import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Link, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { pageTransition } from '../pages/admin-center/kit/motion';

const NAV_GROUPS: { label: string; items: { to: string; label: string; end?: boolean; icon: ReactNode }[] }[] = [
  {
    label: 'Command',
    items: [
      {
        to: '/admin-center',
        label: 'Overview',
        end: true,
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      },
      {
        to: '/admin-center/analytics',
        label: 'Analytics',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      },
      {
        to: '/admin-center/user-activity',
        label: 'User Activity',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      },
      {
        to: '/admin-center/health',
        label: 'System Health',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        to: '/admin-center/users',
        label: 'Users',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      },
      {
        to: '/admin-center/roles',
        label: 'Roles',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
      },
      {
        to: '/admin-center/centers',
        label: 'Centers',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
      {
        to: '/admin-center/broadcast',
        label: 'Broadcast',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
      },
      {
        to: '/admin-center/activity',
        label: 'Activity Log',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        to: '/admin-center/errors',
        label: 'Error Log',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      },
      {
        to: '/admin-center/backups',
        label: 'Backups',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
      },
      {
        to: '/admin-center/schema',
        label: 'Database Schema',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3m0 5c0 1.657-3.582 3-8 3s-8-1.343-8-3" /></svg>,
      },
      {
        to: '/admin-center/branding',
        label: 'Branding',
        icon: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h10a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5" /></svg>,
      },
    ],
  },
];

const AdminCenterLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (to: string, end?: boolean) => !!matchPath({ path: to, end: end ?? false }, location.pathname);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col">
      {/* Mobile top bar */}
      <div className="lg:hidden flex-shrink-0 h-14 bg-slate-900 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-900 font-black text-xs">A</div>
          <span className="text-white font-bold text-sm">Admin Center</span>
        </div>
        <button onClick={() => setMobileMenuOpen((v) => !v)} className="text-white/80 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`fixed lg:static top-0 left-0 h-screen lg:h-auto w-72 bg-slate-900 flex flex-col z-40 flex-shrink-0 transition-transform lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-5 pt-6 pb-5 border-b border-white/10 hidden lg:block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 font-black">A</div>
              <div>
                <p className="text-white font-black text-[15px] leading-tight tracking-tight">Admin Center</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5">Command Deck</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 mt-14 lg:mt-0 space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.to, item.end);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold group ${
                          active ? 'text-slate-900' : 'text-slate-300 hover:bg-white/5 hover:text-white transition-colors'
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="nav-active-pill"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="absolute inset-0 rounded-lg bg-white"
                          />
                        )}
                        <span className="relative flex-shrink-0 w-[18px] h-[18px] opacity-90">{item.icon}</span>
                        <span className="relative">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-1">
            <Link to="/user-dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-[13px] font-semibold">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Exit to Workspace
            </Link>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button onClick={handleLogout} title="Sign out" className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageTransition}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminCenterLayout;
