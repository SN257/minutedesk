import { useSyncExternalStore } from 'react';

/** Extra breadcrumb levels a screen can add under its section, for example Tasks › Workspace › Board. */
export interface Crumb { label: string; run?: () => void }

let current: Crumb[] = [];
const subs = new Set<() => void>();

export const setCrumbs = (c: Crumb[]) => { current = c; subs.forEach((f) => f()); };
export const useExtraCrumbs = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => current);
