import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { parseLocalDate } from '../../lib/date';
import { spring } from '../../lib/motion';
import { Box } from './SideCards';
import { dayStatus, isWeekend, loadLogs, mondayIndex, peekLog, useLogStore, wordCount } from './logStore';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const cellClass = (date: string, today: string): { cls: string; label: string } => {
  if (date > today) return { cls: 'border border-dashed border-line text-muted/50', label: 'Upcoming' };
  const log = peekLog(date);
  if (log === undefined) return { cls: 'bg-ink/[0.05] text-muted animate-pulse', label: 'Loading' };
  const s = dayStatus(log);
  if (s === 'leave') return { cls: 'bg-warn/20 text-warn', label: 'On leave' };
  if (s === 'holiday') return { cls: 'bg-good/15 text-good', label: 'Holiday' };
  if (s === 'logged') {
    const w = wordCount(log?.todayWork || '');
    if (w >= 50) return { cls: 'bg-brand text-white', label: 'Logged — detailed' };
    if (w >= 15) return { cls: 'bg-brand/55 text-white', label: 'Logged' };
    return { cls: 'bg-brand/25 text-brand', label: 'Logged — short' };
  }
  if (isWeekend(date)) return { cls: 'bg-ink/[0.03] text-muted/60', label: 'Weekend' };
  if (date === today) return { cls: 'border-2 border-brand/40 text-ink', label: 'Not logged yet' };
  return { cls: 'bg-bad/15 text-bad', label: 'Missed' };
};

export const HeatCalendar = ({ selected, today, onPick, bare }: { selected: string; today: string; onPick: (d: string) => void; bare?: boolean }) => {
  useLogStore();
  const [month, setMonth] = useState(() => selected.slice(0, 7));
  const [dir, setDir] = useState(1);

  // Follow the selected date if it moves to another month.
  useEffect(() => { setMonth(selected.slice(0, 7)); }, [selected]);

  const [y, m] = month.split('-').map(Number);
  const first = `${y}-${pad(m)}-01`;
  const count = new Date(y, m, 0).getDate();
  const days = useMemo(() => Array.from({ length: count }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`), [y, m, count]);
  const lead = mondayIndex(first);

  useEffect(() => {
    let stop = false;
    void loadLogs(days.filter((d) => d <= today && peekLog(d) === undefined), 10, () => stop);
    return () => { stop = true; };
  }, [days, today]);

  const step = (n: number) => {
    setDir(n);
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const atCurrent = month >= today.slice(0, 7);

  const tally = { logged: 0, leave: 0, holiday: 0, missed: 0 };
  days.forEach((d) => {
    if (d > today) return;
    const log = peekLog(d);
    if (log === undefined) return;
    const s = dayStatus(log);
    if (s === 'logged') tally.logged++;
    else if (s === 'leave') tally.leave++;
    else if (s === 'holiday') tally.holiday++;
    else if (!isWeekend(d) && d !== today) tally.missed++;
  });

  return (
    <Box bare={bare} className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-extrabold">{parseLocalDate(first).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <div className="flex gap-1">
          <button onClick={() => step(-1)} aria-label="Previous month" className="w-8 h-8 rounded-lg hover:bg-ink/5 text-muted hover:text-ink">‹</button>
          <button onClick={() => step(1)} disabled={atCurrent} aria-label="Next month" className="w-8 h-8 rounded-lg hover:bg-ink/5 text-muted hover:text-ink disabled:opacity-30 disabled:pointer-events-none">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEK.map((w, i) => <span key={i} className="text-[10px] font-bold text-muted text-center">{w}</span>)}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={month}
          initial={{ opacity: 0, x: dir * 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -16 }} transition={{ duration: 0.18 }}
          className="grid grid-cols-7 gap-1.5"
        >
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {days.map((d, i) => {
            const { cls, label } = cellClass(d, today);
            const active = d === selected;
            const future = d > today;
            return (
              <motion.button
                key={d}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring, delay: i * 0.008 }}
                whileHover={future ? undefined : { scale: 1.12 }}
                disabled={future}
                onClick={() => onPick(d)}
                title={`${parseLocalDate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} — ${label}`}
                aria-label={`${d}, ${label}`}
                className={`aspect-square rounded-lg text-[11px] font-bold tabular-nums grid place-items-center ${cls} ${active ? 'ring-2 ring-ink ring-offset-1' : ''}`}
              >
                {i + 1}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-4 text-[11px] text-muted font-semibold">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded bg-brand" />Logged {tally.logged}</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded bg-warn/40" />Leave {tally.leave}</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded bg-good/30" />Holiday {tally.holiday}</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded bg-bad/30" />Missed {tally.missed}</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded bg-ink/10" />Weekend</span>
      </div>
    </Box>
  );
};
