import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { addDaysToDateString, formatLocalDate, getLocalDateString, parseLocalDate } from '../../lib/date';
import {
  getAssignedToMeCardsApi, getMeetings, getScheduledMeetings, getTasks, getWorkLogApi,
  updateCardApi, updateTask,
} from '../../lib/api';
import { groupIn } from '../../landing/bits';
import { useAsync } from '../../ui';
import { type Evt, type Item } from './parts';
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
const namesOf = (m: any): string[] => {
  const raw = Array.isArray(m.attendance) ? m.attendance : String(m.attendance || '').split(/[,;\n]/);
  const all = [m.presentSantName, ...raw].map((n) => String(n || '').trim()).filter(Boolean);
  return [...new Set(all)];
};
const toEvt = (m: any, logged: boolean): Evt => ({
  key: `${logged ? 'l' : 's'}-${m.id}`, id: String(m.id), logged, date: day(m.date),
  start: String(m.startTime || '').slice(0, 5), end: String(m.endTime || '').slice(0, 5),
  title: m.meetingType || 'Meeting', sub: m.place || m.center || '', names: namesOf(m),
});
const byTime = (a: Evt, b: Evt) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);

/* ───────── view ───────── */
const Today = ({ go }: ViewProps) => {
  const { user } = useAuth();
  const toast = useToast();

  const today = getLocalDateString();
  const dow = (parseLocalDate(today).getDay() + 6) % 7; // Monday = 0
  const weekStart = addDaysToDateString(today, -dow);
  const weekEnd = addDaysToDateString(weekStart, 6);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToDateString(weekStart, i)), [weekStart]);
  const lastSeven = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToDateString(today, i - 6)), [today]);

  const tasksQ = useAsync(() => getTasks().then(arr), []);
  const cardsQ = useAsync(() => getAssignedToMeCardsApi().then(arr), []);
  const meetingsQ = useAsync(() => getMeetings().then(arr), []);
  const schedQ = useAsync(() => getScheduledMeetings(weekStart, weekEnd).then(arr), [weekStart]);
  const rangeFrom = addDaysToDateString(today, -35);
  const rangeTo = addDaysToDateString(today, 60);
  const rangeQ = useAsync(() => getScheduledMeetings(rangeFrom, rangeTo).then(arr), [rangeFrom]);
  const logsQ = useAsync(
    () => Promise.all(lastSeven.map((d) => getWorkLogApi(d).then((l) => ({ d, l })).catch(() => ({ d, l: null as any })))),
    [today],
  );

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

  const stats = useMemo(() => {
    const tasks = tasksQ.data || [];
    const cards = cardsQ.data || [];
    const doneWeek = weekDays.reduce((n, d) => n + (doneByDay[d] || 0), 0);
    const open = Math.max(0, [
      ...tasks.filter((t) => !t.completed && t.status !== 'done' && day(t.dueDate) && day(t.dueDate) <= weekEnd),
      ...cards.filter((c) => !c.archived && day(c.dueDate) && day(c.dueDate) <= weekEnd),
    ].length - justDone.size);
    const total = doneWeek + open;
    return { doneWeek, open, pct: total ? Math.round((doneWeek / total) * 100) : null };
  }, [tasksQ.data, cardsQ.data, doneByDay, weekDays, weekEnd, justDone]);

  /* work log */
  const logStats = useMemo(() => {
    const entries = logsQ.data || [];
    const has = (e: { l: any }) => !!(e.l && ((e.l.todayWork || '').trim() || e.l.todayOnLeave || e.l.todayHoliday));
    const logged = new Set(entries.filter(has).map((e) => e.d));
    let streak = 0;
    let i = lastSeven.length - 1;
    if (!logged.has(lastSeven[i])) i--; // today still has time
    for (; i >= 0 && logged.has(lastSeven[i]); i--) streak++;
    const elapsed = Math.max(1, weekDays.filter((d) => d <= today && isWeekday(d)).length);
    const workLogged = Math.min(elapsed, weekDays.filter((d) => d <= today && isWeekday(d) && logged.has(d)).length);
    const weekLogged = weekDays.filter((d) => d <= today && logged.has(d)).length;
    const missed = lastSeven.filter((d) => d < today && isWeekday(d) && !logged.has(d));
    const series = lastSeven.map((d) => (logged.has(d) ? 1 : 0));
    return {
      series, streak, weekLogged, workLogged, elapsed, missed,
      pct: Math.round((workLogged / elapsed) * 100),
      todayLogged: logged.has(today),
    };
  }, [logsQ.data, lastSeven, weekDays, today]);

  /* meetings */
  const loggedMeetings = useMemo(
    () => (meetingsQ.data || []).filter((m) => day(m.date) >= weekStart && day(m.date) <= weekEnd),
    [meetingsQ.data, weekStart, weekEnd],
  );
  const plannedWeek = useMemo(
    () => (schedQ.data || []).filter((m) => day(m.date) >= weekStart && day(m.date) <= weekEnd),
    [schedQ.data, weekStart, weekEnd],
  );
  const events: Evt[] = useMemo(
    () => [...loggedMeetings.map((m) => toEvt(m, true)), ...plannedWeek.map((m) => toEvt(m, false))].sort(byTime),
    [loggedMeetings, plannedWeek],
  );

  const meetingStats = useMemo(() => {
    const logged = loggedMeetings.length;
    const planned = plannedWeek.length;
    return { logged, planned, total: logged + planned, pct: logged + planned ? Math.round((logged / (logged + planned)) * 100) : null };
  }, [loggedMeetings, plannedWeek]);

  /* header numbers */
  const first = (user?.name || user?.email || '').split(/[ @]/)[0];
  const itemsLoading = tasksQ.loading && cardsQ.loading;
  const meetingsLoading = meetingsQ.loading && schedQ.loading;
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

  const last14 = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysToDateString(today, i - 13)), [today]);
  const last30 = useMemo(() => Array.from({ length: 30 }, (_, i) => addDaysToDateString(today, i - 29)), [today]);
  const weeks4 = useMemo(() => Array.from({ length: 4 }, (_, i) => addDaysToDateString(weekStart, (i - 3) * 7)), [weekStart]);
  const weekRows = weeks4.map((ws, i) => {
    const days = Array.from({ length: 7 }, (_, k) => addDaysToDateString(ws, k));
    return { label: i === 3 ? 'This wk' : formatLocalDate(ws, { month: 'short', day: 'numeric' }), segs: [days.reduce((n, d) => n + meetingsOn(d), 0), days.reduce((n, d) => n + (doneByDay[d] || 0), 0)] };
  });

  const [donutTab, setDonutTab] = useState('Week');
  const monthPrefix = today.slice(0, 7);
  const donutParts = donutTab === 'Week'
    ? [{ label: 'Logged', v: meetingStats.logged, color: 'var(--color-brand)' }, { label: 'Planned', v: meetingStats.planned, color: 'var(--color-warn)' }]
    : [
      { label: 'Logged', v: Object.entries(loggedByDay).filter(([d]) => d.startsWith(monthPrefix)).reduce((n, [, v]) => n + v, 0), color: 'var(--color-brand)' },
      { label: 'Planned', v: Object.entries(plannedByDay).filter(([d]) => d.startsWith(monthPrefix)).reduce((n, [, v]) => n + v, 0), color: 'var(--color-warn)' },
    ];

  const openNotOverdue = Math.max(0, stats.open - overdueCount);
  const range14 = `${formatLocalDate(last14[0], { month: 'short', day: 'numeric' })} – ${formatLocalDate(today, { month: 'short', day: 'numeric' })}`;
  const listRows = items.map((a) => ({
    key: a.key, title: a.title, done: a.done, late: a.late, tag: a.done ? 'Done' : a.late ? `Overdue · ${formatLocalDate(a.due, { month: 'short', day: 'numeric' })}` : 'Today',
    onToggle: () => complete(a),
  }));

  return (
    <motion.div variants={groupIn} initial="hidden" animate="show" className="flex flex-col gap-3 big:h-full big:overflow-hidden big:px-1.5 big:pt-1.5 pb-0 big:pb-0">
      <Heading
        title={`${greeting}${first ? `, ${first}` : ''}`} sub={`${prettyToday} · ${tagline}`}
        onMeeting={() => go('meetings', 'new')} onTask={() => go('tasks')}
      />

      {/* On large, tall screens this widget grid fills the screen (no scrolling). Elsewhere it stacks. */}
      <div className="grid grid-cols-1 big:grid-cols-12 gap-3 big:flex-1 big:min-h-0">
        {/* left block: 9 columns x 3 rows */}
        <div className="big:col-span-9 min-h-0 grid grid-cols-1 md:grid-cols-2 big:grid-cols-9 big:grid-rows-3 gap-3 [&>*]:min-w-0 [&>*]:min-h-[13rem] big:[&>*]:min-h-0">
          <div className="big:col-span-3"><StatCard up={stats.doneWeek} upLabel="Tasks finished this week" down={stats.open} downLabel="Still open to finish this week" range="This week" loading={itemsLoading} /></div>
          <div className="big:col-span-3"><CalendarWidget meetingDays={meetingDays} taskDays={taskDays} onOpen={() => go('meetings')} /></div>
          <div className="big:col-span-3"><BarsWidget loading={itemsLoading && meetingsLoading} rows={[
            { label: 'Tasks finished', pct: stats.pct, color: 'var(--color-good)', hint: 'No tasks' },
            { label: 'Meetings logged', pct: meetingStats.pct, color: 'var(--color-brand)', hint: 'No meetings' },
            { label: 'Work log this week', pct: logStats.pct, color: 'var(--color-warn)', hint: 'No data' },
          ]} /></div>

          <div className="md:col-span-2 big:col-span-6"><LineWidget labels={last14.map((d) => formatLocalDate(d, { month: 'short', day: 'numeric' }))} a={last14.map(meetingsOn)} b={last14.map((d) => doneByDay[d] || 0)} aLabel="Meetings" bLabel="Tasks finished" range={range14} loading={itemsLoading && meetingsLoading} /></div>
          <div className="md:col-span-2 big:col-span-3"><RadialWidget pct={stats.pct} title="Week progress" sub={stats.pct === null ? 'Nothing due this week yet' : `${stats.doneWeek} finished · ${stats.open} still open`} cta="Review tasks" onCta={() => go('tasks')} loading={itemsLoading} /></div>

          <div className="md:col-span-2 big:col-span-4"><StackedWidget loading={meetingsLoading} rows={weekRows} legend={[{ label: 'Meetings', color: 'var(--color-brand)' }, { label: 'Tasks finished', color: 'var(--color-good)' }]} /></div>
          <div className="md:col-span-2 big:col-span-5"><GroupedWidget loading={meetingsLoading && itemsLoading} days={weekDays.map((d) => formatLocalDate(d, { weekday: 'short' }))}
            series={[weekDays.map((d) => events.filter((e) => e.date === d && e.logged).length), weekDays.map((d) => events.filter((e) => e.date === d && !e.logged).length), weekDays.map((d) => doneByDay[d] || 0)]}
            legend={[{ label: 'Held', color: 'var(--color-brand)' }, { label: 'Planned', color: 'var(--color-muted)' }, { label: 'Tasks finished', color: 'var(--color-good)' }]} /></div>
        </div>

        {/* right column */}
        <div className="big:col-span-3 min-h-0 grid grid-cols-1 md:grid-cols-2 big:flex big:flex-col gap-3 [&>*]:min-w-0 [&>*]:min-h-[11rem] big:[&>*]:min-h-0">
          <div className="big:flex-[1.15]"><ListWidget title="Action items" sub="Due today and overdue" empty="You're all caught up. Nothing is due today." rows={listRows} onAll={() => go('tasks')} /></div>
          <div className="big:flex-[1.15]"><WavesWidget loading={itemsLoading && meetingsLoading} a={last30.map(meetingsOn)} b={last30.map((d) => doneByDay[d] || 0)} aLabel="Meetings per day" bLabel="Tasks finished per day" /></div>
          <div className="md:col-span-2 big:flex-none"><SegmentWidget title="Task status" loading={itemsLoading} parts={[{ label: 'Finished', v: stats.doneWeek, color: 'var(--color-good)' }, { label: 'Open', v: openNotOverdue, color: 'var(--color-brand)' }, { label: 'Overdue', v: overdueCount, color: 'var(--color-bad)' }]} /></div>
          <div className="md:col-span-2 big:flex-[1.3]"><DonutWidget title="Meetings" tabs={['Week', 'Month']} active={donutTab} onTab={setDonutTab} parts={donutParts} centerLabel="meetings" loading={meetingsLoading} /></div>
        </div>
      </div>
    </motion.div>
  );
};

export default Today;
