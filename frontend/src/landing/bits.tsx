import { useEffect, useRef, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useSpring, useTransform, type Variants } from 'framer-motion';
import { softSpring } from '../lib/motion';

/** Counts from 0 to `value` on mount (and whenever value changes). */
export const CountUp = ({ value, decimals = 0, suffix = '', duration = 1.4 }: { value: number; decimals?: number; suffix?: string; duration?: number }) => {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${v.toFixed(decimals)}${suffix}`);
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, duration, mv]);
  return <motion.span>{text}</motion.span>;
};

export const cardIn: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
};
export const groupIn: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } };

/** A glass card that gently tilts toward the pointer. */
export const GlassCard = ({ children, className = '', dark, tilt = true }: { children: ReactNode; className?: string; dark?: boolean; tilt?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  const onMove = (e: React.MouseEvent) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 5);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 5);
  };
  const reset = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div
      ref={ref}
      variants={cardIn}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      whileHover={{ y: -4 }}
      className={`${dark ? 'glass-dark text-white' : 'glass'} rounded-[2rem] ${className}`}
    >
      {children}
    </motion.div>
  );
};

const TONES = ['#4a5c6a', '#06141b', '#4a5c6a', '#4a5c6a', '#9ba8ab'];
export const AvatarStack = ({ names, size = 28 }: { names: string[]; size?: number }) => (
  <div className="flex -space-x-2">
    {names.map((n, i) => (
      <span key={n} className="rounded-full border-2 border-white grid place-items-center font-semibold text-white shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.4, background: TONES[i % TONES.length], color: i === 0 ? '#06141b' : '#fff' }}>
        {n[0]}
      </span>
    ))}
  </div>
);
