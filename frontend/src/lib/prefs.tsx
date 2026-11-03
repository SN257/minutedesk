import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { getUserPreferences, saveUserPreferences } from './api';
import { useAuth } from './auth';
import { setRegional, type Regional } from './formats';

export interface Prefs {
  appearance: { theme?: 'light' | 'dark' | 'auto'; textSize?: 'sm' | 'md' | 'lg'; reduceMotion?: boolean; startPage?: string };
  regional: Regional;
  notify: Record<string, boolean>;
  email?: boolean;
  reminderHour?: number;
}
const EMPTY: Prefs = { appearance: {}, regional: {}, notify: {} };
const KEY = 'md2.prefs';
const SIZE = { sm: '15px', md: '16px', lg: '17.5px' } as const;

const read = (): Prefs => { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return EMPTY; } };

interface Api { prefs: Prefs; update: (fn: (p: Prefs) => Prefs) => void; saving: boolean }
const Ctx = createContext<Api>({ prefs: EMPTY, update: () => {}, saving: false });
export const usePrefs = () => useContext(Ctx);

/** Tell the shell the theme preference changed (it owns the light/dark state). */
export const applyTheme = (mode: 'light' | 'dark' | 'auto') => {
  try { localStorage.setItem('md_theme', mode); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event('md-theme'));
};

/** Personal settings. Cached on this device so they apply instantly, and saved to the account so they follow you. */
export const PrefsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(read);
  const [saving, setSaving] = useState(false);
  const latest = useRef(prefs);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);

  const cache = (p: Prefs) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ } };

  /* pull the saved settings once per sign-in */
  useEffect(() => {
    if (!user || loadedFor.current === user.id) return;
    loadedFor.current = user.id;
    getUserPreferences().then((s) => {
      if (!s || !Object.keys(s).length) return;
      const merged: Prefs = { ...EMPTY, ...s, appearance: s.appearance ?? {}, regional: s.regional ?? {}, notify: s.notify ?? {} };
      latest.current = merged; setPrefs(merged); cache(merged);
      if (merged.appearance.theme) applyTheme(merged.appearance.theme);
    }).catch(() => {});
  }, [user]);

  const update = useCallback((fn: (p: Prefs) => Prefs) => {
    const next = fn(latest.current);
    latest.current = next; setPrefs(next); cache(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaving(true);
      saveUserPreferences(latest.current).catch(() => {}).finally(() => setSaving(false));
    }, 600);
  }, []);

  /* apply the choices to the page */
  useEffect(() => { setRegional(prefs.regional); }, [prefs.regional]);
  useEffect(() => { document.documentElement.style.fontSize = SIZE[prefs.appearance.textSize ?? 'md']; }, [prefs.appearance.textSize]);
  useEffect(() => { document.documentElement.classList.toggle('reduce-motion', !!prefs.appearance.reduceMotion); }, [prefs.appearance.reduceMotion]);

  const value = useMemo(() => ({ prefs, update, saving }), [prefs, update, saving]);
  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={prefs.appearance.reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>
    </Ctx.Provider>
  );
};
