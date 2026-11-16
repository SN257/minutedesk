import { Children, Fragment, forwardRef, isValidElement, useEffect, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type ReactElement, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { rise, spring, stagger } from '../lib/motion';

/* ───────── Button ───────── */
type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-2 shadow-card',
  soft: 'bg-white/60 glass-fill text-ink border border-line hover:border-ink/30',
  ghost: 'text-muted hover:text-ink hover:bg-ink/5',
  danger: 'bg-bad text-white hover:opacity-90',
};
export const Button = ({ variant = 'primary', size = 'md', loading, className = '', children, ...rest }:
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) => (
  <motion.button
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.96 }}
    transition={spring}
    disabled={loading || rest.disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${
      size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-4 py-2.5 text-sm'
    } ${BTN[variant]} ${className}`}
    {...(rest as object)}
  >
    {loading && <Spinner size={14} />}
    {children}
  </motion.button>
);

export const Spinner = ({ size = 20 }: { size?: number }) => (
  <span className="inline-block rounded-full border-2 border-current/25 border-t-current animate-spin" style={{ width: size, height: size }} />
);

/* ───────── Surfaces ───────── */
export const Card = ({ children, className = '', hover, onClick }: { children: ReactNode; className?: string; hover?: boolean; onClick?: () => void }) => (
  <motion.div
    variants={rise}
    whileHover={hover ? { y: -3 } : undefined}
    transition={spring}
    onClick={onClick}
    className={`liquid rounded-[2rem] ${hover || onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

export const Stagger = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <motion.div variants={stagger} initial="hidden" animate="show" className={className}>{children}</motion.div>
);

export const Badge = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'good' | 'warn' | 'bad' | 'dark' }) => {
  const t = {
    neutral: 'bg-ink/5 text-ink-2', brand: 'bg-brand-soft text-brand', good: 'bg-good/10 text-good',
    warn: 'bg-warn/10 text-warn', bad: 'bg-bad/10 text-bad', dark: 'bg-ink text-white',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${t}`}>{children}</span>;
};

export const Avatar = ({ name, size = 36 }: { name?: string; size?: number }) => {
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  const hue = [...(name || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hue} 38% 38%)` }}
    >
      {letter}
    </span>
  );
};

/* ───────── Form controls ───────── */
const FIELD = 'w-full bg-white/55 glass-fill border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...p }, ref) => <input ref={ref} className={`${FIELD} ${className}`} {...p} />);
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...p }, ref) => <textarea ref={ref} className={`${FIELD} resize-none ${className}`} {...p} />);
type Opt = { value: string; label: string; disabled: boolean };
const collectOptions = (children: ReactNode, out: Opt[] = []): Opt[] => {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    if (el.type === Fragment) { collectOptions(el.props.children, out); return; }
    const label = Children.toArray(el.props.children).filter((x) => typeof x === 'string' || typeof x === 'number').join('');
    out.push({ value: String(el.props.value ?? label), label, disabled: !!el.props.disabled });
  });
  return out;
};

