// Shared framer-motion variants for consistent, professional motion across
// the Admin Center — a staggered fade/rise for grids, a slightly larger one
// for page-level entrances.
export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.03 },
  },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};
