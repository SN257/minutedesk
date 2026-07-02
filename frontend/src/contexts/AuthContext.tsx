import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, logout as apiLogout, updateUserTimezone } from '../services/api';
import { getUserTimeZone } from '../utils/date';

const SYNCED_TIMEZONE_KEY = 'synced_timezone';

// Let the backend know the browser's timezone so reminders/due-date checks
// run on the user's local clock instead of the server's. Only calls the API
// when the detected timezone actually changed, so this is cheap to call often.
export const syncTimezone = () => {
  const timezone = getUserTimeZone();
  if (localStorage.getItem(SYNCED_TIMEZONE_KEY) === timezone) return;
  updateUserTimezone(timezone)
    .then(() => localStorage.setItem(SYNCED_TIMEZONE_KEY, timezone))
    .catch(() => {});
};

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      if (userData) syncTimezone();
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent duplicate fetches in StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchUser();
  }, []);

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const refreshUser = async () => {
    setLoading(true);
    fetchedRef.current = true; // Mark as fetched when manually refreshing
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
