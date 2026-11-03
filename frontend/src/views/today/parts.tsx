/* Shared types and a loading placeholder for the dashboard. */
export interface Evt {
  key: string; id: string; logged: boolean; date: string; start: string; end: string;
  title: string; sub: string; names: string[];
}
export interface Item {
  key: string; kind: 'task' | 'card'; id: string; title: string; due: string; done: boolean; late: boolean;
}

export const Skel = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-2xl bg-char/[0.07] animate-pulse ${className}`} />
);
