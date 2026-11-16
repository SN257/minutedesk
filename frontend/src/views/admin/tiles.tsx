import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { rise } from '../../lib/motion';
import { AnimatedNumber, Skeleton } from '../../ui';

export type Glow = 'brand' | 'good' | 'warn' | 'bad';
const GLOW: Record<Glow, string> = { brand: 'bg-brand/15', good: 'bg-good/25', warn: 'bg-warn/25', bad: 'bg-bad/20' };

/** One tile of the control room: glass, with a soft coloured glow in the corner. */
export const ATile = ({ className = '', glow = 'brand', onClick, children }: { className?: string; glow?: Glow; onClick?: () => void; children: ReactNode }) => (
  <motion.section
    variants={rise}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    whileHover={onClick ? { y: -3 } : undefined}
    className={`relative liquid rounded-[2rem] p-5 sm:p-6 overflow-hidden flex flex-col min-w-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    <span aria-hidden className={`pointer-events-none absolute -right-14 -top-14 w-44 h-44 rounded-full blur-2xl opacity-60 ${GLOW[glow]}`} />
    <div className="relative flex flex-col flex-1 min-h-0">{children}</div>
  </motion.section>
);

/** Small caps title with an icon chip, the same on every tile. */
export const ATitle = ({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 mb-3.5">
    {icon && <span className="w-8 h-8 shrink-0 rounded-xl bg-ink/[0.07] grid place-items-center text-ink-2">{icon}</span>}
    <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted flex-1 min-w-0 truncate">{children}</h3>
    {right && <div className="max-sm:basis-full max-sm:order-last min-w-0">{right}</div>}
  </div>
);

/** A figure tile: big number, label, and a quiet line underneath. */
export const KpiTile = ({ icon, label, value, sub, glow = 'brand', onClick, empty, suffix }: { icon: ReactNode; label: string; value: number | null; sub?: string; glow?: Glow; onClick?: () => void; empty?: boolean; suffix?: string }) => (
  <ATile glow={glow} onClick={onClick} className="!p-4 sm:!p-5">
    <div className="flex items-center gap-2 mb-3">
      <span className="w-8 h-8 rounded-xl bg-ink/[0.07] grid place-items-center text-ink-2">{icon}</span>
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted leading-tight line-clamp-2">{label}</span>
    </div>
    <p className="text-4xl font-extrabold tracking-tight tabular-nums leading-none">{empty ? <span className="text-muted/60">—</span> : value === null ? <Skeleton className="h-9 w-14" /> : <><AnimatedNumber value={value} />{suffix && <span className="text-2xl text-muted font-bold ml-0.5">{suffix}</span>}</>}</p>
    {sub && <p className="text-xs text-muted mt-2 line-clamp-2">{sub}</p>}
  </ATile>
);
