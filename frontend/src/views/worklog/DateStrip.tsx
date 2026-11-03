import { useEffect, useMemo, useRef } from 'react';
import { addDaysToDateString, formatLocalDate, parseLocalDate } from '../../lib/date';
import { dayStatus, isWeekend, peekLog, useLogStore } from './logStore';

/** One day as a round chip. The ring colour says how the day went; the filled chip is the one you are writing. */
const ringFor = (status: ReturnType<typeof dayStatus>, loaded: boolean, past: boolean, weekend: boolean) => {
  if (!loaded) return 'border-line/70 border-dashed animate-pulse';
  if (status === 'logged') return 'border-good bg-good/15';
  if (status === 'leave') return 'border-warn bg-warn/15';
  if (status === 'holiday') return 'border-brand bg-brand-soft';
  if (past && !weekend) return 'border-bad/60 bg-bad/10';
  return 'border-line border-dashed';
};

/** A swipeable ribbon of the last two weeks (or back to the picked day), one round chip per day. */
export const DateStrip = ({ selected, today, onSelect }: { selected: string; today: string; onSelect: (d: string) => void }) => {
  useLogStore();
  const scroller = useRef<HTMLDivElement>(null);
  const days = useMemo(() => {
    const first = selected < addDaysToDateString(today, -20) ? selected : addDaysToDateString(today, -20);
    const out: string[] = [];
    for (let d = first; d <= today; d = addDaysToDateString(d, 1)) out.push(d);
    return out;
  }, [selected, today]);

  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>(`[data-day="${selected}"]`);
    if (box && el) box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [selected]);

  const nudge = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });

  return (
    <div className="liquid rounded-[2rem] px-2 sm:px-3 py-3 flex items-center gap-1.5">
      <button type="button" onClick={() => nudge(-1)} aria-label="Earlier days" className="hidden sm:grid w-9 h-9 shrink-0 rounded-full text-muted hover:text-ink hover:bg-ink/[0.07] place-items-center">‹</button>
      <div ref={scroller} className="flex-1 min-w-0 flex gap-1 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
        {days.map((d) => {
          const active = d === selected;
          const log = peekLog(d);
          const date = parseLocalDate(d);
          const loaded = log !== undefined;
          const weekend = isWeekend(d);
          return (
            <button
              key={d}
              type="button"
              data-day={d}
              onClick={() => onSelect(d)}
              aria-pressed={active}
              aria-label={formatLocalDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}
              className={`snap-center shrink-0 w-[54px] flex flex-col items-center gap-1.5 rounded-2xl py-1.5 transition-colors ${active ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.04]'} ${weekend && !active ? 'opacity-60' : ''}`}
            >
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${d === today ? 'text-brand' : 'text-muted'}`}>{d === today ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className={`w-10 h-10 rounded-full border-2 grid place-items-center text-sm font-extrabold tabular-nums transition-colors ${active ? 'bg-ink text-white border-ink' : `${ringFor(dayStatus(log), loaded, d < today, weekend)} text-ink`}`}>
                {date.getDate()}
              </span>
              <span className="text-[10px] font-semibold text-muted">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => nudge(1)} aria-label="Later days" className="hidden sm:grid w-9 h-9 shrink-0 rounded-full text-muted hover:text-ink hover:bg-ink/[0.07] place-items-center">›</button>
    </div>
  );
};
