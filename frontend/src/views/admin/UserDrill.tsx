import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimatedNumber, Avatar, Badge, Button, Empty, Ring, Skeleton, useAsync } from '../../ui';
import { Icon } from '../../shell/icons';
import { getAdminUserDetail, type AdminUserDetail } from '../../lib/api';
import { getLocalDateString, parseLocalDate } from '../../lib/date';
import { DONUT, ErrorNote, G, PDrawer, RoleBadge, fmtDay, fmtJoined, rateTone, timeAgo, tooltipStyle, useLast } from './shared';

/* ───────── Unified timeline ───────── */
type Kind = 'meeting' | 'task' | 'card' | 'worklog' | 'activity';
type Timely = 'early' | 'onTime' | 'late' | null;
interface TItem {
  key: string;
  ms: number;
  dateOnly: boolean;
  kind: Kind;
  tone: 'dark' | 'good' | 'warn' | 'neutral';
  title: string;
  sub?: string;
  timely?: Timely;
  raw: string;
}

/** Pure DATE values are parsed as local calendar dates; real timestamps are parsed as instants. */
const toMs = (raw: string, dateOnly: boolean) => (dateOnly ? parseLocalDate(raw.slice(0, 10)).getTime() : new Date(raw).getTime());

export const buildTimeline = (d: AdminUserDetail): TItem[] => {
  const items: TItem[] = [];
  const push = (i: Omit<TItem, 'ms'>) => items.push({ ...i, ms: toMs(i.raw, i.dateOnly) });

  d.meetings.recent.forEach((m) =>
    push({ key: `m-${m.id}`, raw: m.date, dateOnly: true, kind: 'meeting', tone: 'dark', title: `Logged a meeting: ${m.meetingType || 'Unspecified'}`, sub: [m.center, m.place].filter(Boolean).join(' · ') || undefined }),
  );
  d.tasks.recent.forEach((t) =>
    push({
      key: `t-${t.id}`, raw: t.dueDate || t.createdAt, dateOnly: !!t.dueDate, kind: 'task', tone: t.completed ? 'good' : 'neutral',
      title: t.title, sub: t.completed ? 'Task completed' : `Task ${String(t.status).replace(/_/g, ' ')}`, timely: t.timeliness,
    }),
  );
  d.cards.recent.forEach((c) =>
    push({
      key: `c-${c.id}`, raw: c.dueDate || d.user.createdAt, dateOnly: !!c.dueDate, kind: 'card', tone: c.archived ? 'good' : 'neutral',
      title: c.title, sub: c.archived ? 'Board card completed' : `Board card · ${c.priority || 'no priority'}`, timely: c.timeliness,
    }),
  );
  d.workLogs.recent.forEach((w) =>
    push({
      key: `w-${w.date}`, raw: w.date, dateOnly: true, kind: 'worklog', tone: w.todayOnLeave || w.todayHoliday ? 'warn' : 'dark',
      title: w.todayOnLeave ? 'Marked on leave' : w.todayHoliday ? 'Marked a holiday' : 'Work log submitted', sub: w.todayWork || undefined,
    }),
  );
  d.activity.recent.forEach((a, i) =>
    push({ key: `a-${i}`, raw: a.createdAt, dateOnly: false, kind: 'activity', tone: 'neutral', title: `${a.method} ${a.path}` }),
  );

  return items.filter((i) => !!i.raw && !isNaN(i.ms)).sort((a, b) => b.ms - a.ms);
};

const KIND_ICON: Record<Kind, ReactNode> = {
  meeting: Icon.meetings(14),
  task: Icon.tasks(14),
  card: G.board,
  worklog: Icon.worklog(14),
  activity: G.bolt,
};
const TONE_BG: Record<TItem['tone'], string> = { dark: 'bg-ink text-white', good: 'bg-good text-white', warn: 'bg-warn text-white', neutral: 'bg-ink/10 text-ink-2' };
const TIMELY: Record<string, { tone: 'good' | 'brand' | 'bad'; label: string }> = {
  early: { tone: 'good', label: 'Early' },
  onTime: { tone: 'brand', label: 'On time' },
  late: { tone: 'bad', label: 'Late' },
};

