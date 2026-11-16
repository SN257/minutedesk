import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../../lib/toast';
import { getLocalDateString } from '../../lib/date';
import { TIcon } from './icons';
import { Avatar, Button, Input, Modal, Select, Skeleton } from '../../ui';
import { Icon } from '../../shell/icons';
import { BACKGROUNDS, Boards, COVER, COVER_KEYS, cover, hash, writeBg } from './Boards';
import type { BoardRec } from './model';
import type { TasksData } from './useTasksData';
import { useWorkspaces, type Workspace, type WorkspacesApi } from './workspaces';

const FRAME = 'liquid rounded-[2rem] mt-0 md:-mt-3 h-[calc(100cqh-0.125rem)] md:h-[calc(100dvh-6.25rem)] min-h-[28rem] overflow-hidden';

/** Workspace badge: first letter on a colour taken from the name. */
const WsMark = ({ name, size = 36 }: { name: string; size?: number }) => (
  <span className="shrink-0 grid place-items-center rounded-xl font-extrabold text-[#ffffff] shadow-card" style={{ width: size, height: size, fontSize: size * 0.45, backgroundImage: COVER[COVER_KEYS[hash(name) % COVER_KEYS.length]] }}>
    {(name.trim()[0] || '?').toUpperCase()}
  </span>
);

interface BoardStat { lists: number; cards: number; done: number; overdue: number; starred: boolean; people: string[] }

const Faces = ({ names }: { names: string[] }) => names.length === 0 ? null : (
  <span className="flex -space-x-1.5">
    {names.slice(0, 3).map((n) => <span key={n} className="ring-2 ring-white rounded-full"><Avatar name={n} size={22} /></span>)}
  </span>
);

/** Board tile: a soft gradient cover with the board's initial, a hover cue, and a quiet progress line. */
const BoardTile = ({ b, stat, index, onOpen }: { b: BoardRec; stat: BoardStat; index: number; onOpen: () => void }) => {
  const pct = stat.cards ? Math.round((stat.done / stat.cards) * 100) : 0;
  return (
    <motion.button
      type="button" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -4 }} onClick={onOpen}
      className="group text-left rounded-2xl overflow-hidden bg-white/70 glass-fill border border-line/80 shadow-card hover:shadow-pop transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex flex-col items-stretch justify-start"
    >
      <div className="relative h-28 shrink-0 overflow-hidden" style={cover(b)}>
        <span aria-hidden className="absolute -right-2 -bottom-6 text-[6.5rem] leading-none font-black text-white/35 select-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">{(b.title.trim()[0] || '?').toUpperCase()}</span>
        {stat.starred && <span className="absolute top-2.5 left-2.5 text-warn" aria-label="Starred"><TIcon name="star" size={15} filled /></span>}
        <span className="absolute left-2.5 bottom-2.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink">{stat.lists} {stat.lists === 1 ? 'list' : 'lists'}</span>
        <span className="absolute right-2.5 top-2.5 rounded-full bg-ink text-white px-2.5 py-1 text-[11px] font-bold opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">Open</span>
      </div>
      <div className="px-4 py-3.5 space-y-2.5 flex-1">
        <p className="font-extrabold leading-tight truncate">{b.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="flex-1 h-1.5 rounded-full bg-ink/10 overflow-hidden"><div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} /></div>
          <span className="tabular-nums font-semibold">{stat.done}/{stat.cards}</span>
        </div>
        <div className="flex items-center gap-2 min-h-[22px]">
          <Faces names={stat.people} />
          {stat.overdue > 0 ? <span className="ml-auto rounded-full bg-bad/15 text-bad px-2 py-0.5 text-[11px] font-bold">{stat.overdue} overdue</span> : <span className="ml-auto text-[11px] font-semibold text-muted">{stat.cards} {stat.cards === 1 ? 'card' : 'cards'}</span>}
        </div>
      </div>
    </motion.button>
  );
};

