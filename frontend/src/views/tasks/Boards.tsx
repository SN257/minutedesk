import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { addDaysToDateString, getLocalDateString } from '../../lib/date';
import { Avatar, Button, Input, Modal, Skeleton } from '../../ui';
import { Icon } from '../../shell/icons';
import { PRIORITIES, bucketOf, type BoardRec, cardToItem, dueLabel, labelHex, loadBoardLabels, parseQuickAdd, type CardRec, type Item, type ListRec } from './model';
import { AssigneeAvatar, CheckCircle } from './parts';
import { TIcon, iconPath, type TIconName } from './icons';
import { setCrumbs } from '../../lib/crumbs';
import { Pop } from './pop';
import { FilterMenu } from '../../ui/filter';
import type { WorkspacesApi } from './workspaces';
import type { TasksData } from './useTasksData';

const BG_KEY = 'mdv2-board-bg-';

/** Board backgrounds are tints of the theme colours, so they follow light and dark. */
export const BACKGROUNDS: { key: string; label: string; css: string }[] = [
  { key: 'default', label: 'Default', css: 'linear-gradient(135deg, transparent, transparent)' },
  { key: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 38%, transparent), color-mix(in srgb, var(--color-good) 22%, transparent))' },
  { key: 'forest', label: 'Forest', css: 'linear-gradient(135deg, color-mix(in srgb, var(--color-good) 42%, transparent), color-mix(in srgb, var(--color-brand) 16%, transparent))' },
  { key: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, color-mix(in srgb, var(--color-warn) 42%, transparent), color-mix(in srgb, var(--color-bad) 26%, transparent))' },
  { key: 'rose', label: 'Rose', css: 'linear-gradient(135deg, color-mix(in srgb, var(--color-bad) 34%, transparent), color-mix(in srgb, var(--color-warn) 14%, transparent))' },
  { key: 'dusk', label: 'Dusk', css: 'linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 55%, transparent), color-mix(in srgb, var(--color-bad) 18%, transparent))' },
];
export const readBg = (id: string) => { try { return localStorage.getItem(BG_KEY + id) || 'default'; } catch { return 'default'; } };

export const hash = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

/** Cover gradients for tiles: stronger than the board canvas tints, still made from the theme colours. */
const mix = (c: string, p: number, over = '#06141b') => `color-mix(in srgb, var(--color-${c}) ${p}%, ${over})`;
export const COVER: Record<string, string> = {
  ocean: `linear-gradient(135deg, ${mix('brand', 78)}, ${mix('good', 60, 'var(--color-brand)')})`,
  forest: `linear-gradient(135deg, ${mix('good', 82)}, ${mix('brand', 55, 'var(--color-good)')})`,
  sunset: `linear-gradient(135deg, ${mix('warn', 85)}, ${mix('bad', 80)})`,
  rose: `linear-gradient(135deg, ${mix('bad', 82)}, ${mix('brand', 45, 'var(--color-bad)')})`,
  dusk: `linear-gradient(135deg, ${mix('brand', 85)}, ${mix('bad', 55, 'var(--color-brand)')})`,
};
export const COVER_KEYS = Object.keys(COVER);

/** Board cover: the chosen background, or one picked from the title, with soft light on top. */
export const cover = (b: BoardRec) => {
  const key = readBg(b.id);
  const base = COVER[key] ?? COVER[COVER_KEYS[hash(b.title) % COVER_KEYS.length]];
  return { backgroundImage: `radial-gradient(120% 90% at 0% 0%, rgb(255 255 255 / 0.28), transparent 55%), ${base}` };
};


export const writeBg = (id: string, k: string) => { try { localStorage.setItem(BG_KEY + id, k); } catch { /* ignore */ } };

interface Filters { q: string; members: string[]; labels: string[]; priorities: string[]; due: '' | 'overdue' | 'today' | 'week' | 'month' | 'none'; hideDone: boolean }
const NO_FILTERS: Filters = { q: '', members: [], labels: [], priorities: [], due: '', hideDone: false };

type Drag = { type: 'card' | 'list'; id: string } | null;
interface Over { listId: string; beforeId: string | null }

/* ───────── small pieces ───────── */
const Dots = () => <TIcon name="more" />;

const barBtn = 'tl-bar inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink hover:opacity-80 transition-opacity';

const LabelPill = ({ name, hex }: { name: string; hex: string }) => (
  <span className="inline-flex items-center rounded-md px-2 py-[3px] text-[10.5px] font-extrabold leading-none text-[#ffffff] max-w-full truncate" style={{ background: hex }}>{name}</span>
);

