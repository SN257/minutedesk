export const DEFAULT_TIMEZONE = 'UTC';

export function resolveTimezone(timeZone?: string | null): string {
  return timeZone && timeZone.trim() ? timeZone : DEFAULT_TIMEZONE;
}

/** Calendar date (YYYY-MM-DD) that `date` falls on inside `timeZone`. */
export function getZonedDateString(date: Date, timeZone?: string | null): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimezone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Wall-clock hour/minute that `date` falls on inside `timeZone`. */
export function getZonedHourMinute(date: Date, timeZone?: string | null): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimezone(timeZone),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return { hour: Number(map.hour), minute: Number(map.minute) };
}

/** Pure calendar-date arithmetic on a YYYY-MM-DD string, no timezone involved. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Converts a wall-clock date + time (as entered by a user in `timeZone`) into the
 * real UTC instant it refers to. Needed because plain "date" + "HH:mm" columns
 * carry no timezone info of their own.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone?: string | null): Date {
  const tz = resolveTimezone(timeZone);
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const asUTC = Date.UTC(year, month - 1, day, hour, minute || 0, 0);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(asUTC));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asZoned = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  const offset = asZoned - asUTC;
  return new Date(asUTC - offset);
}
