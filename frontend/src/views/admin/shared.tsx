import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Button, Drawer, Modal } from '../../ui';
import { getSystemHealth, type AdminUserSummary, type SystemHealth } from '../../lib/api';
import { parseLocalDate } from '../../lib/date';

/* ───────── Tabs ───────── */
export type TabKey = 'overview' | 'people' | 'performance' | 'followup' | 'logs' | 'system' | 'setup';

/* ───────── Palette (two-tone navy + one accent) ───────── */
export const C = {
  brand: '#ccd0cf',
  ink: '#ccd0cf',
  ink2: '#9ba8ab',
  muted: '#9ba8ab',
  line: '#253745',
  good: '#4fb89f',
  warn: '#d3a84a',
  bad: '#e0707e',
};
export const DONUT = ['#ccd0cf', '#9ba8ab', '#4a5c6a', '#253745', '#6f808c', '#3a4d5b'];
export const tooltipStyle = {
  background: '#11212d',
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgb(0 0 0 / 0.5)',
};

/* ───────── Time / format helpers ───────── */
export const timeAgo = (iso?: string | null) => {
  if (!iso) return 'never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
/** Real point-in-time values (createdAt etc.) are safe to parse directly. */
export const fmtStamp = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
export const fmtJoined = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
/** Pure calendar dates (meeting date, due date, work-log date) must be parsed as LOCAL dates. */
export const fmtDay = (d?: string | null, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  d ? parseLocalDate(d.slice(0, 10)).toLocaleDateString(undefined, opts) : '—';
export const fmtBytes = (bytes: string | number) => {
  const n = Number(bytes);
  if (!isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
export const firstName = (u: { name?: string; email: string }) => (u.name || u.email).split(/[ @]/)[0];

/* ───────── Performance maths (same formula as the classic admin) ───────── */
export const onTimeRate = (u: AdminUserSummary): number | null => {
  const total = u.timeliness.early + u.timeliness.onTime + u.timeliness.late;
  return total > 0 ? Math.round(((u.timeliness.early + u.timeliness.onTime) / total) * 100) : null;
};
export const scoreOf = (u: AdminUserSummary) => {
  // Points only ever go up: 2 per finished task, 1 per work log, plus up to 10 for finishing on time and up to 10 for the log habit.
  const base = u.workLogsCount + u.tasksCompleted * 2;
  if (base === 0) return 0;
  const otr = onTimeRate(u);
  const timelinessBonus = otr !== null ? Math.round(otr / 10) : 0;
  const complianceBonus = Math.round(u.workLogCompliance.rate / 10);
  return base + timelinessBonus + complianceBonus;
};
export const rateTone = (rate: number | null, good = 80, warn = 50) =>
  rate === null ? 'var(--color-muted)' : rate >= good ? 'var(--color-good)' : rate >= warn ? 'var(--color-warn)' : 'var(--color-bad)';

/* ───────── Small hooks ───────── */
/** Keeps the last non-null value so exit animations don't flash empty content. */
export const useLast = <T,>(v: T | null): T | null => {
  const r = useRef<T | null>(v);
  if (v !== null) r.current = v;
  return r.current;
};

/** Health diagnostics: loads once, then refreshes on an interval (skipped while the tab is hidden). */
export const useHealth = (everyMs = 30000, enabled = true) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHealth(await getSystemHealth());
      setError(null);
      setLastChecked(new Date());
    } catch (e: any) {
      setError(e?.message || 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, everyMs);
    return () => clearInterval(t);
  }, [load, everyMs, enabled]);
  return { health, error, loading, lastChecked, reload: load };
};

/* ───────── Overlays rendered at <body> level ─────────
   The shell animates the view wrapper (transform/filter), which would trap `position: fixed`
   overlays inside it — so every overlay in this workspace is portalled out. */
// Portal into the app root (not <body>) so dialogs keep the app's light/dark theme variables.
const appRoot = () => document.querySelector<HTMLElement>('[data-app-root]') ?? document.body;
export const PModal = (p: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) =>
  createPortal(<div style={{ position: 'relative', zIndex: 170 }}><Modal {...p} /></div>, appRoot());
export const PDrawer = (p: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) =>
  createPortal(<Drawer {...p} />, appRoot());

export const ConfirmModal = ({ open, title, children, confirmLabel, danger, loading, onConfirm, onClose }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void;
}) => (
  <PModal open={open} onClose={loading ? () => {} : onClose} title={title}>
    <div className="text-sm text-ink-2 space-y-2 leading-relaxed">{children}</div>
    <div className="flex justify-end gap-2 mt-6">
      <Button variant="soft" onClick={onClose} disabled={loading}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </PModal>
);

