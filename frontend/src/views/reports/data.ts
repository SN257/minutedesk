import { addDaysToDateString, getLocalDateString, parseLocalDate } from '../../lib/date';
import { dayStatus, isWeekend, peekLog, type DayStatus } from '../worklog/logStore';

/* ───────── ranges ───────── */
export type RangeKey = '7d' | '30d' | '90d' | 'year';
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'year', label: 'This year' },
];
export const LOG_CAP_DAYS = 60;

export interface Bounds { start: string; end: string; days: number }

export const diffDays = (a: string, b: string) => Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86_400_000);

export const boundsFor = (key: RangeKey, today = getLocalDateString()): Bounds => {
  const n = key === '7d' ? 7 : key === '30d' ? 30 : key === '90d' ? 90 : 0;
  const start = n ? addDaysToDateString(today, -(n - 1)) : `${today.slice(0, 4)}-01-01`;
  return { start, end: today, days: diffDays(start, today) + 1 };
};
export const inRange = (d: string | null | undefined, b: Bounds) => !!d && d >= b.start && d <= b.end;

/* ───────── buckets (day / week / month) ───────── */
export interface Bucket { key: string; label: string; from: string; to: string }
export type Grain = 'day' | 'week' | 'month';

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => parseLocalDate(d).toLocaleDateString(undefined, o);

export const makeBuckets = (b: Bounds, grain: Grain): Bucket[] => {
  const out: Bucket[] = [];
  if (grain === 'day') {
    for (let d = b.start; d <= b.end; d = addDaysToDateString(d, 1)) {
      out.push({ key: d, from: d, to: d, label: b.days <= 8 ? fmt(d, { weekday: 'short' }) : fmt(d, { day: 'numeric', month: 'short' }) });
    }
  } else if (grain === 'week') {
    for (let d = b.start; d <= b.end; d = addDaysToDateString(d, 7)) {
      const to = addDaysToDateString(d, 6) > b.end ? b.end : addDaysToDateString(d, 6);
      out.push({ key: d, from: d, to, label: fmt(d, { day: 'numeric', month: 'short' }) });
    }
  } else {
    let [y, m] = b.start.split('-').map(Number);
    for (;;) {
      const first = `${y}-${String(m).padStart(2, '0')}-01`;
      if (first > b.end) break;
      const last = getLocalDateString(new Date(y, m, 0));
      out.push({ key: first.slice(0, 7), from: first < b.start ? b.start : first, to: last > b.end ? b.end : last, label: fmt(first, { month: 'short' }) });
      m++;
      if (m > 12) { m = 1; y++; }
    }
  }
  return out;
};
export const bucketOf = (buckets: Bucket[], d: string) => buckets.findIndex((x) => d >= x.from && d <= x.to);
export const grainFor = (b: Bounds, kind: 'meetings' | 'tasks' | 'log'): Grain => {
  if (kind === 'log') return b.days <= 14 ? 'day' : 'week';
  if (kind === 'meetings') return b.days <= 8 ? 'day' : b.days <= 31 ? 'week' : 'month';
  return b.days <= 31 ? 'day' : b.days <= 91 ? 'week' : 'month';
};
export const grainWord = (g: Grain) => (g === 'day' ? 'day' : g === 'week' ? 'week' : 'month');

/* ───────── generic helpers ───────── */
export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "YYYY-MM-DD" part of a plain date column. */
export const dateOnly = (s?: string | null): string | null => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
/** A timestamp (ISO, UTC) turned into the user's *local* calendar date. */
export const localDay = (ts?: string | Date | null): string | null => {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : getLocalDateString(d);
};

/* ───────── meetings ───────── */
export interface FollowUp { title: string; points: string[] }
export interface MeetingRow {
  id: string; date: string; type: string; center: string; person: string; start: string; end: string;
  followUps: FollowUp[]; notes: number;
}

