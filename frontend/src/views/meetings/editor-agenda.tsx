import { useMemo, useState } from 'react';
import { shortcut } from '../../lib/platform';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { Button, Empty, Textarea } from '../../ui';
import { Icon } from '../../shell/icons';
import { parseAgendaText } from './editor-agenda-parse';
import { AutoTextarea } from './editor-fields';
import { Reveal } from './editor-basics';
import { uid, type EAgendaItem } from './editor-types';

const PLACEHOLDER = `1. Budget review (Ramesh)
* Q1 spending vs plan
* Approve Q2 budget
2. Safety walkthrough (Anil)
- Last month's incidents
3. Next steps`;

/* ───────── One editable, draggable agenda item ───────── */
const Row = ({ item, index, count, autoFocus, onText, onRemove, onMove, onAddBelow }: {
  item: EAgendaItem; index: number; count: number; autoFocus: boolean;
  onText: (t: string) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void; onAddBelow: () => void;
}) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item.id}
      dragListener={false}
      dragControls={controls}
      // No y here: Reorder.Item owns the y motion value while dragging.
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0, transition: { duration: 0.18 } }}
      transition={spring}
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 40px -18px rgb(6 20 27 / 0.35)', zIndex: 5 }}
      className="relative flex items-start gap-2 sm:gap-3 liquid rounded-3xl p-3 sm:p-4 mb-2.5 list-none"
    >
      <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
        <span className="w-7 h-7 rounded-lg bg-brand-soft text-brand text-xs font-extrabold grid place-items-center">{index + 1}</span>
        <button
          type="button"
          aria-label="Drag to reorder"
          onPointerDown={(e) => controls.start(e)}
          style={{ touchAction: 'none' }}
          className="w-7 h-7 rounded-lg text-muted hover:text-ink hover:bg-ink/5 cursor-grab active:cursor-grabbing grid place-items-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7" /><circle cx="15" cy="6" r="1.7" /><circle cx="9" cy="12" r="1.7" /><circle cx="15" cy="12" r="1.7" /><circle cx="9" cy="18" r="1.7" /><circle cx="15" cy="18" r="1.7" /></svg>
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <AutoTextarea
          value={item.text}
          autoFocus={autoFocus}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onAddBelow(); } }}
          placeholder="What will be discussed?"
          aria-label={`Agenda item ${index + 1}`}
          className="text-sm leading-relaxed font-medium text-ink placeholder:text-muted/70 whitespace-pre-wrap py-1"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-0.5 shrink-0">
        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-ink/5 disabled:opacity-25 disabled:pointer-events-none grid place-items-center text-xs">↑</button>
        <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-ink/5 disabled:opacity-25 disabled:pointer-events-none grid place-items-center text-xs">↓</button>
        <button type="button" aria-label="Delete item" onClick={onRemove} className="w-8 h-8 rounded-lg text-muted hover:text-bad hover:bg-bad/10 grid place-items-center text-sm">✕</button>
      </div>
    </Reorder.Item>
  );
};

