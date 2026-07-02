// Shared helpers for working with dates in the *user's local timezone* rather
// than UTC or the server's timezone. Native Date methods like getFullYear()/
// getMonth()/getDate() already operate in the browser's local timezone, so we
// lean on those instead of toISOString() (which is always UTC).

export const getUserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** Local calendar date (YYYY-MM-DD) for `date` (defaults to now). */
export const getLocalDateString = (date: Date = new Date()): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Parses a plain "YYYY-MM-DD" string as a local-midnight Date instead of the
 * UTC-midnight that `new Date(dateStr)` produces. Use this whenever a bare
 * calendar-date string (dueDate, meeting date, workLogDate, etc.) needs to be
 * turned into a Date for display or comparison.
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDaysToDateString = (dateStr: string, days: number): string => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
};

export const formatLocalDate = (
  dateStr: string,
  options?: Intl.DateTimeFormatOptions,
): string => parseLocalDate(dateStr).toLocaleDateString(undefined, options);