export const toMeetingRows = (raw: any[]): MeetingRow[] =>
  (Array.isArray(raw) ? raw : [])
    .map((m): MeetingRow | null => {
      const date = dateOnly(m.date);
      if (!date) return null;
      const notes: any[] = Array.isArray(m.notes) ? m.notes : [];
      return {
        id: String(m.id),
        date,
        type: (m.meetingType || 'Meeting').toString().trim() || 'Meeting',
        center: (m.center || '').toString().trim(),
        person: (m.personName || '').toString().trim(),
        start: m.startTime || '',
        end: m.endTime || '',
        notes: notes.length,
        followUps: notes
          .filter((n) => n?.followUp)
          .map((n) => ({
            title: (n.title || '').toString().trim(),
            points: (Array.isArray(n.points) ? n.points : []).map((p: any) => (p?.text || '').toString().trim()).filter(Boolean),
          })),
      };
    })
    .filter((x): x is MeetingRow => !!x)
    .sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));

export const countBy = <T,>(rows: T[], key: (r: T) => string) => {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) || 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

export const meetingStats = (all: MeetingRow[], b: Bounds) => {
  const rows = all.filter((m) => inRange(m.date, b));
  const prevBounds: Bounds = { start: addDaysToDateString(b.start, -b.days), end: addDaysToDateString(b.start, -1), days: b.days };
  const prev = all.filter((m) => inRange(m.date, prevBounds)).length;
  const buckets = makeBuckets(b, grainFor(b, 'meetings'));
  const series = buckets.map((x) => ({ label: x.label, value: 0 }));
  rows.forEach((m) => { const i = bucketOf(buckets, m.date); if (i >= 0) series[i].value++; });
  return {
    rows,
    prev,
    series,
    grain: grainFor(b, 'meetings'),
    byType: countBy(rows, (m) => m.type),
    byCenter: countBy(rows, (m) => m.center || 'No center'),
    followUps: rows.reduce((n, m) => n + m.followUps.length, 0),
  };
};

/* ───────── tasks (personal tasks + board cards, one shape) ───────── */
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low', 'none'];
export type Timing = 'early' | 'onTime' | 'late';
export interface TaskRow {
  id: string; title: string; source: 'Personal' | 'Board'; priority: Priority;
  due: string | null; created: string | null; done: boolean; doneDate: string | null; timing: Timing | null;
}

const prio = (p?: string | null): Priority => {
  const v = (p || '').toLowerCase();
  return v === 'urgent' || v === 'high' || v === 'medium' || v === 'low' ? v : 'none';
};
const timingOf = (due: string | null, doneDate: string | null): Timing | null =>
  !due || !doneDate ? null : doneDate < due ? 'early' : doneDate === due ? 'onTime' : 'late';

export const toTaskRows = (tasks: any[], cards: any[], userId?: string): TaskRow[] => {
  const rows: TaskRow[] = [];
  (Array.isArray(tasks) ? tasks : []).forEach((t) => {
    const done = !!t.completed || t.status === 'done';
    const due = dateOnly(t.dueDate);
    const doneDate = done ? localDay(t.completedAt || t.updatedAt) : null;
    rows.push({ id: `t-${t.id}`, title: t.title || 'Untitled', source: 'Personal', priority: 'none', due, created: localDay(t.createdAt), done, doneDate, timing: timingOf(due, doneDate) });
  });
  const seen = new Set<string>();
  (Array.isArray(cards) ? cards : []).forEach((c) => {
    if (!c?.id || seen.has(c.id)) return;
    seen.add(c.id);
    // Only the cards that are the user's: unassigned ones on their boards, or assigned to them.
    if (c.assignee && userId && String(c.assignee) !== String(userId)) return;
    const done = !!c.archived;
    const due = dateOnly(c.dueDate);
    const doneDate = done ? localDay(c.archivedAt || c.updatedAt) : null;
    rows.push({ id: `c-${c.id}`, title: c.title || 'Untitled', source: 'Board', priority: prio(c.priority), due, created: localDay(c.createdAt), done, doneDate, timing: timingOf(due, doneDate) });
  });
  return rows;
};