/* ───────── Step 2 ───────── */
export const AgendaStep = ({ items, onChange }: { items: EAgendaItem[]; onChange: (items: EAgendaItem[]) => void }) => {
  const toast = useToast();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [text, setText] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const parsed = useMemo(() => (pasteOpen ? parseAgendaText(text) : []), [pasteOpen, text]);

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const setItemText = (id: string, t: string) => onChange(items.map((i) => (i.id === id ? { ...i, text: t } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };
  const addAt = (index: number) => {
    const fresh: EAgendaItem = { id: uid(), text: '' };
    const next = [...items];
    next.splice(index, 0, fresh);
    onChange(next);
    setFocusId(fresh.id);
  };

  const applyPaste = (replace: boolean) => {
    if (parsed.length === 0) return;
    // Each block (numbered headline + all its sub-points) is ONE agenda string.
    const added: EAgendaItem[] = parsed.map((b) => ({ id: uid(), text: b.text }));
    const keep = replace ? [] : items.filter((i) => i.text.trim());
    onChange([...keep, ...added]);
    setText('');
    setPasteOpen(false);
    toast(`Added ${added.length} agenda item${added.length === 1 ? '' : 's'}`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">What's on the agenda?</h2>
          <p className="text-sm text-muted mt-1 max-w-md">Add the topics for this meeting. Each item can hold several lines, like a heading with bullet points under it. You can edit, reorder or remove anything at any time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={pasteOpen ? 'primary' : 'soft'} size="sm" onClick={() => setPasteOpen((o) => !o)}>
            {pasteOpen ? 'Close paste box' : 'Paste agenda'}
          </Button>
          <Button size="sm" onClick={() => addAt(items.length)}>{Icon.plus(14)} Add item</Button>
        </div>
      </div>

      <Reveal show={pasteOpen}>
        <div className="mb-5 rounded-2xl border border-brand/20 bg-brand-soft/50 p-4">
          <p className="text-sm font-bold">Paste a whole agenda from Word or Docs</p>
          <p className="text-xs text-muted mt-1 mb-3">
            Every numbered line (1. 2. 3.) starts a new agenda item. Bullets and indented lines underneath stay together with it, exactly as you pasted them. Your minutes are not touched.
          </p>
          <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER} className="font-mono text-[13px] leading-relaxed" />

          <AnimatePresence initial={false}>
            {parsed.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted mt-4 mb-2">Preview · {parsed.length} item{parsed.length === 1 ? '' : 's'}</p>
                <div className="max-h-64 scroll-y rounded-xl bg-white/70 glass-fill border border-line divide-y divide-line">
                  {parsed.map((b, i) => (
                    <div key={i} className="px-3.5 py-2.5 flex gap-3">
                      <span className="w-6 h-6 rounded-md bg-brand-soft text-brand text-[11px] font-extrabold grid place-items-center shrink-0">{i + 1}</span>
                      <p className="text-sm whitespace-pre-wrap break-words min-w-0">
                        <span className="font-semibold">{b.headline}</span>
                        {b.subPoints.length > 0 && <span className="block text-muted">{b.subPoints.join('\n')}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => { setText(''); setPasteOpen(false); }}>Cancel</Button>
            {items.some((i) => i.text.trim()) && (
              <Button variant="soft" size="sm" disabled={parsed.length === 0} onClick={() => applyPaste(true)}>Replace current agenda</Button>
            )}
            <Button size="sm" disabled={parsed.length === 0} onClick={() => applyPaste(false)}>
              Add {parsed.length > 0 ? parsed.length : ''} to agenda
            </Button>
          </div>
        </div>
      </Reveal>

      {items.length === 0 ? (
        <Empty
          icon="📝"
          title="No agenda yet"
          hint="Add a first item, or paste a ready-made agenda. You can also skip this and go straight to the minutes."
          action={<div className="flex justify-center gap-2"><Button variant="soft" onClick={() => setPasteOpen(true)}>Paste agenda</Button><Button onClick={() => addAt(0)}>Add first item</Button></div>}
        />
      ) : (
        <Reorder.Group axis="y" values={ids} onReorder={(order: string[]) => onChange(order.map((id) => byId.get(id)).filter((x): x is EAgendaItem => !!x))} className="list-none p-0 m-0">
          <AnimatePresence initial={false}>
            {items.map((it, i) => (
              <Row
                key={it.id}
                item={it}
                index={i}
                count={items.length}
                autoFocus={focusId === it.id}
                onText={(t) => setItemText(it.id, t)}
                onRemove={() => remove(it.id)}
                onMove={(d) => move(i, d)}
                onAddBelow={() => addAt(i + 1)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {items.length > 0 && <p className="text-[11px] text-muted mt-3 text-center">Tip: press {shortcut('Enter')} inside an item to add a new one right below it.</p>}
    </div>
  );
};
