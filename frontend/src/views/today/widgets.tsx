import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getRegional } from '../../lib/formats';
import { motion } from 'framer-motion';
import { CountUp, cardIn } from '../../landing/bits';
import { Icon } from '../../shell/icons';
import { getLocalDateString } from '../../lib/date';
import { Skel } from './parts';

/* Every widget draws with theme variables only (brand / good / warn / muted / bad), so the
   whole grid follows the light and dark theme without any fixed colours. */

const C = { brand: 'var(--color-brand)', good: 'var(--color-good)', warn: 'var(--color-warn)', muted: 'var(--color-muted)', bad: 'var(--color-bad)' };

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
const smooth = (pts: [number, number][]) => {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
};

/** Pixel size of an element, kept up to date, so charts render at 1:1 and never get squashed. */
const useBox = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 320, h: 140 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setSize({ w: Math.max(60, el.clientWidth), h: Math.max(16, el.clientHeight) });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
};

const Card = ({ title, sub, right, children, className = '' }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) => (
  <motion.section variants={cardIn} className={`liquid rounded-[1.75rem] p-4 [@media(max-height:860px)]:p-3.5 h-full min-h-0 flex flex-col overflow-hidden ${className}`}>
    {(title || right) && (
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0">{title && <h3 className="text-[15px] font-medium leading-tight">{title}</h3>}{sub && <p className="text-[11.5px] text-char/50 mt-0.5 truncate [@media(max-height:860px)]:hidden">{sub}</p>}</div>
        {right}
      </div>
    )}
    {children}
  </motion.section>
);

/** A small label showing which period a card covers. It is not clickable: the period is chosen with the filter icon in the heading. */
const Chip = ({ children }: { children: ReactNode }) => (
  <span className="shrink-0 inline-flex items-center rounded-full bg-char/[0.06] px-2.5 py-1 text-[11px] text-char/65 max-w-[11rem] truncate">{children}</span>
);

const Legend = ({ items }: { items: { label: string; color: string }[] }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-char/60 shrink-0">
    {items.map((i) => <span key={i.label} className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: i.color }} />{i.label}</span>)}
  </div>
);

/* ───────── heading ───────── */

export const Heading = ({ title, sub, onMeeting, onTask, filter }: { title: string; sub: string; onMeeting: () => void; onTask: () => void; filter?: ReactNode }) => (
  <motion.div variants={cardIn} className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0">
    <div className="min-w-0">
      <h1 className="text-[1.7rem] sm:text-[1.9rem] leading-tight font-semibold tracking-tight">{title}</h1>
      <p className="text-[13px] text-char/55 truncate max-w-[60vw]">{sub}</p>
    </div>
    <div className="flex items-center gap-2">
      <motion.button whileTap={{ scale: 0.96 }} onClick={onMeeting} className="rounded-xl h-9 px-3.5 text-[13px] font-medium inline-flex items-center gap-1.5 bg-white/60 glass-fill border border-white/70 hover:brightness-105 transition">{Icon.plus(14)} Log minutes</motion.button>
      <motion.button whileTap={{ scale: 0.96 }} onClick={onTask} className="rounded-xl h-9 px-3.5 text-[13px] font-medium inline-flex items-center gap-1.5 bg-char text-white hover:opacity-90 transition">{Icon.tasks(14)} Review tasks</motion.button>
      {filter}
    </div>
  </motion.div>
);

/* ───────── 1. stat card: up / down ───────── */

export const StatCard = ({ up, upLabel, down, downLabel, range, loading, title = 'Pulse' }: { up: number; upLabel: string; down: number; downLabel: string; range: string; loading: boolean; title?: string }) => (
  <Card title={title} right={<Chip>{range}</Chip>}>
    <div className="flex-1 min-h-0 flex flex-col justify-around mt-1">
      {[{ n: up, label: upLabel, icon: '↑', color: C.good }, { n: down, label: downLabel, icon: '↓', color: C.warn }].map((r, i) => (
        <div key={r.label}>
          {i === 1 && <div className="h-px bg-char/10 mb-2" />}
          <div className="flex items-center gap-3">
            <span className="text-[1.8rem] leading-none font-light" style={{ color: r.color }}>{r.icon}</span>
            <span className="text-[2rem] leading-none font-light tabular-nums">{loading ? '—' : <CountUp value={r.n} />}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-char/55 leading-snug">{r.label}</p>
        </div>
      ))}
    </div>
  </Card>
);

