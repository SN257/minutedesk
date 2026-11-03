import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber, Card } from '../../ui';
import { softSpring } from '../../lib/motion';

/** Chart colours — straight from the design tokens, no extras. */
export const C = {
  brand: 'var(--color-brand)',
  brandMid: '#9ba8ab',
  brandSoft: '#4a5c6a',
  good: 'var(--color-good)',
  warn: 'var(--color-warn)',
  bad: 'var(--color-bad)',
  track: '#253745',
  grid: '#253745',
  tick: '#9ba8ab',
};
export const DONUT = [C.brand, '#9ba8ab', C.good, '#4a5c6a', C.warn, '#6f808c'];

export const axis = { tick: { fontSize: 11, fill: C.tick }, tickLine: false, axisLine: false } as const;

export const ChartTip = ({ active, payload, label, unit }: { active?: boolean; payload?: any[]; label?: string; unit?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-white rounded-xl px-3 py-2 shadow-pop text-xs">
      {(label || payload[0]?.payload?.name) && <p className="font-bold mb-1">{label ?? payload[0].payload.name}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 tabular-nums">
          <i className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-white/70">{p.name}</span>
          <span className="font-bold">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
};

export const ChartCard = ({ title, sub, right, children, className = '' }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) => (
  <Card className={`p-5 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h3 className="font-extrabold tracking-tight">{title}</h3>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </Card>
);

export const Legend = ({ items }: { items: { label: string; color: string; value?: string | number }[] }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-semibold text-muted">
    {items.map((i) => (
      <span key={i.label} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: i.color }} />{i.label}{i.value !== undefined && <b className="text-ink tabular-nums">{i.value}</b>}</span>
    ))}
  </div>
);

export const Stat = ({ label, value, suffix, hint, tone }: { label: string; value: number | null; suffix?: string; hint?: string; tone?: 'good' | 'bad' | 'warn' }) => (
  <Card className="p-4">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
    <p className={`text-3xl font-black tracking-tight tabular-nums mt-1 ${tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : ''}`}>
      {value === null ? '—' : <AnimatedNumber value={value} suffix={suffix} />}
    </p>
    {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
  </Card>
);

/** Ring whose centre can show anything (used for the meetings dial). */
export const Dial = ({ value, size = 96, stroke = 9, center, label, color = C.brand }: { value: number; size?: number; stroke?: number; center: ReactNode; label?: string; color?: string }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (p / 100) * c }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-extrabold text-lg tabular-nums">{center}</div>
      </div>
      {label && <span className="text-[11px] font-bold text-muted text-center">{label}</span>}
    </div>
  );
};

/** Animated horizontal bar list (for "by center" style breakdowns). */
export const BarList = ({ items, color = C.brand }: { items: { name: string; value: number }[]; color?: string }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it.name}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold truncate pr-3">{it.name}</span>
            <span className="font-bold tabular-nums text-ink-2">{it.value}</span>
          </div>
          <div className="h-2 rounded-full bg-ink/[0.06] overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${(it.value / max) * 100}%` }} transition={{ ...softSpring, delay: 0.08 * i }} />
          </div>
        </li>
      ))}
    </ul>
  );
};
