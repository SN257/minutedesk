import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createBoardApi, createCardApi, createListApi, createTask, deleteBoardApi, deleteCardApi, deleteListApi, deleteTask,
  duplicateCardApi, getAllCardsApi, getAllUsers, getBoardsApi, getListsApi, getTasks, moveCardApi, updateBoardApi,
  updateCardApi, updateListApi, updateTask,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import {
  applyCardPatch, cardToItem, logActivity, normCard, normTask, taskIsDone, taskToItem,
  type BoardRec, type CardRec, type Item, type ListRec, type TaskRec, type UserRec,
} from './model';

/* eslint-disable @typescript-eslint/no-explicit-any */
const byOrder = <T extends { order: number }>(arr: T[]) => arr.map((v, i) => ({ v, i })).sort((a, b) => a.v.order - b.v.order || a.i - b.i).map((x) => x.v);

export type TaskPatch = Partial<Pick<TaskRec, 'title' | 'description' | 'dueDate' | 'status' | 'completed'>>;
export type CardPatch = Partial<Pick<CardRec, 'title' | 'description' | 'dueDate' | 'checklist' | 'priority' | 'labels' | 'assignee' | 'coverColor' | 'archived'>>;

export const useTasksData = () => {
  const { user } = useAuth();
  const toast = useToast();
  const me = user?.id ?? '';

  const [tasks, setTasks] = useState<TaskRec[]>([]);
  const [cards, setCards] = useState<CardRec[]>([]);
  const [boards, setBoards] = useState<BoardRec[]>([]);
  const [lists, setLists] = useState<ListRec[]>([]);
  const [users, setUsers] = useState<UserRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [t, c, b, u] = await Promise.all([
        getTasks().catch(() => null),
        getAllCardsApi().catch(() => null),
        getBoardsApi().catch(() => null),
        getAllUsers().catch(() => []),
      ]);
      if (t === null && c === null && b === null) throw new Error("We couldn't reach your tasks. Check your connection and try again.");
      const bs: BoardRec[] = (Array.isArray(b) ? b : []).map((x: any) => ({ id: String(x.id), title: x.title || 'Untitled board' }));
      const ls: ListRec[] = (await Promise.all(bs.map((bd) => getListsApi(bd.id).catch(() => []))))
        .flat()
        .map((l: any) => ({ id: String(l.id), title: l.title || 'Untitled', boardId: String(l.boardId), order: Number(l.order) || 0 }));
      setTasks((Array.isArray(t) ? t : []).map(normTask));
      setCards((Array.isArray(c) ? c : []).map(normCard));
      setBoards(bs);
      setLists(ls);
      setUsers(Array.isArray(u) ? u : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fail = useCallback((msg: string) => { toast(msg, 'error'); load(true); }, [toast, load]);

  /* ───────── derived ───────── */
  const listsByBoard = useMemo(() => {
    const m: Record<string, ListRec[]> = {};
    for (const b of boards) m[b.id] = byOrder(lists.filter((l) => l.boardId === b.id));
    return m;
  }, [boards, lists]);

  /** Everything that is "mine": personal tasks + cards assigned to me. */
  const myItems: Item[] = useMemo(
    () => [...tasks.map(taskToItem), ...cards.filter((c) => c.assignee === me).map((c) => cardToItem(c, lists, boards))],
    [tasks, cards, lists, boards, me],
  );

  const findItem = useCallback((id: string): Item | null => {
    const c = cards.find((x) => x.id === id);
    if (c) return cardToItem(c, lists, boards);
    const t = tasks.find((x) => x.id === id);
    return t ? taskToItem(t) : null;
  }, [cards, tasks, lists, boards]);

  /* ───────── tasks ───────── */
  const addTask = useCallback(async (title: string, dueDate?: string | null, description?: string) => {
    try {
      const raw = await createTask({ title, ...(description ? { description } : {}), ...(dueDate ? { dueDate } : {}) });
      const t = normTask(raw);
      setTasks((s) => [t, ...s]);
      return t;
    } catch (e: any) {
      toast(e?.message || "Couldn't add that task", 'error');
      return null;
    }
  }, [toast]);

  const patchTask = useCallback(async (id: string, patch: TaskPatch) => {
    const full: TaskPatch = { ...patch };
    if (patch.status && patch.completed === undefined) full.completed = patch.status === 'done';
    if (patch.completed !== undefined && !patch.status) full.status = patch.completed ? 'done' : 'todo';
    setTasks((s) => s.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...full } as TaskRec;
      if (taskIsDone(next) && !taskIsDone(t)) next.completedAt = new Date().toISOString();
      if (!taskIsDone(next)) next.completedAt = null;
      return next;
    }));
    try { await updateTask(id, full as any); } catch { fail("Couldn't save that change"); }
  }, [fail]);

  /* ───────── cards ───────── */
  const patchCard = useCallback(async (id: string, patch: CardPatch) => {
    setCards((s) => s.map((c) => (c.id === id ? applyCardPatch(c, patch) : c)));
    try { await updateCardApi(id, patch as any); } catch { fail("Couldn't save that change"); }
  }, [fail]);

  const addCard = useCallback(async (listId: string, title: string, dueDate?: string | null, extra: { description?: string; assignee?: string } = {}) => {
    try {
      const order = cardsRef.current.filter((c) => c.listId === listId).reduce((m, c) => Math.max(m, c.order), -1) + 1;
      const raw = await createCardApi(listId, { title, ...(dueDate ? { dueDate } : {}), ...(extra.description ? { description: extra.description } : {}), order, ...(extra.assignee ? { assignee: extra.assignee } : {}) } as any);
      if (!raw?.id) throw new Error('no card');
      const c = normCard({ ...raw, listId, order: raw.order ?? order });
      setCards((s) => [...s, c]);
      return c;
    } catch {
      toast("Couldn't add that card", 'error');
      return null;
    }
  }, [toast]);

  const upsertCard = useCallback((c: CardRec) => setCards((s) => (s.some((x) => x.id === c.id) ? s.map((x) => (x.id === c.id ? c : x)) : [...s, c])), []);

  /** Move a card to `toListId`, placing it before `beforeId` (or at the end). Renumbers like the original board did. */
  const moveCard = useCallback(async (cardId: string, toListId: string, beforeId: string | null) => {
    const all = cardsRef.current;
    const card = all.find((c) => c.id === cardId);
    if (!card) return;
    const target = byOrder(all.filter((c) => c.listId === toListId && c.id !== cardId));
    let idx = beforeId ? target.findIndex((c) => c.id === beforeId) : -1;
    if (idx < 0) idx = target.length;
    const ordered = [...target];
    ordered.splice(idx, 0, { ...card, listId: toListId });
    const changes = ordered.flatMap((c, i) => (c.id === cardId ? (card.listId === toListId && card.order === i ? [] : [{ id: c.id, order: i }]) : c.order !== i ? [{ id: c.id, order: i }] : []));
    if (!changes.length) return;
    if (card.listId !== toListId) {
      const name = (id: string) => lists.find((l) => l.id === id)?.title ?? 'a list';
      logActivity(cardId, me, `moved this card from ${name(card.listId)} to ${name(toListId)}`);
    }
    const map = new Map(changes.map((c) => [c.id, c.order]));
    setCards((s) => s.map((c) => (c.id === cardId ? { ...c, listId: toListId, order: map.get(c.id) ?? c.order } : map.has(c.id) ? { ...c, order: map.get(c.id)! } : c)));
    try {
      for (const ch of changes) await moveCardApi(ch.id, toListId, ch.order);
    } catch { fail("Couldn't move that card"); }
  }, [fail, lists, me]);

  const duplicateCard = useCallback(async (id: string) => {
    try {
      const raw = await duplicateCardApi(id);
      if (!raw?.id) throw new Error('no card');
      const max = cardsRef.current.filter((c) => c.listId === raw.listId).reduce((m, c) => Math.max(m, c.order), -1) + 1;
      const c = normCard({ ...raw, order: max });
      setCards((s) => [...s, c]);
      moveCardApi(c.id, c.listId, max).catch(() => {});
      toast('Duplicated');
      return c;
    } catch {
      toast("Couldn't duplicate that card", 'error');
      return null;
    }
  }, [toast]);

  const removeItem = useCallback(async (item: Item) => {
    if (item.kind === 'task') setTasks((s) => s.filter((t) => t.id !== item.id));
    else setCards((s) => s.filter((c) => c.id !== item.id));
    try {
      if (item.kind === 'task') await deleteTask(item.id); else await deleteCardApi(item.id);
      toast('Deleted');
    } catch { fail("Couldn't delete that"); }
  }, [fail, toast]);

  /** Tick / untick an item (optimistic). */
  const toggleDone = useCallback(async (item: Item) => {
    const done = !item.done;
    if (item.kind === 'task') await patchTask(item.id, { completed: done, status: done ? 'done' : 'todo' });
    else await patchCard(item.id, { archived: done });
    toast(done ? `Done: ${item.title.length > 40 ? item.title.slice(0, 40) + '…' : item.title}` : 'Moved back to open', 'success');
  }, [patchTask, patchCard, toast]);

  /* ───────── lists & boards ───────── */
  const addList = useCallback(async (boardId: string, title: string) => {
    try {
      const order = lists.filter((l) => l.boardId === boardId).length;
      const raw = await createListApi(boardId, { title, order } as any);
      const l: ListRec = { id: String(raw.id), title: raw.title || title, boardId, order: Number(raw.order) || order };
      setLists((s) => [...s, l]);
      return l;
    } catch { toast("Couldn't add that list", 'error'); return null; }
  }, [lists, toast]);

  const renameList = useCallback(async (id: string, title: string) => {
    setLists((s) => s.map((l) => (l.id === id ? { ...l, title } : l)));
    try { await updateListApi(id, { title }); } catch { fail("Couldn't rename that list"); }
  }, [fail]);

  const removeList = useCallback(async (id: string) => {
    setLists((s) => s.filter((l) => l.id !== id));
    setCards((s) => s.filter((c) => c.listId !== id));
    try { await deleteListApi(id); toast('List deleted'); } catch { fail("Couldn't delete that list"); }
  }, [fail, toast]);

  /** Drag a list next to another one (`after` = place it on the right of the target). */
  const moveList = useCallback(async (listId: string, targetId: string, after: boolean) => {
    const l = lists.find((x) => x.id === listId);
    if (!l || listId === targetId) return;
    const sib = byOrder(lists.filter((x) => x.boardId === l.boardId && x.id !== listId));
    let idx = sib.findIndex((x) => x.id === targetId);
    if (idx < 0) return;
    if (after) idx++;
    const ordered = [...sib];
    ordered.splice(idx, 0, l);
    const changes = ordered.map((x, i) => ({ id: x.id, order: i })).filter((c) => lists.find((x) => x.id === c.id)!.order !== c.order);
    if (!changes.length) return;
    setLists((s) => s.map((x) => { const c = changes.find((k) => k.id === x.id); return c ? { ...x, order: c.order } : x; }));
    try { for (const c of changes) await updateListApi(c.id, { order: c.order }); } catch { fail("Couldn't move that list"); }
  }, [lists, fail]);

  const addBoard = useCallback(async (title: string) => {
    try {
      const raw = await createBoardApi({ title });
      const b: BoardRec = { id: String(raw.id), title: raw.title || title };
      setBoards((s) => [b, ...s]);
      return b;
    } catch { toast("Couldn't create that board", 'error'); return null; }
  }, [toast]);

  const renameBoard = useCallback(async (id: string, title: string) => {
    setBoards((s) => s.map((b) => (b.id === id ? { ...b, title } : b)));
    try { await updateBoardApi(id, { title }); } catch { fail("Couldn't rename that board"); }
  }, [fail]);

  const removeBoard = useCallback(async (id: string) => {
    const gone = new Set(lists.filter((l) => l.boardId === id).map((l) => l.id));
    setBoards((s) => s.filter((b) => b.id !== id));
    setLists((s) => s.filter((l) => l.boardId !== id));
    setCards((s) => s.filter((c) => !gone.has(c.listId)));
    try { await deleteBoardApi(id); toast('Board deleted'); } catch { fail("Couldn't delete that board"); }
  }, [lists, fail, toast]);

  return {
    me, loading, error, reload: load,
    tasks, cards, boards, lists, users, listsByBoard, myItems, findItem,
    addTask, patchTask, addCard, patchCard, upsertCard, moveCard, duplicateCard, removeItem, toggleDone,
    addList, renameList, removeList, moveList, addBoard, renameBoard, removeBoard,
  };
};

export type TasksData = ReturnType<typeof useTasksData>;