/* ───────── 2. month calendar ───────── */

export const CalendarWidget = ({ meetingDays, taskDays, onOpen }: { meetingDays: Set<string>; taskDays: Set<string>; onOpen: (d: string) => void }) => {
  const todayStr = getLocalDateString();
  const [off, setOff] = useState(0);
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + off);
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1);
  const weekStart = getRegional().weekStart ?? 0;
  const lead = (first.getDay() - weekStart + 7) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const rows = Math.ceil(cells.length / 7);
  const key = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return (
    <Card>
      <div className="flex items-center justify-between text-[14px] font-medium">
        <button onClick={() => setOff((o) => o - 1)} aria-label="Previous month" className="w-7 h-7 rounded-full hover:bg-char/[0.07] grid place-items-center text-char/60">‹</button>
        <span>{first.toLocaleString(undefined, { month: 'long', year: off === 0 ? undefined : 'numeric' })}</span>
        <button onClick={() => setOff((o) => o + 1)} aria-label="Next month" className="w-7 h-7 rounded-full hover:bg-char/[0.07] grid place-items-center text-char/60">›</button>
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[10px] text-char/45">{(getRegional().weekStart === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="flex-1 min-h-0 grid grid-cols-7 text-center text-[11.5px] tabular-nums" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const k = key(d), isToday = k === todayStr, hasM = meetingDays.has(k), hasT = taskDays.has(k);
          const ring = isToday ? C.brand : hasM ? C.warn : hasT ? C.good : '';
          return (
            <button key={i} onClick={() => onOpen(k)} className="grid place-items-center">
              <span className={`w-[1.55rem] h-[1.55rem] rounded-full grid place-items-center ${isToday ? 'font-semibold' : ''}`} style={ring ? { boxShadow: `inset 0 0 0 1.5px ${ring}` } : undefined}>{d}</span>
            </button>
          );
        })}
      </div>
      <div className="shrink-0 pt-1"><Legend items={[{ label: 'Today', color: C.brand }, { label: 'Meeting', color: C.warn }, { label: 'Task due', color: C.good }]} /></div>
    </Card>
  );
};

/* ───────── 3. labelled progress bars ───────── */

export const BarsWidget = ({ rows, loading }: { rows: { label: string; pct: number | null; color: string; hint: string }[]; loading: boolean }) => (
  <Card title="Progress">
    <div className="flex-1 min-h-0 flex flex-col justify-around mt-1 gap-1">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-[11.5px] text-char/65"><span>{r.label}</span><span className="tabular-nums text-char/50">{loading ? '—' : r.pct === null ? r.hint : `${r.pct}%`}</span></div>
          <div className="mt-1 h-2 rounded-full bg-char/[0.09] overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: r.color }} initial={{ width: 0 }} animate={{ width: `${r.pct ?? 0}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} /></div>
        </div>
      ))}
    </div>
  </Card>
);

/* ───────── 4. two-line smooth chart ───────── */