const Badge2 = ({ children, tone = 'plain', title }: { children: ReactNode; tone?: 'plain' | 'bad' | 'warn' | 'good' | 'done'; title?: string }) => (
  <span title={title} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[11px] font-bold ${
    tone === 'bad' ? 'bg-bad text-[#ffffff]' : tone === 'warn' ? 'bg-warn text-[#06141b]' : tone === 'good' ? 'bg-good text-[#06141b]' : tone === 'done' ? 'bg-good/20 text-good' : 'text-muted'}`}>
    {children}
  </span>
);

const Svg = ({ d, size = 12 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const CLOCK = iconPath('clock');
const CHECK = iconPath('checklist');
const TEXT = iconPath('description');
const FLAG = iconPath('flag');

/* ───────── Card tile ───────── */
const CardTile = ({ card, item, today, data, defs, dragging, labelsOpen, onLabels, onOpen, onMenu, onDragStart, onDragEnd }: {
  card: CardRec; item: Item; today: string; data: TasksData; defs: ReturnType<typeof loadBoardLabels>; dragging: boolean; labelsOpen: boolean; onLabels: () => void;
  onOpen: () => void; onMenu: (r: DOMRect) => void; onDragStart: (e: DragEvent) => void; onDragEnd: () => void;
}) => {
  const b = bucketOf(item, today);
  const dueTone = item.done ? 'done' : b === 'overdue' ? 'bad' : b === 'today' ? 'warn' : 'plain';
  const done = card.checklist.filter((c) => c.done).length;
  const prio = PRIORITIES.find((p) => p.key === card.priority);
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} data-card-id={card.id}>
      <motion.div
        layout="position"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: dragging ? 0.35 : 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
        transition={spring}
        onClick={onOpen}
        className="group relative rounded-lg bg-white shadow-[0_1px_2px_rgb(9_30_66/0.22)] hover:ring-2 hover:ring-brand/50 cursor-pointer overflow-hidden"
      >
        {card.coverColor && <div className="h-8" style={{ background: card.coverColor }} />}
        <div className="px-3 py-2.5">
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5" onClick={(e) => { e.stopPropagation(); onLabels(); }} title="Click to show or hide label names">
              {card.labels.map((l) => (labelsOpen ? <LabelPill key={l} name={l} hex={labelHex(l, defs)} /> : <span key={l} title={l} className="h-2 w-10 rounded-full" style={{ background: labelHex(l, defs) }} />))}
            </div>
          )}
          <div className="flex items-start gap-2">
            <div className={`${card.archived ? '' : 'hidden group-hover:block'} shrink-0 pt-px`}><CheckCircle done={card.archived} size={18} onToggle={() => data.toggleDone(item)} /></div>
            <p className={`flex-1 min-w-0 text-[14px] leading-snug break-words ${card.archived ? 'text-muted line-through decoration-muted/50' : 'text-ink'}`}>{card.title}</p>
            <button type="button" aria-label="Edit card" onClick={(e) => { e.stopPropagation(); onMenu(e.currentTarget.closest('[data-card-id]')!.getBoundingClientRect()); }}
              className="shrink-0 -mr-1.5 -mt-1 w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-ink/10 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition"><TIcon name="edit" size={15} /></button>
          </div>
          {(card.dueDate || card.description || card.checklist.length > 0 || prio || card.assignee) && (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-1.5 -ml-1.5">
              {card.dueDate && <Badge2 tone={dueTone} title="Due date"><Svg d={CLOCK} />{dueLabel(card.dueDate, today)}</Badge2>}
              {card.description && <Badge2 title="Has a description"><Svg d={TEXT} /></Badge2>}
              {card.checklist.length > 0 && <Badge2 tone={done === card.checklist.length ? 'done' : 'plain'} title="Checklist"><Svg d={CHECK} />{done}/{card.checklist.length}</Badge2>}
              {prio && <Badge2 title={`${prio.label} priority`}><span className={`w-2 h-2 rounded-full ${prio.dot}`} /><Svg d={FLAG} /></Badge2>}
              {card.assignee && <span className="ml-auto pr-1.5"><AssigneeAvatar users={data.users} id={card.assignee} size={24} /></span>}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* ───────── Column ───────── */
const Column = ({ list, cards, total, data, today, defs, labelsOpen, onLabels, drag, over, listOver, onOver, onListOver, onDropHere, onDropList, onOpen, onMenu, onDragStart, onDragEnd, onListDragStart }: {
  list: ListRec; cards: CardRec[]; total: number; data: TasksData; today: string; defs: ReturnType<typeof loadBoardLabels>; labelsOpen: boolean; onLabels: () => void;
  drag: Drag; over: Over | null; listOver: { id: string; after: boolean } | null;
  onOver: (o: Over | null) => void; onListOver: (o: { id: string; after: boolean } | null) => void;
  onDropHere: (listId: string) => void; onDropList: (targetId: string) => void;
  onOpen: (c: CardRec) => void; onMenu: (c: CardRec, r: DOMRect) => void;
  onDragStart: (e: DragEvent, id: string) => void; onDragEnd: () => void; onListDragStart: (e: DragEvent, id: string) => void;
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.title);
  const [confirm, setConfirm] = useState(false);
  const draggingCard = drag?.type === 'card' ? drag.id : null;
  const isOver = !!draggingCard && over?.listId === list.id;
  const listTarget = drag?.type === 'list' && listOver?.id === list.id && drag.id !== list.id ? listOver : null;

  const handleOver = (e: DragEvent) => {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (drag.type === 'list') {
      const r = e.currentTarget.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      if (listOver?.id !== list.id || listOver.after !== after) onListOver({ id: list.id, after });
      return;
    }
    const nodes = Array.from(bodyRef.current?.querySelectorAll<HTMLElement>('[data-card-id]') ?? []).filter((n) => n.dataset.cardId !== drag.id);
    let beforeId: string | null = null;
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { beforeId = n.dataset.cardId ?? null; break; }
    }
    if (over?.listId !== list.id || over.beforeId !== beforeId) onOver({ listId: list.id, beforeId });
  };

  const submitCard = async (e?: FormEvent) => {
    e?.preventDefault();
    const { title, dueDate } = parseQuickAdd(text, today);
    if (!title) return;
    setText('');
    await data.addCard(list.id, title, dueDate);
    setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  const saveName = () => {
    const t = name.trim();
    setEditing(false);
    if (t && t !== list.title) data.renameList(list.id, t); else setName(list.title);
  };

  const line = <div className="h-1 mb-2 rounded-full bg-brand pointer-events-none" />;

  return (
    <div
      onDragOver={handleOver}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { if (isOver) onOver(null); if (listTarget) onListOver(null); } }}
      onDrop={(e) => { e.preventDefault(); if (drag?.type === 'list') onDropList(list.id); else onDropHere(list.id); }}
      className={`relative w-[82vw] max-w-[300px] sm:w-[286px] shrink-0 snap-start flex flex-col max-h-full rounded-2xl tl-col ${isOver ? 'ring-2 ring-brand/60' : ''} ${drag?.type === 'list' && drag.id === list.id ? 'opacity-40' : ''}`}
    >
      {listTarget && <span className={`absolute top-0 bottom-0 w-1 rounded-full bg-brand ${listTarget.after ? '-right-2.5' : '-left-2.5'}`} />}
      {/* header (also the drag handle for the whole list) */}
      <div draggable={!editing} onDragStart={(e) => onListDragStart(e, list.id)} onDragEnd={onDragEnd} className="flex items-center gap-1.5 pl-3.5 pr-1.5 pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex-1 min-w-0">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => { if (e.key === 'Escape') { setName(list.title); setEditing(false); } }} className="!py-1.5 font-bold" aria-label="List name" />
          </form>
        ) : (
          <button type="button" onClick={() => { setName(list.title); setEditing(true); }} title="Click to rename" className="flex-1 min-w-0 text-left text-[15px] font-extrabold truncate inline-flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${/done|complete|finish|ship|live/i.test(list.title) ? 'bg-good' : /progress|doing|review|test|wip/i.test(list.title) ? 'bg-warn' : /block|bug|issue/i.test(list.title) ? 'bg-bad' : 'bg-brand'}`} />
            <span className="truncate">{list.title}</span>
          </button>
        )}
        <span className="text-[11px] font-bold text-muted tabular-nums rounded-full bg-ink/[0.08] px-2 py-0.5">{total}</span>
        <Pop align="right" width="w-64" button={(_, toggle) => (
          <button type="button" onClick={toggle} aria-label="List actions" className="w-8 h-8 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/10"><Dots /></button>
        )}>
          {(close) => (
            <div className="space-y-0.5 text-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted px-2 pb-1">List actions</p>
              {!confirm ? (
                <>
                  <button type="button" onClick={() => { close(); setAdding(true); }} className="w-full text-left rounded-lg px-2 py-2 font-semibold hover:bg-ink/[0.07]">Add a card</button>
                  <button type="button" onClick={() => { close(); setName(list.title); setEditing(true); }} className="w-full text-left rounded-lg px-2 py-2 font-semibold hover:bg-ink/[0.07]">Rename list</button>
                  <button type="button" onClick={() => { close(); cards.filter((c) => !c.archived).forEach((c) => data.patchCard(c.id, { archived: true })); }} className="w-full text-left rounded-lg px-2 py-2 font-semibold hover:bg-ink/[0.07]">Mark all cards complete</button>
                  <button type="button" onClick={() => setConfirm(true)} className="w-full text-left rounded-lg px-2 py-2 font-semibold text-bad hover:bg-bad/10">Delete list</button>
                </>
              ) : (
                <div className="px-2 space-y-2">
                  <p className="text-xs font-semibold text-bad">Delete this list{total ? ` and its ${total} ${total === 1 ? 'card' : 'cards'}` : ''}?</p>
                  <div className="flex gap-2"><Button size="sm" variant="danger" onClick={() => { close(); setConfirm(false); data.removeList(list.id); }}>Delete</Button><Button size="sm" variant="soft" onClick={() => setConfirm(false)}>Keep</Button></div>
                </div>
              )}
            </div>
          )}
        </Pop>
      </div>

      {/* cards */}
      <div ref={bodyRef} className="flex-1 min-h-[2rem] overflow-y-auto scroll-y px-2.5 pt-1 pb-1.5">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {cards.map((c) => (
              <div key={c.id}>
                {isOver && over?.beforeId === c.id && line}
                <CardTile
                  card={c} item={cardToItem(c, data.lists, data.boards)} today={today} data={data} defs={defs} dragging={draggingCard === c.id} labelsOpen={labelsOpen} onLabels={onLabels}
                  onOpen={() => onOpen(c)} onMenu={(r) => onMenu(c, r)} onDragStart={(e) => onDragStart(e, c.id)} onDragEnd={onDragEnd}
                />
              </div>
            ))}
          </AnimatePresence>
          {isOver && over?.beforeId === null && line}
          {cards.length === 0 && !isOver && (
            <div className="rounded-xl border-2 border-dashed border-line/80 px-3 py-6 text-center text-xs font-semibold text-muted">{drag ? 'Drop a card here' : total ? 'No cards match' : 'No cards yet'}</div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="px-2 pb-2 pt-1">
        {adding ? (
          <form onSubmit={submitCard} className="space-y-2">
            <textarea
              autoFocus value={text} rows={2} placeholder="Enter a title for this card…  (#fri sets a date)" aria-label="New card title"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCard(); } else if (e.key === 'Escape') { setAdding(false); setText(''); } }}
              className="w-full resize-none rounded-xl bg-white border border-line shadow-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted/70"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" type="submit">Add card</Button>
              <button type="button" aria-label="Close" onClick={() => { setAdding(false); setText(''); }} className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-ink/10">✕</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-semibold text-ink-2 hover:bg-ink/[0.08] transition-colors">
            {Icon.plus(16)} Add a card
          </button>
        )}
      </div>
    </div>
  );
};

