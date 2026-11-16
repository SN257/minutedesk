import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../lib/siteConfig';
import { AnimatePresence, motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { Button, Card, Empty, Skeleton, useAsync } from '../../ui';
import { getAllCardsApi, getAssignedToMeCardsApi, getMeetings, getTasks } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { addDaysToDateString, formatLocalDate, getLocalDateString } from '../../lib/date';
import { useToast } from '../../lib/toast';
import { loadLogs, useLogStore, peekLog } from '../worklog/logStore';
import { downloadCsv } from './csv';
import { boundsFor, logStats, logWindow, meetingStats, RANGES, taskStats, toMeetingRows, toTaskRows, type InsightCtx, type RangeKey } from './data';
import { Bento } from './Bento';
import { FilterMenu } from '../../ui/filter';

const Loading = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}</div>
    <Skeleton className="h-44" />
  </div>
);

const Insights = ({ go }: ViewProps) => {
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [range, setRange] = useState<RangeKey>('30d');
  const logVersion = useLogStore();
  const [logsDone, setLogsDone] = useState(false);

  const today = getLocalDateString();
  const bounds = useMemo(() => boundsFor(range, today), [range, today]);

  /* meetings, tasks and cards — loaded once */
  const src = useAsync(async () => {
    const [m, t, a, b] = await Promise.all([
      getMeetings().catch(() => null),
      getTasks().catch(() => null),
      getAllCardsApi().catch(() => null),
      getAssignedToMeCardsApi().catch(() => null),
    ]);
    if (m === null && t === null && a === null && b === null) throw new Error("We couldn't reach your data. Check your connection and try again.");
    const cards = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
    return {
      meetings: toMeetingRows(m ?? []),
      tasks: toTaskRows(t ?? [], cards, user?.id),
      partial: [m === null && 'meetings', t === null && 'tasks', a === null && b === null && 'board cards'].filter(Boolean) as string[],
    };
  }, [user?.id]);

  /* work logs — up to 60 days, 10 requests at a time, shared cache with the Work Log page */
  const win = useMemo(() => logWindow(bounds), [bounds]);
  useEffect(() => {
    let stop = false;
    setLogsDone(false);
    const dates: string[] = [];
    for (let d = win.end; d >= win.start; d = addDaysToDateString(d, -1)) dates.push(d);
    void loadLogs(dates, 10, () => stop).then(() => !stop && setLogsDone(true));
    return () => { stop = true; };
  }, [win]);

  const logLoaded = useMemo(() => {
    void logVersion;
    let n = 0;
    for (let d = win.start; d <= win.end; d = addDaysToDateString(d, 1)) if (peekLog(d) !== undefined) n++;
    return n;
  }, [win, logVersion]);
  const logLoading = !logsDone && logLoaded < win.days;

  const ctx: InsightCtx | null = useMemo(() => {
    if (!src.data) return null;
    void logVersion;
    return {
      bounds,
      ms: meetingStats(src.data.meetings, bounds),
      ts: taskStats(src.data.tasks, bounds, today),
      ls: logStats(bounds, today),
      logLoading,
      go,
    };
  }, [src.data, bounds, today, logVersion, logLoading, go]);

  const exportCsv = () => {
    if (!ctx || !src.data) return;
    const { ms, ts, ls } = ctx;
    const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
    downloadCsv(`insights_${range}_${today}.csv`, [
      ['Period', `${bounds.start} to ${bounds.end}`],
      [],
      ['SUMMARY'],
      ['Metric', 'Value'],
      ['Tasks in period', ts.total], ['Tasks completed', ts.done], ['Task completion %', ts.completionPct],
      ['Finished early', ts.early], ['Finished on the due day', ts.onTime], ['Finished late', ts.late], ['On-time % (estimate)', ts.onTimePct],
      ['Open tasks now', ts.openNow], ['Overdue now', ts.overdue],
      ['Meetings', ms.rows.length], ['Meetings in the period before', ms.prev], ['Follow-ups flagged', ms.followUps],
      ['Work log window', `${ls.window.start} to ${ls.window.end}`], ['Days logged', ls.logged], ['Missed weekdays', ls.missed],
      ['Leave days', ls.leave], ['Holidays', ls.holiday], ['Log compliance %', ls.compliance], ['Current streak', ls.current], ['Longest streak', ls.longest],
      [],
      ['MEETINGS'],
      ['Date', 'Type', 'Center', 'Person', 'Start', 'End', 'Notes', 'Follow-ups'],
      ...ms.rows.map((m) => [m.date, m.type, m.center, m.person, m.start, m.end, m.notes, m.followUps.map((f) => [f.title, ...f.points].filter(Boolean).join(' / ')).join(' | ')]),
      [],
      ['TASKS'],
      ['Title', 'Source', 'Priority', 'Created', 'Due', 'Status', 'Completed on', 'Timing (estimate)'],
      ...ts.scope.map((t) => [t.title, t.source, t.priority, t.created, t.due, t.done ? 'Done' : 'Open', t.doneDate, t.timing === 'onTime' ? 'On the day' : t.timing === 'early' ? 'Early' : t.timing === 'late' ? 'Late' : '']),
      [],
      ['WORK LOG'],
      ['Date', 'Status', 'What I did', 'Planned next'],
      ...ls.days.map((d) => [d.date, d.status === 'unknown' ? 'Not loaded' : cap(d.status), d.text, d.plan]),
    ]);
    toast('CSV downloaded');
  };

  return (
    <div>
      {/* Heading + period */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-3 sm:mb-5">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-brand">{t('insights.eyebrow')}</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">{t('insights.title')}</h1>
          <p className="text-muted mt-1.5">{formatLocalDate(bounds.start, { day: 'numeric', month: 'short' })} – {formatLocalDate(bounds.end, { day: 'numeric', month: 'short', year: 'numeric' })}, just for you.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu size="sm" title="Filter insights" groups={[
            { id: 'range', kind: 'single', label: 'Period', value: range, defaultValue: '30d', onChange: (v) => setRange(v as RangeKey), options: RANGES.map((r) => ({ value: r.key, label: r.label })) },
          ]} />
          <Button variant="soft" onClick={exportCsv} disabled={!ctx} className="!rounded-full">Export CSV</Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {logLoading && (
          <motion.div key="prog" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mb-4">
              <p className="text-xs text-muted mb-1.5">Reading your work logs… {logLoaded} of {win.days} days</p>
              <div className="h-1 rounded-full bg-ink/[0.06] overflow-hidden"><motion.div className="h-full bg-brand rounded-full" animate={{ width: `${(logLoaded / Math.max(1, win.days)) * 100}%` }} /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {src.data && src.data.partial.length > 0 && (
        <p className="text-xs text-warn bg-warn/10 rounded-xl px-3 py-2 mb-4">We couldn't load your {src.data.partial.join(' and ')}, so those numbers may look empty.</p>
      )}

      {src.loading && !src.data ? (
        <Loading />
      ) : src.error && !src.data ? (
        <Card><Empty icon="📡" title="Insights are taking a break" hint={src.error} action={<Button onClick={src.reload}>Try again</Button>} /></Card>
      ) : ctx ? (
        <Bento {...ctx} />
      ) : null}
    </div>
  );
};

export default Insights;