/** Small tile for the Recently viewed and Starred rows. */
const MiniTile = ({ b, stat, onOpen }: { b: BoardRec; stat: BoardStat; onOpen: () => void }) => (
  <button type="button" onClick={onOpen} className="group text-left rounded-xl overflow-hidden bg-white/70 glass-fill border border-line/80 hover:border-ink/30 hover:shadow-card transition flex flex-col items-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
    <div className="relative h-14 shrink-0" style={cover(b)}>
      <span aria-hidden className="absolute right-2 -bottom-3 text-5xl leading-none font-black text-white/35 select-none">{(b.title.trim()[0] || '?').toUpperCase()}</span>
      {stat.starred && <span className="absolute top-1.5 left-2 text-warn" aria-label="Starred"><TIcon name="star" size={15} filled /></span>}
    </div>
    <div className="px-3 py-2">
      <p className="text-[13px] font-bold truncate">{b.title}</p>
      <p className="text-[11px] text-muted truncate">{stat.lists} {stat.lists === 1 ? 'list' : 'lists'} · {stat.cards} {stat.cards === 1 ? 'card' : 'cards'}</p>
    </div>
  </button>
);

const Swatches = ({ value, onChange }: { value: string; onChange: (k: string) => void }) => (
  <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Background">
    {BACKGROUNDS.map((b) => (
      <button key={b.key} type="button" role="radio" aria-checked={value === b.key} aria-label={b.label} onClick={() => onChange(b.key)}
        className={`h-10 rounded-lg border-2 bg-white/60 ${value === b.key ? 'border-ink' : 'border-line'}`} style={{ backgroundImage: b.css }} />
    ))}
  </div>
);

