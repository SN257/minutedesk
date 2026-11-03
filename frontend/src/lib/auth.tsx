import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout, updateUserTimezone } from './api';
import { getUserTimeZone } from './date';

/** Pages a person can open. `allowedPages` null/undefined means everything; super admins are never limited. */
export type PageKey = 'today' | 'meetings' | 'tasks' | 'worklog' | 'reports';
export interface AuthUser { id: string; email: string; name?: string; role?: string; allowedPages?: string[] | null; adminTabs?: string[] | null }

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  /** Super admin, or an admin-type role that was given at least one admin section. */
  hasAdmin: boolean;
  /** Can this person open this admin section? Super admins can open all of them. */
  canAdmin: (tab: string) => boolean;
  /** Can this person open the page? (Settings and Admin are handled separately.) */
  can: (page: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u as AuthUser | null)).finally(() => setLoading(false));
  }, []);

  // Keep the backend aware of the user's local timezone (reminders run on it).
  useEffect(() => {
    if (!user) return;
    const tz = getUserTimeZone();
    if (localStorage.getItem('synced_timezone') !== tz) {
      updateUserTimezone(tz).then(() => localStorage.setItem('synced_timezone', tz)).catch(() => {});
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    setUser((await apiLogin({ email, password })) as AuthUser);
  }, []);
  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  }, []);

  const value = useMemo(() => {
    const isAdmin = user?.role === 'super_admin';
    const can = (page: string) => isAdmin || !Array.isArray(user?.allowedPages) || (user?.allowedPages ?? []).includes(page);
    const tabs = user?.role !== 'user' && Array.isArray(user?.adminTabs) ? user!.adminTabs! : [];
    const canAdmin = (tab: string) => isAdmin || tabs.includes(tab);
    return { user, loading, isAdmin, hasAdmin: isAdmin || tabs.length > 0, canAdmin, can, login, logout };
  }, [user, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