export const taskStats = (all: TaskRow[], b: Bounds, today = getLocalDateString()) => {
  // "In scope" = created, due or finished during the period.
  const scope = all.filter((t) => inRange(t.created, b) || inRange(t.due, b) || inRange(t.doneDate, b));
  const done = scope.filter((t) => t.done);
  const timed = done.filter((t) => t.timing);
  const early = timed.filter((t) => t.timing === 'early').length;
  const onTime = timed.filter((t) => t.timing === 'onTime').length;
  const late = timed.filter((t) => t.timing === 'late').length;
  const openNow = all.filter((t) => !t.done);
  const overdue = openNow.filter((t) => t.due && t.due < today);

  const buckets = makeBuckets(b, grainFor(b, 'tasks'));
  const trend = buckets.map((x) => ({
    label: x.label,
    completed: all.filter((t) => t.done && t.doneDate && t.doneDate >= x.from && t.doneDate <= x.to).length,
    // Backlog = created by the end of this bucket and not yet finished by then.
    open: all.filter((t) => (t.created ?? t.doneDate ?? t.due ?? b.start) <= x.to && (!t.done || (t.doneDate ?? '') > x.to)).length,
  }));

  const byPriority = PRIORITIES.map((p) => {
    const inP = scope.filter((t) => t.priority === p);
    return { name: p === 'none' ? 'No priority' : p[0].toUpperCase() + p.slice(1), done: inP.filter((t) => t.done).length, open: inP.filter((t) => !t.done).length };
  }).filter((x) => x.done + x.open > 0);

  return {
    scope, done: done.length, total: scope.length, completionPct: pct(done.length, scope.length),
    early, onTime, late, timed: timed.length, onTimePct: pct(early + onTime, timed.length),
    openNow: openNow.length, overdue: overdue.length, trend, grain: grainFor(b, 'tasks'), byPriority,
  };
};

/* ───────── work log ───────── */
export interface LogDay { date: string; status: DayStatus | 'pending' | 'weekend' | 'unknown' | 'missed'; text: string; plan: string }

export const logWindow = (b: Bounds): Bounds => {
  const start = b.days > LOG_CAP_DAYS ? addDaysToDateString(b.end, -(LOG_CAP_DAYS - 1)) : b.start;
  return { start, end: b.end, days: diffDays(start, b.end) + 1 };
};

/** Reads the shared cache — call after the days have been loaded. */
export const logStats = (b: Bounds, today = getLocalDateString()) => {
  const w = logWindow(b);
  const days: LogDay[] = [];
  for (let d = w.start; d <= w.end; d = addDaysToDateString(d, 1)) {
    const log = peekLog(d);
    const s = dayStatus(log);
    let status: LogDay['status'];
    if (log === undefined) status = 'unknown';
    else if (s !== 'empty') status = s;
    else if (isWeekend(d)) status = 'weekend';
    else status = d === today ? 'pending' : 'missed';
    days.push({ date: d, status, text: log?.todayWork || '', plan: log?.tomorrowWork || '' });
  }
  const count = (s: LogDay['status']) => days.filter((x) => x.status === s).length;
  const logged = count('logged'), missed = count('missed'), leave = count('leave'), holiday = count('holiday');

  // current + longest run of consecutive working days that are logged / off
  let longest = 0, run = 0;
  days.forEach((x) => {
    if (x.status === 'logged') { run++; longest = Math.max(longest, run); }
    else if (x.status === 'missed') run = 0;
  });
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const x = days[i];
    if (x.status === 'logged') current++;
    else if (x.status === 'missed') break;
  }

  const buckets = makeBuckets(w, grainFor(w, 'log'));
  const series = buckets.map((x) => ({ label: x.label, logged: 0, missed: 0, off: 0 }));
  days.forEach((x) => {
    const i = bucketOf(buckets, x.date);
    if (i < 0) return;
    if (x.status === 'logged') series[i].logged++;
    else if (x.status === 'missed') series[i].missed++;
    else if (x.status === 'leave' || x.status === 'holiday') series[i].off++;
  });

  return {
    window: w, capped: b.days > LOG_CAP_DAYS, days, logged, missed, leave, holiday,
    unknown: count('unknown'), compliance: pct(logged, logged + missed), current, longest,
    missedDates: days.filter((x) => x.status === 'missed').map((x) => x.date),
    series, grain: grainFor(w, 'log'),
  };
};

/* ───────── shared context handed to each tab ───────── */
export type MeetingStats = ReturnType<typeof meetingStats>;
export type TaskStats = ReturnType<typeof taskStats>;
export type LogStats = ReturnType<typeof logStats>;
export interface InsightCtx {
  bounds: Bounds;
  ms: MeetingStats;
  ts: TaskStats;
  ls: LogStats;
  logLoading: boolean;
  go: (view: 'worklog' | 'tasks' | 'meetings', param?: string | null) => void;
}