/* ───────── Step-by-step setup for a first-time user ───────── */
const Onboarding = ({ data, ws, onOpen, onView }: { data: TasksData; ws: WorkspacesApi; onOpen: (id: string) => void; onView?: (v: 'list' | 'calendar') => void }) => {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [made, setMade] = useState<Workspace | null>(null);
  const [boardName, setBoardName] = useState('');
  const [bg, setBg] = useState('ocean');
  const [busy, setBusy] = useState(false);

  const createWs = (e: FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setMade(ws.create(wsName, wsDesc));
    setStep(2);
  };
  const createBoard = async (e: FormEvent) => {
    e.preventDefault();
    if (!boardName.trim() || !made || busy) return;
    setBusy(true);
    const b = await data.addBoard(boardName.trim());
    setBusy(false);
    if (!b) return;
    ws.assign(b.id, made.id); writeBg(b.id, bg);
    toast(`"${b.title}" is ready. Add your first list.`);
    onOpen(b.id);
  };

  const steps = ['Workspace', 'Board', 'Lists & cards'];
  return (
    <div className={`${FRAME} overflow-y-auto scroll-y`}>
      <div className="max-w-xl mx-auto px-5 py-6 sm:py-10">
        {onView && <div className="flex justify-end mb-6"><ViewTabs onView={onView} /></div>}
        <ol className="flex items-center gap-2 mb-8" aria-label="Setup steps">
          {steps.map((s, i) => {
            const n = i + 1; const on = n === step; const done = n < step;
            return (
              <li key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold ${on ? 'bg-ink text-white' : done ? 'bg-good/25 text-good' : 'bg-ink/10 text-muted'}`}>{done ? Icon.check(13) : n}</span>
                <span className={`text-xs font-bold ${on ? '' : 'text-muted'}`}>{s}</span>
                {i < steps.length - 1 && <span className="flex-1 h-px bg-line" />}
              </li>
            );
          })}
        </ol>
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 ? (
            <motion.form key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={createWs} className="space-y-5">
              <div><h2 className="text-2xl font-extrabold tracking-tight">Create your workspace</h2><p className="text-muted mt-1.5">A workspace is where your boards live. Name it after your team, project or area of work.</p></div>
              <label className="block"><span className="block text-xs font-bold text-ink-2 mb-1.5">Workspace name</span><Input autoFocus value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="e.g. Marketing team" /></label>
              <label className="block"><span className="block text-xs font-bold text-ink-2 mb-1.5">What is it for? <span className="text-muted font-medium">(optional)</span></span><Input value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} placeholder="e.g. Campaigns and launches" /></label>
              <Button type="submit" size="lg" disabled={!wsName.trim()}>Continue {Icon.arrow(18)}</Button>
            </motion.form>
          ) : (
            <motion.form key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={createBoard} className="space-y-5">
              <div><h2 className="text-2xl font-extrabold tracking-tight">Create a board in {made?.name}</h2><p className="text-muted mt-1.5">A board holds one project. Next you will add lists (the columns) and cards (the work).</p></div>
              <label className="block"><span className="block text-xs font-bold text-ink-2 mb-1.5">Board name</span><Input autoFocus value={boardName} onChange={(e) => setBoardName(e.target.value)} placeholder="e.g. Website launch" /></label>
              <div><span className="block text-xs font-bold text-ink-2 mb-1.5">Background</span><Swatches value={bg} onChange={setBg} /></div>
              <div className="flex items-center gap-2"><Button type="button" variant="soft" onClick={() => setStep(1)}>Back</Button><Button type="submit" size="lg" loading={busy} disabled={!boardName.trim()}>Create board {Icon.arrow(18)}</Button></div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/** Switch the Tasks page back to its list or calendar. Board mode fills the screen, so this lives inside it. */
const ViewTabs = ({ onView }: { onView: (v: 'list' | 'calendar') => void }) => (
  <div className="inline-flex rounded-full bg-ink/[0.06] p-1" role="tablist" aria-label="View">
    {([['list', 'List'], ['board', 'Board'], ['calendar', 'Calendar']] as const).map(([k, l]) => (
      <button key={k} type="button" role="tab" aria-selected={k === 'board'} onClick={() => k !== 'board' && onView(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${k === 'board' ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
    ))}
  </div>
);

/* ───────── Boards home: left menu, recently viewed, then every workspace ───────── */
const Home = ({ data, ws, onOpen, onView }: { data: TasksData; ws: WorkspacesApi; onOpen: (id: string) => void; openCard: (id: string) => void; onView?: (v: 'list' | 'calendar') => void }) => {
  const toast = useToast();
  const [boardModal, setBoardModal] = useState<{ ws: string } | null>(null);
  const [wsModal, setWsModal] = useState<null | 'new' | { edit: Workspace }>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [bg, setBg] = useState('ocean');
  const [wsPick, setWsPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Workspace | null>(null);

  const today = getLocalDateString();
  const isStarred = (id: string) => { try { return localStorage.getItem(`md2.star.${id}`) === '1'; } catch { return false; } };
  const statOf = (b: BoardRec): BoardStat => {
    const ls = data.listsByBoard[b.id] ?? [];
    const ids = new Set(ls.map((l) => l.id));
    const cs = data.cards.filter((c) => ids.has(c.listId));
    const people = [...new Set(cs.map((c) => c.assignee).filter(Boolean) as string[])].map((id) => data.users.find((u) => u.id === id)).filter(Boolean).map((u) => (u!.name || u!.email || '?') as string);
    return { lists: ls.length, cards: cs.length, done: cs.filter((c) => c.archived).length, overdue: cs.filter((c) => !c.archived && !!c.dueDate && c.dueDate < today).length, starred: isStarred(b.id), people };
  };
  const visible = focus ? ws.workspaces.filter((w) => w.id === focus) : ws.workspaces;
  const starred = data.boards.filter((b) => isStarred(b.id));

  const openBoardModal = (wsId: string) => { setName(''); setBg('ocean'); setWsPick(wsId); setBoardModal({ ws: wsId }); };
  const openWsModal = (m: 'new' | { edit: Workspace }) => { setName(m === 'new' ? '' : m.edit.name); setDesc(m === 'new' ? '' : m.edit.description); setWsModal(m); };

  const saveWs = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !wsModal) return;
    if (wsModal === 'new') { const w = ws.create(name, desc); toast(`Workspace "${w.name}" created`); openBoardModal(w.id); }
    else ws.rename(wsModal.edit.id, name, desc);
    setWsModal(null);
  };
  const saveBoard = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const b = await data.addBoard(name.trim());
    setBusy(false);
    if (!b) return;
    ws.assign(b.id, wsPick); writeBg(b.id, bg);
    setBoardModal(null);
    onOpen(b.id);
  };

  const small = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-3 items-start';
  const grid = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 items-start';

  return (
    <div className={`${FRAME} flex`}>
      {/* left menu */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col gap-1 border-r border-line/70 p-4 overflow-y-auto scroll-y">
        <button type="button" onClick={() => setFocus(null)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-left ${focus === null ? 'bg-brand-soft text-brand' : 'hover:bg-ink/[0.07]'}`}>
          <TIcon name="board" size={17} />Boards
        </button>
        <div className="flex items-center justify-between px-3 pt-6 pb-1.5">
          <span className="text-xs font-bold text-muted">Workspaces</span>
          <button type="button" onClick={() => openWsModal('new')} aria-label="Create workspace" className="w-7 h-7 rounded-md grid place-items-center text-muted hover:text-ink hover:bg-ink/10">{Icon.plus(15)}</button>
        </div>
        {ws.workspaces.map((w) => (
          <button key={w.id} type="button" onClick={() => setFocus(focus === w.id ? null : w.id)} className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold text-left ${focus === w.id ? 'bg-brand-soft text-brand' : 'hover:bg-ink/[0.07]'}`}>
            <WsMark name={w.name} size={28} /><span className="truncate flex-1">{w.name}</span>
          </button>
        ))}
      </aside>

      {/* content */}
      <div className="flex-1 min-w-0 overflow-y-auto scroll-y px-5 sm:px-7 pt-4 pb-6 space-y-6">
        {onView && <div className="flex justify-end"><ViewTabs onView={onView} /></div>}
        {starred.length > 0 && !focus && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-extrabold mb-4"><TIcon name="star" size={15} filled />Starred boards</h2>
            <div className={small}>{starred.map((b) => <MiniTile key={b.id} b={b} stat={statOf(b)} onOpen={() => onOpen(b.id)} />)}</div>
          </section>
        )}
        {ws.recentBoards.length > 0 && !focus && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-extrabold mb-4"><TIcon name="recent" size={17} />Recently viewed</h2>
            <div className={small}>{ws.recentBoards.slice(0, 6).map((b) => <MiniTile key={b.id} b={b} stat={statOf(b)} onOpen={() => onOpen(b.id)} />)}</div>
          </section>
        )}
        <section>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3">Your workspaces</h2>
          <div className="space-y-8">
          {visible.map((w) => (
            <div key={w.id}>
              <div className="flex flex-wrap items-center gap-3 mb-5 rounded-2xl liquid px-4 py-3">
                <WsMark name={w.name} size={44} />
                <div className="min-w-0 flex-1"><p className="text-lg font-extrabold leading-tight truncate">{w.name}</p><p className="text-xs text-muted truncate">{ws.boardsOf(w.id).length} {ws.boardsOf(w.id).length === 1 ? 'board' : 'boards'}{w.description ? ` · ${w.description}` : ''}</p></div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button size="sm" variant="soft" onClick={() => openWsModal({ edit: w })}>Settings</Button>
                  <Button size="sm" variant="soft" className="!text-bad" onClick={() => setConfirmDel(w)}>Delete</Button>
                </div>
              </div>
              <div className={grid}>
                {ws.boardsOf(w.id).map((b, i) => <BoardTile key={b.id} b={b} index={i} stat={statOf(b)} onOpen={() => onOpen(b.id)} />)}
                <button type="button" onClick={() => openBoardModal(w.id)} className="group rounded-2xl border-2 border-dashed border-line hover:border-brand hover:bg-brand-soft/40 h-[15rem] grid place-items-center text-sm font-bold text-ink-2 hover:text-brand transition-colors"><span className="flex flex-col items-center gap-3"><span className="w-12 h-12 rounded-full bg-ink/[0.07] group-hover:bg-brand/15 grid place-items-center transition-colors">{Icon.plus(22)}</span>Create new board</span></button>
              </div>
            </div>
          ))}
          </div>
        </section>
      </div>

      {/* create board */}
      <Modal open={!!boardModal} onClose={() => setBoardModal(null)} title="Create board">
        <form onSubmit={saveBoard} className="space-y-4">
          <div><span className="block text-xs font-bold text-ink-2 mb-1.5">Background</span><Swatches value={bg} onChange={setBg} /></div>
          <label className="block"><span className="block text-xs font-bold text-ink-2 mb-1.5">Board title</span><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website launch" /></label>
          <div><span className="block text-xs font-bold text-ink-2 mb-1.5">Workspace</span>
            <Select value={wsPick} onChange={(e) => setWsPick(e.target.value)} aria-label="Workspace">{ws.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
          <Button type="submit" loading={busy} disabled={!name.trim()} className="w-full">Create</Button>
        </form>
      </Modal>

      {/* create / edit workspace */}
      <Modal open={!!wsModal} onClose={() => setWsModal(null)} title={wsModal === 'new' ? 'Create workspace' : 'Workspace settings'}>
        <form onSubmit={saveWs} className="space-y-4">
          <label className="block"><span className="block text-xs font-bold text-ink-2 mb-1.5">Workspace name</span><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing team" /></label>
          <label className="block"><span className="block text-xs font-bold text-ink-2 mb-1.5">Description <span className="text-muted font-medium">(optional)</span></span><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this workspace for?" /></label>
          <Button type="submit" disabled={!name.trim()} className="w-full">{wsModal === 'new' ? 'Continue' : 'Save'}</Button>
        </form>
      </Modal>

      <Modal open={!!confirmDel} onClose={() => !busy && setConfirmDel(null)} title="Delete this workspace?">
        {confirmDel && (() => {
          const list = ws.boardsOf(confirmDel.id);
          const cards = data.cards.filter((c) => data.lists.some((l) => l.id === c.listId && list.some((b) => b.id === l.boardId))).length;
          return (
            <>
              <p className="text-sm text-ink-2">
                "{confirmDel.name}" will be deleted for good{list.length ? <>, together with its {list.length} {list.length === 1 ? 'board' : 'boards'} ({list.map((b) => b.title).join(', ')}), all their lists and {cards} {cards === 1 ? 'card' : 'cards'}</> : ''}. This cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="soft" onClick={() => setConfirmDel(null)} disabled={busy}>Keep it</Button>
                <Button variant="danger" loading={busy} onClick={async () => {
                  setBusy(true);
                  for (const b of list) await data.removeBoard(b.id);
                  ws.remove(confirmDel.id);
                  setBusy(false); setConfirmDel(null); setFocus(null);
                  toast('Workspace deleted');
                }}>Delete everything</Button>
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
};

/* ───────── Entry: home or a board ───────── */
export const BoardsArea = ({ data, onOpen, onView }: { data: TasksData; onOpen: (id: string) => void; onView?: (v: 'list' | 'calendar') => void }) => {
  const ws = useWorkspaces(data.me, data.boards, data.loading);
  const [boardId, setBoardId] = useState<string | null>(null);
  const open = useMemo(() => (boardId && data.boards.some((b) => b.id === boardId) ? boardId : null), [boardId, data.boards]);

  if (data.loading) return <div className={`${FRAME} p-4`}><Skeleton className="h-11 w-72 mb-4" /><div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}</div></div>;
  if (open) return <Boards data={data} onOpen={onOpen} boardId={open} onBoard={setBoardId} ws={ws} />;
  if (ws.workspaces.length === 0 && data.boards.length === 0) return <Onboarding data={data} ws={ws} onOpen={setBoardId} onView={onView} />;
  return <Home data={data} ws={ws} onOpen={setBoardId} openCard={onOpen} onView={onView} />;
};
