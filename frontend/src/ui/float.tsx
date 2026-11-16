import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * A glass menu that opens from a button but is drawn on top of the whole page, not inside the bar the button lives in.
 * (A blurred bar cannot blur what is behind a menu nested inside it, so menus inside the top bar need this.)
 */
export const FloatPanel = ({ open, onClose, anchor, placement = 'bottom-end', width, className = '', children }: {
  open: boolean; onClose: () => void; anchor: RefObject<HTMLElement | null>; placement?: 'bottom-end' | 'right-end'; width: number; className?: string; children: ReactNode;
}) => {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  const place = useCallback(() => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    if (placement === 'right-end') setPos({ left: Math.min(r.right + 12, window.innerWidth - width - 12), bottom: Math.max(12, window.innerHeight - r.bottom) });
    else setPos({ left: Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12)), top: r.bottom + 10 });
  }, [anchor, placement, width]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { const t = e.target as Node; if (!panel.current?.contains(t) && !anchor.current?.contains(t)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, anchor, onClose, place]);

  const host = typeof document !== 'undefined' ? (document.querySelector('[data-app-root]') ?? document.body) : null;
  if (!host) return null;
  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div ref={panel} initial={{ opacity: 0, y: placement === 'right-end' ? 0 : -6, x: placement === 'right-end' ? -6 : 0 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width }}
          className={`z-[180] rounded-2xl glass-pop text-char ${className}`}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    host,
  );
};
