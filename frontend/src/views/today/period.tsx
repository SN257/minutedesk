import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../../shell/icons';
import { addDaysToDateString, formatLocalDate, getLocalDateString, parseLocalDate } from '../../lib/date';

/* The dashboard's date range: every card and chart covers the stretch of time chosen here. */

export type PeriodKey = 'today' | 'yesterday' | 'week' | 'lastweek' | '7d' | 'month' | 'lastmonth' | '30d' | '90d' | 'year' | 'all' | 'custom';
export interface PeriodState { key: PeriodKey; from?: string; to?: string }
export interface Period { key: PeriodKey; from: string; to: string; label: string }

/** The shortcuts down the side of the picker. */
const SHORTCUTS: { key: Exclude<PeriodKey, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This week' },
  { key: 'lastweek', label: 'Last week' },
  { key: '7d', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

const STORE = 'md2.dash.period';
const DEFAULT: PeriodState = { key: 'week' };

/** The chosen range is remembered on this device. */
export const usePeriod = () => {
  const [state, setState] = useState<PeriodState>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (v && (v.key === 'custom' || SHORTCUTS.some((o) => o.key === v.key))) return v as PeriodState;
    } catch { /* storage unavailable */ }
    return DEFAULT;
  });
  const set = (s: PeriodState) => {
    setState(s);
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage unavailable */ }
  };
  return [state, set] as const;
};

const daysBetween = (a: string, b: string) => Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86400000);
const monthStart = (d: string) => `${d.slice(0, 7)}-01`;
const monthEnd = (d: string) => { const x = parseLocalDate(d); return getLocalDateString(new Date(x.getFullYear(), x.getMonth() + 1, 0)); };
const addMonths = (ym: string, by: number) => { const x = parseLocalDate(`${ym}-01`); return getLocalDateString(new Date(x.getFullYear(), x.getMonth() + by, 1)).slice(0, 7); };
const short = (d: string) => formatLocalDate(d, { month: 'short', day: 'numeric' });