export const LineWidget = ({ labels, a, b, aLabel, bLabel, range, loading }: { labels: string[]; a: number[]; b: number[]; aLabel: string; bLabel: string; range: string; loading: boolean }) => {
  const [ref, { w, h }] = useBox();
  const padL = 26, padR = 8, padT = 10, padB = 20;
  const max = Math.max(4, ...a, ...b), step = Math.ceil(max / 3), top = step * 3;
  const n = Math.max(2, a.length);
  const x = (i: number) => padL + (i / (n - 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - v / top) * (h - padT - padB);
  const pa = a.map((v, i) => [x(i), y(v)] as [number, number]), pb = b.map((v, i) => [x(i), y(v)] as [number, number]);
  const la = smooth(pa), lb = smooth(pb);
  const peak = (arr: number[]) => arr.indexOf(Math.max(...arr));
  return (
    <Card title="Activity trend" sub="Meetings and finished tasks" right={<Chip>{range}</Chip>}>
      <div ref={ref} className="relative flex-1 min-h-0 mt-1">
        {loading ? <Skel className="absolute inset-0" /> : (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" role="img" aria-label="Activity trend">
            <defs><linearGradient id="lw-a" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity="0.14" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            {[0, 1, 2, 3].map((i) => <g key={i}><line x1={padL} x2={w - padR} y1={y(i * step)} y2={y(i * step)} stroke="currentColor" strokeOpacity="0.08" /><text x={padL - 6} y={y(i * step) + 3.5} textAnchor="end" fontSize="9.5" fill="currentColor" fillOpacity="0.45">{i * step}</text></g>)}
            {la && <path d={`${la} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#lw-a)" style={{ color: C.brand }} />}
            {lb && <path d={lb} fill="none" style={{ stroke: C.warn }} strokeWidth="2.2" strokeLinecap="round" />}
            {la && <path d={la} fill="none" style={{ stroke: C.brand }} strokeWidth="2.2" strokeLinecap="round" />}
            {a.length > 0 && <circle cx={x(peak(a))} cy={y(a[peak(a)])} r="5" fill="var(--color-white)" style={{ stroke: C.brand }} strokeWidth="2" />}
            {b.length > 0 && <circle cx={x(peak(b))} cy={y(b[peak(b)])} r="5" fill="var(--color-white)" style={{ stroke: C.warn }} strokeWidth="2" />}
            {labels.map((l, i) => (i === 0 || i === labels.length - 1 || i === Math.floor(labels.length / 2)) && <text key={i} x={x(i)} y={h - 5} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'} fontSize="10" fill="currentColor" fillOpacity="0.5">{l}</text>)}
          </svg>
        )}
      </div>
      <div className="pt-1"><Legend items={[{ label: aLabel, color: C.brand }, { label: bLabel, color: C.warn }]} /></div>
    </Card>
  );
};

/* ───────── 5. radial progress ───────── */

export const RadialWidget = ({ pct, title, sub, cta, onCta, loading }: { pct: number | null; title: string; sub: string; cta: string; onCta: () => void; loading: boolean }) => {
  const [ref, { w, h }] = useBox();
  const size = Math.max(40, Math.min(w, h, 140));
  const stroke = Math.max(6, Math.round(size * 0.075));
  const R = (size - stroke) / 2, CIR = 2 * Math.PI * R, v = pct ?? 0;
  return (
    <Card title={title} sub={sub}>
      <div ref={ref} className="flex-1 min-h-0 relative my-1">
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="currentColor" strokeOpacity="0.09" strokeWidth={stroke} />
              {pct !== null && (
                <motion.circle cx={size / 2} cy={size / 2} r={R} fill="none" style={{ stroke: C.brand }} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={CIR} initial={{ strokeDashoffset: CIR }} animate={{ strokeDashoffset: CIR * (1 - v / 100) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
              )}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              {loading ? <span className="text-char/40">—</span> : pct === null ? (
                <span className="text-char/45">{Icon.check(Math.round(size * 0.28))}</span>
              ) : (
                <span className="font-light tabular-nums leading-none" style={{ fontSize: Math.max(18, size * 0.27) }}><CountUp value={v} /><span className="text-char/50" style={{ fontSize: '0.5em' }}>%</span></span>
              )}
            </div>
          </div>
        </div>
      </div>
      <button onClick={onCta} className="mt-2 w-full rounded-full bg-char text-white text-[13px] font-medium py-2 hover:opacity-90 transition-opacity shrink-0">{cta}</button>
    </Card>
  );
};

/* ───────── 6. stacked horizontal bars ───────── */

export const StackedWidget = ({ rows, legend, loading, title = 'Last four weeks', sub = 'Meetings and finished tasks per week' }: { rows: { label: string; segs: number[] }[]; legend: { label: string; color: string }[]; loading: boolean; title?: string; sub?: string }) => {
  const max = Math.max(1, ...rows.map((r) => r.segs.reduce((a, b) => a + b, 0)));
  const colors = [C.brand, C.good, C.warn];
  return (
    <Card title={title} sub={sub}>
      {loading ? <Skel className="mt-2 flex-1" /> : (
        <div className="flex-1 min-h-0 flex flex-col justify-around mt-1 gap-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5">
              <span className="w-9 text-[10.5px] text-char/50 shrink-0">{r.label}</span>
              <div className="flex-1 h-4 flex gap-0.5 min-w-0">
                {r.segs.map((s, i) => s > 0 && <motion.span key={i} className="h-full rounded-md" style={{ background: colors[i], opacity: i === 0 ? 1 : 0.8 }} initial={{ width: 0 }} animate={{ width: `${(s / max) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />)}
                {r.segs.every((s) => s === 0) && <span className="h-full w-1.5 rounded-md bg-char/10" />}
              </div>
              <span className="w-6 text-right text-[11px] tabular-nums text-char/55 shrink-0">{r.segs.reduce((a, b) => a + b, 0)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="pt-1"><Legend items={legend} /></div>
    </Card>
  );
};

/* ───────── 7. grouped vertical bars ───────── */

export const GroupedWidget = ({ days, series, legend, loading, title = 'This week by day', sub = 'Held, planned and finished' }: { days: string[]; series: number[][]; legend: { label: string; color: string }[]; loading: boolean; title?: string; sub?: string }) => {
  const [ref, { w, h }] = useBox();
  const padL = 24, padB = 18, padT = 8, padR = 4;
  const max = Math.max(3, ...series.flat()), step = Math.ceil(max / 3), top = step * 3;
  const colors = [C.brand, C.muted, C.good];
  const gw = (w - padL - padR) / days.length;
  const bw = Math.min(11, gw / 4);
  const y = (v: number) => padT + (1 - v / top) * (h - padT - padB);
  return (
    <Card title={title} sub={sub}>
      <div ref={ref} className="relative flex-1 min-h-0 mt-1">
        {loading ? <Skel className="absolute inset-0" /> : (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" role="img" aria-label="Weekly bars">
            {[0, 1, 2, 3].map((i) => <g key={i}><line x1={padL} x2={w - padR} y1={y(i * step)} y2={y(i * step)} stroke="currentColor" strokeOpacity="0.07" /><text x={padL - 5} y={y(i * step) + 3.5} textAnchor="end" fontSize="9.5" fill="currentColor" fillOpacity="0.45">{i * step}</text></g>)}
            {days.map((d, gi) => {
              const cx = padL + gw * gi + gw / 2;
              return (
                <g key={d}>
                  {series.map((s, si) => {
                    const hh = Math.max(s[gi] > 0 ? 3 : 0, y(0) - y(s[gi]));
                    return <rect key={si} x={cx + (si - 1) * (bw + 2) - bw / 2} y={y(0) - hh} width={bw} height={hh} rx="3" style={{ fill: colors[si] }} />;
                  })}
                  <text x={cx} y={h - 4} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.55">{d}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <div className="pt-1"><Legend items={legend} /></div>
    </Card>
  );
};

/* ───────── 8. quick list (action items) ───────── */

export const ListWidget = ({ title, sub, rows, empty, onAll }: {
  title: string; sub: string; empty: string; onAll: () => void;
  rows: { key: string; title: string; tag: string; late?: boolean; done?: boolean; onToggle?: () => void }[];
}) => (
  <Card title={title} sub={sub} right={<button onClick={onAll} className="text-[11.5px] font-medium text-char/65 hover:text-char underline underline-offset-4 decoration-char/25">Open</button>}>
    {rows.length === 0 ? <p className="flex-1 grid place-items-center text-[12.5px] text-char/50 text-center">{empty}</p> : (
      <ul className="mt-2 flex-1 min-h-0 flex flex-col justify-around">
        {rows.slice(0, 4).map((r, i) => (
          <li key={r.key} className={`flex items-center gap-2.5 ${i >= 3 ? '[@media(max-height:860px)]:hidden' : ''} ${i >= 2 ? '[@media(max-height:800px)]:hidden' : ''}`}>
            <button onClick={r.onToggle} disabled={r.done} aria-label={r.done ? 'Done' : `Mark "${r.title}" done`} className={`w-[18px] h-[18px] rounded-full border-2 grid place-items-center shrink-0 transition-colors ${r.done ? 'bg-char border-char text-white' : 'border-char/30 hover:border-char'}`}>{r.done && Icon.check(9)}</button>
            <span className={`flex-1 truncate text-[13px] ${r.done ? 'line-through text-char/40' : ''}`}>{r.title}</span>
            <span className={`shrink-0 text-[10.5px] rounded-full px-2 py-0.5 ${r.late ? 'bg-bad/15 text-bad' : 'bg-char/[0.07] text-char/60'}`}>{r.tag}</span>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

/* ───────── 9. wave (area) charts ───────── */

const Wave = ({ data, color, label, id }: { data: number[]; color: string; label: string; id: string }) => {
  const [ref, { w, h }] = useBox();
  const max = Math.max(2, ...data);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, 4 + (1 - v / max) * (h - 16)] as [number, number]);
  const line = smooth(pts);
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <p className="text-[10.5px] text-char/50 shrink-0">{label}</p>
      <div ref={ref} className="relative flex-1 min-h-0">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" aria-hidden>
          <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: color }} stopOpacity="0.45" /><stop offset="1" style={{ stopColor: color }} stopOpacity="0.02" /></linearGradient></defs>
          {line && <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />}
          {line && <path d={line} fill="none" style={{ stroke: color }} strokeWidth="1.8" strokeLinecap="round" />}
        </svg>
      </div>
    </div>
  );
};

export const WavesWidget = ({ a, b, aLabel, bLabel, loading, title = 'Rhythm', sub = 'Last 30 days' }: { a: number[]; b: number[]; aLabel: string; bLabel: string; loading: boolean; title?: string; sub?: string }) => (
  <Card title={title} sub={sub}>
    {loading ? <Skel className="mt-2 flex-1" /> : (
      <div className="flex-1 min-h-0 flex flex-col gap-1.5 mt-1.5">
        <Wave data={a} color="var(--color-brand)" label={aLabel} id="wv-a" />
        <Wave data={b} color="var(--color-warn)" label={bLabel} id="wv-b" />
      </div>
    )}
  </Card>
);

/* ───────── 10. segmented bar ───────── */

export const SegmentWidget = ({ title, parts, loading }: { title: string; parts: { label: string; v: number; color: string }[]; loading: boolean }) => {
  const total = parts.reduce((a, p) => a + p.v, 0);
  return (
    <Card title={title}>
      {loading ? <Skel className="mt-2 h-8" /> : (
        <>
          <div className="mt-2 h-3 flex gap-0.5 rounded-full overflow-hidden bg-char/[0.08]">
            {total > 0 && parts.filter((p) => p.v > 0).map((p) => <motion.span key={p.label} className="h-full" style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${(p.v / total) * 100}%` }} transition={{ duration: 0.8 }} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-char/60">
            {parts.map((p) => <span key={p.label} className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />{p.label} <b className="font-semibold text-char/80 tabular-nums">{p.v}</b></span>)}
          </div>
        </>
      )}
    </Card>
  );
};

/* ───────── 11. donut ───────── */

export const DonutWidget = ({ title, range, parts, centerLabel, loading }: {
  title: string; range: string; parts: { label: string; v: number; color: string }[]; centerLabel: string; loading: boolean;
}) => {
  const total = parts.reduce((a, p) => a + p.v, 0);
  const R = 52, CIR = 2 * Math.PI * R;
  let acc = 0;
  return (
    <Card title={title} right={<Chip>{range}</Chip>}>
      {loading ? <Skel className="mt-2 flex-1" /> : (
        <div className="flex-1 min-h-0 flex items-center justify-center gap-4 mt-1">
          <div className="relative h-full max-h-[8.5rem] aspect-square shrink min-w-0">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="18" />
              {total > 0 && parts.filter((p) => p.v > 0).map((p) => {
                const len = (p.v / total) * CIR;
                const el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" style={{ stroke: p.color }} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 3)} ${CIR}`} strokeDashoffset={-acc} />;
                acc += len;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-[1.5rem] font-medium leading-none tabular-nums">{total}</p><p className="text-[10px] text-char/50 mt-0.5">{centerLabel}</p></div></div>
          </div>
          <ul className="space-y-1.5 min-w-0">
            {parts.map((p) => <li key={p.label} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} /><span className="text-char/65 truncate">{p.label}</span><b className="font-semibold tabular-nums ml-1">{total ? Math.round((p.v / total) * 100) : 0}%</b></li>)}
          </ul>
        </div>
      )}
    </Card>
  );
};

