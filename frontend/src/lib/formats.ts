/* Regional display choices from Settings. Plain module state so non-React helpers (date and time formatters) can read them. */
export interface Regional { timeFormat?: '12h' | '24h'; dateFormat?: 'dmy' | 'mdy' | 'ymd'; weekStart?: 0 | 1 }

let current: Regional = {};
export const setRegional = (r: Regional) => { current = r; };
export const getRegional = () => current;

/** The locale that gives the chosen date order, or undefined to follow the browser. */
export const dateLocale = (): string | undefined => (current.dateFormat ? ({ dmy: 'en-GB', mdy: 'en-US', ymd: 'en-CA' } as const)[current.dateFormat] : undefined);

/** "15:30" → "3:30 PM" when the 12-hour clock is chosen. */
export const formatClock = (t?: string | null): string => {
  const s = (t || '').slice(0, 5);
  if (current.timeFormat !== '12h' || !/^\d{1,2}:\d{2}$/.test(s)) return s;
  const [h, m] = s.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
