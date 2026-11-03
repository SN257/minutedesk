import { addDaysToDateString, formatLocalDate, getLocalDateString, parseLocalDate } from '../../lib/date';

/* ───────── Records (as held in state) ───────── */
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'inprogress' | 'done';
export interface ChecklistItem { id: string; text: string; done: boolean }

export interface TaskRec {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  completed: boolean;
  status: TaskStatus;
  completedAt: string | null;
  updatedAt: string | null;
}
export interface CardRec {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  order: number;
  listId: string;
  labels: string[];
  priority: Priority | null;
  assignee: string | null;
  coverColor: string | null;
  archived: boolean;
  archivedAt: string | null;
  checklist: ChecklistItem[];
  updatedAt: string | null;
}
export interface BoardRec { id: string; title: string }
export interface ListRec { id: string; title: string; boardId: string; order: number }
export interface UserRec { id: string; name?: string; email?: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
export const normTask = (r: any): TaskRec => ({
  id: String(r.id),
  title: r.title || '',
  description: r.description || '',
  dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : null,
  completed: !!r.completed,
  status: r.status === 'inprogress' || r.status === 'done' ? r.status : r.completed ? 'done' : 'todo',
  completedAt: r.completedAt || null,
  updatedAt: r.updatedAt || null,
});

export const normCard = (r: any): CardRec => ({
  id: String(r.id),
  title: r.title || '',
  description: r.description || '',
  dueDate: r.dueDate ? String(r.dueDate).slice(0, 10) : null,
  order: Number(r.order) || 0,
  listId: String(r.listId),
  labels: Array.isArray(r.labels) ? r.labels.filter(Boolean) : typeof r.labels === 'string' && r.labels ? r.labels.split(',') : [],
  priority: ['low', 'medium', 'high', 'urgent'].includes(r.priority) ? r.priority : null,
  assignee: r.assignee || null,
  coverColor: r.coverColor || null,
  archived: !!r.archived,
  archivedAt: r.archivedAt || null,
  checklist: Array.isArray(r.checklist) ? r.checklist : [],
  updatedAt: r.updatedAt || null,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export const taskIsDone = (t: TaskRec) => t.completed || t.status === 'done';

/** Mirrors the backend rules for checklist <-> archived so the optimistic UI matches what the server will do. */
export const applyCardPatch = (c: CardRec, patch: Partial<CardRec>): CardRec => {
  const next: CardRec = { ...c, ...patch };
  if (patch.archived === true && next.checklist.length > 0) {
    next.checklist = next.checklist.map((i) => ({ ...i, done: true }));
  }
  if (patch.checklist && patch.checklist.length > 0) {
    const all = patch.checklist.every((i) => i.done);
    if (all) { if (patch.archived !== false) next.archived = true; }
    else if (patch.archived === undefined) next.archived = false;
  }
  if (next.archived && !c.archived) next.archivedAt = new Date().toISOString();
  if (!next.archived && c.archived) next.archivedAt = null;
  return next;
};

/* ───────── Unified item (task or card) ───────── */
export interface Item {
  key: string;
  kind: 'task' | 'card';
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  done: boolean;
  doneAt: string | null;
  priority: Priority | null;
  assignee: string | null;
  checklist: ChecklistItem[];
  labels: string[];
  coverColor: string | null;
  status: TaskStatus;
  listId: string | null;
  listTitle: string | null;
  boardId: string | null;
  boardTitle: string | null;
}

export const taskToItem = (t: TaskRec): Item => {
  const done = taskIsDone(t);
  return {
    key: `task:${t.id}`, kind: 'task', id: t.id, title: t.title, description: t.description, dueDate: t.dueDate,
    done, doneAt: done ? t.completedAt || t.updatedAt : null, priority: null, assignee: null, checklist: [], labels: [],
    coverColor: null, status: done ? 'done' : t.status, listId: null, listTitle: null, boardId: null, boardTitle: null,
  };
};

export const cardToItem = (c: CardRec, lists: ListRec[], boards: BoardRec[]): Item => {
  const list = lists.find((l) => l.id === c.listId);
  const board = list ? boards.find((b) => b.id === list.boardId) : undefined;
  return {
    key: `card:${c.id}`, kind: 'card', id: c.id, title: c.title, description: c.description, dueDate: c.dueDate,
    done: c.archived, doneAt: c.archived ? c.archivedAt || c.updatedAt : null, priority: c.priority, assignee: c.assignee,
    checklist: c.checklist, labels: c.labels, coverColor: c.coverColor, status: c.archived ? 'done' : 'todo',
    listId: c.listId, listTitle: list?.title ?? null, boardId: list?.boardId ?? null, boardTitle: board?.title ?? null,
  };
};

/* ───────── Dates ───────── */
export type Bucket = 'overdue' | 'today' | 'upcoming' | 'none' | 'done';

export const bucketOf = (it: Pick<Item, 'done' | 'dueDate'>, today: string): Bucket => {
  if (it.done) return 'done';
  if (!it.dueDate) return 'none';
  if (it.dueDate < today) return 'overdue';
  return it.dueDate === today ? 'today' : 'upcoming';
};

export const dayDiff = (a: string, b: string) => Math.round((parseLocalDate(a).getTime() - parseLocalDate(b).getTime()) / 86400000);

export const dueLabel = (date: string, today: string): string => {
  const d = dayDiff(date, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d < -1) return `${-d}d overdue`;
  if (d < 7) return formatLocalDate(date, { weekday: 'short' });
  const sameYear = parseLocalDate(date).getFullYear() === parseLocalDate(today).getFullYear();
  return formatLocalDate(date, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
};

export const longDate = (date: string) => formatLocalDate(date, { weekday: 'short', month: 'short', day: 'numeric' });

/** Local calendar date of an ISO timestamp, or null. */
export const dateOfTimestamp = (ts: string | null): string | null => {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : getLocalDateString(d);
};

/* ───────── Quick-add: "Send invoice #fri" ───────── */
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Turns a shortcut word (tomorrow, fri, 3d, 2w, nextweek, 2026-11-05) into a local YYYY-MM-DD, or null. */
export const parseWhen = (raw: string, today: string): string | null => {
  const w = raw.toLowerCase();
  if (w === 'today' || w === 'tod') return today;
  if (w === 'tomorrow' || w === 'tmr' || w === 'tmrw' || w === 'tom') return addDaysToDateString(today, 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(w)) return w;
  const m = w.match(/^(\d{1,3})([dw])$/);
  if (m) return addDaysToDateString(today, Number(m[1]) * (m[2] === 'w' ? 7 : 1));
  const dow = parseLocalDate(today).getDay();
  if (w === 'nextweek' || w === 'nw') return addDaysToDateString(today, ((8 - dow) % 7) || 7);
  if (w === 'weekend') return addDaysToDateString(today, ((6 - dow + 7) % 7) || 7);
  if (/^[a-z]{3,9}$/.test(w)) {
    const idx = WEEKDAYS.findIndex((d) => d.startsWith(w));
    if (idx >= 0) return addDaysToDateString(today, ((idx - dow + 7) % 7) || 7);
  }
  return null;
};

export const parseQuickAdd = (text: string, today: string): { title: string; dueDate: string | null } => {
  const re = /(^|\s)#([a-z0-9-]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const when = parseWhen(match[2], today);
    if (when) {
      const title = (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim();
      return { title, dueDate: when };
    }
  }
  return { title: text.trim(), dueDate: null };
};

/* ───────── Priority & labels ───────── */
export const PRIORITIES: { key: Priority; label: string; dot: string }[] = [
  { key: 'low', label: 'Low', dot: 'bg-muted/60' },
  { key: 'medium', label: 'Medium', dot: 'bg-brand' },
  { key: 'high', label: 'High', dot: 'bg-warn' },
  { key: 'urgent', label: 'Urgent', dot: 'bg-bad' },
];
export const priorityRank = (p: Priority | null) => (p === 'urgent' ? 0 : p === 'high' ? 1 : p === 'medium' ? 2 : p === 'low' ? 3 : 4);

export const LABEL_COLORS = ['#b8404f', '#9ba8ab', '#a5802f', '#2d7a6a', '#4a5c6a', '#4a5c6a', '#4a5c6a', '#9ba8ab', '#4a5c6a', '#4a5c6a'];
export const COVER_COLORS = ['#06141b', '#4a5c6a', '#253745', '#253745', '#a5802f', '#b8404f'];

export interface LabelDef { name: string; hex: string }
/** Same storage key as the original app so existing label colours carry over. */
export const loadBoardLabels = (boardId: string | null): LabelDef[] => {
  if (!boardId) return [];
  try {
    const raw = localStorage.getItem(`board-labels-${boardId}`);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};
export const saveBoardLabels = (boardId: string | null, defs: LabelDef[]) => {
  if (!boardId) return;
  try { localStorage.setItem(`board-labels-${boardId}`, JSON.stringify(defs)); } catch { /* storage unavailable */ }
};
export const labelHex = (name: string, defs: LabelDef[]) =>
  defs.find((d) => d.name === name)?.hex ?? LABEL_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % LABEL_COLORS.length];

export const checklistProgress = (list: ChecklistItem[]) => {
  const done = list.filter((i) => i.done).length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
};

export const sortItems = (a: Item, b: Item) =>
  (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : (a.dueDate || '9999') > (b.dueDate || '9999') ? 1
    : priorityRank(a.priority) - priorityRank(b.priority) || a.title.localeCompare(b.title);

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ───────── Card activity (kept on this device: the server only stores comments) ───────── */
export interface Activity { id: string; userId: string; text: string; at: string }
const actKey = (cardId: string) => `md2.activity.${cardId}`;
export const readActivity = (cardId: string): Activity[] => {
  try { const v = JSON.parse(localStorage.getItem(actKey(cardId)) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const logActivity = (cardId: string, userId: string, text: string) => {
  try {
    const next = [...readActivity(cardId), { id: uid(), userId, text, at: new Date().toISOString() }].slice(-60);
    localStorage.setItem(actKey(cardId), JSON.stringify(next));
  } catch { /* storage unavailable */ }
};
