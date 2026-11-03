import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { addCommentApi, getCommentsApi } from '../../lib/api';
import { addDaysToDateString, getLocalDateString } from '../../lib/date';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { Avatar, Button, Drawer, Input, Select, Textarea } from '../../ui';
import {
  COVER_COLORS, LABEL_COLORS, PRIORITIES, checklistProgress, dayDiff, loadBoardLabels, longDate, parseWhen, saveBoardLabels, uid,
  type ChecklistItem, type Item, type LabelDef, type Priority, type TaskStatus,
} from './model';
import { CheckCircle, LabelChip, ProgressBar, Section, SourceBadge, userName } from './parts';
import { CardBack } from './CardBack';
import type { CardPatch, TaskPatch, TasksData } from './useTasksData';

interface Comment { id: string; userId: string; text: string; createdAt: string }

const Chip = ({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) => (
  <button type="button" onClick={onClick} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${active ? 'bg-ink text-white border-ink' : 'bg-white border-line text-ink-2 hover:border-ink/30'}`}>{children}</button>
);

const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To do' },
  { key: 'inprogress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

const Body = ({ item, data, onClose }: { item: Item; data: TasksData; onClose: () => void }) => {
  const toast = useToast();
  const today = getLocalDateString();
  const isCard = item.kind === 'card';

  const [title, setTitle] = useState(item.title);
  const [desc, setDesc] = useState(item.description);
  const [confirm, setConfirm] = useState(false);
  const [checkText, setCheckText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [defs, setDefs] = useState<LabelDef[]>(() => loadBoardLabels(item.boardId));
  const [newLabel, setNewLabel] = useState<{ name: string; hex: string } | null>(null);

  // Keep local drafts in sync if the item is changed from elsewhere (e.g. the list behind the drawer).
  const lastSynced = useRef({ title: item.title, desc: item.description });
  useEffect(() => {
    if (item.title !== lastSynced.current.title) { setTitle(item.title); lastSynced.current.title = item.title; }
    if (item.description !== lastSynced.current.desc) { setDesc(item.description); lastSynced.current.desc = item.description; }
  }, [item.title, item.description]);

  useEffect(() => {
    if (!isCard) return;
    let alive = true;
    getCommentsApi(item.id).then((c) => alive && setComments(Array.isArray(c) ? c : [])).catch(() => {});
    return () => { alive = false; };
  }, [isCard, item.id]);

  const patch = (p: CardPatch & Pick<TaskPatch, 'status' | 'completed'>) => {
    if (isCard) data.patchCard(item.id, p as CardPatch);
    else data.patchTask(item.id, p as TaskPatch);
  };

  const commitTitle = () => {
    const t = title.trim();
    if (!t) { setTitle(item.title); return; }
    if (t !== item.title) { lastSynced.current.title = t; patch({ title: t }); }
  };
  const commitDesc = () => { if (desc !== item.description) { lastSynced.current.desc = desc; patch({ description: desc }); } };

  /* Checklist */
  const prog = checklistProgress(item.checklist);
  const setChecklist = (next: ChecklistItem[]) => patch({ checklist: next });
  const addCheck = (e: FormEvent) => {
    e.preventDefault();
    const t = checkText.trim();
    if (!t) return;
    setCheckText('');
    setChecklist([...item.checklist, { id: uid(), text: t, done: false }]);
  };

  /* Labels */
  const boardCardLabels = useMemo(() => {
    const set = new Set<string>(defs.map((d) => d.name));
    item.labels.forEach((l) => set.add(l));
    if (item.boardId) {
      const ids = new Set(data.listsByBoard[item.boardId]?.map((l) => l.id));
      data.cards.filter((c) => ids.has(c.listId)).forEach((c) => c.labels.forEach((l) => set.add(l)));
    }
    return [...set];
  }, [defs, item.labels, item.boardId, data.cards, data.listsByBoard]);

  const toggleLabel = (name: string) => patch({ labels: item.labels.includes(name) ? item.labels.filter((l) => l !== name) : [...item.labels, name] });
  const createLabel = (e: FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newLabel.name.trim()) return;
    const name = newLabel.name.trim();
    const next = [...defs.filter((d) => d.name !== name), { name, hex: newLabel.hex }];
    setDefs(next);
    saveBoardLabels(item.boardId, next);
    if (!item.labels.includes(name)) patch({ labels: [...item.labels, name] });
    setNewLabel(null);
  };

  /* Comments */
  const sendComment = async (e: FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    const temp: Comment = { id: `tmp-${uid()}`, userId: data.me, text, createdAt: new Date().toISOString() };
    setComments((c) => [...c, temp]);
    setCommentText('');
    try {
      const saved = await addCommentApi(item.id, text);
      setComments((c) => c.map((x) => (x.id === temp.id ? { ...temp, ...saved } : x)));
    } catch {
      setComments((c) => c.filter((x) => x.id !== temp.id));
      setCommentText(text);
      toast("Couldn't post that comment", 'error');
    }
  };

  const quickDue = (v: string | null) => patch({ dueDate: v });
  const dueNote = item.dueDate && !item.done ? (() => { const d = dayDiff(item.dueDate, today); return d < 0 ? `${-d} ${d === -1 ? 'day' : 'days'} overdue` : d === 0 ? 'Due today' : `In ${d} ${d === 1 ? 'day' : 'days'}`; })() : '';
  const boardLists = item.boardId ? data.listsByBoard[item.boardId] ?? [] : [];

  return (
    <div>
      {/* Title row */}
      <div className="flex items-start gap-3 mb-6">
        <div className="pt-2"><CheckCircle done={item.done} size={26} onToggle={() => data.toggleDone(item)} /></div>
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setTitle(item.title); (e.target as HTMLInputElement).blur(); } }}
            aria-label="Title"
            className={`w-full text-xl font-extrabold tracking-tight bg-transparent outline-none rounded-lg px-2 py-1 -mx-2 hover:bg-ink/[0.04] focus:bg-ink/[0.04] focus:ring-4 focus:ring-brand/10 ${item.done ? 'line-through text-muted' : ''}`}
          />
          <div className="mt-1.5"><SourceBadge item={item} /></div>
        </div>
      </div>

      {!isCard && (
        <Section label="Status">
          <div className="inline-flex bg-ink/[0.05] rounded-xl p-1 gap-0.5">
            {STATUSES.map((s) => (
              <button key={s.key} type="button" onClick={() => patch({ status: s.key })} className={`relative px-3.5 py-2 rounded-lg text-sm font-semibold ${item.status === s.key ? 'text-ink' : 'text-muted hover:text-ink'}`}>
                {item.status === s.key && <motion.span layoutId="drawer-status" transition={spring} className="absolute inset-0 bg-white rounded-lg shadow-card" />}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section label="Due date" right={dueNote && <span className={`text-xs font-bold ${dueNote.includes('overdue') ? 'text-bad' : 'text-muted'}`}>{dueNote}</span>}>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={item.dueDate ?? ''} onChange={(e) => quickDue(e.target.value || null)} aria-label="Due date" className="!w-auto" />
          <Chip active={item.dueDate === today} onClick={() => quickDue(today)}>Today</Chip>
          <Chip active={item.dueDate === addDaysToDateString(today, 1)} onClick={() => quickDue(addDaysToDateString(today, 1))}>Tomorrow</Chip>
          <Chip onClick={() => quickDue(parseWhen('nextweek', today))}>Next week</Chip>
          {item.dueDate && <button type="button" onClick={() => quickDue(null)} className="text-xs font-semibold text-muted hover:text-bad px-2 py-2">Clear</button>}
        </div>
        {item.dueDate && <p className="text-[11px] text-muted mt-1.5">{longDate(item.dueDate)}</p>}
      </Section>

      {isCard && (
        <>
          <Section label="Priority">
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => {
                const on = item.priority === p.key;
                return (
                  <button key={p.key} type="button" onClick={() => patch({ priority: on ? null : (p.key as Priority) })}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${on ? 'bg-ink text-white border-ink' : 'bg-white border-line text-ink-2 hover:border-ink/30'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />{p.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Assigned to">
            <div className="flex items-center gap-3">
              {item.assignee && <Avatar name={userName(data.users, item.assignee)} size={36} />}
              <Select value={item.assignee ?? ''} onChange={(e) => patch({ assignee: e.target.value || null })} aria-label="Assignee" className="flex-1">
                <option value="">Unassigned</option>
                {data.users.map((u) => <option key={u.id} value={u.id}>{u.id === data.me ? 'Me' : u.name || u.email || u.id}</option>)}
              </Select>
              {item.assignee !== data.me && <Button size="sm" variant="soft" onClick={() => patch({ assignee: data.me })}>Me</Button>}
            </div>
          </Section>

          {boardLists.length > 0 && (
            <Section label="List">
              <Select value={item.listId ?? ''} onChange={(e) => { if (e.target.value && e.target.value !== item.listId) { data.moveCard(item.id, e.target.value, null); toast(`Moved to ${boardLists.find((l) => l.id === e.target.value)?.title}`); } }} aria-label="List">
                {boardLists.map((l) => <option key={l.id} value={l.id}>{item.boardTitle} · {l.title}</option>)}
              </Select>
            </Section>
          )}

          <Section label="Labels" right={<button type="button" onClick={() => setNewLabel(newLabel ? null : { name: '', hex: LABEL_COLORS[0] })} className="text-xs font-bold text-brand px-2 py-1.5 -my-1.5 rounded-lg hover:bg-brand-soft">{newLabel ? 'Cancel' : '+ New label'}</button>}>
            <div className="flex flex-wrap gap-2">
              {boardCardLabels.length === 0 && !newLabel && <p className="text-sm text-muted">No labels yet. Create one to group similar work.</p>}
              {boardCardLabels.map((l) => <LabelChip key={l} name={l} defs={defs} active={item.labels.includes(l)} onClick={() => toggleLabel(l)} />)}
            </div>
            <AnimatePresence initial={false}>
              {newLabel && (
                <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={createLabel} className="overflow-hidden">
                  <div className="pt-3 space-y-3">
                    <Input autoFocus value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })} placeholder="Label name" aria-label="Label name" />
                    <div className="flex flex-wrap items-center gap-2">
                      {LABEL_COLORS.map((c) => (
                        <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setNewLabel({ ...newLabel, hex: c })} className="w-7 h-7 rounded-full ring-offset-2 transition" style={{ background: c, boxShadow: newLabel.hex === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }} />
                      ))}
                      <Button size="sm" type="submit" className="ml-auto" disabled={!newLabel.name.trim()}>Add label</Button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </Section>

          <Section label="Cover colour">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="No cover" onClick={() => patch({ coverColor: null })} className={`w-8 h-8 rounded-full border-2 grid place-items-center text-muted text-xs ${!item.coverColor ? 'border-ink' : 'border-line'}`}>∅</button>
              {COVER_COLORS.map((c) => (
                <motion.button key={c} type="button" aria-label={`Cover ${c}`} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} onClick={() => patch({ coverColor: item.coverColor === c ? null : c })}
                  className="w-8 h-8 rounded-full" style={{ background: c, boxShadow: item.coverColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }} />
              ))}
            </div>
          </Section>
        </>
      )}

      <Section label="Notes">
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={commitDesc} rows={4} placeholder="Add details, links or context…" aria-label="Description" />
      </Section>

      {isCard && (
        <Section label="Checklist" right={prog.total > 0 && <span className="text-xs font-bold text-muted tabular-nums">{prog.done} of {prog.total} done</span>}>
          {prog.total > 0 && <div className="mb-3"><ProgressBar pct={prog.pct} /></div>}
          <ul className="m-0 p-0">
            <AnimatePresence initial={false}>
              {item.checklist.map((c) => (
                <motion.li key={c.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, x: 20 }} transition={spring} className="list-none overflow-hidden">
                  <div className="group flex items-center gap-3 py-1.5">
                    <CheckCircle done={c.done} size={20} label={c.done ? 'Untick item' : 'Tick item'} onToggle={() => setChecklist(item.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} />
                    <span className={`flex-1 text-sm break-words ${c.done ? 'line-through text-muted' : 'text-ink'}`}>{c.text}</span>
                    <button type="button" aria-label="Remove item" onClick={() => setChecklist(item.checklist.filter((x) => x.id !== c.id))} className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-bad hover:bg-bad/5 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition">✕</button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <form onSubmit={addCheck} className="flex gap-2 mt-2">
            <Input value={checkText} onChange={(e) => setCheckText(e.target.value)} placeholder="Add a step…" aria-label="New checklist item" />
            <Button type="submit" variant="soft" disabled={!checkText.trim()}>Add</Button>
          </form>
        </Section>
      )}

      {isCard && (
        <Section label={`Comments${comments.length ? ` · ${comments.length}` : ''}`}>
          <ul className="m-0 p-0 space-y-3 mb-3">
            <AnimatePresence initial={false}>
              {comments.map((c) => (
                <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="list-none flex gap-3">
                  <Avatar name={userName(data.users, c.userId, data.me)} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs"><span className="font-bold">{userName(data.users, c.userId, data.me)}</span> <span className="text-muted">· {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></p>
                    <p className="mt-1 text-sm bg-ink/[0.04] rounded-2xl rounded-tl-md px-3.5 py-2 break-words whitespace-pre-wrap">{c.text}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            {comments.length === 0 && <li className="list-none text-sm text-muted">No comments yet.</li>}
          </ul>
          <form onSubmit={sendComment} className="flex gap-2">
            <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment…" aria-label="Comment" />
            <Button type="submit" disabled={!commentText.trim()}>Send</Button>
          </form>
        </Section>
      )}

      {/* Actions */}
      <div className="border-t border-line pt-5 mt-2 flex flex-wrap items-center gap-2">
        <Button variant={item.done ? 'soft' : 'primary'} onClick={() => data.toggleDone(item)}>{item.done ? 'Reopen' : 'Mark complete'}</Button>
        {isCard && <Button variant="soft" onClick={() => data.duplicateCard(item.id)}>Duplicate</Button>}
        <div className="ml-auto">
          <AnimatePresence mode="wait" initial={false}>
            {confirm ? (
              <motion.div key="c" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-bad">Delete for good?</span>
                <Button size="sm" variant="danger" onClick={() => { onClose(); data.removeItem(item); }}>Delete</Button>
                <Button size="sm" variant="soft" onClick={() => setConfirm(false)}>Keep</Button>
              </motion.div>
            ) : (
              <motion.div key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button variant="ghost" className="!text-bad hover:!bg-bad/5" onClick={() => setConfirm(true)}>Delete</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export const TaskDrawer = ({ item, open, onClose, data }: { item: Item | null; open: boolean; onClose: () => void; data: TasksData }) => {
  const last = useRef<Item | null>(null);
  if (item) last.current = item;
  const shown = item ?? last.current;
  if (shown?.kind === 'card') {
    return (
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[150] overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative min-h-full flex items-start justify-center p-3 sm:p-8" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
              <motion.div initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="relative w-full max-w-4xl glass-pop !bg-white/[0.985] rounded-3xl">
                <CardBack key={shown.key} item={shown} data={data} onClose={onClose} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  return (
    <Drawer open={open} onClose={onClose} title={shown ? 'Task' : ''}>
      {shown && <Body key={shown.key} item={shown} data={data} onClose={onClose} />}
    </Drawer>
  );
};
