import { useMemo, useState } from 'react';
import { useT } from '../../lib/siteConfig';
import { AnimatePresence, motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { rise, spring } from '../../lib/motion';
import { getLocalDateString, parseLocalDate } from '../../lib/date';
import { useToast } from '../../lib/toast';
import { deleteScheduledMeeting, getMeetings, getScheduledMeetings } from '../../lib/api';
import { Badge, Button, Card, Drawer, Empty, Input, Skeleton, Stagger, Tabs, useAsync } from '../../ui';
import { FilterMenu } from '../../ui/filter';
import { Icon } from '../../shell/icons';
import { ConfirmModal, Ico, IconBtn } from './bits';
import { ScheduleForm } from './Schedule';
import {
  d10, durationLabel, getListTab, hhmm, inMeetingPeriod, longDate, matchesFlags, MEETING_FLAGS, MEETING_PERIODS, monthKey, setListTab, shortDate, titleCase,
  toMinutes, typeTone, type ListTab, type Meeting, type MeetingPeriod, type Scheduled,
} from './helpers';

type Go = ViewProps['go'];
const PAGE = 30;

/* ───────────────────────── Logged meetings ───────────────────────── */

const Logged = ({ meetings, go }: { meetings: Meeting[]; go: Go }) => {
  const [q, setQ] = useState('');
  const [centersSel, setCentersSel] = useState<string[]>([]);
  const [typesSel, setTypesSel] = useState<string[]>([]);
  const [period, setPeriod] = useState<MeetingPeriod>('any');
  const [flags, setFlags] = useState<string[]>([]);
  const todayStr = getLocalDateString();
  const [, setShown] = useState(PAGE);

  const sorted = useMemo(
    () => [...meetings].sort((a, b) => d10(b.date).localeCompare(d10(a.date)) || (b.startTime || '').localeCompare(a.startTime || '')),
    [meetings],
  );
  const haystack = useMemo(() => {
    const map = new Map<string, string>();
    sorted.forEach((m) => {
      map.set(m.id, [
        m.center, m.place, m.personName, m.meetingType, m.presentSantName, m.attendance, ...(m.agenda || []),
        ...(m.notes || []).flatMap((n) => [n.title, ...(n.points || []).flatMap((p) => [p.text, p.assignee])]),
      ].filter(Boolean).join(' ').toLowerCase());
    });
    return map;
  }, [sorted]);

  const centers = useMemo(() => {
    const c = new Map<string, number>();
    sorted.forEach((m) => { if (m.center) { const k = titleCase(m.center); c.set(k, (c.get(k) || 0) + 1); } });
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [sorted]);

  const needle = q.trim().toLowerCase();
  const filtered = sorted.filter((m) =>
    (!centersSel.length || centersSel.includes(m.center ? titleCase(m.center) : 'No center')) &&
    (!typesSel.length || typesSel.includes(m.meetingType || 'Others')) &&
    inMeetingPeriod(m.date, period, todayStr) && matchesFlags(m, flags) &&
    (!needle || haystack.get(m.id)?.includes(needle)),
  );
  const typeCounts = useMemo(() => {
    const c = new Map<string, number>();
    sorted.forEach((m) => { const t = m.meetingType || 'Others'; c.set(t, (c.get(t) || 0) + 1); });
    return c;
  }, [sorted]);
  const groups = useMemo(() => {
    const byCenter = new Map<string, Meeting[]>();
    filtered.forEach((m) => { const k = m.center ? titleCase(m.center) : 'No center'; (byCenter.get(k) || byCenter.set(k, []).get(k)!).push(m); });
    return [...byCenter.entries()]
      .map(([center, items]) => {
        const byType = new Map<string, Meeting[]>();
        items.forEach((m) => { const t = m.meetingType || 'Others'; (byType.get(t) || byType.set(t, []).get(t)!).push(m); });
        return { center, items, types: [...byType.entries()].sort((x, y) => y[1].length - x[1].length) };
      })
      .sort((x, y) => (x.center === 'No center' ? 1 : y.center === 'No center' ? -1 : y.items.length - x.items.length));
  }, [filtered]);
  const filtering = !!(needle || centersSel.length || typesSel.length || period !== 'any' || flags.length);
  const clearAll = () => { setQ(''); setCentersSel([]); setTypesSel([]); setPeriod('any'); setFlags([]); };

  if (meetings.length === 0) {
    return (
      <Card><Empty icon="📝" title="No meetings logged yet" hint="After a meeting, jot down what was discussed and decided. It only takes a minute."
        action={<Button onClick={() => go('meetings', 'new')}>{Icon.plus(16)} Log your first minutes</Button>} /></Card>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3 sm:mb-6">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{Icon.search(17)}</span>
          <Input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search centers, people or minutes" className="pl-11 !rounded-full !py-3" aria-label="Search meetings" />
        </div>
        <FilterMenu title="Filter meetings" groups={[
          { id: 'type', kind: 'multi', label: 'Meeting type', value: typesSel, onChange: (v) => { setTypesSel(v); setShown(PAGE); }, options: [...typeCounts.entries()].sort((x, y) => y[1] - x[1]).map(([t, n]) => ({ value: t, label: t, count: n })) },
          { id: 'center', kind: 'multi', label: 'Center', value: centersSel, onChange: (v) => { setCentersSel(v); setShown(PAGE); }, hidden: centers.length < 2, options: centers.map(([c, n]) => ({ value: c, label: c, count: n })) },
          { id: 'period', kind: 'single', label: 'Held', value: period, defaultValue: 'any', onChange: (v) => { setPeriod(v as MeetingPeriod); setShown(PAGE); }, options: MEETING_PERIODS },
          { id: 'flags', kind: 'multi', label: 'Minutes', value: flags, onChange: (v) => { setFlags(v); setShown(PAGE); }, options: MEETING_FLAGS },
        ]} />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <Empty icon="🔍" title="Nothing matches" hint="Try a different word, or clear the filters."
            action={<Button variant="soft" onClick={clearAll}>Clear filters</Button>} />
        </Card>
      ) : (
        <div className="space-y-7">
          {filtering && <p className="text-xs font-semibold text-muted">{groups.length} {groups.length === 1 ? 'center' : 'centers'} found · {filtered.length} {filtered.length === 1 ? 'meeting' : 'meetings'}</p>}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((g) => {
              const latest = g.items[0];
              return (
                <motion.button
                  key={g.center}
                  type="button"
                  layout
                  whileHover={{ y: -3 }}
                  transition={spring}
                  onClick={() => go('meetings', `center:${encodeURIComponent(g.center)}`)}
                  className="liquid rounded-[1.75rem] p-5 sm:p-6 text-left flex flex-col focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-brand-soft text-brand grid place-items-center"><Ico name="pin" size={20} /></span>
                    <span className="text-4xl font-extrabold tabular-nums leading-none">{g.items.length}</span>
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight mt-5 truncate">{g.center}</h2>
                  <p className="text-sm text-muted mt-0.5">{g.items.length === 1 ? 'meeting' : 'meetings'}{latest ? ` · last on ${shortDate(latest.date)}` : ''}</p>
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-line/70 mt-auto">
                    {g.types.slice(0, 4).map(([t, l]) => <Badge key={t} tone={typeTone(t)}>{t} · {l.length}</Badge>)}
                    {g.types.length > 4 && <Badge>+{g.types.length - 4}</Badge>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Scheduled meetings ───────────────────────── */

const ScheduledCard = ({ s, used, loggedId, overdue, today, go, onEdit, onDelete }: {
  s: Scheduled; used: boolean; loggedId?: string; overdue: boolean; today: string; go: Go; onEdit: (s: Scheduled) => void; onDelete: (s: Scheduled) => void;
}) => {
  const agenda = (s.agenda || []).filter((a) => a?.trim());
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={spring}
      className={`liquid rounded-3xl p-4 ${overdue ? 'ring-1 ring-warn/50' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wider text-brand">{d10(s.date) === today ? 'Today' : shortDate(s.date)}</p>
        <div className="flex items-center -mr-2">
          {!used && <IconBtn label="Edit scheduled meeting" onClick={() => onEdit(s)}><Ico name="pencil" size={15} /></IconBtn>}
          <IconBtn label="Delete scheduled meeting" tone="danger" onClick={() => onDelete(s)}><Ico name="trash" size={15} /></IconBtn>
        </div>
      </div>
      <h3 className="font-extrabold text-base leading-snug mt-0.5">{titleCase(s.center) || s.meetingType || 'Meeting'}</h3>
      <p className="text-sm text-muted mt-1 inline-flex items-center gap-1.5"><Ico name="clock" size={13} /> {hhmm(s.startTime)} · {durationLabel(s.duration || 0)}{!!s.participants && <> · <Ico name="users" size={13} /> {s.participants}</>}</p>
      {agenda.length > 0 && (
        <ul className="mt-2.5 space-y-0.5">
          {agenda.slice(0, 2).map((a, i) => <li key={i} className="text-sm text-ink-2 truncate">• {a.split('\n')[0]}</li>)}
          {agenda.length > 2 && <li className="text-xs text-muted">+ {agenda.length - 2} more</li>}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {s.meetingType && <Badge tone={typeTone(s.meetingType)}>{s.meetingType}</Badge>}
        {used && <Badge tone="good"><Ico name="check" size={11} /> Logged</Badge>}
      </div>
      <div className="mt-3.5">
        {used ? (
          loggedId && <Button size="sm" variant="soft" className="w-full" onClick={() => go('meetings', loggedId)}>View minutes</Button>
        ) : (
          <Button size="sm" className="w-full" onClick={() => go('meetings', `start:${s.id}`)}><Ico name="play" size={12} /> {overdue ? 'Add minutes' : 'Start meeting'}</Button>
        )}
      </div>
    </motion.div>
  );
};

const Column = ({ title, hint, tone, list, empty, overdue, used, today, loggedBy, go, onEdit, onDelete }: {
  title: string; hint: string; tone: string; list: Scheduled[]; empty: string; overdue?: boolean; used?: boolean; today: string; loggedBy: Map<string, string>;
  go: Go; onEdit: (s: Scheduled) => void; onDelete: (s: Scheduled) => void;
}) => (
  <section className="rounded-[2rem] bg-ink/[0.035] p-3 sm:p-4 min-w-0">
    <div className="flex items-center gap-2 px-1.5 pb-3">
      <span className={`w-2.5 h-2.5 rounded-full ${tone}`} />
      <h2 className="text-sm font-extrabold">{title}</h2>
      <span className="ml-auto text-xs font-bold text-muted tabular-nums">{list.length}</span>
    </div>
    <p className="text-xs text-muted px-1.5 -mt-2 mb-3">{hint}</p>
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {list.map((s) => <ScheduledCard key={s.id} s={s} used={!!used} loggedId={loggedBy.get(s.id)} overdue={!!overdue} today={today} go={go} onEdit={onEdit} onDelete={onDelete} />)}
      </AnimatePresence>
      {list.length === 0 && <p className="text-sm text-muted text-center py-8 rounded-3xl border border-dashed border-line">{empty}</p>}
    </div>
  </section>
);

const Scheduled_ = ({ board, loggedBy, today, go, onEdit, onDelete, onNew }: {
  board: Board; loggedBy: Map<string, string>; today: string; go: Go; onEdit: (s: Scheduled) => void; onDelete: (s: Scheduled) => void; onNew: () => void;
}) => {
  const { waiting, upcoming, done } = board;
  if (waiting.length + upcoming.length + done.length === 0) {
    return (
      <Card><Empty icon="🗓️" title="Nothing scheduled" hint="Plan a meeting ahead and start it with one tap when the time comes. Your agenda comes along."
        action={<Button onClick={onNew}>{Icon.plus(16)} Schedule a meeting</Button>} /></Card>
    );
  }
  const common = { today, loggedBy, go, onEdit, onDelete };
  return (
    <div className="grid lg:grid-cols-3 gap-4 items-start">
      <Column title="Needs minutes" hint="Already happened. Log what was discussed." tone="bg-warn" list={waiting} empty="All caught up" overdue {...common} />
      <Column title="Coming up" hint="Start with one tap when it is time." tone="bg-brand" list={upcoming} empty="Nothing planned" {...common} />
      <Column title="Logged" hint="Minutes already recorded." tone="bg-good" list={done} empty="None yet" used {...common} />
    </div>
  );
};

type Board = { waiting: Scheduled[]; upcoming: Scheduled[]; done: Scheduled[] };

/* ───────────────────────── Screen ───────────────────────── */

const ListSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-28" />
    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px]" />)}
  </div>
);

const MeetingList = ({ go }: Pick<ViewProps, 'go'>) => {
  const t = useT();
  const toast = useToast();
  const [tab, setTabState] = useState<ListTab>(getListTab);
  const setTab = (t: ListTab) => { setTabState(t); setListTab(t); };
  const logged = useAsync<Meeting[]>(() => getMeetings(), []);
  const sched = useAsync<Scheduled[]>(() => getScheduledMeetings(undefined, undefined, true), []);
  const [delSched, setDelSched] = useState<Scheduled | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; item: Scheduled | null }>({ open: false, item: null });

  const meetings = logged.data || [];
  const scheduled = sched.data || [];
  const loggedSchedIds = useMemo(() => new Set(meetings.map((m) => m.scheduledMeetingId).filter(Boolean)), [meetings]);
  const openCount = scheduled.filter((s) => !loggedSchedIds.has(s.id)).length;
  const today = getLocalDateString();
  const nowD = new Date();
  const nowMin = nowD.getHours() * 60 + nowD.getMinutes();
  const loggedBy = useMemo(() => {
    const map = new Map<string, string>();
    meetings.forEach((m) => { if (m.scheduledMeetingId) map.set(m.scheduledMeetingId, m.id); });
    return map;
  }, [meetings]);
  const board = useMemo<Board>(() => {
    const cmp = (a: Scheduled, b: Scheduled) => d10(a.date).localeCompare(d10(b.date)) || a.startTime.localeCompare(b.startTime);
    const isPast = (x: Scheduled) => d10(x.date) < today || (d10(x.date) === today && toMinutes(x.endTime || x.startTime) <= nowMin);
    const open = scheduled.filter((x) => !loggedBy.has(x.id));
    return {
      waiting: open.filter(isPast).sort((a, b) => cmp(b, a)),
      upcoming: open.filter((x) => !isPast(x)).sort(cmp),
      done: scheduled.filter((x) => loggedBy.has(x.id)).sort((a, b) => cmp(b, a)),
    };
  }, [scheduled, loggedBy, today, nowMin]);
  const waitingCount = board.waiting.length;
  const waiting0: Scheduled | undefined = board.waiting[0];
  const next: Scheduled | undefined = board.upcoming[0] || waiting0;
  const week = useMemo(() => {
    const start = parseLocalDate(today);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const date = getLocalDateString(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
      return { date, count: scheduled.filter((x) => d10(x.date) === date).length + meetings.filter((m) => d10(m.date) === date && !m.scheduledMeetingId).length };
    });
  }, [today, scheduled, meetings]);
  const thisMonth = meetings.filter((m) => monthKey(m.date) === today.slice(0, 7)).length;

  const confirmDeleteSched = async () => {
    if (!delSched) return;
    setBusy(true);
    try {
      await deleteScheduledMeeting(delSched.id);
      sched.reload();
      toast('Scheduled meeting deleted');
    } catch (e) {
      toast((e as Error).message || 'Could not delete the meeting', 'error');
    } finally { setBusy(false); setDelSched(null); }
  };

  const openForm = (item: Scheduled | null = null) => setDrawer({ open: true, item });
  const closeForm = () => setDrawer((d) => ({ ...d, open: false }));
  const loading = (tab === 'logged' ? logged.loading && !logged.data : sched.loading && !sched.data);
  const error = tab === 'logged' ? logged.error : sched.error;

  return (
    <Stagger>
      {/* Spotlight + week */}
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-3 sm:gap-4 mb-3 sm:mb-5">
        <motion.div variants={rise} className="rounded-[2rem] hero-ink p-6 sm:p-8 flex flex-col min-h-[15rem] relative overflow-hidden">
          <span aria-hidden className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <p className="relative text-xs font-extrabold uppercase tracking-wider opacity-70">{next ? (waitingCount > 0 && next === waiting0 ? 'Needs your minutes' : 'Next up') : 'Your meetings'}</p>
          {next ? (
            <>
              <h1 className="relative text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 leading-tight">{titleCase(next.center) || next.meetingType || 'Meeting'}</h1>
              <p className="relative mt-2 text-base opacity-80 inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5"><Ico name="calendar" size={15} /> {d10(next.date) === today ? 'Today' : longDate(next.date)}</span>
                <span className="inline-flex items-center gap-1.5"><Ico name="clock" size={15} /> {hhmm(next.startTime)} · {durationLabel(next.duration || 0)}</span>
              </p>
              {(next.agenda || []).filter((a) => a?.trim())[0] && <p className="relative mt-3 text-sm opacity-70 line-clamp-2">Agenda: {(next.agenda || []).filter((a) => a?.trim()).slice(0, 2).map((a) => a.split('\n')[0]).join(' · ')}</p>}
              <div className="relative mt-auto pt-6 flex flex-wrap gap-2">
                <button type="button" onClick={() => go('meetings', `start:${next.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-white text-ink px-5 py-3 text-sm font-bold hover:opacity-90 transition-opacity"><Ico name="play" size={13} /> {next === waiting0 ? 'Add minutes' : 'Start meeting'}</button>
                <button type="button" onClick={() => go('meetings', 'new')} className="rounded-xl bg-white/15 hover:bg-white/25 transition-colors px-5 py-3 text-sm font-bold">Log minutes</button>
              </div>
            </>
          ) : (
            <>
              <h1 className="relative text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 leading-tight">{t('meetings.empty.title')}</h1>
              <p className="relative mt-2 opacity-75 max-w-sm">{t('meetings.empty.sub')}</p>
              <div className="relative mt-auto pt-6 flex flex-wrap gap-2">
                <button type="button" onClick={() => openForm()} className="rounded-xl bg-white text-ink px-5 py-3 text-sm font-bold hover:opacity-90 transition-opacity">Schedule a meeting</button>
                <button type="button" onClick={() => go('meetings', 'new')} className="rounded-xl bg-white/15 hover:bg-white/25 transition-colors px-5 py-3 text-sm font-bold">Log minutes</button>
              </div>
            </>
          )}
        </motion.div>

        <Card className="p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold">This week</h2>
            <button type="button" onClick={() => go('meetings', 'schedule')} className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1.5"><Ico name="calendar" size={13} /> Calendar</button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-4">
            {week.map((w) => (
              <button key={w.date} type="button" onClick={() => go('meetings', 'schedule')} aria-label={shortDate(w.date)}
                className={`rounded-2xl py-2.5 text-center transition-colors ${w.date === today ? 'bg-ink text-white' : 'bg-ink/[0.05] hover:bg-ink/[0.1]'}`}>
                <p className="text-[10px] font-extrabold uppercase opacity-70">{parseLocalDate(w.date).toLocaleDateString(undefined, { weekday: 'narrow' })}</p>
                <p className="text-base font-extrabold tabular-nums leading-tight">{Number(w.date.slice(8))}</p>
                <span className="mt-1 flex justify-center gap-0.5 h-1.5">{Array.from({ length: Math.min(w.count, 3) }).map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />)}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-auto pt-5">
            {[
              { label: 'This month', value: thisMonth },
              { label: 'All logged', value: meetings.length },
              { label: 'To log', value: waitingCount, warn: waitingCount > 0 },
            ].map((k) => (
              <div key={k.label}>
                <p className={`text-2xl font-extrabold tabular-nums leading-none ${k.warn ? 'text-warn' : ''}`}>{logged.data && sched.data ? k.value : '–'}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted mt-1">{k.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 sm:mb-5">
        <Tabs<ListTab>
          id="meetings"
          value={tab}
          onChange={setTab}
          items={[{ key: 'logged', label: 'Logged minutes', count: logged.data ? meetings.length : undefined }, { key: 'scheduled', label: 'Scheduled', count: sched.data ? openCount : undefined }]}
        />
        <div className="flex items-center gap-2">
          <Button variant="soft" onClick={() => openForm()} className="!bg-white !border !border-ink/15 shadow-card hover:!border-ink/40">{Icon.plus(16)} Schedule</Button>
          <Button onClick={() => go('meetings', 'new')} className="shadow-pop">{Icon.plus(16)} Log minutes</Button>
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <Card><Empty icon="😕" title="We couldn't load your meetings" hint={error} action={<Button variant="soft" onClick={() => (tab === 'logged' ? logged.reload() : sched.reload())}>Try again</Button>} /></Card>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <motion.div initial="show" animate="show">
              {tab === 'logged' ? (
                <Logged meetings={meetings} go={go} />
              ) : (
                <Scheduled_ board={board} loggedBy={loggedBy} today={today} go={go} onEdit={openForm} onDelete={setDelSched} onNew={() => openForm()} />
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      <Drawer open={drawer.open} onClose={closeForm} title={drawer.item ? 'Edit scheduled meeting' : 'Schedule a meeting'}>
        {drawer.open && (
          <ScheduleForm
            initial={drawer.item}
            existing={scheduled}
            onCancel={closeForm}
            onDone={() => { closeForm(); setTab('scheduled'); sched.reload(); }}
          />
        )}
      </Drawer>

      <ConfirmModal
        open={!!delSched}
        title="Delete this scheduled meeting?"
        body={delSched && <>{titleCase(delSched.center) || delSched.meetingType || 'The meeting'} on {longDate(delSched.date)} at {hhmm(delSched.startTime)} will be removed.</>}
        busy={busy}
        onConfirm={confirmDeleteSched}
        onClose={() => !busy && setDelSched(null)}
      />
    </Stagger>
  );
};

export default MeetingList;