/* ───────── Board ───────── */
export const Boards = ({ data, onOpen, boardId, onBoard, ws }: { data: TasksData; onOpen: (id: string) => void; boardId: string; onBoard: (id: string | null) => void; ws: WorkspacesApi }) => {
  const toast = useToast();
  const today = getLocalDateString();
  const setBoardId = onBoard;
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<Over | null>(null);
  const [listOver, setListOver] = useState<{ id: string; after: boolean } | null>(null);
  const [menuCard, setMenuCard] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [labelsOpen, setLabelsOpen] = useState(() => { try { return localStorage.getItem('md2.labels.open') === '1'; } catch { return false; } });
  const toggleLabels = () => setLabelsOpen((v) => { const n = !v; try { localStorage.setItem('md2.labels.open', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  const [addingList, setAddingList] = useState(false);
  const [listName, setListName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const [switcher, setSwitcher] = useState(false);
  const [boardQ, setBoardQ] = useState('');
  const [panes, setPanes] = useState<{ inbox: boolean; planner: boolean }>(() => { try { return { inbox: false, planner: false, ...JSON.parse(localStorage.getItem('md2.panes') || '{}') }; } catch { return { inbox: false, planner: false }; } });
  const togglePane = (k: 'inbox' | 'planner') => setPanes((p) => { const n = { ...p, [k]: !p[k] }; try { localStorage.setItem('md2.panes', JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const [starred, setStarred] = useState(false);
  const [inboxText, setInboxText] = useState('');
  const [newBoard, setNewBoard] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);
  const [deleteBoard, setDeleteBoard] = useState(false);
  const [bgKey, setBgKey] = useState('default');
  const scroller = useRef<HTMLDivElement>(null);

  const board = data.boards.find((b) => b.id === boardId) ?? null;
  const lists = board ? data.listsByBoard[board.id] ?? [] : [];
  const defs = useMemo(() => loadBoardLabels(board?.id ?? null), [board?.id, data.cards]);
  useEffect(() => { if (board) { ws.visit(board.id); setBgKey(readBg(board.id)); try { setStarred(localStorage.getItem(`md2.star.${board.id}`) === '1'); } catch { setStarred(false); } } }, [board?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Breadcrumb in the top bar: Tasks › Workspace › Board. Each level above the board is a link.
  const wsName = board ? ws.wsOf(board.id)?.name : undefined;
  useEffect(() => {
    if (!board) return;
    setCrumbs([
      ...(wsName ? [{ label: wsName, run: () => setBoardId(null) }] : []),
      { label: board.title, run: () => { window.location.hash = '/tasks'; } },
    ]);
    const home = () => setBoardId(null);
    window.addEventListener('md2:tasks-home', home);
    return () => { setCrumbs([]); window.removeEventListener('md2:tasks-home', home); };
  }, [board?.title, wsName]); // eslint-disable-line react-hooks/exhaustive-deps

  const boardCards = useMemo(() => {
    const ids = new Set(lists.map((l) => l.id));
    return data.cards.filter((c) => ids.has(c.listId));
  }, [data.cards, lists]);
  const members = useMemo(() => {
    const ids = new Set<string>(); boardCards.forEach((c) => c.assignee && ids.add(c.assignee));
    return data.users.filter((u) => ids.has(u.id));
  }, [boardCards, data.users]);
  const allLabels = useMemo(() => [...new Set(boardCards.flatMap((c) => c.labels))].sort(), [boardCards]);

  const weekEnd = addDaysToDateString(today, 7);
  const matches = (c: CardRec) => {
    const f = filters;
    if (f.hideDone && c.archived) return false;
    if (f.q && !`${c.title} ${c.description} ${c.labels.join(' ')}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.members.length && !f.members.some((m) => (m === 'none' ? !c.assignee : m === 'me' ? c.assignee === data.me : c.assignee === m))) return false;
    if (f.labels.length && !f.labels.some((l) => c.labels.includes(l))) return false;
    if (f.priorities.length && !f.priorities.includes(c.priority || 'none')) return false;
    if (f.due === 'month' && !(c.dueDate && c.dueDate >= today && c.dueDate <= addDaysToDateString(today, 30))) return false;
    if (f.due === 'none' && c.dueDate) return false;
    if (f.due === 'overdue' && !(c.dueDate && c.dueDate < today && !c.archived)) return false;
    if (f.due === 'today' && c.dueDate !== today) return false;
    if (f.due === 'week' && !(c.dueDate && c.dueDate >= today && c.dueDate <= weekEnd)) return false;
    return true;
  };
  const cardsFor = (l: ListRec) => data.cards.filter((c) => c.listId === l.id).map((c, i) => ({ c, i })).sort((a, b) => a.c.order - b.c.order || a.i - b.i).map((x) => x.c).filter(matches);
  const totalIn = (l: ListRec) => data.cards.filter((c) => c.listId === l.id).length;

  const setBg = (k: string) => { setBgKey(k); if (board) try { localStorage.setItem(BG_KEY + board.id, k); } catch { /* ignore */ } };
  const bg = BACKGROUNDS.find((b) => b.key === bgKey) ?? BACKGROUNDS[0];

  const endDrag = () => { setDrag(null); setOver(null); setListOver(null); };
  const dropCard = (listId: string) => {
    if (drag?.type === 'card') data.moveCard(drag.id, listId, over?.listId === listId ? over.beforeId : null);
    endDrag();
  };
  const dropList = (targetId: string) => {
    if (drag?.type === 'list' && listOver) data.moveList(drag.id, targetId, listOver.after);
    endDrag();
  };
  const edgeScroll = (e: DragEvent) => {
    const el = scroller.current;
    if (!el || !drag) return;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left + 80) el.scrollBy({ left: -24 });
    else if (e.clientX > r.right - 80) el.scrollBy({ left: 24 });
  };

  const submitList = async (e: FormEvent) => {
    e.preventDefault();
    const t = listName.trim();
    if (!t || !board) return;
    setListName('');
    await data.addList(board.id, t);
    setTimeout(() => scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: 'smooth' }), 80);
  };
  const createBoard = async (e: FormEvent) => {
    e.preventDefault();
    const t = newBoard.trim();
    if (!t) return;
    const b = await data.addBoard(t);
    if (b) { const w = board ? ws.wsOf(board.id) : null; if (w) ws.assign(b.id, w.id); setBoardId(b.id); setSwitcher(false); setNewBoard(''); toast(`Board "${b.title}" is ready`); }
  };
  const saveTitle = () => {
    const t = title.trim();
    setRenaming(false);
    if (t && board && t !== board.title) data.renameBoard(board.id, t);
  };

  const menu = menuCard ? data.cards.find((c) => c.id === menuCard) ?? null : null;
  const menuItem = menu ? cardToItem(menu, data.lists, data.boards) : null;
  const moveLists = menu ? data.listsByBoard[data.lists.find((l) => l.id === menu.listId)?.boardId ?? ''] ?? lists : lists;
  const completed = boardCards.filter((c) => c.archived);

  if (data.loading) {
    return (
      <div className="liquid rounded-[2rem] p-4 mt-0 md:-mt-3 h-[calc(100cqh-0.125rem)] min-h-[26rem]">
        <Skeleton className="h-11 w-72 mb-4" />
        <div className="flex gap-3 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-[286px] shrink-0" />)}</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="liquid rounded-[2rem] p-10 text-center">
        <p className="text-4xl mb-3">🗂️</p>
        <h2 className="text-xl font-extrabold">Create your first board</h2>
        <p className="text-sm text-muted mt-1 max-w-sm mx-auto">Lists are the columns, cards are the work. Drag cards between lists as they progress.</p>
        <form onSubmit={createBoard} className="flex gap-2 max-w-sm mx-auto mt-5">
          <Input value={newBoard} onChange={(e) => setNewBoard(e.target.value)} placeholder="e.g. Website launch" aria-label="Board name" />
          <Button type="submit" disabled={!newBoard.trim()}>Create</Button>
        </form>
      </div>
    );
  }

  const dock = [
    { key: 'inbox', label: 'Inbox', icon: 'inbox', active: panes.inbox, run: () => togglePane('inbox') },
    { key: 'planner', label: 'Planner', icon: 'planner', active: panes.planner, run: () => togglePane('planner') },
    { key: 'board', label: 'Board', icon: 'board', active: true, run: () => {} },
    { key: 'switch', label: 'Switch boards', icon: 'boards', active: false, run: () => setSwitcher(true) },
  ];
  const toggleStar = () => { const v = !starred; setStarred(v); try { localStorage.setItem(`md2.star.${board.id}`, v ? '1' : '0'); } catch { /* ignore */ } };
  const shareBoard = async () => { try { await navigator.clipboard.writeText(location.href); toast('Board link copied'); } catch { toast(location.href, 'info'); } };

  /* Inbox = personal tasks, Planner = what is due, day by day */
  const inboxItems = data.myItems.filter((i) => i.kind === 'task' && !i.done).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const plannerDays = Array.from({ length: 14 }, (_, i) => addDaysToDateString(today, i));
  const plannerOpen = data.myItems.filter((i) => !i.done && i.dueDate);
  const overdue = plannerOpen.filter((i) => i.dueDate! < today);
  const submitInbox = async (e: FormEvent) => {
    e.preventDefault();
    const { title, dueDate } = parseQuickAdd(inboxText, today);
    if (!title) return;
    setInboxText('');
    await data.addTask(title, dueDate);
  };
  const miniCard = (i: Item) => (
    <div key={i.key} role="button" tabIndex={0} onClick={() => onOpen(i.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(i.id)} className="group flex items-start gap-2 rounded-lg bg-white shadow-[0_1px_2px_rgb(9_30_66/0.22)] px-3 py-2.5 cursor-pointer hover:ring-2 hover:ring-brand/50">
      <div className="pt-px"><CheckCircle done={i.done} size={18} onToggle={() => data.toggleDone(i)} /></div>
      <div className="min-w-0 flex-1"><p className="text-sm leading-snug break-words">{i.title}</p>{i.dueDate && <p className={`text-[11px] font-bold mt-1 ${i.dueDate < today ? 'text-bad' : 'text-muted'}`}>{dueLabel(i.dueDate, today)}</p>}</div>
    </div>
  );

  return (
    <div className="relative rounded-[2rem] overflow-hidden liquid mt-0 md:-mt-3 h-[calc(100cqh-0.125rem)] md:h-[calc(100dvh-6.25rem)] min-h-[28rem] flex flex-col">
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: bg.css }} />

      {/* header */}
      <div className="relative z-20 flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4 pb-3">
        <button type="button" onClick={() => setBoardId(null)} aria-label="Back to boards" className={`${barBtn} !px-2.5`}>
          <TIcon name="back" />
        </button>
        {renaming ? (
          <form onSubmit={(e) => { e.preventDefault(); saveTitle(); }}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)} className="!py-1.5 !text-lg !font-extrabold !w-64" aria-label="Board name" />
          </form>
        ) : (
          <button type="button" onClick={() => { setTitle(board.title); setRenaming(true); }} title="Click to rename" className="text-xl sm:text-2xl font-extrabold tracking-tight rounded-lg px-2 -mx-2 hover:bg-ink/[0.08] truncate max-w-[60vw]">{board.title}</button>
        )}
        {ws.wsOf(board.id) && <span className="hidden sm:inline text-xs font-bold text-muted rounded-md bg-ink/[0.07] px-2 py-1">{ws.wsOf(board.id)!.name}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {members.length > 0 && (
            <div className="hidden sm:flex -space-x-2 mr-1">{members.slice(0, 4).map((u) => <span key={u.id} className="ring-2 ring-white rounded-full" title={u.name || u.email}><Avatar name={u.name || u.email || '?'} size={30} /></span>)}{members.length > 4 && <span className="w-[30px] h-[30px] rounded-full bg-ink/10 text-[11px] font-bold grid place-items-center ring-2 ring-white">+{members.length - 4}</span>}</div>
          )}

          <button type="button" onClick={toggleStar} aria-label={starred ? 'Unstar board' : 'Star board'} aria-pressed={starred} className={`${barBtn} !px-2.5`}>
            <TIcon name="star" filled={starred} className={starred ? 'text-warn' : ''} />
          </button>
          <button type="button" onClick={shareBoard} className={barBtn}>
            <TIcon name="share" size={15} />
            Share
          </button>
          <FilterMenu size="sm" variant="bar" title="Filter cards" groups={[
            { id: 'q', kind: 'text', label: 'Keyword', value: filters.q, onChange: (v) => setFilters({ ...filters, q: v }), placeholder: 'Search cards…' },
            { id: 'members', kind: 'multi', label: 'Members', value: filters.members, onChange: (v) => setFilters({ ...filters, members: v }),
              options: [{ value: 'me', label: 'Assigned to me' }, { value: 'none', label: 'No members' }, ...members.filter((u) => u.id !== data.me).map((u) => ({ value: u.id, label: u.name || u.email || 'Member' }))] },
            { id: 'priority', kind: 'multi', label: 'Priority', value: filters.priorities, onChange: (v) => setFilters({ ...filters, priorities: v }),
              options: [...PRIORITIES.slice().reverse().map((p) => ({ value: p.key as string, label: p.label })), { value: 'none', label: 'No priority' }] },
            { id: 'labels', kind: 'multi', label: 'Labels', value: filters.labels, onChange: (v) => setFilters({ ...filters, labels: v }), hidden: allLabels.length === 0, options: allLabels.map((l) => ({ value: l, label: l })) },
            { id: 'due', kind: 'single', label: 'Due date', value: filters.due, defaultValue: '', onChange: (v) => setFilters({ ...filters, due: v as Filters['due'] }),
              options: [{ value: '', label: 'Any time' }, { value: 'overdue', label: 'Overdue' }, { value: 'today', label: 'Due today' }, { value: 'week', label: 'Next 7 days' }, { value: 'month', label: 'Next 30 days' }, { value: 'none', label: 'No due date' }] },
            { id: 'hideDone', kind: 'toggle', label: 'Hide completed cards', value: filters.hideDone, onChange: (v) => setFilters({ ...filters, hideDone: v }) },
          ]} />

          <Pop align="right" width="w-72" button={(_, t) => (
            <button type="button" onClick={t} aria-label="Board menu" className={`${barBtn} !px-2.5`}><Dots /></button>
          )}>
            {(close) => (
              <div className="space-y-0.5 text-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted px-2 pb-1">Board</p>
                <button type="button" onClick={() => { close(); setTitle(board.title); setRenaming(true); }} className="w-full text-left rounded-lg px-2 py-2 font-semibold hover:bg-ink/[0.07]">Rename board</button>
                <button type="button" onClick={() => { close(); setCompletedOpen(true); }} className="w-full text-left rounded-lg px-2 py-2 font-semibold hover:bg-ink/[0.07]">Completed cards <span className="text-muted">({completed.length})</span></button>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted px-2 pt-3 pb-1.5">Background</p>
                <div className="grid grid-cols-3 gap-2 px-2 pb-1">
                  {BACKGROUNDS.map((b) => (
                    <button key={b.key} type="button" onClick={() => setBg(b.key)} aria-pressed={bgKey === b.key} className={`h-12 rounded-xl border-2 text-[10px] font-bold grid place-items-end p-1.5 bg-white/60 ${bgKey === b.key ? 'border-ink' : 'border-line'}`} style={{ backgroundImage: b.css }}>
                      <span className="rounded bg-white/80 px-1 text-ink">{b.label}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => { close(); setDeleteBoard(true); }} className="w-full text-left rounded-lg px-2 py-2 mt-1 font-semibold text-bad hover:bg-bad/10">Delete board</button>
              </div>
            )}
          </Pop>
        </div>
      </div>

      {/* workspace: optional Inbox and Planner panes beside the board */}
      <div className="relative flex-1 min-h-0 flex gap-3 px-4 sm:px-5 pb-20">
        <AnimatePresence initial={false}>
          {panes.inbox && (
            <motion.aside key="inbox" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 300 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="hidden md:flex shrink-0 overflow-hidden">
              <div className="w-[300px] flex flex-col max-h-full rounded-2xl tl-col">
                <div className="flex items-center gap-2 px-3.5 pt-3 pb-2"><span className="flex-1 text-[15px] font-extrabold">Inbox</span><span className="text-xs font-bold text-muted tabular-nums">{inboxItems.length}</span></div>
                <form onSubmit={submitInbox} className="px-2 pb-2"><input value={inboxText} onChange={(e) => setInboxText(e.target.value)} placeholder="Add a card  (#fri sets a date)" aria-label="Add to inbox" className="w-full rounded-lg bg-white/80 shadow-[0_1px_2px_rgb(9_30_66/0.22)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/50 placeholder:text-muted/70" /></form>
                <div className="flex-1 min-h-0 overflow-y-auto scroll-y px-2 pb-2 space-y-2">
                  {inboxItems.map(miniCard)}
                  {inboxItems.length === 0 && <p className="text-sm text-muted text-center py-6">Your personal tasks land here.</p>}
                </div>
              </div>
            </motion.aside>
          )}
          {panes.planner && (
            <motion.aside key="planner" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 340 }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="hidden md:flex shrink-0 overflow-hidden">
              <div className="w-[340px] flex flex-col max-h-full rounded-2xl tl-col">
                <div className="flex items-center gap-2 px-3.5 pt-3 pb-2"><span className="flex-1 text-[15px] font-extrabold">Planner</span><span className="text-xs font-bold text-muted">Next 14 days</span></div>
                <div className="flex-1 min-h-0 overflow-y-auto scroll-y px-3 pb-3 space-y-4">
                  {overdue.length > 0 && (
                    <section><p className="text-sm font-extrabold text-bad mb-1.5">Overdue</p><div className="space-y-2">{overdue.map(miniCard)}</div></section>
                  )}
                  {plannerDays.map((d, idx) => {
                    const list = plannerOpen.filter((i) => i.dueDate === d);
                    const label = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
                    return (
                      <section key={d}>
                        <p className="text-sm mb-1.5"><b>{label}</b> <span className="text-muted">{new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: idx < 2 ? 'short' : undefined, day: 'numeric', month: 'long' })}</span></p>
                        {list.length ? <div className="space-y-2">{list.map(miniCard)}</div> : <p className="text-sm text-muted">Nothing planned{idx === 0 ? ' today' : ''}</p>}
                      </section>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      <div ref={scroller} onDragOver={edgeScroll} className="relative flex-1 min-w-0 min-h-0 flex items-start gap-3 overflow-x-auto overflow-y-hidden snap-x snap-proximity scroll-y">
        {lists.map((l) => (
          <Column
            key={l.id} list={l} cards={cardsFor(l)} total={totalIn(l)} data={data} today={today} defs={defs} labelsOpen={labelsOpen} onLabels={toggleLabels} drag={drag} over={over} listOver={listOver}
            onOver={setOver} onListOver={setListOver} onDropHere={dropCard} onDropList={dropList}
            onOpen={(c) => onOpen(c.id)} onMenu={(c, r) => { setMenuCard(c.id); setMenuRect(r); setQuickTitle(c.title); setMoveOpen(false); }}
            onDragStart={(e, id) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); setTimeout(() => setDrag({ type: 'card', id }), 0); }}
            onListDragStart={(e, id) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); setTimeout(() => setDrag({ type: 'list', id }), 0); }}
            onDragEnd={endDrag}
          />
        ))}
        {lists.length === 0 && (
          <div className="w-[min(22rem,82vw)] shrink-0 rounded-2xl tl-col p-5 space-y-3 self-start">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand">Step 3 · Add lists</p>
            <h3 className="text-lg font-extrabold leading-snug">Lists are the columns of your board</h3>
            <p className="text-sm text-muted">Name your first list on the right, or start with a ready-made set. Then add cards to each list.</p>
            <Button size="sm" variant="soft" onClick={async () => { for (const n of ['To do', 'In progress', 'Done']) await data.addList(board.id, n); }}>Use To do · In progress · Done</Button>
          </div>
        )}
        <div className="w-[82vw] max-w-[300px] sm:w-[286px] shrink-0 snap-start">
          {addingList || lists.length === 0 ? (
            <form onSubmit={submitList} className="rounded-2xl tl-col p-2.5 space-y-2">
              <Input autoFocus value={listName} onChange={(e) => setListName(e.target.value)} placeholder={lists.length === 0 ? 'First list, e.g. To do' : 'Enter list name…'} aria-label="New list name" onKeyDown={(e) => e.key === 'Escape' && setAddingList(false)} />
              <div className="flex items-center gap-2">
                <Button size="sm" type="submit" disabled={!listName.trim()}>Add list</Button>
                {lists.length > 0 && <button type="button" aria-label="Close" onClick={() => setAddingList(false)} className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-ink/10">✕</button>}
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setAddingList(true)} className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl tl-bar text-sm font-bold text-ink hover:opacity-80 transition-opacity">{Icon.plus(16)} Add another list</button>
          )}
        </div>
      </div>
      </div>

      {/* dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[96%]">
        <div className="glass-pop !bg-white/[0.94] rounded-2xl p-1.5 flex items-center gap-1">
          {dock.map((d) => {
            const active = d.active;
            return (
              <button key={d.key} type="button" onClick={d.run} aria-label={d.label} aria-pressed={d.key === 'inbox' || d.key === 'planner' ? active : undefined} aria-current={d.key === 'board' ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 text-sm font-bold transition-colors ${active ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-ink/[0.07]'}`}>
                <TIcon name={d.icon as TIconName} size={17} />
                <span className={`whitespace-nowrap ${active ? '' : 'hidden sm:inline'}`}>{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* switch boards */}
      <Modal open={switcher} onClose={() => { setSwitcher(false); setBoardQ(''); }} title="Switch boards" wide>
        <div className="space-y-5">
          <Input value={boardQ} onChange={(e) => setBoardQ(e.target.value)} placeholder="Search your boards" aria-label="Search boards" autoFocus />
          <div>
            <p className="text-sm font-extrabold mb-2.5">Your boards</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.boards.filter((b) => b.title.toLowerCase().includes(boardQ.trim().toLowerCase())).map((b) => {
                const bgk = readBg(b.id);
                const css = (BACKGROUNDS.find((x) => x.key === bgk) ?? BACKGROUNDS[0]).css;
                return (
                  <button key={b.id} type="button" onClick={() => { setBoardId(b.id); setSwitcher(false); setBoardQ(''); }} className={`group text-left rounded-xl overflow-hidden border bg-white shadow-card hover:ring-2 hover:ring-brand/50 ${b.id === board.id ? 'border-brand' : 'border-line'}`}>
                    <div className="h-20 bg-ink/10" style={{ backgroundImage: css }} />
                    <p className="px-3 py-2.5 text-sm font-bold truncate">{b.title}{b.id === board.id && <span className="ml-2 text-[10px] text-brand">Current</span>}</p>
                  </button>
                );
              })}
              <form onSubmit={createBoard} className="rounded-xl bg-ink/[0.06] p-3 flex flex-col justify-center gap-2 min-h-[7.5rem]">
                <Input value={newBoard} onChange={(e) => setNewBoard(e.target.value)} placeholder="Create new board" aria-label="New board name" className="!py-2" />
                <Button size="sm" type="submit" disabled={!newBoard.trim()}>Create</Button>
              </form>
            </div>
          </div>
        </div>
      </Modal>

      {/* quick edit (Trello-style): edit the title in place with the actions beside the card */}
      <AnimatePresence>
        {menu && menuItem && menuRect && (
          <motion.div className="fixed inset-0 z-[160]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/45" onClick={() => setMenuCard(null)} />
            <div className="absolute" style={{ left: Math.min(menuRect.left, window.innerWidth - 300 - 190), top: Math.min(menuRect.top, window.innerHeight - 320), width: Math.min(menuRect.width, 300) }}>
              <textarea
                autoFocus value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} rows={3} aria-label="Card title"
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const t = quickTitle.trim(); if (t && t !== menu.title) data.patchCard(menu.id, { title: t }); setMenuCard(null); } else if (e.key === 'Escape') setMenuCard(null); }}
                className="w-full resize-none rounded-lg bg-white shadow-pop px-3 py-2.5 text-sm outline-none ring-2 ring-brand/50"
              />
              <Button className="mt-2" onClick={() => { const t = quickTitle.trim(); if (t && t !== menu.title) data.patchCard(menu.id, { title: t }); setMenuCard(null); }}>Save</Button>
              <div className="absolute left-full top-0 ml-2 w-44 space-y-1.5">
                {[
                  ['Open card', () => { setMenuCard(null); onOpen(menu.id); }],
                  ['Move to…', () => setMoveOpen(true)],
                  [menu.archived ? 'Reopen' : 'Mark complete', () => { setMenuCard(null); data.toggleDone(menuItem); }],
                  ['Copy card', () => { setMenuCard(null); data.duplicateCard(menu.id); }],
                  ['Delete', () => { setMenuCard(null); data.removeItem(menuItem); }],
                ].map(([label, run]) => (
                  <button key={label as string} type="button" onClick={run as () => void} className={`block w-full text-left rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold shadow-card hover:bg-white ${label === 'Delete' ? 'text-bad' : 'text-ink'}`}>{label as string}</button>
                ))}
                <AnimatePresence>
                  {moveOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg bg-white shadow-pop p-1.5 space-y-0.5">
                      {moveLists.map((l) => (
                        <button key={l.id} type="button" disabled={l.id === menu.listId} onClick={() => { data.moveCard(menu.id, l.id, null); setMoveOpen(false); setMenuCard(null); toast(`Moved to ${l.title}`); }}
                          className="w-full text-left rounded-md px-2.5 py-1.5 text-sm font-semibold hover:bg-ink/[0.07] disabled:text-brand disabled:bg-brand-soft">{l.title}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* completed cards */}
      <Modal open={completedOpen} onClose={() => setCompletedOpen(false)} title={`Completed cards · ${completed.length}`} wide>
        {completed.length === 0 ? <p className="text-sm text-muted py-4">Nothing completed on this board yet.</p> : (
          <ul className="divide-y divide-line/70 max-h-[55vh] overflow-y-auto scroll-y">
            {completed.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{c.title}</p><p className="text-xs text-muted">{data.lists.find((l) => l.id === c.listId)?.title}</p></div>
                <Button size="sm" variant="soft" onClick={() => data.patchCard(c.id, { archived: false })}>Restore</Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={deleteBoard} onClose={() => setDeleteBoard(false)} title="Delete this board?">
        <p className="text-sm text-ink-2">"{board.title}" with all its lists and cards will be removed for good.</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="soft" onClick={() => setDeleteBoard(false)}>Keep it</Button>
          <Button variant="danger" onClick={() => { const id = board.id; setDeleteBoard(false); data.removeBoard(id); setBoardId(null); }}>Delete board</Button>
        </div>
      </Modal>
    </div>
  );
};
