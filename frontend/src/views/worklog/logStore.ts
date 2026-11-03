import { useSyncExternalStore } from 'react';
import { getWorkLogApi, saveWorkLogApi } from '../../lib/api';
import { addDaysToDateString, getLocalDateString, parseLocalDate } from '../../lib/date';

/**
 * A tiny shared cache for daily work logs. Used by the Work Log view (date strip,
 * heat calendar, streak) and by Insights (compliance / charts), so a day is only
 * ever fetched once per few minutes.
 */

export interface WorkLogEntry {
  date: string;
  todayWork: string;
  tomorrowWork: string;
  todayOnLeave: boolean;
  todayHoliday: boolean;
  tomorrowOnLeave: boolean;
  tomorrowHoliday: boolean;
}
export type DayStatus = 'logged' | 'leave' | 'holiday' | 'empty';

const TTL = 5 * 60_000;
const cache = new Map<string, { at: number; log: WorkLogEntry | null }>();
const inflight = new Map<string, Promise<WorkLogEntry | null | undefined>>();
const saving = new Map<string, Promise<unknown>>();

/* ── change notification (batched so 60 quick fetches don't cause 60 renders) ── */
const listeners = new Set<() => void>();
let version = 0;
let timer: number | undefined;
const bump = () => {
  if (timer !== undefined) return;
  timer = window.setTimeout(() => {
    timer = undefined;
    version++;
    listeners.forEach((l) => l());
  }, 40);
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Re-renders the calling component whenever the cache changes. */
export const useLogStore = () => useSyncExternalStore(subscribe, () => version);

const normalize = (date: string, r: any): WorkLogEntry | null => {
  if (!r || typeof r !== 'object') return null;
  const has = r.date || r.id || r.todayWork || r.tomorrowWork || r.todayOnLeave || r.todayHoliday || r.tomorrowOnLeave || r.tomorrowHoliday;
  if (!has) return null;
  return {
    date,
    todayWork: r.todayWork || '',
    tomorrowWork: r.tomorrowWork || '',
    todayOnLeave: !!r.todayOnLeave,
    todayHoliday: !!r.todayHoliday,
    tomorrowOnLeave: !!r.tomorrowOnLeave,
    tomorrowHoliday: !!r.tomorrowHoliday,
  };
};

/** undefined = not fetched yet, null = fetched and nothing written that day. */
export const peekLog = (date: string): WorkLogEntry | null | undefined => cache.get(date)?.log;

/** Resolves to the entry, null (no log), or undefined when the request failed. Never throws. */
export const fetchLog = async (date: string, force = false): Promise<WorkLogEntry | null | undefined> => {
  const hit = cache.get(date);
  if (!force && hit && Date.now() - hit.at < TTL) return hit.log;
  const running = inflight.get(date);
  if (running && !force) return running;
  const p = (async () => {
    const pendingSave = saving.get(date);
    if (pendingSave) await pendingSave.catch(() => {});
    try {
      const log = normalize(date, await getWorkLogApi(date));
      cache.set(date, { at: Date.now(), log });
      bump();
      return log;
    } catch {
      return undefined;
    } finally {
      inflight.delete(date);
    }
  })();
  inflight.set(date, p);
  return p;
};

/** Fetch many days with limited concurrency. */
export const loadLogs = async (dates: string[], concurrency = 10, stop?: () => boolean) => {
  let i = 0;
  const worker = async () => {
    while (i < dates.length) {
      if (stop?.()) return;
      await fetchLog(dates[i++]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, dates.length) }, worker));
};

export const saveLog = (date: string, form: Omit<WorkLogEntry, 'date'>) => {
  const p = saveWorkLogApi({ date, ...form }).then(() => {
    cache.set(date, { at: Date.now(), log: normalize(date, { date, ...form }) });
    bump();
  });
  saving.set(date, p);
  const clear = () => { if (saving.get(date) === p) saving.delete(date); };
  p.then(clear, clear);
  return p;
};

/* ── day helpers ── */
export const isWeekend = (date: string) => {
  const d = parseLocalDate(date).getDay();
  return d === 0 || d === 6;
};

export const dayStatus = (log: WorkLogEntry | null | undefined): DayStatus => {
  if (!log) return 'empty';
  if (log.todayOnLeave) return 'leave';
  if (log.todayHoliday) return 'holiday';
  if ((log.todayWork || '').trim() || (log.tomorrowWork || '').trim()) return 'logged';
  return 'empty';
};

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Mon-first weekday index (0 = Monday). */
export const mondayIndex = (date: string) => (parseLocalDate(date).getDay() + 6) % 7;

export const lastDays = (n: number, end = getLocalDateString()) => Array.from({ length: n }, (_, i) => addDaysToDateString(end, -i));

export const STREAK_WINDOW = 60;

/** Consecutive working days logged (leave/holiday keep the streak alive; weekends are skipped). */
export const computeStreak = (today = getLocalDateString()) => {
  let count = 0;
  let unknown = false;
  let capped = true;
  for (let i = 0; i < STREAK_WINDOW; i++) {
    const d = addDaysToDateString(today, -i);
    if (isWeekend(d)) continue;
    const log = peekLog(d);
    if (log === undefined) { unknown = true; capped = false; break; }
    const s = dayStatus(log);
    if (s === 'logged') count++;
    else if (s === 'empty' && d !== today) { capped = false; break; }
  }
  return { count, capped, unknown };
};

/** Monday of the week containing `date`. */
export const weekStart = (date: string = getLocalDateString()) => addDaysToDateString(date, -mondayIndex(date));
