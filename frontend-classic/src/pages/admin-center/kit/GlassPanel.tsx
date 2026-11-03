import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from './motion';

// Flat, professional white card — solid colors only, no blur/transparency/glow.
const GlassPanel = ({
  children,
  className = '',
  hoverLift = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  hoverLift?: boolean;
  as?: 'div';
}) => (
  <motion.div
    variants={fadeUp}
    whileHover={hoverLift ? { y: -2, transition: { duration: 0.2 } } : undefined}
    className={`relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 ${
      hoverLift ? 'hover:shadow-md hover:border-slate-300' : ''
    } ${className}`}
  >
    {children}
  </motion.div>
);

export default GlassPanel;
