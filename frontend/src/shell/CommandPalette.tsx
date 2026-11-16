import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '../lib/motion';
import { Icon } from './icons';

export interface Command { id: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void }

export const CommandPalette = ({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) => {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? commands.filter((c) => (c.label + ' ' + (c.hint || '')).toLowerCase().includes(s)) : commands;
  }, [q, commands]);

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  useEffect(() => setIdx(0), [q]);

  const run = (c?: Command) => { if (c) { onClose(); c.run(); } };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') run(results[idx]);
    if (e.key === 'Escape') onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[300] flex items-start justify-center pt-[14vh] px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ y: -16, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={spring}
            className="relative w-full max-w-xl glass-pop rounded-2xl overflow-hidden" onKeyDown={onKey}>
            <div className="flex items-center gap-3 px-4 border-b border-line">
              <span className="text-muted">{Icon.search(18)}</span>
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or jump to…  try “new meeting”" className="flex-1 py-4 text-base outline-none placeholder:text-muted/70" />
              <kbd className="text-[10px] font-mono text-muted border border-line rounded px-1.5 py-0.5">esc</kbd>
            </div>
            <div className="max-h-[50vh] scroll-y p-2">
              {results.length === 0 && <p className="text-center text-sm text-muted py-8">Nothing matches “{q}”</p>}
              {results.map((c, i) => (
                <button key={c.id} onMouseEnter={() => setIdx(i)} onClick={() => run(c)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${i === idx ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-ink/5'}`}>
                  <span className="w-8 h-8 rounded-lg glass-fill border border-line grid place-items-center text-ink-2">{c.icon}</span>
                  <span className="flex-1 text-sm font-semibold">{c.label}</span>
                  {c.hint && <span className="text-xs text-muted">{c.hint}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
