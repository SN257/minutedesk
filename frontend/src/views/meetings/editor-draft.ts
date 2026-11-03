import type { EditorData } from './editor-types';

/** Drafts live in localStorage only. Every access is guarded: storage can be blocked or full. */
export interface Draft {
  data: EditorData;
  step: number;
  savedAt: number;
}

const key = (id: string, scheduledId?: string | null) =>
  `mdv2.meeting-draft.${id === 'new' ? `new${scheduledId ? `:${scheduledId}` : ''}` : id}`;

export const loadDraft = (id: string, scheduledId?: string | null): Draft | null => {
  try {
    const raw = localStorage.getItem(key(id, scheduledId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || typeof d !== 'object' || !d.data || !Array.isArray(d.data.agenda) || !Array.isArray(d.data.notes)) return null;
    return d;
  } catch {
    return null;
  }
};

export const saveDraft = (id: string, scheduledId: string | null | undefined, draft: Draft): boolean => {
  try {
    localStorage.setItem(key(id, scheduledId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
};

export const clearDraft = (id: string, scheduledId?: string | null) => {
  try {
    localStorage.removeItem(key(id, scheduledId));
  } catch {
    /* ignore */
  }
};
