import { useCallback, useEffect, useLayoutEffect, useRef, type Ref, type ReactNode, type RefObject, type TextareaHTMLAttributes } from 'react';

/** Textarea that grows with its content - used for inline editing of agenda blocks and minute points. */
export const AutoTextarea = ({ value, inputRef, className = '', ...rest }:
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> & { value: string; inputRef?: Ref<HTMLTextAreaElement> }) => {
  const local = useRef<HTMLTextAreaElement | null>(null);

  const fit = useCallback(() => {
    const el = local.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(fit, [value, fit]);
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  const setRef = useCallback((el: HTMLTextAreaElement | null) => {
    local.current = el;
    if (typeof inputRef === 'function') inputRef(el);
    else if (inputRef) (inputRef as { current: HTMLTextAreaElement | null }).current = el;
    if (el) fit();
  }, [inputRef, fit]);

  return <textarea ref={setRef} rows={1} value={value} className={`block w-full resize-none overflow-hidden bg-transparent outline-none ${className}`} {...rest} />;
};

/** Calls `onOutside` when a mouse/touch lands outside the referenced element. */
export const useClickOutside = (ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent | TouchEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h);
    };
  }, [ref, onOutside, active]);
};

export const Chip = ({ active, onClick, children, className = '' }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-ink text-white border-ink' : 'bg-white text-ink-2 border-line hover:border-ink/30'} ${className}`}
  >
    {children}
  </button>
);

export const FieldError = ({ message }: { message?: string }) =>
  message ? <span className="block text-[11px] font-semibold text-bad mt-1">{message}</span> : null;
