import { AnimatePresence, motion } from 'framer-motion';

const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

/** Crescent moon: shown in the light theme, because it is what you switch to. */
const MoonIcon = () => (
  <svg {...common}><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" /></svg>
);

/** Sun with eight short rays: shown in the dark theme, because it is what you switch to. */
const SunIcon = () => (
  <svg {...common}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </svg>
);

/**
 * The light / dark switch, drawn like the other header icons (no background, a soft circle on hover). The icon is the theme you will switch TO:
 * a moon while you are in the light theme, a sun while you are in the dark theme.
 */
export const ThemeToggle = ({ dark, onToggle }: { dark: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    className="relative shrink-0 w-10 h-10 rounded-full grid place-items-center text-char/70 hover:bg-char/[0.07] hover:text-char transition-colors">
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={dark ? 'sun' : 'moon'} className="grid place-items-center" initial={{ opacity: 0, rotate: dark ? -70 : 70, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: dark ? 70 : -70, scale: 0.6 }} transition={{ duration: 0.18 }}>
        {dark ? <SunIcon /> : <MoonIcon />}
      </motion.span>
    </AnimatePresence>
  </button>
);
