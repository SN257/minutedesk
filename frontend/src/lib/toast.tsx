import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from './motion';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; text: string }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

const DOT: Record<Kind, string> = { success: 'bg-good', error: 'bg-bad', info: 'bg-brand' };

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={spring}
              className="flex items-center gap-2.5 bg-ink text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-pop"
            >
              <span className={`w-2 h-2 rounded-full ${DOT[t.kind]}`} />
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
};
