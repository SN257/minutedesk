import { useCallback, useEffect, useState } from 'react';
import { addDaysToDateString, getLocalDateString, parseLocalDate } from '../lib/date';
import { getAssignedToMeCardsApi, getScheduledMeetings, getTasks, isYesterdayWorkLogMissing } from '../lib/api';

export interface Needs { overdue: number; dueToday: number; meetingsToday: number; logMissing: number; doneWeek: number; totalWeek: number }
const EMPTY: Needs = { overdue: 0, dueToday: 0, meetingsToday: 0, logMissing: 0, doneWeek: 0, totalWeek: 0 };

const day = (s?: string | null) => (s ? String(s).slice(0, 10) : '');
const localDay = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : getLocalDateString(d);
};
const arr = (x: unknown): any[] => (Array.isArray(x) ? x : []);

/** The few numbers the side panel needs; refreshed every couple of minutes and whenever the tab regains focus. */
export const useNeeds = () => {
  const [needs, setNeeds] = useState<Needs>(EMPTY);

  const load = useCallback(async () => {
    const today = getLocalDateString();
    const dow = (parseLocalDate(today).getDay() + 6) % 7;
    const weekStart = addDaysToDateString(today, -dow);
    const weekEnd = addDaysToDateString(weekStart, 6);
    const [t, c, m, l] = await Promise.allSettled([getTasks(), getAssignedToMeCardsApi(), getScheduledMeetings(today, today), isYesterdayWorkLogMissing()]);
    const tasks = t.status === 'fulfilled' ? arr(t.value) : [];
    const cards = c.status === 'fulfilled' ? arr(c.value) : [];
    const openTasks = tasks.filter((x) => !x.completed && x.status !== 'done' && day(x.dueDate));
    const openCards = cards.filter((x) => !x.archived && day(x.dueDate));
    const open = [...openTasks, ...openCards];
    const doneWeek = [
      ...tasks.filter((x) => x.completed && localDay(x.completedAt) >= weekStart && localDay(x.completedAt) <= weekEnd),
      ...cards.filter((x) => x.archived && localDay(x.archivedAt) >= weekStart && localDay(x.archivedAt) <= weekEnd),
    ].length;
    const openWeek = open.filter((x) => day(x.dueDate) <= weekEnd).length;
    setNeeds({
      overdue: open.filter((x) => day(x.dueDate) < today).length,
      dueToday: open.filter((x) => day(x.dueDate) === today).length,
      meetingsToday: m.status === 'fulfilled' ? arr(m.value).filter((x) => day(x.date) === today).length : 0,
      logMissing: l.status === 'fulfilled' && l.value?.missing ? 1 : 0,
      doneWeek, totalWeek: doneWeek + openWeek,
    });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 120000);
    const f = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', f);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', f); };
  }, [load]);

  return { needs, reload: load };
};