/* ───────── Small UI pieces ───────── */
export const Pills = <T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((it) => {
      const active = value === it.key;
      return (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          aria-pressed={active}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-ink text-white' : 'bg-white/50 border border-white/70 text-muted hover:text-ink hover:border-ink/30'}`}
        >
          {it.label}
          {it.count !== undefined && <span className={`ml-1.5 tabular-nums ${active ? 'text-white/70' : 'text-muted'}`}>{it.count}</span>}
        </button>
      );
    })}
  </div>
);

export const SectionHead = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="text-xs text-muted mt-0.5 max-w-xl">{sub}</p>}
    </div>
    {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
  </div>
);

export const IconBtn = ({ label, onClick, tone = 'neutral', disabled, children }: { label: string; onClick: () => void; tone?: 'neutral' | 'bad'; disabled?: boolean; children: ReactNode }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    aria-label={label}
    title={label}
    disabled={disabled}
    className={`w-8 h-8 rounded-lg grid place-items-center transition-colors disabled:opacity-30 disabled:pointer-events-none ${tone === 'bad' ? 'text-muted hover:text-bad hover:bg-bad/10' : 'text-muted hover:text-ink hover:bg-ink/5'}`}
  >
    {children}
  </button>
);

export const ErrorNote = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 bg-bad/5 border border-bad/20 text-bad rounded-xl px-4 py-3 text-sm">
    <span className="font-semibold">{message}</span>
    {onRetry && <Button size="sm" variant="soft" onClick={onRetry}>Try again</Button>}
  </div>
);

export const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative flex-1 min-w-[200px]">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{G.search}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/50 border border-white/70 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
    />
  </div>
);

/** Sticky-header class helpers so every table in this workspace looks the same. */
export const TH = 'sticky top-0 z-10 bg-white/80 px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted whitespace-nowrap border-b border-line';
export const TD = 'px-4 py-3 whitespace-nowrap';

export const RoleBadge = ({ role, labels }: { role: string; labels?: Record<string, string> }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${role === 'super_admin' ? 'bg-ink text-white' : 'bg-ink/5 text-ink-2'}`}>
    {labels?.[role] || (role === 'super_admin' ? 'Super admin' : role === 'user' ? 'User' : role)}
  </span>
);

/* ───────── Glyphs ───────── */
const g = (d: string, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const G = {
  search: g('M21 21l-4.3-4.3M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z', 15),
  edit: g('M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z'),
  trash: g('M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6'),
  download: g('M12 3v12m0 0l-4-4m4 4l4-4M4 21h16'),
  refresh: g('M20 11a8 8 0 00-14.9-3M4 4v4h4M4 13a8 8 0 0014.9 3M20 20v-4h-4'),
  external: g('M14 3h7v7m0-7L10 14M19 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h5'),
  send: g('M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'),
  users: g('M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8', 18),
  building: g('M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01', 18),
  bolt: g('M13 2L3 14h8l-1 8 10-12h-8l1-8z', 18),
  board: g('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 16),
  check: g('M5 13l4 4L19 7', 16),
  db: g('M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6', 18),
};

/** The refresh icon: turns one full circle on every click, and keeps turning while `busy`. */
export const useSpin = (busy?: boolean) => {
  const [turns, setTurns] = useState(0);
  const spin = () => setTurns((t) => t + 1);
  const icon = (
    <motion.span className="inline-grid place-items-center" animate={{ rotate: turns * 360 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <motion.span className="inline-grid place-items-center" animate={busy ? { rotate: 360 } : { rotate: 0 }} transition={busy ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { duration: 0 }}>{G.refresh}</motion.span>
    </motion.span>
  );
  return { spin, icon };
};

/** A refresh button with the spinning icon. */
export const RefreshButton = ({ onClick, label = 'Refresh', busy, className = '' }: { onClick: () => void; label?: string; busy?: boolean; className?: string }) => {
  const { spin, icon } = useSpin(busy);
  return <Button size="sm" variant="soft" className={`!rounded-full ${className}`} onClick={() => { spin(); onClick(); }}>{icon} {label}</Button>;
};
