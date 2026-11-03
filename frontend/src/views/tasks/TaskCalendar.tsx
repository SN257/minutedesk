import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getLocalDateString, parseLocalDate } from '../../lib/date';
import { spring } from '../../lib/motion';
import { Card } from '../../ui';
import type { Item } from './model';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Month view: tasks sit on their due date. Click a task to open it, or "+" on a day to add one there. */
export const TaskCalendar = ({ items, today, onOpen, onAdd }: {
  items: Item[]; today: string; onOpen: (i: Item) => void; onAdd: (title: string, date: string) => Promise<unknown>;
}) => {
  const [cursor, setCursor] = useState(() => { const d = parseLocalDate(today); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [adding, setAdding] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const byDate = useMemo(() => {
    const m = new Map<string, Item[]>();
    items.forEach((i) => { if (i.dueDate) (m.get(i.dueDate) || m.set(i.dueDate, []).get(i.dueDate)!).push(i); });
    return m;
  }, [items]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead);
    const total = Math.ceil((lead + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => getLocalDateString(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
  }, [cursor]);

  const month = cursor.getMonth();
  const submit = async (e: FormEvent, date: string) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    await onAdd(title.trim(), date);
    setBusy(false); setTitle(''); setAdding(null);
  };
  const noDate = items.filter((i) => !i.dueDate && !i.done).length;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold tracking-tight">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => { const d = parseLocalDate(today); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="px-3 h-9 rounded-lg text-xs font-bold text-muted hover:text-ink hover:bg-ink/5">Today</button>
          <button type="button" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), month - 1, 1))} className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/5">‹</button>
          <button type="button" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), month + 1, 1))} className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/5">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-2xl overflow-hidden bg-line/60 border border-line/60">
        {WEEK.map((w) => <div key={w} className="bg-white/70 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-muted">{w}</div>)}
        {cells.map((d) => {
          const list = byDate.get(d) || [];
          const inMonth = parseLocalDate(d).getMonth() === month;
          const isToday = d === today;
          return (
            <div key={d} className={`group relative bg-white/70 min-h-[5.5rem] sm:min-h-[7rem] p-1.5 sm:p-2 ${inMonth ? '' : 'opacity-45'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold tabular-nums w-6 h-6 grid place-items-center rounded-full ${isToday ? 'bg-ink text-white' : 'text-ink-2'}`}>{Number(d.slice(8))}</span>
                <button type="button" aria-label={`Add task on ${d}`} onClick={() => { setAdding(d); setTitle(''); }} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 w-6 h-6 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-ink/10 transition-opacity">+</button>
              </div>
              <div className="mt-1 space-y-1">
                {list.slice(0, 3).map((i) => (
                  <button key={i.key} type="button" onClick={() => onOpen(i)} title={i.title}
                    className={`w-full text-left truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${i.done ? 'bg-ink/5 text-muted line-through' : i.dueDate! < today ? 'bg-bad/10 text-bad hover:bg-bad/20' : 'bg-brand-soft text-brand hover:bg-brand/20'}`}>
                    {i.title}
                  </button>
                ))}
                {list.length > 3 && <p className="text-[10px] font-bold text-muted px-1">+{list.length - 3} more</p>}
              </div>
              <AnimatePresence>
                {adding === d && (
                  <motion.form initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring} onSubmit={(e) => submit(e, d)}
                    className="absolute left-1 right-1 top-8 z-10 rounded-xl glass-pop !bg-white/[0.97] p-1.5">
                    <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => !title && setAdding(null)} onKeyDown={(e) => e.key === 'Escape' && setAdding(null)} placeholder="New task…" disabled={busy}
                      className="w-full rounded-lg bg-transparent px-2 py-1.5 text-xs outline-none" />
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {noDate > 0 && <p className="text-xs text-muted mt-3">{noDate} open {noDate === 1 ? 'task has' : 'tasks have'} no due date and {noDate === 1 ? "isn't" : "aren't"} shown here. Switch to List to schedule {noDate === 1 ? 'it' : 'them'}.</p>}
    </Card>
  );
};
