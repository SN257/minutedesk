import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { addDaysToDateString, formatLocalDate, getLocalDateString, parseLocalDate } from '../../lib/date';
import {
  getAssignedToMeCardsApi, getMeetings, getScheduledMeetings, getTasks, getWorkLogRange,
  updateCardApi, updateTask,
} from '../../lib/api';
import { DateRangeButton, resolvePeriod, usePeriod } from './period';
import { groupIn } from '../../landing/bits';
import { useAsync } from '../../ui';
import { type Item } from './parts';
import {
  BarsWidget, CalendarWidget, DonutWidget, GroupedWidget, Heading, LineWidget, ListWidget, RadialWidget,
  SegmentWidget, StackedWidget, StatCard, WavesWidget,
} from './widgets';

/* ───────── helpers ───────── */
const day = (s?: string | null) => (s ? String(s).slice(0, 10) : '');
const localDay = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : getLocalDateString(d);
};
const arr = (x: unknown): any[] => (Array.isArray(x) ? x : []);
const isWeekday = (d: string) => { const g = parseLocalDate(d).getDay(); return g >= 1 && g <= 5; };
const daysIn = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 4000; d = addDaysToDateString(d, 1)) out.push(d);
  return out;
};
type Gran = 'day' | 'week' | 'month';
interface Bucket { start: string; end: string; label: string }
const mondayOf = (d: string) => addDaysToDateString(d, -((parseLocalDate(d).getDay() + 6) % 7));
/** Splits a period into days, weeks or months, whichever keeps the charts readable. */
const makeBuckets = (from: string, to: string, force?: 'week'): { gran: Gran; list: Bucket[] } => {
  const span = daysIn(from, to).length;
  const gran: Gran = force ?? (span <= 45 ? 'day' : span <= 210 ? 'week' : 'month');
  const list: Bucket[] = [];
  if (gran === 'day') {
    daysIn(from, to).forEach((d) => list.push({ start: d, end: d, label: formatLocalDate(d, { month: 'short', day: 'numeric' }) }));
  } else if (gran === 'week') {
    for (let ws = mondayOf(from); ws <= to && list.length < 80; ws = addDaysToDateString(ws, 7)) {
      const start = ws < from ? from : ws;
      const end = addDaysToDateString(ws, 6) > to ? to : addDaysToDateString(ws, 6);
      list.push({ start, end, label: formatLocalDate(start, { month: 'short', day: 'numeric' }) });
    }
  } else {
    for (let ms = `${from.slice(0, 7)}-01`; ms <= to && list.length < 120; ) {
      const d = parseLocalDate(ms);
      const last = getLocalDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      list.push({ start: ms < from ? from : ms, end: last > to ? to : last, label: formatLocalDate(ms, { month: 'short', year: '2-digit' }) });
      ms = getLocalDateString(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  }
  return { gran, list };
};

/* ───────── view ───────── */
const Today = ({ go }: ViewProps) => {
  const { user } = useAuth();
  const toast = useToast();

  const today = getLocalDateString();
  const [pState, setPState] = usePeriod();

  const tasksQ = useAsync(() => getTasks().then(arr), []);
  const cardsQ = useAsync(() => getAssignedToMeCardsApi().then(arr), []);
  const meetingsQ = useAsync(() => getMeetings().then(arr), []);

  // "All time" starts on the first day that has anything in it.
  const earliest = useMemo(() => {
    const ds = [
      ...(tasksQ.data || []).flatMap((t) => [localDay((t as any).createdAt), day(t.dueDate), localDay((t as any).completedAt)]),
      ...(cardsQ.data || []).flatMap((c) => [localDay(c.createdAt), day(c.dueDate), localDay(c.archivedAt)]),
      ...(meetingsQ.data || []).map((m) => day(m.date)),
    ].filter(Boolean).sort();
    return ds[0] ?? null;
  }, [tasksQ.data, cardsQ.data, meetingsQ.data]);
  const period = useMemo(() => resolvePeriod(pState, today, earliest), [pState, today, earliest]);
  const { from, to } = period;
  const inPeriod = (d: string) => !!d && d >= from && d <= to;
  const periodDays = useMemo(() => daysIn(from, to), [from, to]);

  // Planned meetings: the period itself, plus a little either side so the calendar always has its dots.
  const fetchFrom = from < addDaysToDateString(today, -35) ? from : addDaysToDateString(today, -35);
  const fetchTo = to > addDaysToDateString(today, 60) ? to : addDaysToDateString(today, 60);
  const rangeQ = useAsync(() => getScheduledMeetings(fetchFrom, fetchTo).then(arr), [fetchFrom, fetchTo]);
  const logTo = to < today ? to : today;
  const logsQ = useAsync(() => (from > today ? Promise.resolve([]) : getWorkLogRange(from, logTo)), [from, logTo]);

  const [justDone, setJustDone] = useState<Set<string>>(new Set());

  /* action items: open (overdue + due today) and those already finished today */
  const items: Item[] = useMemo(() => {
    const open = [
      ...(tasksQ.data || [])
        .filter((x) => !x.completed && x.status !== 'done' && day(x.dueDate) && day(x.dueDate) <= today)
        .map((x) => ({ key: `t-${x.id}`, kind: 'task' as const, id: x.id, title: x.title, due: day(x.dueDate) })),
      ...(cardsQ.data || [])
        .filter((x) => !x.archived && day(x.dueDate) && day(x.dueDate) <= today)
        .map((x) => ({ key: `c-${x.id}`, kind: 'card' as const, id: x.id, title: x.title, due: day(x.dueDate) })),
    ].sort((a, b) => a.due.localeCompare(b.due)).map((a) => ({ ...a, done: justDone.has(a.key), late: a.due < today }));
    const finished = [
      ...(tasksQ.data || [])
        .filter((x) => x.completed && day(x.dueDate) && day(x.dueDate) <= today && localDay((x as any).completedAt) === today)
        .map((x) => ({ key: `t-${x.id}`, kind: 'task' as const, id: x.id, title: x.title, due: day(x.dueDate) })),
      ...(cardsQ.data || [])
        .filter((x) => x.archived && day(x.dueDate) && day(x.dueDate) <= today && localDay(x.archivedAt) === today)
        .map((x) => ({ key: `c-${x.id}`, kind: 'card' as const, id: x.id, title: x.title, due: day(x.dueDate) })),
    ].map((a) => ({ ...a, done: true, late: a.due < today }));
    return [...open, ...finished];
  }, [tasksQ.data, cardsQ.data, today, justDone]);

  const complete = async (a: Item) => {
    setJustDone((s) => new Set(s).add(a.key));
    try {
      if (a.kind === 'task') await updateTask(a.id, { completed: true, status: 'done' });
      else await updateCardApi(a.id, { archived: true });
      toast(`Nice. "${a.title}" is done.`);
    } catch {
      setJustDone((s) => { const n = new Set(s); n.delete(a.key); return n; });
      toast("Couldn't update that one. Please try again.", 'error');
    }
  };

  /* tasks / cards finished per weekday + week totals */
  const doneByDay = useMemo(() => {
    const m: Record<string, number> = {};
    const stamps = [
      ...(tasksQ.data || []).filter((t) => t.completed).map((t) => localDay((t as any).completedAt)),
      ...(cardsQ.data || []).filter((c) => c.archived).map((c) => localDay(c.archivedAt)),
    ].filter(Boolean);
    stamps.forEach((d) => { m[d] = (m[d] || 0) + 1; });
    m[today] = (m[today] || 0) + justDone.size;
    return m;
  }, [tasksQ.data, cardsQ.data, justDone, today]);

  const dueLimit = period.key === 'all' ? '9999-12-31' : to;
  const stats = useMemo(() => {
    const tasks = tasksQ.data || [];
    const cards = cardsQ.data || [];
    const doneIn = periodDays.reduce((n, d) => n + (doneByDay[d] || 0), 0);
    // Still open: not finished yet, and due by the end of the period (for "All time", every open item).
    const openList = [
      ...tasks.filter((t) => !t.completed && t.status !== 'done' && (period.key === 'all' || (day(t.dueDate) && day(t.dueDate) <= dueLimit))),
      ...cards.filter((c) => !c.archived && (period.key === 'all' || (day(c.dueDate) && day(c.dueDate) <= dueLimit))),
    ];
    const justNow = items.filter((i) => justDone.has(i.key) && i.due <= dueLimit).length;
    const open = Math.max(0, openList.length - justNow);
    const total = doneIn + open;
    return { done: doneIn, open, pct: total ? Math.round((doneIn / total) * 100) : null };
  }, [tasksQ.data, cardsQ.data, doneByDay, periodDays, dueLimit, period.key, justDone, items]);

  /* work log: how many of the working days so far in this period have an entry */
  const logStats = useMemo(() => {
    const logged = new Set((logsQ.data || []).filter((e) => e.written || e.leave || e.holiday).map((e) => e.date));
    const workDays = from > today ? [] : daysIn(from, logTo).filter(isWeekday);
    const done = workDays.filter((d) => logged.has(d)).length;
    return { pct: workDays.length ? Math.round((done / workDays.length) * 100) : null };
  }, [logsQ.data, from, logTo, today]);

  /* meetings in the period */
  const loggedMeetings = useMemo(() => (meetingsQ.data || []).filter((m) => inPeriod(day(m.date))), [meetingsQ.data, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const plannedMeetings = useMemo(() => (rangeQ.data || []).filter((m) => inPeriod(day(m.date))), [rangeQ.data, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const meetingStats = useMemo(() => {
    const logged = loggedMeetings.length;
    const planned = plannedMeetings.length;
    return { logged, planned, total: logged + planned, pct: logged + planned ? Math.round((logged / (logged + planned)) * 100) : null };
  }, [loggedMeetings, plannedMeetings]);

  /* header numbers */
  const first = (user?.name || user?.email || '').split(/[ @]/)[0];
  const itemsLoading = tasksQ.loading && cardsQ.loading;
  const meetingsLoading = meetingsQ.loading && rangeQ.loading;
  const overdueCount = items.filter((i) => !i.done && i.late).length;
  const openCount = items.filter((i) => !i.done).length;
  const tagline = itemsLoading
    ? 'Getting your day ready…'
    : overdueCount > 0
      ? `${overdueCount} thing${overdueCount > 1 ? 's are' : ' is'} running late. Start with the smallest one.`
      : openCount > 0
        ? `${openCount} thing${openCount > 1 ? 's' : ''} due today. You've got this.`
        : 'Nothing urgent today. A good day to get ahead.';
  const prettyToday = formatLocalDate(today, { weekday: 'long', month: 'long', day: 'numeric' });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  /* ───── widget data ───── */
  const loggedByDay = useMemo(() => {
    const m: Record<string, number> = {};
    (meetingsQ.data || []).forEach((x) => { const d = day(x.date); if (d) m[d] = (m[d] || 0) + 1; });
    return m;
  }, [meetingsQ.data]);
  const plannedByDay = useMemo(() => {
    const m: Record<string, number> = {};
    (rangeQ.data || []).forEach((x) => { const d = day(x.date); if (d) m[d] = (m[d] || 0) + 1; });
    return m;
  }, [rangeQ.data]);
  const meetingsOn = (d: string) => (loggedByDay[d] || 0) + (plannedByDay[d] || 0);

  const meetingDays = useMemo(() => new Set([...Object.keys(loggedByDay), ...Object.keys(plannedByDay)]), [loggedByDay, plannedByDay]);
  const taskDays = useMemo(() => new Set([
    ...(tasksQ.data || []).filter((t) => !t.completed && t.status !== 'done').map((t) => day(t.dueDate)),
    ...(cardsQ.data || []).filter((c) => !c.archived).map((c) => day(c.dueDate)),
  ].filter(Boolean)), [tasksQ.data, cardsQ.data]);

  // Charts: the period is cut into days, weeks or months so a long stretch stays readable.
  const buckets = useMemo(() => makeBuckets(from, to), [from, to]);
  const sumOver = (b: Bucket, fn: (d: string) => number) => daysIn(b.start, b.end).reduce((n, d) => n + fn(d), 0);
  const trendMeetings = buckets.list.map((b) => sumOver(b, meetingsOn));
  const trendDone = buckets.list.map((b) => sumOver(b, (d) => doneByDay[d] || 0));
  const running = (xs: number[]) => xs.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
  const stackBuckets = useMemo(() => (buckets.gran === 'day' ? makeBuckets(from, to, 'week').list : buckets.list).slice(-6), [buckets, from, to]);
  const stackRows = stackBuckets.map((b) => ({ label: b.label, segs: [sumOver(b, meetingsOn), sumOver(b, (d) => doneByDay[d] || 0)] }));
  const stackUnit = buckets.gran === 'month' ? 'month' : 'week';

  // By weekday, added up over the whole period.
  const byWeekday = useMemo(() => {
    const held = Array(7).fill(0), planned = Array(7).fill(0), done = Array(7).fill(0);
    periodDays.forEach((d) => {
      const i = (parseLocalDate(d).getDay() + 6) % 7;
      held[i] += loggedByDay[d] || 0; planned[i] += plannedByDay[d] || 0; done[i] += doneByDay[d] || 0;
    });
    return { held, planned, done };
  }, [periodDays, loggedByDay, plannedByDay, doneByDay]);

  const openNotOverdue = Math.max(0, stats.open - overdueCount);
  const stillOpenLabel = period.key === 'all' ? 'Still open' : period.key === 'week' ? 'Still open to finish this week' : `Still open, due by ${formatLocalDate(to, { month: 'short', day: 'numeric' })}`;
  const listRows = items.map((a) => ({
    key: a.key, title: a.title, done: a.done, late: a.late, tag: a.done ? 'Done' : a.late ? `Overdue · ${formatLocalDate(a.due, { month: 'short', day: 'numeric' })}` : 'Today',
    onToggle: () => complete(a),
  }));

  return (
    <motion.div variants={groupIn} initial="hidden" animate="show" className="flex flex-col gap-3 big:h-full big:overflow-hidden big:px-1.5 big:pt-1.5 pb-0 big:pb-0">
      <Heading
        title={`${greeting}${first ? `, ${first}` : ''}`} sub={`${prettyToday} · ${tagline}`}
        onMeeting={() => go('meetings', 'new')} onTask={() => go('tasks')}
        filter={<DateRangeButton state={pState} onChange={setPState} period={period} />}
      />

      {/* On large, tall screens this widget grid fills the screen (no scrolling). Elsewhere it stacks. */}
      <div className="grid grid-cols-1 big:grid-cols-12 gap-3 big:flex-1 big:min-h-0">
        {/* left block: 9 columns x 3 rows */}
        <div className="big:col-span-9 min-h-0 grid grid-cols-1 md:grid-cols-2 big:grid-cols-9 big:grid-rows-3 gap-3 [&>*]:min-w-0 [&>*]:min-h-[13rem] big:[&>*]:min-h-0">
          <div className="big:col-span-3"><StatCard title="Pulse" up={stats.done} upLabel="Tasks finished" down={stats.open} downLabel={stillOpenLabel} range={period.label} loading={itemsLoading} /></div>
          <div className="big:col-span-3"><CalendarWidget meetingDays={meetingDays} taskDays={taskDays} onOpen={() => go('meetings')} /></div>
          <div className="big:col-span-3"><BarsWidget loading={itemsLoading && meetingsLoading} rows={[
            { label: 'Tasks finished', pct: stats.pct, color: 'var(--color-good)', hint: 'No tasks' },
            { label: 'Meetings logged', pct: meetingStats.pct, color: 'var(--color-brand)', hint: 'No meetings' },
            { label: 'Work log days', pct: logStats.pct, color: 'var(--color-warn)', hint: 'No data' },
          ]} /></div>

          <div className="md:col-span-2 big:col-span-6"><LineWidget labels={buckets.list.map((b) => b.label)} a={trendMeetings} b={trendDone} aLabel="Meetings" bLabel="Tasks finished" range={period.label} loading={itemsLoading && meetingsLoading} /></div>
          <div className="md:col-span-2 big:col-span-3"><RadialWidget pct={stats.pct} title="Progress" sub={stats.pct === null ? 'Nothing due in this period' : `${stats.done} finished · ${stats.open} still open`} cta="Review tasks" onCta={() => go('tasks')} loading={itemsLoading} /></div>

          <div className="md:col-span-2 big:col-span-4"><StackedWidget loading={meetingsLoading} title={`By ${stackUnit}`} sub={`Meetings and finished tasks per ${stackUnit}`} rows={stackRows} legend={[{ label: 'Meetings', color: 'var(--color-brand)' }, { label: 'Tasks finished', color: 'var(--color-good)' }]} /></div>
          <div className="md:col-span-2 big:col-span-5"><GroupedWidget loading={meetingsLoading && itemsLoading} title="By day of the week" sub="Held, planned and finished, added up over the period" days={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            series={[byWeekday.held, byWeekday.planned, byWeekday.done]}
            legend={[{ label: 'Held', color: 'var(--color-brand)' }, { label: 'Planned', color: 'var(--color-muted)' }, { label: 'Tasks finished', color: 'var(--color-good)' }]} /></div>
        </div>

        {/* right column */}
        <div className="big:col-span-3 min-h-0 grid grid-cols-1 md:grid-cols-2 big:flex big:flex-col gap-3 [&>*]:min-w-0 [&>*]:min-h-[11rem] big:[&>*]:min-h-0">
          <div className="big:flex-[1.15]"><ListWidget title="Action items" sub="Due today and overdue" empty="You're all caught up. Nothing is due today." rows={listRows} onAll={() => go('tasks')} /></div>
          <div className="big:flex-[1.15]"><WavesWidget loading={itemsLoading && meetingsLoading} title="Running total" sub={period.label} a={running(trendMeetings)} b={running(trendDone)} aLabel="Meetings so far" bLabel="Tasks finished so far" /></div>
          <div className="md:col-span-2 big:flex-none"><SegmentWidget title="Task status" loading={itemsLoading} parts={[{ label: 'Finished', v: stats.done, color: 'var(--color-good)' }, { label: 'Open', v: openNotOverdue, color: 'var(--color-brand)' }, { label: 'Overdue', v: overdueCount, color: 'var(--color-bad)' }]} /></div>
          <div className="md:col-span-2 big:flex-[1.3]"><DonutWidget title="Meetings" range={period.label} parts={[{ label: 'Logged', v: meetingStats.logged, color: 'var(--color-brand)' }, { label: 'Planned', v: meetingStats.planned, color: 'var(--color-warn)' }]} centerLabel="meetings" loading={meetingsLoading} /></div>
        </div>
      </div>
    </motion.div>
  );
};

export default Today;
