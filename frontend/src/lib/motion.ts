import type { Variants, Transition } from 'framer-motion';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 30 };
export const softSpring: Transition = { type: 'spring', stiffness: 220, damping: 26 };

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: softSpring },
};

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: spring },
};

export const viewTransition: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};
