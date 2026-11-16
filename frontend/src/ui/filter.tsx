import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

/* One filter control for the whole app: a sliders icon that opens a panel with every filter for the page. */

export interface FilterOption { value: string; label: string; count?: number; hint?: string }

interface Base { id: string; label: string; hidden?: boolean; hint?: string }
/** Pick one value. `defaultValue` is what "no filter" looks like. `view` marks a display choice (sort, group) that is not counted as a filter. */
export interface SingleGroup extends Base { kind: 'single'; options: FilterOption[]; value: string; defaultValue: string; onChange: (v: string) => void; view?: boolean }
/** Pick any number of values. Nothing picked means no filter. */
export interface MultiGroup extends Base { kind: 'multi'; options: FilterOption[]; value: string[]; onChange: (v: string[]) => void }
/** A yes/no switch. */
export interface ToggleGroup extends Base { kind: 'toggle'; value: boolean; onChange: (v: boolean) => void }
/** A search box inside the panel, for pages whose search lives in the filter. */
export interface TextGroup extends Base { kind: 'text'; value: string; onChange: (v: string) => void; placeholder?: string }
export type FilterGroup = SingleGroup | MultiGroup | ToggleGroup | TextGroup;

const isActive = (g: FilterGroup) => (g.kind === 'single' ? !g.view && g.value !== g.defaultValue : g.kind === 'multi' ? g.value.length > 0 : g.kind === 'text' ? g.value.trim() !== '' : g.value);
const reset = (g: FilterGroup) => {
  if (g.kind === 'single') { if (!g.view) g.onChange(g.defaultValue); } else if (g.kind === 'multi') g.onChange([]); else if (g.kind === 'text') g.onChange(''); else g.onChange(false);
};

/** The sliders icon: three lines, each with a small ring on it. */
export const SlidersIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
    <path d="M3 6h10.6M18.4 6H21" /><circle cx="16" cy="6" r="2.4" />
    <path d="M3 12h2.6M10.4 12H21" /><circle cx="8" cy="12" r="2.4" />
    <path d="M3 18h11.6M19.4 18H21" /><circle cx="17" cy="18" r="2.4" />
  </svg>
);

const Mark = ({ on, round }: { on: boolean; round?: boolean }) => (
  <span className={`w-[18px] h-[18px] shrink-0 grid place-items-center border-2 transition-colors ${round ? 'rounded-full' : 'rounded-md'} ${on ? 'border-ink bg-ink text-white' : 'border-ink/25 text-transparent'}`}>
    {on && (round
      ? <span className="w-1.5 h-1.5 rounded-full bg-white" />
      : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>)}
  </span>
);

const Row = ({ on, round, label, count, hint, onClick, role }: { on: boolean; round?: boolean; label: string; count?: number; hint?: string; onClick: () => void; role: 'radio' | 'checkbox' }) => (
  <button type="button" role={role} aria-checked={on} onClick={onClick}
    className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${on ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.05]'}`}>
    <Mark on={on} round={round} />
    <span className="min-w-0 flex-1">
      <span className="block text-[13.5px] leading-tight truncate">{label}</span>
      {hint && <span className="block text-[11px] text-muted truncate">{hint}</span>}
    </span>
    {count !== undefined && <span className="text-[11px] tabular-nums text-muted shrink-0">{count}</span>}
  </button>
);

const Section = ({ g }: { g: FilterGroup }) => {
  if (g.kind === 'text') {
    return (
      <div>
        <p className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{g.label}</p>
        <input value={g.value} onChange={(e) => g.onChange(e.target.value)} placeholder={g.placeholder} aria-label={g.label} className="w-full rounded-xl bg-ink/[0.05] border border-ink/10 px-3 py-2 text-[13.5px] outline-none focus:border-brand" />
      </div>
    );
  }
  if (g.kind === 'toggle') {
    return (
      <button type="button" role="switch" aria-checked={g.value} onClick={() => g.onChange(!g.value)} className="w-full flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-ink/[0.05] transition-colors">
        <span className="min-w-0"><span className="block text-[13.5px] leading-tight">{g.label}</span>{g.hint && <span className="block text-[11px] text-muted">{g.hint}</span>}</span>
        <span className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${g.value ? 'bg-ink' : 'bg-ink/20'}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#ffffff] shadow transition-transform ${g.value ? 'translate-x-4' : ''}`} /></span>
      </button>
    );
  }
  const long = g.options.length > 7;
  return (
    <div>
      <p className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted flex items-center justify-between">
        <span>{g.label}</span>
        {g.kind === 'multi' && g.value.length > 0 && <button type="button" onClick={() => g.onChange([])} className="normal-case tracking-normal text-[11px] font-semibold text-muted hover:text-ink">Clear</button>}
      </p>
      <div role={g.kind === 'single' ? 'radiogroup' : 'group'} aria-label={g.label} className={long ? 'max-h-44 overflow-y-auto scroll-y' : ''}>
        {g.options.map((o) => {
          const on = g.kind === 'single' ? g.value === o.value : g.value.includes(o.value);
          return (
            <Row key={o.value} on={on} round={g.kind === 'single'} role={g.kind === 'single' ? 'radio' : 'checkbox'} label={o.label} count={o.count} hint={o.hint}
              onClick={() => (g.kind === 'single' ? g.onChange(o.value) : g.onChange(on ? g.value.filter((v) => v !== o.value) : [...g.value, o.value]))} />
          );
        })}
      </div>
    </div>
  );
};