const dayHeading = (ms: number) => {
  const d = new Date(ms);
  const key = getLocalDateString(d);
  const now = new Date();
  if (key === getLocalDateString(now)) return 'Today';
  const y = new Date(); y.setDate(now.getDate() - 1);
  if (key === getLocalDateString(y)) return 'Yesterday';
  const t = new Date(); t.setDate(now.getDate() + 1);
  if (key === getLocalDateString(t)) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
};

const Timeline = ({ items }: { items: TItem[] }) => {
  const [limit, setLimit] = useState(20);
  const shown = items.slice(0, limit);
  const groups: { day: string; rows: TItem[] }[] = [];
  shown.forEach((i) => {
    const day = dayHeading(i.ms);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(i);
    else groups.push({ day, rows: [i] });
  });
  if (!items.length) return <Empty icon="🕊️" title="Nothing recorded yet" hint="Meetings, tasks and logs will tell their story here." />;
  return (
    <div>
      {groups.map((g) => (
        <div key={g.day} className="mb-4 last:mb-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted mb-2">{g.day}</p>
          <ul className="relative space-y-3">
            <span className="absolute left-[13px] top-2 bottom-2 w-px bg-line" />
            {g.rows.map((i, n) => (
              <motion.li
                key={i.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(n * 0.03, 0.3) }}
                className="relative flex items-start gap-3"
              >
                <span className={`relative z-10 w-7 h-7 rounded-full grid place-items-center shrink-0 ring-4 ring-white ${TONE_BG[i.tone]}`}>{KIND_ICON[i.kind]}</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold break-words min-w-0">{i.title}</p>
                    {i.timely && <Badge tone={TIMELY[i.timely].tone}>{TIMELY[i.timely].label}</Badge>}
                  </div>
                  {i.sub && <p className="text-xs text-muted mt-0.5 line-clamp-2 break-words">{i.sub}</p>}
                </div>
                <span className="text-[11px] text-muted whitespace-nowrap pt-1">
                  {i.kind === 'activity' ? timeAgo(i.raw) : i.dateOnly ? fmtDay(i.raw, { month: 'short', day: 'numeric' }) : new Date(i.raw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
      {limit < items.length && (
        <div className="text-center mt-4">
          <Button size="sm" variant="soft" onClick={() => setLimit((l) => l + 20)}>Show {Math.min(20, items.length - limit)} more</Button>
        </div>
      )}
    </div>
  );
};

/* ───────── Small blocks ───────── */
const MiniDonut = ({ title, data }: { title: string; data: { label: string; count: number }[] }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-2xl border border-line p-3 min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted mb-1 truncate">{title}</p>
      {total === 0 ? (
        <p className="text-xs text-muted text-center py-8">Nothing yet</p>
      ) : (
        <>
          <div className="h-[104px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="label" innerRadius={28} outerRadius={46} paddingAngle={3} stroke="none" animationDuration={800}>
                  {data.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-1 space-y-0.5">
            {data.slice(0, 5).map((d, i) => (
              <li key={d.label} className="flex items-center gap-1.5 text-[11px] text-muted min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT[i % DONUT.length] }} />
                <span className="truncate flex-1">{d.label || 'Unspecified'}</span>
                <span className="tabular-nums font-bold text-ink-2">{d.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
  <div className="rounded-xl bg-ink/[0.035] px-3 py-2.5 min-w-0">
    <p className="text-xl font-extrabold tabular-nums leading-tight"><AnimatedNumber value={value} /></p>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted truncate">{label}</p>
    {sub && <p className="text-[10px] text-muted truncate">{sub}</p>}
  </div>
);

const Section = ({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) => (
  <section className="mt-6">
    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink">{title}</h4>
    {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

/* ───────── Drawer ───────── */
const Body = ({ id, lastActive }: { id: string; lastActive: string | null }) => {
  const { data: d, loading, error, reload } = useAsync(() => getAdminUserDetail(id), [id]);
  const timeline = useMemo(() => (d ? buildTimeline(d) : []), [d]);

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (loading || !d) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Skeleton className="w-14 h-14 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-56" /></div></div>
        <div className="flex justify-around"><Skeleton className="w-20 h-20 rounded-full" /><Skeleton className="w-20 h-20 rounded-full" /><Skeleton className="w-20 h-20 rounded-full" /></div>
        <Skeleton className="h-24" /><Skeleton className="h-48" />
      </div>
    );
  }

  // Personal tasks and board cards are both "tasks" to a person, as on the Performance cards; a card is done once archived.
  const doneAll = d.tasks.completed + d.cards.archived;
  const totalAll = d.tasks.total + d.cards.total;
  const taskRate = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : null;
  const t = d.tasks.timeliness, c = d.cards.timeliness;
  const tl = t.early + t.onTime + t.late + c.early + c.onTime + c.late;
  const onTime = tl > 0 ? Math.round(((t.early + t.onTime + c.early + c.onTime) / tl) * 100) : null;
  const comp = d.workLogs.compliance;
  const missed = comp.missedRecentDates;

  return (
    <div>
      <div className="flex items-center gap-3.5">
        <Avatar name={d.user.name || d.user.email} size={56} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-lg font-extrabold tracking-tight truncate">{d.user.name || <span className="italic font-medium text-muted">No name</span>}</p>
            <RoleBadge role={d.user.role} />
          </div>
          <p className="text-sm text-muted truncate">{d.user.email}</p>
          <p className="text-[11px] text-muted mt-0.5">
            Joined {fmtJoined(d.user.createdAt)}{d.user.timezone ? ` · ${d.user.timezone}` : ''} · last active {timeAgo(lastActive ?? d.activity.recent[0]?.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6 rounded-2xl border border-line py-4 px-2">
        <div className="flex flex-col items-center">
          <Ring value={taskRate} size={84} stroke={8} color={rateTone(taskRate)} label="Task completion" />
          <span className="text-[10px] text-muted mt-0.5">{doneAll}/{totalAll} done</span>
        </div>
        <div className="flex flex-col items-center">
          <Ring value={onTime} size={84} stroke={8} color={rateTone(onTime)} label="On-time rate" />
          <span className="text-[10px] text-muted mt-0.5">tasks and cards</span>
        </div>
        <div className="flex flex-col items-center">
          <Ring value={comp.rate} size={84} stroke={8} color={rateTone(comp.rate, 90, 70)} label="Log compliance" />
          <span className="text-[10px] text-muted mt-0.5">{comp.missedDays} missed · last 30 days</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
        <Stat label="Meetings" value={d.meetings.total} />
        <Stat label="Tasks" value={d.tasks.total} sub={`${d.tasks.overdue} overdue`} />
        <Stat label="Board cards" value={d.cards.total} sub={`${d.cards.active} active`} />
        <Stat label="Work logs" value={d.workLogs.total} sub={`${d.workLogs.onLeave} leave · ${d.workLogs.holiday} holiday`} />
        <Stat label="Actions, 7 days" value={d.activity.last7d} />
        <Stat label="Actions, 30 days" value={d.activity.last30d} />
      </div>

      <Section title="Where the time goes">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MiniDonut title="Meetings by type" data={d.meetings.byType} />
          <MiniDonut title="Tasks by status" data={d.tasks.byStatus} />
          <MiniDonut title="Cards by priority" data={d.cards.byPriority} />
        </div>
      </Section>

      <Section title="Missed work-log days" sub="Working days in the last 30 without a log.">
        {missed.length === 0 ? (
          <p className="text-sm text-good font-semibold">No missed days. Beautiful consistency.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {missed.map((day) => (
              <span key={day} className="px-2.5 py-1 rounded-lg bg-bad/10 text-bad text-xs font-bold">{fmtDay(day, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Activity timeline" sub="Meetings, tasks, cards, work logs and app actions in one story.">
        <Timeline items={timeline} />
      </Section>
    </div>
  );
};

export const UserDrill = ({ selection, onClose }: { selection: { id: string; name: string; lastActive: string | null } | null; onClose: () => void }) => {
  const shown = useLast(selection);
  return (
    <PDrawer open={!!selection} onClose={onClose} title={shown?.name || 'Person'}>
      {shown && <Body key={shown.id} id={shown.id} lastActive={shown.lastActive} />}
    </PDrawer>
  );
};
