import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { Icon } from '../../shell/icons';

export const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'where', label: 'Where & who' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'review', label: 'Review' },
] as const;

/** Animated progress line + a pill that glides between steps. */
export const Stepper = ({ step, onGo, reached }: { step: number; onGo: (i: number) => void; reached: number }) => {
  const pct = (step / (STEPS.length - 1)) * 100;
  return (
    <nav aria-label="Progress" className="relative px-2">
      {/* Track sits behind the dots, centred on them (dot size 40 => top 20) */}
      <div className="absolute left-[12.5%] right-[12.5%] top-5 h-[3px] -translate-y-1/2 rounded-full bg-line overflow-hidden">
        <motion.div className="h-full bg-brand rounded-full origin-left" initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 160, damping: 22 }} />
      </div>
      <ol className="relative grid grid-cols-4">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const clickable = i <= reached || i === step + 1;
          return (
            <li key={s.key} className="flex justify-center">
              <button
                type="button"
                onClick={() => clickable && onGo(i)}
                disabled={!clickable}
                aria-current={active ? 'step' : undefined}
                className="group flex flex-col items-center gap-1.5 min-w-[64px] disabled:cursor-default"
              >
                <span className="relative w-10 h-10 grid place-items-center">
                  {active && <motion.span layoutId="editor-step-pill" transition={spring} className="absolute inset-0 rounded-full bg-ink shadow-card" />}
                  {!active && (
                    <motion.span
                      initial={false}
                      animate={{ backgroundColor: done ? 'var(--color-brand)' : '#11212d', borderColor: done ? 'var(--color-brand)' : 'var(--color-line)' }}
                      className="absolute inset-1.5 rounded-full border-2"
                    />
                  )}
                  <span className={`relative text-sm font-extrabold ${active ? 'text-white' : done ? 'text-white' : 'text-muted'}`}>
                    {done ? Icon.check(16) : i + 1}
                  </span>
                </span>
                <span className={`text-[11px] sm:text-xs font-bold transition-colors ${active ? 'text-ink' : done ? 'text-ink-2' : 'text-muted'}`}>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