/**
 * The filter button. It sits in a page's toolbar, the same height as the search box, shows how many filters are on, and opens the panel.
 * `size` is the button's height: "sm" 36px (headers), "md" 40px (search rows).
 */
export const FilterMenu = ({ groups, title = 'Filters', size = 'md', variant = 'default', className = '' }: { groups: FilterGroup[]; title?: string; size?: 'sm' | 'md'; variant?: 'default' | 'bar'; className?: string }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const visible = groups.filter((g) => !g.hidden);
  const filters = visible.filter((g) => !(g.kind === 'single' && g.view));
  const views = visible.filter((g) => g.kind === 'single' && g.view);
  const count = filters.filter(isActive).length;
  const summary = filters.filter(isActive).map((g) => g.label).join(', ');

  const place = useCallback(() => {
    const b = btn.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const w = Math.min(328, window.innerWidth - 24);
    // open toward the side with more room, and never off the screen
    const left = Math.max(12, Math.min(r.right - w, window.innerWidth - w - 12));
    const top = r.bottom + 8;
    setPos({ top, left, maxH: Math.max(260, window.innerHeight - top - 16) });
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const scroll = (e: Event) => { if (!panel.current?.contains(e.target as Node)) place(); }; // follow the button; never close on a stray scroll
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('resize', place); window.removeEventListener('scroll', scroll, true); };
  }, [open, place]);

  const host = typeof document !== 'undefined' ? (document.querySelector('[data-app-root]') ?? document.body) : null;
  // "md" stretches to the height of the row it sits in (the search box), so the two always line up.
  const dim = size === 'sm' ? 'h-9 w-9' : 'self-stretch min-h-10 min-w-11';

  const body: ReactNode = (
    <AnimatePresence>
      {open && pos && (
        <motion.div ref={panel} role="dialog" aria-label={title} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.min(328, window.innerWidth - 24), maxHeight: pos.maxH }}
          className="z-[180] flex flex-col rounded-2xl glass-pop text-ink overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5 border-b border-ink/10">
            <p className="text-sm font-extrabold flex items-center gap-2">{title}{count > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-ink text-white text-[11px] font-bold grid place-items-center">{count}</span>}</p>
            <button type="button" disabled={count === 0} onClick={() => filters.forEach(reset)} className="text-[12.5px] font-semibold text-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed">Reset all</button>
          </div>
          <div className="overflow-y-auto scroll-y p-2 space-y-3 flex-1 min-h-0">
            {filters.filter((g) => g.kind === 'text').map((g) => <Section key={g.id} g={g} />)}
            {filters.filter((g) => g.kind !== 'toggle' && g.kind !== 'text').map((g) => <Section key={g.id} g={g} />)}
            {filters.some((g) => g.kind === 'toggle') && (
              <div className="border-t border-ink/10 pt-2">{filters.filter((g) => g.kind === 'toggle').map((g) => <Section key={g.id} g={g} />)}</div>
            )}
            {views.length > 0 && (
              <div className="border-t border-ink/10 pt-3 space-y-3">{views.map((g) => <Section key={g.id} g={g} />)}</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen((o) => !o)} aria-label={count ? `${title}, ${count} on` : title} aria-expanded={open} aria-haspopup="dialog" title={count ? `${title}: ${summary}` : title}
        className={`relative shrink-0 ${dim} rounded-xl grid place-items-center transition-colors ${variant === 'bar' ? `tl-bar text-ink hover:opacity-80 ${open || count > 0 ? '!bg-ink !text-white' : ''}` : `border ${open || count > 0 ? 'bg-ink text-white border-ink' : 'bg-white/55 glass-fill border-white/70 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:brightness-105'}`} ${className}`}>
        <SlidersIcon />
        {count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center ring-2 ring-white">{count}</span>}
      </button>
      {host && createPortal(body, host)}
    </>
  );
};
