import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber, Card } from '../../ui';
import { addDaysToDateString, parseLocalDate } from '../../lib/date';
import { spring } from '../../lib/motion';
import { computeStreak, dayStatus, isWeekend, peekLog, STREAK_WINDOW, useLogStore, weekStart } from './logStore';

/** A panel on its own, or a section inside the combined panel (`bare`). */
export const Box = ({ bare, className = '', children }: { bare?: boolean; className?: string; children: ReactNode }) =>
  bare ? <div className={className}>{children}</div> : <Card className={className}>{children}</Card>;

export const StreakCard = ({ today, bare }: { today: string; bare?: boolean }) => {
  useLogStore();
  const { count, capped, unknown } = computeStreak(today);
  const loggedToday = dayStatus(peekLog(today)) !== 'empty';
  return (
    <Box bare={bare} className="p-5 relative overflow-hidden">
      <span aria-hidden className="absolute -right-10 -top-12 w-36 h-36 rounded-full bg-good/10" />
      <p className="relative text-[11px] font-extrabold text-muted uppercase tracking-wider">Streak</p>
      <div className="relative flex items-end gap-3 mt-2">
        <span className="text-6xl font-black tracking-tight tabular-nums leading-none">{unknown && count === 0 ? '–' : <AnimatedNumber value={count} />}{capped && count > 0 ? '+' : ''}</span>
        <span className="pb-1.5 text-sm font-bold text-ink-2 leading-tight">working {count === 1 ? 'day' : 'days'}<br />in a row</span>
      </div>
      <p className="relative text-sm text-muted mt-3">
        {unknown && count === 0 ? 'Counting…' : count === 0 ? 'A fresh start: log today and the streak begins.' : loggedToday ? 'Today is in the bag. See you tomorrow.' : `Log today to make it ${count + 1}.`}
      </p>
      {capped && count > 0 && <p className="relative text-[11px] text-muted/80 mt-1">We look back {STREAK_WINDOW} days.</p>}
    </Box>
  );
};

export const WeekCard = ({ today, onPick, bare }: { today: string; onPick: (d: string) => void; bare?: boolean }) => {
  useLogStore();
  const start = weekStart(today);
  const days = Array.from({ length: 5 }, (_, i) => addDaysToDateString(start, i));
  const done = days.filter((d) => d <= today && dayStatus(peekLog(d)) !== 'empty').length;
  const pct = (done / 5) * 100;
  return (
    <Box bare={bare} className="p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-extrabold text-muted uppercase tracking-wider">This week</p>
        <p className="text-sm font-bold tabular-nums">{done} <span className="text-muted font-semibold">of 5 days</span></p>
      </div>
      <div className="h-2 rounded-full bg-ink/[0.06] mt-3 overflow-hidden">
        <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ ...spring, stiffness: 120 }} />
      </div>
      <div className="grid grid-cols-5 gap-2 mt-4">
        {days.map((d) => {
          const log = peekLog(d);
          const s = dayStatus(log);
          const future = d > today;
          const missed = !future && log !== undefined && s === 'empty' && d !== today && !isWeekend(d);
          const cls = future ? 'border border-dashed border-line text-muted/50' : s === 'logged' ? 'bg-good text-white' : s === 'leave' ? 'bg-warn/20 text-warn' : s === 'holiday' ? 'bg-brand-soft text-brand' : missed ? 'bg-bad/15 text-bad' : 'border-2 border-brand/40 text-ink';
          return (
            <button key={d} disabled={future} onClick={() => onPick(d)} className="flex flex-col items-center gap-1.5 disabled:pointer-events-none">
              <span className="text-[10px] font-bold text-muted uppercase">{parseLocalDate(d).toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <motion.span whileHover={{ scale: 1.1 }} className={`w-9 h-9 rounded-full grid place-items-center text-xs font-extrabold ${cls}`}>
                {s === 'logged' ? '✓' : s === 'leave' ? 'L' : s === 'holiday' ? 'H' : parseLocalDate(d).getDate()}
              </motion.span>
            </button>
          );
        })}
      </div>
    </Box>
  );
};
