import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../../ui';
import { spring } from '../../../lib/motion';
import { LANDING_ICONS, landingIcon } from '../../../lib/landingIcons';
import { ConfirmModal, G, PModal } from '../shared';

export const FIELD = 'w-full rounded-2xl bg-white/55 border border-white/70 px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10';
export const LBL = 'block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted mb-2';

export type Kind = 'text' | 'long' | 'lines' | 'icon';
export interface FieldSpec<T> { key: keyof T & string; label: string; kind?: Kind; half?: boolean; hint?: string }

/** A switch used for "show / hide" style choices. */
export const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? 'bg-good' : 'bg-ink/20'}`}>
    <motion.span layout transition={spring} className={`absolute top-1 w-5 h-5 rounded-full shadow ${on ? 'bg-white right-1' : 'bg-white dark:bg-ink/70 left-1'}`} />
  </button>
);

const round = 'w-9 h-9 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-ink/10 transition-colors disabled:opacity-30 disabled:pointer-events-none';

/** Items as big cards. Click a card to edit it in a form; move it with the arrows; delete it; or add a new one. */
export function CardEditor<T extends Record<string, any>>({ items, onChange, fields, title, excerpt, iconOf, noun, blank, canAdd = true, canDelete = true, cardExtra, formExtra, cols = 'sm:grid-cols-2 2xl:grid-cols-3' }: {
  items: T[];
  onChange: (next: T[]) => void;
  fields: FieldSpec<T>[];
  title: (item: T, i: number) => string;
  excerpt?: (item: T) => string;
  iconOf?: (item: T) => string | undefined;
  noun: string;
  blank: () => T;
  canAdd?: boolean;
  canDelete?: boolean;
  cardExtra?: (item: T, patch: (p: Partial<T>) => void) => ReactNode;
  formExtra?: (item: T, patch: (p: Partial<T>) => void) => ReactNode;
  cols?: string;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [del, setDel] = useState<number | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const patch = (i: number, p: Partial<T>) => onChange(items.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };
  const openEdit = (i: number) => { setEditing(i); setEditOpen(true); };
  const cur = editing !== null ? items[editing] : undefined;

  const input = (f: FieldSpec<T>, it: T, i: number) => {
    const v = it[f.key];
    switch (f.kind) {
      case 'long': return <textarea className={`${FIELD} resize-y`} rows={4} value={String(v ?? '')} onChange={(e) => patch(i, { [f.key]: e.target.value } as Partial<T>)} />;
      case 'lines': return <textarea className={`${FIELD} resize-y`} rows={7} value={Array.isArray(v) ? v.join('\n') : ''} onChange={(e) => patch(i, { [f.key]: e.target.value.split('\n') } as Partial<T>)} placeholder="One point per line" />;
      case 'icon': return (
        <div className="flex flex-wrap gap-2">
          {LANDING_ICONS.map((n) => (
            <button key={n} type="button" aria-label={n} aria-pressed={v === n} onClick={() => patch(i, { [f.key]: n } as Partial<T>)} className={`w-12 h-12 rounded-2xl grid place-items-center transition-colors ${v === n ? 'bg-ink text-white' : 'bg-white/55 border border-white/70 text-muted hover:text-ink'}`}>{landingIcon(n, 20)}</button>
          ))}
        </div>
      );
      default: return <input className={FIELD} value={String(v ?? '')} onChange={(e) => patch(i, { [f.key]: e.target.value } as Partial<T>)} />;
    }
  };

  return (
    <>
      <ul className={`grid grid-cols-1 ${cols} gap-4`}>
        {items.map((it, i) => {
          const ic = iconOf?.(it);
          const t = title(it, i);
          const ex = excerpt?.(it);
          return (
            <li key={i} className="liquid rounded-[1.5rem] flex flex-col min-w-0">
              <button type="button" onClick={() => openEdit(i)} className="text-left p-5 flex-1 min-w-0 rounded-t-[1.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 shrink-0 rounded-2xl bg-ink/[0.07] grid place-items-center text-ink-2 text-sm font-extrabold tabular-nums">{ic ? landingIcon(ic, 20) : i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-extrabold leading-snug break-words line-clamp-2">{t || <em className="font-medium text-muted">Untitled {noun}</em>}</p>
                    {ex && <p className="text-sm text-muted mt-1.5 line-clamp-3 break-words">{ex}</p>}
                  </div>
                </div>
              </button>
              {cardExtra && <div className="px-5 pb-3">{cardExtra(it, (p) => patch(i, p))}</div>}
              <div className="flex items-center gap-1 px-3 py-2 border-t border-white/60">
                <Button size="sm" variant="soft" className="!rounded-full" onClick={() => openEdit(i)}>{G.edit} Edit</Button>
                <span className="flex-1" />
                <button type="button" aria-label="Move earlier" title="Move earlier" className={round} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" aria-label="Move later" title="Move later" className={round} disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                {canDelete && <button type="button" aria-label="Delete" title="Delete" className={`${round} hover:!text-bad`} onClick={() => { setDel(i); setDelOpen(true); }}>{G.trash}</button>}
              </div>
            </li>
          );
        })}
        {canAdd && (
          <li>
            <button type="button" onClick={() => { onChange([...items, blank()]); openEdit(items.length); }} className="w-full h-full min-h-[8.5rem] rounded-[1.5rem] border-2 border-dashed border-ink/20 hover:border-ink/45 hover:bg-white/40 transition-colors grid place-items-center text-muted hover:text-ink">
              <span className="text-center"><span className="block text-3xl leading-none">+</span><span className="block text-sm font-bold mt-1.5">Add {noun}</span></span>
            </button>
          </li>
        )}
      </ul>

      <PModal wide open={editOpen} onClose={() => setEditOpen(false)} title={`Edit ${noun}`}>
        {cur && editing !== null && (
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <label key={f.key} className={`block ${f.half ? '' : 'sm:col-span-2'}`}>
                <span className={LBL}>{f.label}</span>
                {input(f, cur, editing)}
                {f.hint && <span className="block text-xs text-muted mt-1.5">{f.hint}</span>}
              </label>
            ))}
            {formExtra?.(cur, (p) => patch(editing, p))}
            <div className="sm:col-span-2 flex justify-end pt-1"><Button className="!rounded-full" onClick={() => setEditOpen(false)}>Done</Button></div>
          </div>
        )}
      </PModal>

      <ConfirmModal open={delOpen} title={`Delete this ${noun}?`} confirmLabel="Delete" danger onConfirm={() => { if (del !== null) onChange(items.filter((_, k) => k !== del)); setDelOpen(false); }} onClose={() => setDelOpen(false)}>
        <p><strong>{del !== null && items[del] ? title(items[del], del) || `This ${noun}` : ''}</strong> will be removed from the draft.</p>
        <p className="text-muted">It only disappears for everyone when you publish. Discard the draft to get it back.</p>
      </ConfirmModal>
    </>
  );
}