/** Turns the chosen option into real dates. `earliest` is the first day that has any data, used for "All time". */
export const resolvePeriod = (s: PeriodState, today: string, earliest: string | null): Period => {
  const monday = (d: string) => addDaysToDateString(d, -((parseLocalDate(d).getDay() + 6) % 7));
  switch (s.key) {
    case 'today': return { key: 'today', from: today, to: today, label: 'Today' };
    case 'yesterday': { const y = addDaysToDateString(today, -1); return { key: 'yesterday', from: y, to: y, label: 'Yesterday' }; }
    case 'week': { const from = monday(today); return { key: 'week', from, to: addDaysToDateString(from, 6), label: 'This week' }; }
    case 'lastweek': { const from = addDaysToDateString(monday(today), -7); return { key: 'lastweek', from, to: addDaysToDateString(from, 6), label: 'Last week' }; }
    case '7d': return { key: '7d', from: addDaysToDateString(today, -6), to: today, label: 'Last 7 days' };
    case '30d': return { key: '30d', from: addDaysToDateString(today, -29), to: today, label: 'Last 30 days' };
    case '90d': return { key: '90d', from: addDaysToDateString(today, -89), to: today, label: 'Last 90 days' };
    case 'month': return { key: 'month', from: monthStart(today), to: monthEnd(today), label: formatLocalDate(today, { month: 'long', year: 'numeric' }) };
    case 'lastmonth': {
      const prev = `${addMonths(today.slice(0, 7), -1)}-01`;
      return { key: 'lastmonth', from: prev, to: monthEnd(prev), label: formatLocalDate(prev, { month: 'long', year: 'numeric' }) };
    }
    case 'year': return { key: 'year', from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31`, label: today.slice(0, 4) };
    case 'all': return { key: 'all', from: earliest && earliest < today ? earliest : addDaysToDateString(today, -89), to: today, label: 'All time' };
    default: {
      let from = s.from || addDaysToDateString(today, -29);
      let to = s.to || today;
      if (from > to) [from, to] = [to, from];
      if (daysBetween(from, to) > 3650) from = addDaysToDateString(to, -3650);
      return { key: 'custom', from, to, label: from === to ? formatLocalDate(from, { month: 'short', day: 'numeric', year: 'numeric' }) : `${short(from)} – ${short(to)}${from.slice(0, 4) !== to.slice(0, 4) ? `, ${to.slice(0, 4)}` : ''}` };
    }
  }
};

/** True on screens wide enough for two months side by side. */
const useWide = () => {
  const q = '(min-width: 700px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setWide(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return wide;
};

/* ───────── one month of the calendar ───────── */
const Month = ({ ym, lo, hi, today, onPick, onHover }: { ym: string; lo: string | null; hi: string | null; today: string; onPick: (d: string) => void; onHover: (d: string | null) => void }) => {
  const first = `${ym}-01`;
  const lead = (parseLocalDate(first).getDay() + 6) % 7; // weeks start on Monday
  const count = parseLocalDate(monthEnd(first)).getDate();
  return (
    <div className="min-w-[15.5rem] flex-1">
      <p className="text-center text-[13.5px] font-semibold mb-2">{formatLocalDate(first, { month: 'long', year: 'numeric' })}</p>
      <div className="grid grid-cols-7 text-center" onMouseLeave={() => onHover(null)}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} className="text-[10px] font-bold text-char/45 pb-1.5">{w}</span>)}
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const d = `${ym}-${String(i + 1).padStart(2, '0')}`;
          const dow = (lead + i) % 7;
          const inR = lo !== null && hi !== null && d >= lo && d <= hi;
          const isLo = d === lo, isHi = d === hi;
          const end = isLo || isHi;
          return (
            <span key={d} className={`relative h-9 grid place-items-center ${inR ? 'bg-char/[0.08]' : ''} ${isLo || (inR && (dow === 0 || i === 0)) ? 'rounded-l-full' : ''} ${isHi || (inR && (dow === 6 || i === count - 1)) ? 'rounded-r-full' : ''}`}>
              <button type="button" onClick={() => onPick(d)} onMouseEnter={() => onHover(d)} aria-label={formatLocalDate(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} aria-pressed={end}
                className={`w-8 h-8 rounded-full text-[12.5px] tabular-nums transition-colors ${end ? 'bg-char text-white font-semibold' : d === today ? 'ring-1 ring-char/40 font-semibold hover:bg-char/10' : 'hover:bg-char/10'}`}>{i + 1}</button>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** One calendar-icon button, the same size as the other heading actions. It opens the date-range picker: shortcuts on the left, two months side by side on the right. */
export const DateRangeButton = ({ state, onChange, period }: { state: PeriodState; onChange: (s: PeriodState) => void; period: Period }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const wide = useWide();
  const today = getLocalDateString();
  const active = state.key !== DEFAULT.key;

  // The first month shown: the one before the end of the range, so the end is always visible.
  const [view, setView] = useState(() => addMonths((period.to < today ? period.to : today).slice(0, 7), -1));
  const [anchor, setAnchor] = useState<string | null>(null); // the first click of a new range
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const openIt = () => {
    if (!open) { setView(addMonths((period.to < today ? period.to : today).slice(0, 7), wide ? -1 : 0)); setAnchor(null); setHover(null); }
    setOpen((o) => !o);
  };

  const pickDay = (d: string) => {
    if (!anchor) { setAnchor(d); return; }
    const [from, to] = d < anchor ? [d, anchor] : [anchor, d];
    onChange({ key: 'custom', from, to });
    setAnchor(null); setHover(null); setOpen(false);
  };

  // What is highlighted: the range being drawn, or the range in use.
  const [lo, hi] = useMemo<[string | null, string | null]>(() => {
    if (anchor) { const e = hover ?? anchor; return e < anchor ? [e, anchor] : [anchor, e]; }
    return [period.from, period.to];
  }, [anchor, hover, period.from, period.to]);

  const months = wide ? [view, addMonths(view, 1)] : [view];
  const shortcutOn = (k: string) => !anchor && state.key === k;

  return (
    <div ref={box} className="relative">
      <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={openIt} aria-label="Choose a date range" aria-expanded={open} aria-haspopup="dialog" title={`Showing: ${period.label}`}
        className={`relative rounded-xl h-9 w-9 grid place-items-center border transition-colors ${open || active ? 'bg-char text-white border-char' : 'bg-white/80 border-char/10 text-char hover:bg-white'}`}>
        {Icon.meetings(17)}
        {active && !open && <span aria-hidden className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-good ring-2 ring-white" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Date range" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
            className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-max max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white border border-char/10 shadow-[0_24px_50px_-20px_rgba(6,20,27,0.45)] overflow-hidden">
            <div className={wide ? 'flex' : 'block'}>
              {/* shortcuts */}
              <div className={wide ? 'w-[10.5rem] shrink-0 border-r border-char/10 p-2 max-h-[27rem] overflow-y-auto' : 'p-2 border-b border-char/10 flex gap-1.5 overflow-x-auto [scrollbar-width:none]'} role="radiogroup" aria-label="Shortcuts">
                {SHORTCUTS.map((o) => (
                  <button key={o.key} type="button" role="radio" aria-checked={shortcutOn(o.key)} onClick={() => { onChange({ key: o.key }); setAnchor(null); setOpen(false); }}
                    className={`${wide ? 'w-full text-left' : 'shrink-0'} rounded-lg px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors ${shortcutOn(o.key) ? 'bg-char text-white font-medium' : 'text-char/75 hover:bg-char/[0.07]'}`}>{o.label}</button>
                ))}
              </div>

              {/* calendar */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <button type="button" onClick={() => setView(addMonths(view, -1))} aria-label="Previous month" className="w-8 h-8 rounded-full hover:bg-char/10 grid place-items-center text-lg leading-none">‹</button>
                  <span className="text-[11.5px] text-char/55">{anchor ? 'Now pick the last day' : 'Pick the first day, then the last'}</span>
                  <button type="button" onClick={() => setView(addMonths(view, 1))} aria-label="Next month" className="w-8 h-8 rounded-full hover:bg-char/10 grid place-items-center text-lg leading-none">›</button>
                </div>
                <div className="flex gap-5">
                  {months.map((ym) => <Month key={ym} ym={ym} lo={lo} hi={hi} today={today} onPick={pickDay} onHover={setHover} />)}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-char/10 pt-3">
                  <span className="text-[12px] text-char/55 truncate">Showing: <b className="font-semibold text-char/80">{period.label}</b></span>
                  <button type="button" disabled={!active && !anchor} onClick={() => { onChange(DEFAULT); setAnchor(null); setOpen(false); }} className="shrink-0 text-[12px] font-semibold text-char/70 hover:text-char disabled:opacity-40 disabled:cursor-not-allowed">Reset</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
