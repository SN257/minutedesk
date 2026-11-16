import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { addCommentApi, getCommentsApi } from '../../lib/api';
import { getLocalDateString } from '../../lib/date';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { Avatar, Button, Input, Select } from '../../ui';
import { LABEL_COLORS, PRIORITIES, bucketOf, checklistProgress, dueLabel, labelHex, loadBoardLabels, readActivity, saveBoardLabels, logActivity, uid, type ChecklistItem, type Item, type LabelDef, type Priority } from './model';
import { iconPath } from './icons';
import { CheckCircle, ProgressBar, userName } from './parts';
import { Pop } from './pop';
import type { CardPatch, TasksData } from './useTasksData';

interface Comment { id: string; userId: string; text: string; createdAt: string }

const COVERS = ['#4bce97', '#e2b203', '#faa53d', '#f87168', '#9f8fef', '#579dff', '#60c6d2', '#94c748', '#e774bb', '#8590a2'];

const Ic = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  plus: iconPath('plus'), tag: iconPath('tag'), clock: iconPath('clock'), check: iconPath('checklist'), user: iconPath('user'), members: iconPath('members'),
  text: iconPath('description'), msg: iconPath('comment'), image: iconPath('image'), dots: iconPath('more'), flag: iconPath('flag'), move: iconPath('move'),
  copy: iconPath('copy'), eye: iconPath('watch'), share: iconPath('link'), trash: iconPath('trash'), x: iconPath('close'), done: iconPath('complete'),
};

const PBtn = ({ icon, children, onClick, active }: { icon: string; children: ReactNode; onClick: () => void; active?: boolean }) => (
  <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-ink text-white border-ink' : 'border-line hover:bg-ink/[0.06] text-ink'}`}>
    <Ic d={icon} size={15} />{children}
  </button>
);