/** Custom dropdown. Same props as a native <select> + <option> children, but the list always opens below the field. */
export const Select = ({ className = '', value, onChange, disabled, children, id, ...aria }: SelectHTMLAttributes<HTMLSelectElement>) => {
  const opts = collectOptions(children);
  const cur = String(value ?? '');
  const sel = opts.find((o) => o.value === cur) ?? (cur === '' ? opts[0] : undefined);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, max: 280 });
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setBox({ left: r.left, top: r.bottom + 8, width: r.width, max: Math.max(140, Math.min(320, window.innerHeight - r.bottom - 20)) });
  };
  const show = () => {
    if (disabled) return;
    place();
    setActive(Math.max(0, opts.findIndex((o) => o.value === sel?.value)));
    setOpen(true);
  };
  const pick = (o: Opt) => {
    if (o.disabled) return;
    setOpen(false);
    btn.current?.focus();
    if (o.value !== cur) onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } } as unknown as ChangeEvent<HTMLSelectElement>);
  };

  useEffect(() => {
    if (!open) return;
    const move = () => place();
    const down = (e: MouseEvent) => { if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => { let n = a; for (let i = 0; i < opts.length; i++) { n = (n + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; if (!opts[n].disabled) break; } return n; });
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (opts[active]) pick(opts[active]); }
      else if (e.key === 'Tab') setOpen(false);
    };
    window.addEventListener('scroll', move, true);
    window.addEventListener('resize', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('scroll', move, true);
      window.removeEventListener('resize', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('keydown', key, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, opts.length]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const root = typeof document !== 'undefined' ? document.querySelector('[data-app-root]') || document.body : null;
  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={aria['aria-label']}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); show(); } }}
        className={`${FIELD} flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${open ? '!border-brand !ring-4 !ring-brand/10' : ''} ${className}`}
      >
        <span className={`truncate ${sel ? '' : 'text-muted/70'}`}>{sel?.label ?? ''}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} className="shrink-0 text-muted inline-flex">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </motion.span>
      </button>
      {root && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={list}
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
              style={{ position: 'fixed', left: box.left, top: box.top, minWidth: box.width, maxHeight: box.max, transformOrigin: 'top' }}
              className="glass-pop !bg-white/[0.97] z-[400] rounded-2xl p-1.5 overflow-y-auto scroll-y text-ink"
            >
              {opts.map((o, i) => {
                const on = o.value === sel?.value;
                return (
                  <button
                    key={o.value + i}
                    type="button"
                    role="option"
                    aria-selected={on}
                    data-i={i}
                    disabled={o.disabled}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition-colors disabled:opacity-40 ${on ? 'font-bold text-brand' : 'font-medium'} ${i === active ? 'bg-ink/[0.07]' : ''}`}
                  >
                    <span className="truncate">{o.label || '—'}</span>
                    {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        root,
      )}
    </>
  );
};
export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block">
    <span className="block text-xs font-bold text-ink-2 mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-muted mt-1">{hint}</span>}
  </label>
);

/* ───────── Overlays ───────── */
export const Modal = ({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) => {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0, scale: 0.98 }} transition={spring}
            className={`relative glass-pop w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-[2rem]`}
          >
            {title && (
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
                <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-ink/5 text-muted grid place-items-center">✕</button>
              </div>
            )}
            <div className="px-6 pb-6 pt-1 scroll-y">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const Drawer = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 z-[150]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
        <motion.aside
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 h-full w-full sm:w-[520px] glass-pop sm:rounded-l-[2rem] flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h3 className="text-lg font-extrabold tracking-tight truncate">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-ink/5 text-muted grid place-items-center">✕</button>
          </div>
          <div className="flex-1 scroll-y p-6">{children}</div>
        </motion.aside>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ───────── Data display ───────── */
export const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
};

export const Ring = ({ value, size = 96, stroke = 9, label, color = 'var(--color-brand)' }: { value: number | null; size?: number; stroke?: number; label?: string; color?: string }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (pct / 100) * c }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-extrabold text-lg tabular-nums">{value === null ? '—' : <AnimatedNumber value={pct} suffix="%" />}</div>
      </div>
      {label && <span className="text-[11px] font-bold text-muted text-center">{label}</span>}
    </div>
  );
};

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`rounded-xl bg-ink/[0.06] animate-pulse ${className}`} />;

export const Empty = ({ icon = '✨', title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) => (
  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-14 px-6">
    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} className="text-4xl mb-3">{icon}</motion.div>
    <p className="font-bold text-ink">{title}</p>
    {hint && <p className="text-sm text-muted mt-1 max-w-xs mx-auto">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </motion.div>
);

export const Tabs = <T extends string>({ value, onChange, items, id }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[]; id: string }) => (
  <div className="inline-flex bg-ink/[0.05] dark:bg-ink/[0.08] rounded-xl p-1 gap-0.5">
    {items.map((it) => (
      <button key={it.key} onClick={() => onChange(it.key)} className={`relative px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${value === it.key ? 'text-ink' : 'text-muted hover:text-ink'}`}>
        {value === it.key && <motion.span layoutId={`tab-${id}`} transition={spring} className="absolute inset-0 bg-white/80 glass-fill dark:bg-ink/[0.16] rounded-lg shadow-card" />}
        <span className="relative">{it.label}{it.count !== undefined && <span className="ml-1.5 text-[11px] text-muted">{it.count}</span>}</span>
      </button>
    ))}
  </div>
);

export const PageTitle = ({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="text-muted mt-1">{sub}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/** Small hook for loading async data with a refresh handle. */
export const useAsync = <T,>(fn: () => Promise<T>, deps: unknown[] = []) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn().then((d) => alive && (setData(d), setError(null))).catch((e) => alive && setError(e?.message || 'Something went wrong')).finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
};
