import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Avatar, Badge, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { useToast } from '../../lib/toast';
import { getFollowupDetail, getFollowupUsers, sendFollowupReminder, type FollowDayStatus, type FollowItem, type FollowRow, type ReminderKind } from '../../lib/api';
import { ConfirmModal, ErrorNote, G, RoleBadge, SearchBox, fmtDay, fmtStamp, timeAgo } from './shared';
import { ATile, ATitle, KpiTile } from './tiles';
import { FilterMenu } from '../../ui/filter';

type ListTab = 'overdue' | 'pending' | 'late';

const KIND_LABEL: Record<ReminderKind, string> = { overdue_tasks: 'Overdue tasks', worklog_missing: 'Work log', custom: 'Message' };

/** Colours for the work-log calendar. */
const DAY_STYLE: Record<FollowDayStatus, string> = {
  filled: 'bg-good/20 text-good font-bold',
  leave: 'bg-brand/15 text-brand font-bold',
  holiday: 'bg-warn/20 text-warn font-bold',
  missed: 'bg-bad/15 text-bad font-bold',
  today: 'ring-2 ring-ink/40 bg-white/60 font-bold',
  upcoming: 'bg-ink/[0.04] text-muted/70',
  off: 'text-muted/40',
  before: 'invisible',
};
const DAY_LABEL: Record<FollowDayStatus, string> = {
  filled: 'Filled', leave: 'On leave', holiday: 'Holiday', missed: 'Missed', today: 'Today', upcoming: 'Upcoming', off: 'Weekend', before: '',
};

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const Chip = ({ tone, children }: { tone: 'bad' | 'warn' | 'good' | 'neutral'; children: ReactNode }) => {
  const c = { bad: 'bg-bad/10 text-bad', warn: 'bg-warn/15 text-warn', good: 'bg-good/10 text-good', neutral: 'bg-ink/[0.06] text-muted' }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${c}`}>{children}</span>;
};

/* ───────── the people list (left) ───────── */
const PeopleList = ({ rows, loading, error, retry, selected, onPick }: { rows: FollowRow[]; loading: boolean; error: string | null; retry: () => void; selected: string | null; onPick: (id: string) => void }) => {
  const [q, setQ] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [roleSel, setRoleSel] = useState<string[]>([]);
  const [activeIn, setActiveIn] = useState('any');
  const [sort, setSort] = useState('attention');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const idle = (r: FollowRow) => (r.lastActive ? (Date.now() - new Date(r.lastActive).getTime()) / 86400000 : Infinity);
    return rows
      .filter((r) => (!s || (r.name || '').toLowerCase().includes(s) || r.email.toLowerCase().includes(s))
        && (!needs.length || (needs.includes('overdue') && r.overdue > 0) || (needs.includes('logs') && r.missedLogDays > 0) || (needs.includes('late') && r.doneLate > 0))
        && (!roleSel.length || roleSel.includes(r.role))
        && (activeIn === 'any' || (activeIn === 'idle' ? idle(r) > 30 : idle(r) <= Number(activeIn))))
      .sort((a, b) => sort === 'name' ? (a.name || a.email).localeCompare(b.name || b.email) : sort === 'logs' ? b.missedLogDays - a.missedLogDays || b.overdue - a.overdue : sort === 'active' ? (b.lastActive || '').localeCompare(a.lastActive || '') : b.overdue - a.overdue || b.missedLogDays - a.missedLogDays);
  }, [rows, q, needs, roleSel, activeIn, sort]);
  const roleKeys = useMemo(() => [...new Set(rows.map((r) => r.role))], [rows]);

  return (
    <ATile className="lg:!sticky lg:top-3 lg:max-h-[calc(100dvh-9.5rem)]">
      <ATitle icon={G.users}>People</ATitle>
      <div className="flex items-center gap-2.5">
        <SearchBox value={q} onChange={setQ} placeholder="Search people…" />
        <FilterMenu title="Filter people" groups={[
          { id: 'needs', kind: 'multi', label: 'Needs attention', value: needs, onChange: setNeeds, options: [
            { value: 'overdue', label: 'Has overdue tasks', count: rows.filter((r) => r.overdue > 0).length },
            { value: 'logs', label: 'Missed work logs', count: rows.filter((r) => r.missedLogDays > 0).length },
            { value: 'late', label: 'Finished work late', count: rows.filter((r) => r.doneLate > 0).length },
          ] },
          { id: 'role', kind: 'multi', label: 'Role', value: roleSel, onChange: setRoleSel, options: roleKeys.map((k) => ({ value: k, label: k === 'super_admin' ? 'Super admin' : k.charAt(0).toUpperCase() + k.slice(1), count: rows.filter((r) => r.role === k).length })) },
          { id: 'active', kind: 'single', label: 'Last active', value: activeIn, defaultValue: 'any', onChange: setActiveIn, options: [{ value: 'any', label: 'Any time' }, { value: '1', label: 'Last 24 hours' }, { value: '7', label: 'Last 7 days' }, { value: 'idle', label: 'Not active in 30 days' }] },
          { id: 'sort', kind: 'single', view: true, label: 'Sort by', value: sort, defaultValue: 'attention', onChange: setSort, options: [{ value: 'attention', label: 'Most overdue first' }, { value: 'logs', label: 'Most missed logs' }, { value: 'active', label: 'Recently active' }, { value: 'name', label: 'Name (A to Z)' }] },
        ]} />
      </div>
      <div className="mt-3 -mx-2 px-2 flex-1 min-h-0 overflow-y-auto scroll-y space-y-1">
        {error ? <ErrorNote message={error} onRetry={retry} />
          : loading && !rows.length ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
          : shown.length === 0 ? <p className="text-sm text-muted text-center py-8">No one matches.</p>
          : shown.map((r) => {
            const on = selected === r.id;
            const clear = r.overdue === 0 && r.missedLogDays === 0;
            return (
              <button key={r.id} type="button" onClick={() => onPick(r.id)} aria-current={on ? 'true' : undefined}
                className={`w-full text-left flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${on ? 'bg-ink text-white' : 'hover:bg-ink/[0.05]'}`}>
                <Avatar name={r.name || r.email} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold truncate">{r.name || r.email}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.overdue > 0 && <Chip tone="bad">{r.overdue} overdue</Chip>}
                    {r.missedLogDays > 0 && <Chip tone="warn">{r.missedLogDays} logs missed</Chip>}
                    {clear && <Chip tone="good">All clear</Chip>}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </ATile>
  );
};

/* ───────── one work-item row ───────── */
const ItemRow = ({ it, tab }: { it: FollowItem; tab: ListTab }) => (
  <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
    <span className={`w-2 h-2 rounded-full shrink-0 ${tab === 'overdue' ? 'bg-bad' : tab === 'late' ? 'bg-warn' : 'bg-brand'}`} />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold truncate">{it.title}</span>
      <span className="block text-xs text-muted">
        {it.source === 'card' ? 'Board card' : 'Task'}{it.priority ? ` · ${it.priority}` : ''}{it.dueDate ? ` · due ${fmtDay(it.dueDate, { day: 'numeric', month: 'short' })}` : ' · no due date'}
        {tab === 'late' && it.doneOn ? ` · done ${fmtDay(it.doneOn, { day: 'numeric', month: 'short' })}` : ''}
      </span>
    </span>
    {tab === 'overdue' && <Chip tone="bad">{it.daysOverdue} day{it.daysOverdue === 1 ? '' : 's'} overdue</Chip>}
    {tab === 'late' && <Chip tone="warn">{it.daysLate} day{it.daysLate === 1 ? '' : 's'} late</Chip>}
    {tab === 'pending' && (it.dueToday ? <Chip tone="warn">Due today</Chip> : <Chip tone="neutral">On track</Chip>)}
  </li>
);

/* ───────── one person (right) ───────── */
const Person = ({ id, onBack }: { id: string; onBack: () => void }) => {
  const toast = useToast();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data: d, loading, error, reload } = useAsync(() => getFollowupDetail(id, month), [id, month]);
  const [tab, setTab] = useState<ListTab>('overdue');
  const [kinds, setKinds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<ReminderKind | null>(null);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { setMonth(undefined); setTab('overdue'); setTitle(''); setMessage(''); }, [id]);

  const send = async (kind: ReminderKind) => {
    setSending(true);
    try {
      await sendFollowupReminder(id, kind === 'custom' ? { kind, title: title.trim() || undefined, message: message.trim() } : { kind });
      toast('Reminder sent.', 'success');
      setConfirm(null);
      if (kind === 'custom') { setTitle(''); setMessage(''); }
      reload();
    } catch (err: any) {
      toast(err?.message || 'Could not send the reminder.', 'error');
      setConfirm(null);
    } finally {
      setSending(false);
    }
  };

  if (error && !d) return <ErrorNote message={error} onRetry={reload} />;
  if (!d) return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[2rem]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-[2rem]" />)}</div>
      <Skeleton className="h-64 rounded-[2rem]" />
    </div>
  );

  const name = d.user.name || d.user.email;
  const t = d.tasks;
  const rawList = tab === 'overdue' ? t.overdueList : tab === 'pending' ? t.pendingList : t.doneLateList;
  const list = kinds.length ? rawList.filter((it) => kinds.includes(it.source)) : rawList;
  const shownCount = kinds.length ? list.length : tab === 'overdue' ? t.overdue : tab === 'pending' ? t.pending : t.doneLate;
  const w = d.workLog;
  const first = new Date(`${w.month}-01T00:00:00`).getDay();
  const offset = (first + 6) % 7; // weeks start on Monday
  const isNow = w.month === d.today.slice(0, 7);

  return (
    <div className="space-y-4 min-w-0">
      {/* who */}
      <ATile glow="brand">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={onBack} className="lg:hidden basis-full w-fit inline-flex items-center gap-1.5 rounded-full bg-ink/[0.07] px-3 py-1.5 text-xs font-bold hover:bg-ink/[0.12]">← All people</button>
          <Avatar name={name} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">{name}</h2>
            <p className="text-sm text-muted truncate">{d.user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <RoleBadge role={d.user.role} />
              <span>Active {timeAgo(d.user.lastActive)}</span>
              {d.user.timezone && <span>· {d.user.timezone.replace(/_/g, ' ')}</span>}
            </div>
          </div>
        </div>
      </ATile>

      {/* the numbers */}
      <Stagger className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiTile icon={G.board} label="Work items" value={t.total} sub={`${t.done} finished`} />
        <KpiTile icon={G.check} label="Done in time" value={t.inTime} glow="good" sub={t.onTimeRate === null ? 'Nothing finished yet' : `${t.onTimeRate}% of finished`} />
        <KpiTile icon={G.bolt} label="Done late" value={t.doneLate} glow="warn" sub="After the due date" />
        <KpiTile icon={G.refresh} label="Pending" value={t.pending} sub="Still open, not yet due" />
        <KpiTile icon={G.bolt} label="Overdue" value={t.overdue} glow="bad" sub={t.overdue ? 'Open and past due' : 'Nothing overdue'} />
      </Stagger>

      {/* work items */}
      <ATile>
        <ATitle icon={G.board} right={
          tab === 'overdue' && t.overdue > 0
            ? <Button className="!rounded-full" onClick={() => setConfirm('overdue_tasks')}>{G.send}<span className="ml-1.5">Remind about overdue ({t.overdue})</span></Button>
            : undefined
        }>Work items</ATitle>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Showing <b className="text-ink">{tab === 'overdue' ? 'overdue' : tab === 'pending' ? 'pending' : 'finished late'}</b> · {shownCount}</p>
          <FilterMenu size="sm" title="Filter work items" groups={[
            { id: 'show', kind: 'single', label: 'Show', value: tab, defaultValue: 'overdue', onChange: (v) => setTab(v as ListTab), options: [
              { value: 'overdue', label: 'Overdue', count: t.overdue }, { value: 'pending', label: 'Pending', count: t.pending }, { value: 'late', label: 'Done late', count: t.doneLate },
            ] },
            { id: 'kind', kind: 'multi', label: 'Type', value: kinds, onChange: setKinds, options: [{ value: 'task', label: 'Tasks' }, { value: 'card', label: 'Board cards' }] },
          ]} />
        </div>
        <div className="mt-4">
          {list.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">{tab === 'overdue' ? 'Nothing overdue. Nice.' : tab === 'pending' ? 'Nothing pending right now.' : 'Nothing was finished late.'}</p>
          ) : (
            <>
              <ul className="divide-y divide-ink/10">{list.map((it) => <ItemRow key={`${it.source}-${it.id}`} it={it} tab={tab} />)}</ul>
              {shownCount > list.length && <p className="text-xs text-muted mt-3">Showing {list.length} of {shownCount}.</p>}
            </>
          )}
        </div>
      </ATile>

      {/* work log */}
      <ATile>
        <ATitle icon={G.edit} right={
          w.missedRecentCount > 0
            ? <Button className="!rounded-full" onClick={() => setConfirm('worklog_missing')}>{G.send}<span className="ml-1.5">Remind to fill log ({w.missedRecentCount})</span></Button>
            : undefined
        }>Work log</ATitle>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] p-1">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(w.month, -1))} className="w-8 h-8 rounded-full hover:bg-ink/10 grid place-items-center">‹</button>
            <span className="px-2 text-sm font-bold min-w-[9.5rem] text-center">{monthLabel(w.month)}</span>
            <button type="button" aria-label="Next month" disabled={isNow} onClick={() => setMonth(shiftMonth(w.month, 1))} className="w-8 h-8 rounded-full hover:bg-ink/10 grid place-items-center disabled:opacity-30">›</button>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Chip tone="good">{w.filled} filled</Chip>
            <Chip tone="bad">{w.missed} missed</Chip>
            {w.leave > 0 && <Chip tone="neutral">{w.leave} leave</Chip>}
            {w.holiday > 0 && <Chip tone="neutral">{w.holiday} holiday</Chip>}
            <Chip tone={w.rate === null ? 'neutral' : w.rate >= 80 ? 'good' : w.rate >= 50 ? 'warn' : 'bad'}>{w.rate === null ? 'No data' : `${w.rate}% on time`}</Chip>
          </div>
        </div>
        <div className="grid xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] gap-6 items-start">
          <div>
            <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`Work log, ${monthLabel(w.month)}`}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => <span key={x} className="text-[10px] font-extrabold uppercase tracking-wider text-muted pb-1">{x}</span>)}
              {Array.from({ length: offset }).map((_, i) => <span key={`o${i}`} />)}
              {w.days.map((day) => (
                <span key={day.date} title={`${fmtDay(day.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${DAY_LABEL[day.status]}${day.note ? ` — ${day.note}` : ''}`}
                  className={`h-10 sm:h-11 rounded-xl grid place-items-center text-sm ${DAY_STYLE[day.status]}`}>{Number(day.date.slice(8))}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
              {(['filled', 'missed', 'leave', 'holiday', 'upcoming'] as FollowDayStatus[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${DAY_STYLE[s].split(' ')[0]}`} />{DAY_LABEL[s]}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-ink/[0.04] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Not filled, last 30 days</p>
            <p className="text-3xl font-extrabold tabular-nums mt-1">{w.missedRecentCount}<span className="text-sm font-bold text-muted ml-1.5">working day{w.missedRecentCount === 1 ? '' : 's'}</span></p>
            {w.missedRecent.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {w.missedRecent.map((x) => <Chip key={x} tone="bad">{fmtDay(x, { weekday: 'short', day: 'numeric', month: 'short' })}</Chip>)}
              </div>
            )}
            {w.missedRecentCount > w.missedRecent.length && <p className="text-xs text-muted mt-2">Showing the latest {w.missedRecent.length}.</p>}
            <p className="text-xs text-muted mt-4">{w.lastLogDate ? `Last log written on ${fmtDay(w.lastLogDate)}.` : 'No log has been written yet.'} Weekends are not counted as missed, and a day marked leave or holiday counts as filled.</p>
          </div>
        </div>
      </ATile>

      {/* meetings */}
      <ATile>
        <ATitle icon={G.users}>Meetings</ATitle>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl bg-ink/[0.05] px-4 py-3"><p className="text-2xl font-extrabold tabular-nums">{d.meetings.total}</p><p className="text-xs text-muted">Minutes logged, all time</p></div>
          <div className="rounded-2xl bg-ink/[0.05] px-4 py-3"><p className="text-2xl font-extrabold tabular-nums">{d.meetings.inMonth}</p><p className="text-xs text-muted">In {monthLabel(w.month)}</p></div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-2">Recent</p>
            {d.meetings.recent.length === 0 ? <p className="text-sm text-muted">No minutes yet.</p> : (
              <ul className="divide-y divide-ink/10">
                {d.meetings.recent.map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <span className="min-w-0"><span className="block text-sm font-bold truncate">{m.meetingType || 'Meeting'}</span><span className="block text-xs text-muted truncate">{[m.center, m.place].filter(Boolean).join(' · ') || '—'}</span></span>
                    <span className="text-xs text-muted shrink-0">{fmtDay(m.date, { day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-2">Scheduled next</p>
            {d.meetings.upcoming.length === 0 ? <p className="text-sm text-muted">Nothing scheduled.</p> : (
              <ul className="divide-y divide-ink/10">
                {d.meetings.upcoming.map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <span className="min-w-0"><span className="block text-sm font-bold truncate">{m.meetingType || 'Meeting'}</span><span className="block text-xs text-muted truncate">{m.center || '—'}</span></span>
                    <span className="text-xs text-muted shrink-0">{fmtDay(m.date, { day: 'numeric', month: 'short' })} · {m.startTime?.slice(0, 5)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ATile>

      {/* send a message */}
      <ATile glow="good">
        <ATitle icon={G.send}>Send a message to {name.split(' ')[0]}</ATitle>
        <p className="text-sm text-muted mb-3">It arrives as a notification in the app, and by email if they have email on. For overdue tasks or a missing work log, use the buttons above: the message is written for you from their real data.</p>
        <div className="space-y-3">
          <input className="w-full rounded-xl bg-white/50 border border-white/70 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder="Title (optional)" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="w-full min-h-[7rem] rounded-xl bg-white/50 border border-white/70 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 resize-y" placeholder="Write your message…" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted tabular-nums">{message.length}/1000</span>
            <Button className="!rounded-full" loading={sending && confirm === null} disabled={!message.trim()} onClick={() => send('custom')}>{G.send}<span className="ml-1.5">Send message</span></Button>
          </div>
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted mt-6 mb-2">Sent recently</p>
        {d.reminders.length === 0 ? <p className="text-sm text-muted">Nothing sent yet.</p> : (
          <ul className="divide-y divide-ink/10">
            {d.reminders.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.kind === 'overdue_tasks' ? 'bad' : r.kind === 'worklog_missing' ? 'warn' : 'brand'}>{KIND_LABEL[r.kind] ?? 'Message'}</Badge>
                  <span className="text-sm font-bold">{r.title}</span>
                  <span className="ml-auto text-xs text-muted">{fmtStamp(r.createdAt)}</span>
                </div>
                <p className="text-xs text-muted mt-1">{r.read ? 'Seen' : 'Not seen yet'}{r.sentBy ? ` · sent by ${r.sentBy}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </ATile>

      <ConfirmModal open={confirm !== null} title={confirm === 'overdue_tasks' ? 'Send an overdue-tasks reminder?' : 'Send a work-log reminder?'} confirmLabel="Send reminder" loading={sending}
        onConfirm={() => confirm && send(confirm)} onClose={() => setConfirm(null)}>
        <p>This goes to <b>{name}</b> as a notification{' '}and an email.</p>
        {confirm && (
          <div className="rounded-xl bg-ink/[0.05] p-3.5 mt-2">
            <p className="font-bold">{d.defaults[confirm === 'overdue_tasks' ? 'overdue_tasks' : 'worklog_missing'].title}</p>
            <p className="whitespace-pre-line text-muted mt-1.5 text-[13px] break-words">{d.defaults[confirm === 'overdue_tasks' ? 'overdue_tasks' : 'worklog_missing'].body}</p>
          </div>
        )}
      </ConfirmModal>
      {loading && <span className="sr-only">Loading</span>}
    </div>
  );
};

/* ───────── page ───────── */
const AdminFollowUp = () => {
  const { data, loading, error, reload } = useAsync(getFollowupUsers, []);
  const rows = data ?? [];
  const [picked, setPicked] = useState<string | null>(null);

  // On a wide screen, open the person who needs the most follow-up straight away.
  useEffect(() => {
    if (picked || !rows.length || typeof window === 'undefined' || window.innerWidth < 1024) return;
    setPicked([...rows].sort((a, b) => b.overdue - a.overdue || b.missedLogDays - a.missedLogDays)[0].id);
  }, [rows, picked]);

  return (
    <div className="grid lg:grid-cols-[21rem_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
      {/* stretches the full height of the row, so the list card can stay in view while the page scrolls */}
      <div className={`self-stretch ${picked ? 'max-lg:hidden' : ''}`}>
        <PeopleList rows={rows} loading={loading} error={error} retry={reload} selected={picked} onPick={setPicked} />
      </div>
      <div className={`min-w-0 ${picked ? '' : 'max-lg:hidden'}`}>
        {picked ? <Person key={picked} id={picked} onBack={() => setPicked(null)} /> : <Empty icon="👈" title="Choose a person" hint="Their work, meetings and work log appear here." />}
      </div>
    </div>
  );
};

export default AdminFollowUp;