const Row = ({ icon, children, onClick, danger }: { icon: string; children: ReactNode; onClick: () => void; danger?: boolean }) => (
  <button type="button" onClick={onClick} className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold text-left hover:bg-ink/[0.07] ${danger ? 'text-bad hover:!bg-bad/10' : ''}`}>
    <Ic d={icon} size={16} />{children}
  </button>
);

const PopTitle = ({ children }: { children: ReactNode }) => <p className="text-center text-xs font-extrabold uppercase tracking-wider text-muted pb-2">{children}</p>;

export const CardBack = ({ item, data, onClose }: { item: Item; data: TasksData; onClose: () => void }) => {
  const toast = useToast();
  const today = getLocalDateString();
  const [title, setTitle] = useState(item.title);
  const [descOpen, setDescOpen] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [addingItem, setAddingItem] = useState(false);
  const [itemText, setItemText] = useState('');
  const [hideChecked, setHideChecked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [details, setDetails] = useState(true);
  const [defs, setDefs] = useState<LabelDef[]>(() => loadBoardLabels(item.boardId));
  const [labelQ, setLabelQ] = useState('');
  const [newLabel, setNewLabel] = useState<{ name: string; hex: string } | null>(null);
  const [watch, setWatch] = useState(() => { try { return localStorage.getItem(`md2.watch.${item.id}`) === '1'; } catch { return false; } });
  const [, bump] = useState(0);
  const lastTitle = useRef(item.title);

  const card = data.cards.find((c) => c.id === item.id);
  const lists = item.boardId ? data.listsByBoard[item.boardId] ?? [] : [];
  const patch = (p: CardPatch) => data.patchCard(item.id, p);

  useEffect(() => { if (item.title !== lastTitle.current) { setTitle(item.title); lastTitle.current = item.title; } }, [item.title]);
  useEffect(() => { if (!descOpen) setDesc(item.description); }, [item.description, descOpen]);
  useEffect(() => {
    let alive = true;
    getCommentsApi(item.id).then((c) => alive && setComments(Array.isArray(c) ? c : [])).catch(() => {});
    return () => { alive = false; };
  }, [item.id]);

  const log = (text: string) => { logActivity(item.id, data.me, text); bump((n) => n + 1); };

  const commitTitle = () => {
    const t = title.trim();
    if (!t) { setTitle(item.title); return; }
    if (t !== item.title) { lastTitle.current = t; patch({ title: t }); log(`renamed this card to "${t}"`); }
  };
  const saveDesc = () => { setDescOpen(false); if (desc !== item.description) { patch({ description: desc }); log('updated the description'); } };

  /* labels */
  const allLabels = useMemo(() => {
    const set = new Set<string>(defs.map((d) => d.name));
    item.labels.forEach((l) => set.add(l));
    const ids = new Set(lists.map((l) => l.id));
    data.cards.filter((c) => ids.has(c.listId)).forEach((c) => c.labels.forEach((l) => set.add(l)));
    return [...set].sort();
  }, [defs, item.labels, lists, data.cards]);
  const toggleLabel = (n: string) => { patch({ labels: item.labels.includes(n) ? item.labels.filter((l) => l !== n) : [...item.labels, n] }); };
  const createLabel = (e: FormEvent) => {
    e.preventDefault();
    if (!newLabel?.name.trim()) return;
    const name = newLabel.name.trim();
    const next = [...defs.filter((d) => d.name !== name), { name, hex: newLabel.hex }];
    setDefs(next); saveBoardLabels(item.boardId, next);
    if (!item.labels.includes(name)) patch({ labels: [...item.labels, name] });
    setNewLabel(null);
  };

  /* checklist */
  const prog = checklistProgress(item.checklist);
  const setChecklist = (next: ChecklistItem[]) => patch({ checklist: next });
  const addItem = (e?: FormEvent) => {
    e?.preventDefault();
    const t = itemText.trim();
    if (!t) return;
    setItemText('');
    if (item.checklist.length === 0) log('added a checklist to this card');
    setChecklist([...item.checklist, { id: uid(), text: t, done: false }]);
  };

  /* comments */
  const sendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const temp: Comment = { id: `tmp-${uid()}`, userId: data.me, text, createdAt: new Date().toISOString() };
    setComments((c) => [temp, ...c]);
    setCommentText(''); setCommentOpen(false);
    try {
      const saved = await addCommentApi(item.id, text);
      setComments((c) => c.map((x) => (x.id === temp.id ? { ...temp, ...saved } : x)));
    } catch {
      setComments((c) => c.filter((x) => x.id !== temp.id));
      setCommentText(text); setCommentOpen(true);
      toast("Couldn't post that comment", 'error');
    }
  };

  const feed = useMemo(() => {
    const acts = readActivity(item.id).map((a) => ({ id: a.id, userId: a.userId, text: a.text, at: a.at, comment: false }));
    const cs = comments.map((c) => ({ id: c.id, userId: c.userId, text: c.text, at: c.createdAt, comment: true }));
    return [...(details ? acts : []), ...cs].sort((a, b) => b.at.localeCompare(a.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, details, item.id, item.title, item.checklist.length, item.listId, item.done, item.dueDate]);

  const moveTo = (listId: string) => {
    if (!listId || listId === item.listId) return;
    const to = lists.find((l) => l.id === listId)?.title;
    data.moveCard(item.id, listId, null);
    toast(`Moved to ${to}`);
  };
  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}#/tasks/${item.id}`;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url, 'info'); }
  };
  const toggleWatch = () => {
    const v = !watch; setWatch(v);
    try { localStorage.setItem(`md2.watch.${item.id}`, v ? '1' : '0'); } catch { /* ignore */ }
    toast(v ? 'You are watching this card' : 'Stopped watching', 'info');
  };

  const b = bucketOf(item, today);
  const shown = hideChecked ? item.checklist.filter((c) => !c.done) : item.checklist;
  const assigned = item.assignee ? data.users.find((u) => u.id === item.assignee) : null;
  const prio = PRIORITIES.find((p) => p.key === item.priority);
  const when = (iso: string) => { const d = new Date(iso); return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`; };

  /* shared popovers (reused by the button row and the "+ Add" menu) */
  const labelsPop = (close: () => void) => (
    <div className="space-y-3">
      <PopTitle>Labels</PopTitle>
      {!newLabel ? (
        <>
          <Input value={labelQ} onChange={(e) => setLabelQ(e.target.value)} placeholder="Search labels…" className="!py-2" aria-label="Search labels" />
          <div className="space-y-1.5 max-h-56 overflow-y-auto scroll-y">
            {allLabels.filter((l) => l.toLowerCase().includes(labelQ.toLowerCase())).map((l) => (
              <button key={l} type="button" onClick={() => toggleLabel(l)} className="w-full flex items-center gap-2">
                <span className={`w-4 h-4 rounded border-2 grid place-items-center ${item.labels.includes(l) ? 'bg-ink border-ink text-white' : 'border-line'}`}>{item.labels.includes(l) && <Ic d="M5 13l4 4L19 7" size={10} />}</span>
                <span className="flex-1 text-left rounded-md px-3 py-2 text-sm font-bold text-[#ffffff]" style={{ background: labelHex(l, defs) }}>{l}</span>
              </button>
            ))}
            {allLabels.length === 0 && <p className="text-sm text-muted">No labels yet.</p>}
          </div>
          <Button size="sm" variant="soft" className="w-full" onClick={() => setNewLabel({ name: '', hex: LABEL_COLORS[0] })}>Create a new label</Button>
        </>
      ) : (
        <form onSubmit={(e) => { createLabel(e); }} className="space-y-3">
          <Input autoFocus value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })} placeholder="Label name" aria-label="Label name" />
          <div className="grid grid-cols-5 gap-2">
            {[...COVERS].map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setNewLabel({ ...newLabel, hex: c })} className="h-8 rounded-md" style={{ background: c, outline: newLabel.hex === c ? '2px solid var(--color-ink)' : 'none', outlineOffset: 2 }} />)}
          </div>
          <div className="flex gap-2"><Button size="sm" type="submit" disabled={!newLabel.name.trim()}>Create</Button><Button size="sm" variant="soft" type="button" onClick={() => setNewLabel(null)}>Back</Button></div>
        </form>
      )}
      <button type="button" className="sr-only" onClick={close}>Close</button>
    </div>
  );
  const datesPop = (close: () => void) => (
    <div className="space-y-3">
      <PopTitle>Dates</PopTitle>
      <label className="block text-xs font-bold text-muted">Due date
        <Input type="date" value={item.dueDate ?? ''} onChange={(e) => patch({ dueDate: e.target.value || null })} className="!mt-1.5" aria-label="Due date" />
      </label>
      <div className="flex gap-2"><Button size="sm" onClick={close}>Save</Button>{item.dueDate && <Button size="sm" variant="soft" onClick={() => { patch({ dueDate: null }); close(); }}>Remove</Button>}</div>
    </div>
  );
  const membersPop = (close: () => void) => (
    <div className="space-y-2">
      <PopTitle>Members</PopTitle>
      <div className="max-h-60 overflow-y-auto scroll-y space-y-0.5">
        {data.users.map((u) => (
          <button key={u.id} type="button" onClick={() => { patch({ assignee: item.assignee === u.id ? null : u.id }); close(); }} className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold hover:bg-ink/[0.07] text-left">
            <Avatar name={u.name || u.email || '?'} size={28} /><span className="flex-1 truncate">{u.name || u.email}</span>{item.assignee === u.id && <Ic d="M5 13l4 4L19 7" size={14} />}
          </button>
        ))}
        {data.users.length === 0 && <p className="text-sm text-muted">No people to assign.</p>}
      </div>
    </div>
  );
  const prioPop = (close: () => void) => (
    <div className="space-y-1">
      <PopTitle>Priority</PopTitle>
      {PRIORITIES.slice().reverse().map((p) => (
        <button key={p.key} type="button" onClick={() => { patch({ priority: p.key as Priority }); close(); }} className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-ink/[0.07] text-left"><span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />{p.label}{item.priority === p.key && <span className="ml-auto"><Ic d="M5 13l4 4L19 7" size={14} /></span>}</button>
      ))}
      {item.priority && <button type="button" onClick={() => { patch({ priority: null }); close(); }} className="w-full text-left rounded-lg px-2.5 py-2 text-sm font-semibold text-muted hover:bg-ink/[0.07]">Remove priority</button>}
    </div>
  );
  const coverPop = (close: () => void) => (
    <div className="space-y-3">
      <PopTitle>Cover</PopTitle>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Colors</p>
      <div className="grid grid-cols-5 gap-2">
        {COVERS.map((c) => <button key={c} type="button" aria-label={`Cover ${c}`} onClick={() => { patch({ coverColor: item.coverColor === c ? null : c }); }} className="h-9 rounded-md" style={{ background: c, outline: item.coverColor === c ? '2px solid var(--color-ink)' : 'none', outlineOffset: 2 }} />)}
      </div>
      {item.coverColor && <Button size="sm" variant="soft" className="w-full" onClick={() => { patch({ coverColor: null }); close(); }}>Remove cover</Button>}
    </div>
  );

  return (
    <div>
      {item.coverColor && <div className="h-24 rounded-t-3xl" style={{ background: item.coverColor }} />}

      {/* header */}
      <div className="flex items-center gap-2 px-5 sm:px-7 pt-5 pb-3">
        <Select value={item.listId ?? ''} onChange={(e) => moveTo(e.target.value)} aria-label="List" className="!w-auto !py-1.5 !text-sm !font-bold !rounded-lg !bg-ink/[0.07] !border-transparent min-w-[9rem]">
          {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <Pop align="right" width="w-72" button={(_, t) => <button type="button" onClick={t} aria-label="Cover" className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/[0.08]"><Ic d={I.image} size={18} /></button>}>{coverPop}</Pop>
          <Pop align="right" width="w-64" button={(_, t) => <button type="button" onClick={t} aria-label="Card menu" className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/[0.08]"><Ic d={I.dots} size={18} /></button>}>
            {(close) => (
              <div className="space-y-0.5">
                <PopTitle>Actions</PopTitle>
                <Row icon={I.user} onClick={() => { close(); patch({ assignee: item.assignee === data.me ? null : data.me }); }}>{item.assignee === data.me ? 'Leave' : 'Join'}</Row>
                <Row icon={I.copy} onClick={() => { close(); data.duplicateCard(item.id); }}>Copy</Row>
                <Row icon={I.eye} onClick={() => { close(); toggleWatch(); }}>{watch ? 'Unwatch' : 'Watch'}</Row>
                <Row icon={I.share} onClick={() => { close(); copyLink(); }}>Share link</Row>
                <Row icon={I.done} onClick={() => { close(); data.toggleDone(item); }}>{item.done ? 'Reopen' : 'Mark complete'}</Row>
                <div className="border-t border-line/70 my-1" />
                <Row icon={I.trash} danger onClick={() => { close(); onClose(); data.removeItem(item); }}>Delete</Row>
              </div>
            )}
          </Pop>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/[0.08]"><Ic d={I.x} size={18} /></button>
        </div>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_21rem] border-t border-line/70">
        {/* left */}
        <div className="px-5 sm:px-7 py-5 space-y-7 min-w-0">
          <div className="flex items-start gap-3">
            <div className="pt-2"><CheckCircle done={item.done} size={24} onToggle={() => { data.toggleDone(item); log(item.done ? 'marked this card incomplete' : 'marked this card complete'); }} /></div>
            <textarea
              value={title} rows={1} aria-label="Title"
              onChange={(e) => { setTitle(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
              className="flex-1 min-w-0 resize-none bg-transparent text-2xl font-extrabold tracking-tight leading-snug outline-none rounded-lg px-2 -mx-2 py-1 focus:bg-ink/[0.05]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 -mt-3">
            <Pop width="w-56" button={(_, t) => <PBtn icon={I.plus} onClick={t}>Add</PBtn>}>
              {(close) => (
                <div className="space-y-0.5">
                  <PopTitle>Add to card</PopTitle>
                  <Row icon={I.tag} onClick={() => { close(); document.getElementById('cb-labels')?.click(); }}>Labels</Row>
                  <Row icon={I.clock} onClick={() => { close(); document.getElementById('cb-dates')?.click(); }}>Dates</Row>
                  <Row icon={I.check} onClick={() => { close(); setAddingItem(true); }}>Checklist</Row>
                  <Row icon={I.members} onClick={() => { close(); document.getElementById('cb-members')?.click(); }}>Members</Row>
                  <Row icon={I.flag} onClick={() => { close(); document.getElementById('cb-prio')?.click(); }}>Priority</Row>
                </div>
              )}
            </Pop>
            <Pop width="w-72" button={(_, t) => <button id="cb-labels" type="button" onClick={t} className="inline-flex items-center gap-2 rounded-lg border border-line hover:bg-ink/[0.06] px-3 py-2 text-sm font-semibold"><Ic d={I.tag} size={15} />Labels</button>}>{labelsPop}</Pop>
            <Pop width="w-64" button={(_, t) => <button id="cb-dates" type="button" onClick={t} className="inline-flex items-center gap-2 rounded-lg border border-line hover:bg-ink/[0.06] px-3 py-2 text-sm font-semibold"><Ic d={I.clock} size={15} />Dates</button>}>{datesPop}</Pop>
            <PBtn icon={I.check} onClick={() => setAddingItem(true)}>Checklist</PBtn>
            <Pop width="w-64" button={(_, t) => <button id="cb-members" type="button" onClick={t} className="inline-flex items-center gap-2 rounded-lg border border-line hover:bg-ink/[0.06] px-3 py-2 text-sm font-semibold"><Ic d={I.members} size={15} />Members</button>}>{membersPop}</Pop>
            <Pop width="w-56" button={(_, t) => <button id="cb-prio" type="button" onClick={t} className="sr-only">Priority</button>}>{prioPop}</Pop>
          </div>

          {/* current values */}
          {(item.labels.length > 0 || item.dueDate || assigned || prio) && (
            <div className="flex flex-wrap gap-x-6 gap-y-4 -mt-2">
              {assigned && <div><p className="text-xs font-bold text-muted mb-1.5">Members</p><span className="inline-flex items-center gap-2"><Avatar name={assigned.name || assigned.email || '?'} size={30} /><span className="text-sm font-semibold">{assigned.name || assigned.email}</span></span></div>}
              {item.labels.length > 0 && <div><p className="text-xs font-bold text-muted mb-1.5">Labels</p><div className="flex flex-wrap gap-1.5">{item.labels.map((l) => <span key={l} className="rounded-md px-3 py-1.5 text-xs font-extrabold text-[#ffffff]" style={{ background: labelHex(l, defs) }}>{l}</span>)}</div></div>}
              {item.dueDate && <div><p className="text-xs font-bold text-muted mb-1.5">Due date</p><span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold ${item.done ? 'bg-good/20 text-good' : b === 'overdue' ? 'bg-bad text-[#ffffff]' : b === 'today' ? 'bg-warn text-[#06141b]' : 'bg-ink/[0.07]'}`}><Ic d={I.clock} size={14} />{dueLabel(item.dueDate, today)}{item.done && ' · Complete'}{!item.done && b === 'overdue' && ' · Overdue'}</span></div>}
              {prio && <div><p className="text-xs font-bold text-muted mb-1.5">Priority</p><span className="inline-flex items-center gap-2 rounded-lg bg-ink/[0.07] px-3 py-1.5 text-sm font-bold"><span className={`w-2.5 h-2.5 rounded-full ${prio.dot}`} />{prio.label}</span></div>}
            </div>
          )}

          {/* description */}
          <section>
            <h3 className="flex items-center gap-3 text-lg font-extrabold mb-3"><Ic d={I.text} size={20} />Description</h3>
            <div className="sm:pl-9">
              {descOpen ? (
                <div className="space-y-2">
                  <textarea autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="Add a more detailed description…" aria-label="Description" className="w-full rounded-lg border border-brand bg-white/70 glass-fill px-3 py-2.5 text-sm outline-none ring-4 ring-brand/10 resize-y" />
                  <div className="flex gap-2"><Button size="sm" onClick={saveDesc}>Save</Button><Button size="sm" variant="ghost" onClick={() => { setDesc(item.description); setDescOpen(false); }}>Cancel</Button></div>
                </div>
              ) : item.description ? (
                <button type="button" onClick={() => setDescOpen(true)} className="w-full text-left text-sm whitespace-pre-wrap break-words rounded-lg px-3 py-2 -mx-3 hover:bg-ink/[0.05]">{item.description}</button>
              ) : (
                <button type="button" onClick={() => setDescOpen(true)} className="w-full text-left rounded-lg border border-line px-3.5 py-3 text-sm text-muted hover:bg-ink/[0.04] min-h-[4.5rem]">Add a more detailed description…</button>
              )}
            </div>
          </section>

          {/* checklist */}
          {(item.checklist.length > 0 || addingItem) && (
            <section>
              <div className="flex items-center gap-3 mb-2">
                <Ic d={I.check} size={20} /><h3 className="text-lg font-extrabold flex-1">Checklist</h3>
                {item.checklist.some((c) => c.done) && <Button size="sm" variant="soft" onClick={() => setHideChecked((v) => !v)}>{hideChecked ? 'Show checked items' : 'Hide checked items'}</Button>}
                <Button size="sm" variant="soft" onClick={() => { setChecklist([]); setAddingItem(false); }}>Delete</Button>
              </div>
              <div className="sm:pl-9">
                <div className="flex items-center gap-3 mb-3"><span className="w-9 text-xs font-bold tabular-nums text-muted">{prog.pct}%</span><div className="flex-1"><ProgressBar pct={prog.pct} /></div></div>
                <ul className="m-0 p-0 space-y-0.5">
                  <AnimatePresence initial={false}>
                    {shown.map((c) => (
                      <motion.li key={c.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring} className="list-none overflow-hidden">
                        <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-ink/[0.05]">
                          <button type="button" role="checkbox" aria-checked={c.done} aria-label={c.text} onClick={() => setChecklist(item.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                            className={`w-[18px] h-[18px] shrink-0 rounded border-2 grid place-items-center ${c.done ? 'bg-brand border-brand text-white' : 'border-line hover:border-ink/50'}`}>{c.done && <Ic d="M5 13l4 4L19 7" size={11} />}</button>
                          <span className={`flex-1 text-sm break-words ${c.done ? 'line-through text-muted' : ''}`}>{c.text}</span>
                          <button type="button" aria-label="Remove item" onClick={() => setChecklist(item.checklist.filter((x) => x.id !== c.id))} className="w-8 h-8 rounded-lg grid place-items-center text-muted hover:text-bad hover:bg-bad/10 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><Ic d={I.x} size={14} /></button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {addingItem ? (
                  <form onSubmit={addItem} className="mt-2 space-y-2">
                    <textarea autoFocus value={itemText} onChange={(e) => setItemText(e.target.value)} rows={2} placeholder="Add an item" aria-label="New checklist item"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); } else if (e.key === 'Escape') { setAddingItem(false); setItemText(''); } }}
                      className="w-full rounded-lg border border-brand bg-white/70 glass-fill px-3 py-2 text-sm outline-none ring-4 ring-brand/10 resize-none" />
                    <div className="flex gap-2"><Button size="sm" type="submit" disabled={!itemText.trim()}>Add</Button><Button size="sm" variant="ghost" type="button" onClick={() => { setAddingItem(false); setItemText(''); }}>Cancel</Button></div>
                  </form>
                ) : (
                  <Button size="sm" variant="soft" className="mt-2" onClick={() => setAddingItem(true)}>Add an item</Button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* right: comments and activity */}
        <aside className="px-5 sm:px-6 py-5 md:border-l border-line/70 md:bg-ink/[0.025] md:rounded-br-3xl min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <Ic d={I.msg} size={20} /><h3 className="text-base font-extrabold flex-1">Comments and activity</h3>
            <Button size="sm" variant="soft" onClick={() => setDetails((v) => !v)}>{details ? 'Hide details' : 'Show details'}</Button>
          </div>
          {commentOpen ? (
            <div className="space-y-2 mb-5">
              <textarea autoFocus value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} placeholder="Write a comment…" aria-label="Comment" className="w-full rounded-lg border border-brand bg-white/70 glass-fill px-3 py-2 text-sm outline-none ring-4 ring-brand/10 resize-none" />
              <div className="flex gap-2"><Button size="sm" onClick={sendComment} disabled={!commentText.trim()}>Save</Button><Button size="sm" variant="ghost" onClick={() => { setCommentOpen(false); setCommentText(''); }}>Cancel</Button></div>
            </div>
          ) : (
            <button type="button" onClick={() => setCommentOpen(true)} className="w-full text-left rounded-lg border border-line bg-white/70 px-3.5 py-3 text-sm text-muted hover:bg-white mb-5">Write a comment…</button>
          )}
          <ul className="m-0 p-0 space-y-4">
            {feed.map((f) => (
              <li key={f.id} className="list-none flex gap-3">
                <Avatar name={userName(data.users, f.userId, data.me)} size={30} />
                <div className="min-w-0 flex-1">
                  {f.comment ? (
                    <>
                      <p className="text-sm"><b>{userName(data.users, f.userId, data.me)}</b> <span className="text-xs text-muted underline">{when(f.at)}</span></p>
                      <p className="mt-1 text-sm rounded-lg bg-white/80 border border-line px-3 py-2 break-words whitespace-pre-wrap">{f.text}</p>
                    </>
                  ) : (
                    <p className="text-sm"><b>{userName(data.users, f.userId, data.me)}</b> {f.text}<br /><span className="text-xs text-muted underline">{when(f.at)}</span></p>
                  )}
                </div>
              </li>
            ))}
            {feed.length === 0 && <li className="list-none text-sm text-muted">No activity yet.</li>}
          </ul>
          {card && details && <p className="mt-5 text-[11px] text-muted">Activity such as moves and edits is kept on this device.</p>}
        </aside>
      </div>
    </div>
  );
};
