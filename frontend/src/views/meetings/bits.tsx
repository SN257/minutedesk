import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { Button, Modal } from '../../ui';

/* Small stroke icons used across the meetings screens. */
const PATHS = {
  trash: 'M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14M10 11v6m4-6v6',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  back: 'M19 12H5m6-6l-6 6 6 6',
  clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z',
  users: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1m17 0v-1a4 4 0 00-3-3.9M14 4.1a4 4 0 010 7.8M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  play: 'M6 4l14 8-14 8V4z',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  bell: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9m4.3 13a2 2 0 003.4 0',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  calendar: 'M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  check: 'M5 13l4 4L19 7',
  x: 'M6 6l12 12M18 6L6 18',
} as const;

export const Ico = ({ name, size = 16 }: { name: keyof typeof PATHS; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
);

/** Filter chip (pill toggle). */
export const Chip = ({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) => (
  <motion.button
    type="button"
    layout
    whileTap={{ scale: 0.95 }}
    transition={spring}
    onClick={onClick}
    aria-pressed={active}
    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
      active ? 'bg-ink text-white border-ink' : 'bg-white/70 glass-fill text-ink-2 border-line hover:border-ink/30'
    }`}
  >
    {children}
    {count !== undefined && <span className={`text-[10px] ${active ? 'text-white/70' : 'text-muted'}`}>{count}</span>}
  </motion.button>
);

export const BackLink = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} className="md-noprint inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink mb-4 -ml-1 px-1 py-1.5 rounded-lg">
    <Ico name="back" size={16} /> {children}
  </button>
);

/** Round icon-only button. */
export const IconBtn = ({ label, onClick, children, tone = 'default' }: { label: string; onClick: (e: React.MouseEvent) => void; children: ReactNode; tone?: 'default' | 'danger' }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`w-10 h-10 rounded-xl grid place-items-center transition-colors ${tone === 'danger' ? 'text-muted hover:text-bad hover:bg-bad/10' : 'text-muted hover:text-ink hover:bg-ink/5'}`}
  >
    {children}
  </button>
);

export const ConfirmModal = ({ open, title, body, confirmLabel = 'Delete', busy, onConfirm, onClose }: {
  open: boolean; title: string; body: ReactNode; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) => (
  <Modal open={open} onClose={onClose} title={title}>
    <div className="text-sm text-ink-2 leading-relaxed">{body}</div>
    <div className="flex justify-end gap-2 mt-6">
      <Button variant="soft" onClick={onClose} disabled={busy}>Keep it</Button>
      <Button variant="danger" onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
    </div>
  </Modal>
);
