import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatLocalDate, getLocalDateString, parseLocalDate } from '../lib/date';

/* A single-date calendar that opens from a button. Used where a native date input would not open on click. */

export type DayMark = 'logged' | 'leave' | 'holiday' | null;

const monthEnd = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
const shiftMonth = (ym: string, by: number) => {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const DOT: Record<Exclude<DayMark, null>, string> = { logged: 'bg-good', leave: 'bg-brand', holiday: 'bg-warn' };

export const DatePickerButton = ({ value, onChange, min, max, children, className = '', mark, onMonth, label = 'Pick a date' }: {
  value: string; onChange: (d: string) => void; min?: string; max?: string; children: ReactNode; className?: string;
  /** A small dot under a day, for example "this day has a log". */
  mark?: (d: string) => DayMark;
  /** Called with "YYYY-MM" whenever a month comes into view, so the page can load what it needs for the dots. */
  onMonth?: (ym: string) => void;
  label?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(value.slice(0, 7));
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const today = getLocalDateString();
  const W = 304;

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(r.right - W, window.innerWidth - W - 12)) });
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => { if (open) onMonth?.(view); }, [open, view]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { const t = e.target as Node; if (!panel.current?.contains(t) && !btn.current?.contains(t)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const scroll = (e: Event) => { if (!panel.current?.contains(e.target as Node)) place(); }; // follow the button; never close on a stray scroll
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('resize', place); window.removeEventListener('scroll', scroll, true); };
  }, [open, place]);

  const toggle = () => { if (!open) setView(value.slice(0, 7)); setOpen((o) => !o); };
  const pick = (d: string) => { onChange(d); setOpen(false); };

  const first = `${view}-01`;
  const lead = (parseLocalDate(first).getDay() + 6) % 7; // weeks start on Monday
  const count = monthEnd(view);
  const disabled = (d: string) => (!!max && d > max) || (!!min && d < min);
  const canPrev = !min || shiftMonth(view, -1) >= min.slice(0, 7);
  const canNext = !max || shiftMonth(view, 1) <= max.slice(0, 7);
  const host = typeof document !== 'undefined' ? (document.querySelector('[data-app-root]') ?? document.body) : null;

  const body = (
    <AnimatePresence>
      {open && pos && (
        <motion.div ref={panel} role="dialog" aria-label={label} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: W }}
          className="z-[180] rounded-2xl glass-pop text-ink p-3.5">
          <div className="flex items-center justify-between mb-2">
            <button type="button" disabled={!canPrev} onClick={() => setView(shiftMonth(view, -1))} aria-label="Previous month" className="w-8 h-8 rounded-full hover:bg-ink/10 grid place-items-center text-lg leading-none disabled:opacity-30 disabled:hover:bg-transparent">‹</button>
            <p className="text-sm font-bold">{formatLocalDate(first, { month: 'long', year: 'numeric' })}</p>
            <button type="button" disabled={!canNext} onClick={() => setView(shiftMonth(view, 1))} aria-label="Next month" className="w-8 h-8 rounded-full hover:bg-ink/10 grid place-items-center text-lg leading-none disabled:opacity-30 disabled:hover:bg-transparent">›</button>
          </div>
          <div className="grid grid-cols-7 text-center gap-y-0.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} className="text-[10px] font-bold text-muted pb-1">{w}</span>)}
            {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: count }, (_, i) => {
              const d = `${view}-${String(i + 1).padStart(2, '0')}`;
              const off = disabled(d);
              const on = d === value;
              const m = mark?.(d) ?? null;
              return (
                <button key={d} type="button" disabled={off} onClick={() => pick(d)} aria-pressed={on} aria-label={formatLocalDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  className={`relative h-9 w-9 mx-auto rounded-full text-[13px] tabular-nums transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${on ? 'bg-ink text-white font-semibold' : d === today ? 'ring-1 ring-ink/40 font-semibold hover:bg-ink/10' : 'hover:bg-ink/10 disabled:hover:bg-transparent'}`}>
                  {i + 1}
                  {m && <span aria-hidden className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${on ? 'bg-white' : DOT[m]}`} />}
                </button>
              );
            })}
          </div>
          {mark && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-good" />Logged</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand" />Leave</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warn" />Holiday</span>
            </div>
          )}
          <div className="mt-3 pt-2.5 border-t border-ink/10 flex items-center justify-between">
            <button type="button" disabled={disabled(today)} onClick={() => pick(today)} className="text-[12.5px] font-semibold text-ink hover:underline disabled:opacity-40 disabled:no-underline">Today</button>
            <button type="button" onClick={() => setOpen(false)} className="text-[12.5px] font-semibold text-muted hover:text-ink">Close</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-label={label} aria-expanded={open} aria-haspopup="dialog" className={className}>{children}</button>
      {host && createPortal(body, host)}
    </>
  );
};
