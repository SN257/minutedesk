import { useCallback, useEffect, useMemo, useState } from 'react';
import { uid, type BoardRec } from './model';

/**
 * Workspaces group boards (Trello style). The server only knows about boards, so the workspaces
 * and which board sits in which workspace are kept in this browser, per signed-in user.
 */
export interface Workspace { id: string; name: string; description: string }

const wsKey = (me: string) => `md2.workspaces.${me}`;
const mapKey = (me: string) => `md2.board-ws.${me}`;
const recentKey = (me: string) => `md2.recent-boards.${me}`;

const read = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export const useWorkspaces = (me: string, boards: BoardRec[], loading: boolean) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => read(wsKey(me), []));
  const [map, setMap] = useState<Record<string, string>>(() => read(mapKey(me), {}));
  const [recent, setRecent] = useState<string[]>(() => read(recentKey(me), []));

  useEffect(() => {
    setWorkspaces(read(wsKey(me), [])); setMap(read(mapKey(me), {})); setRecent(read(recentKey(me), []));
  }, [me]);

  // Boards that existed before workspaces did: give them a home so nothing disappears.
  useEffect(() => {
    if (loading || !me || boards.length === 0 || workspaces.length > 0) return;
    const w: Workspace = { id: uid(), name: 'My workspace', description: '' };
    setWorkspaces([w]); write(wsKey(me), [w]);
  }, [loading, me, boards.length, workspaces.length]);

  const wsOf = useCallback((boardId: string) => {
    const id = map[boardId];
    return workspaces.find((w) => w.id === id) ?? workspaces[0] ?? null;
  }, [map, workspaces]);

  const boardsOf = useCallback((wsId: string) => boards.filter((b) => wsOf(b.id)?.id === wsId), [boards, wsOf]);

  const create = useCallback((name: string, description = ''): Workspace => {
    const w: Workspace = { id: uid(), name: name.trim(), description: description.trim() };
    setWorkspaces((s) => { const n = [...s, w]; write(wsKey(me), n); return n; });
    return w;
  }, [me]);

  const rename = useCallback((id: string, name: string, description?: string) => {
    setWorkspaces((s) => { const n = s.map((w) => (w.id === id ? { ...w, name: name.trim() || w.name, description: description ?? w.description } : w)); write(wsKey(me), n); return n; });
  }, [me]);

  const remove = useCallback((id: string) => {
    setWorkspaces((s) => {
      const n = s.filter((w) => w.id !== id);
      write(wsKey(me), n);
      return n;
    });
    setMap((m) => { const n = Object.fromEntries(Object.entries(m).filter(([, w]) => w !== id)); write(mapKey(me), n); return n; });
  }, [me]);

  const assign = useCallback((boardId: string, wsId: string) => {
    setMap((m) => { const n = { ...m, [boardId]: wsId }; write(mapKey(me), n); return n; });
  }, [me]);

  const visit = useCallback((boardId: string) => {
    setRecent((r) => { const n = [boardId, ...r.filter((x) => x !== boardId)].slice(0, 8); write(recentKey(me), n); return n; });
  }, [me]);

  const recentBoards = useMemo(() => recent.map((id) => boards.find((b) => b.id === id)).filter(Boolean) as BoardRec[], [recent, boards]);

  return { workspaces, wsOf, boardsOf, create, rename, remove, assign, visit, recentBoards };
};

export type WorkspacesApi = ReturnType<typeof useWorkspaces>;
