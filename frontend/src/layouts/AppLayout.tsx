import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getNotifications, markNotificationRead } from '../services/api';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const { appearance } = useSettings();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [hasOpenedNotifications, setHasOpenedNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const data = await getNotifications();
      let list = Array.isArray(data) ? data : [];
      list = list.filter((n: any) => !n.read);
      list.sort((a: any, b: any) => {
        if ((a.read ? 1 : 0) !== (b.read ? 1 : 0)) return (a.read ? 1 : 0) - (b.read ? 1 : 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
    setLoadingNotifications(false);
  };

  const relativeTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 86400)}h`;
      return `${Math.floor(diff / 86400)}d`;
    } catch { return ''; }
  };

  const markAllRead = async () => {
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    try {
      await Promise.all(ids.map((id) => markNotificationRead(id).catch(() => id)));
    } catch (e) {
      await loadNotifications();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    if (showNotifications || mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [showNotifications, mobileMenuOpen]);

  useEffect(() => {
    const isTouchLike = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(hover: none)').matches);
    if (!isTouchLike) return;
    const el = mainRef.current;
    if (!el) return;
    let dragging = false;
    let lastY = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        dragging = true;
        lastY = e.clientY;
        e.preventDefault();
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      if (e.pointerType !== 'mouse') return;
      const delta = lastY - e.clientY;
      if (delta !== 0) window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
      lastY = e.clientY;
      e.preventDefault();
    };
    const onPointerUp = () => { dragging = false; };
    el.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const getCategory = (n: any) => n.type || n.category || n.meta?.category || 'General';
  const groupedNotifications = notifications.reduce((acc: Record<string, any[]>, n) => {
    const key = getCategory(n);
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryColors: Record<string, { bg: string; text: string; badge: string }> = {
    'General': { bg: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-200' },
    'Meeting': { bg: 'bg-slate-100', text: 'text-slate-800', badge: 'bg-slate-300' },
    'Task': { bg: 'bg-slate-50', text: 'text-slate-600', badge: 'bg-slate-200' },
    'Assignment': { bg: 'bg-slate-100', text: 'text-slate-900', badge: 'bg-slate-200' },
    'Reminder': { bg: 'bg-slate-50', text: 'text-slate-500', badge: 'bg-slate-100' },
    'System': { bg: 'bg-gray-100', text: 'text-gray-900', badge: 'bg-gray-200' },
  };

  const getCategoryStyle = (category: string) => categoryColors[category] || categoryColors['General'];

  const toggleNotifications = async () => {
    if (!showNotifications) {
      await loadNotifications();
      setHasOpenedNotifications(true);
    }
    setShowNotifications(!showNotifications);
  };

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const data = await getNotifications();
        if (!mounted) return;
        let list = Array.isArray(data) ? data : [];
        list = list.filter((n: any) => !n.read);
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(list);
      } catch (e) { }
    };
    poll();
    const id = setInterval(poll, 7000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleNotificationClick = async (n: any) => {
    try {
      if (!n.read) {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.filter((it) => it.id !== n.id));
      }
    } catch (err) { }
    if (n.link) {
      navigate(n.link);
      setShowNotifications(false);
    }
  };

  const APPS = [
    {
      id: 'general',
      label: 'Home Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      path: '/dashboard',
      items: [
        { to: '/dashboard', label: 'Overview', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> },
        { to: '/settings', label: 'Settings', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      ]
    },
    {
      id: 'meetings',
      label: 'Meeting Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      path: '/meetings',
      items: [
        { to: '/meetings', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l-2 2M12 19V6l-2 2M15 19V6l-2 2" /></svg> },
        { to: '/meetings/schedule', label: 'Schedule', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { to: '/add-meeting', label: 'Minutes', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      ]
    },
    {
      id: 'tasks',
      label: 'Project Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      path: '/tasks',
      items: [
        { to: '/tasks', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
        { to: '/boards', label: 'Manager', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
      ]
    },
    {
      id: 'worklog',
      label: 'Work Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      path: '/work-logs',
      items: [
        { to: '/work-logs', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { to: '/work-logs/daily', label: 'Daily Log', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      ]
    },
    {
      id: 'insights',
      label: 'Insight Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      path: '/reports',
      items: [
        { to: '/reports', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg> },
        { to: '/reports/insights', label: 'Analytics', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      ]
    }
  ];

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isHubMode = searchParams.get('launch') === 'true';

  const activeApp = APPS.find(app => (
    app.id !== 'general' && (
      location.pathname.startsWith(app.path) ||
      app.items.some(it => location.pathname.startsWith(it.to))
    )
  )) || APPS[0];

  const handleHubHome = () => {
    window.close();
    // Fallback if window.close doesn't work (usually only works for tabs opened by JS)
    if (!window.closed) {
      navigate('/dashboard');
    }
  };

  const HeaderBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const labelFor = (seg: string) => {
      if (seg === 'meetings') return 'Meeting Hub';
      if (seg === 'tasks') return 'Project Hub';
      if (seg === 'work-logs') return 'Work Hub';
      if (seg === 'reports') return 'Insight Hub';
      if (seg === 'dashboard') return 'Overview';
      return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    };
    const crumbs = parts.map((p, i) => ({
      to: '/' + parts.slice(0, i + 1).join('/'),
      label: labelFor(p),
    }));

    return (
      <nav className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
        <Link to="/" className="hover:underline text-slate-600 dark:text-slate-400">Hub</Link>
        {crumbs.length > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
        {crumbs.map((c, idx) => (
          <span key={c.to} className="flex items-center gap-2">
            <Link to={c.to} className="hover:underline text-slate-600 dark:text-slate-400">{c.label}</Link>
            {idx < crumbs.length - 1 && <span className="text-slate-300 dark:text-slate-600">/</span>}
          </span>
        ))}
      </nav>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 transition-colors duration-300 ${appearance.compactMode ? 'compact-layout' : ''}`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl z-50 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className={`h-14 md:h-16 flex items-center border-b border-white/10 transition-all ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={isHubMode ? handleHubHome : () => navigate('/')}
          >
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="font-bold text-lg text-white">MinuteDesk</span>}
          </div>
        </div>

        {/* App Switcher - Hidden in Focused Mode */}
        {!isHubMode && (
          <div className="px-3 pt-4 mb-2">
            {!sidebarCollapsed && <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">Activity Hubs</div>}
            <div className={`grid gap-2 ${sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {APPS.map((app) => (
                <NavLink
                  key={app.id}
                  to={app.path}
                  className={() => `flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all duration-300 group relative ${activeApp.id === app.id ? 'bg-white text-slate-900 border-white shadow-xl scale-[1.03] z-10' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'}`}
                >
                  <div className={`${sidebarCollapsed ? 'w-10 h-10 flex items-center justify-center' : 'mb-1'} transition-transform group-hover:scale-110`}>{app.icon}</div>
                  {!sidebarCollapsed && <span className="text-[9px] font-black uppercase tracking-tight text-center leading-none mt-1">{app.label.split(' ')[0]}</span>}
                  {activeApp.id === app.id && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full" />}
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-white/10 mx-4 my-2" />

        {/* Tools / Focused Menu */}
        <div className="px-3 mb-4 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-hide">
          {!sidebarCollapsed && <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1">{isHubMode ? 'Navigation' : 'Tools'}</div>}
          <nav className={`grid content-start gap-2 ${sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {isHubMode && (
              <button
                onClick={handleHubHome}
                className={`flex transition-all duration-300 group ${sidebarCollapsed ? 'items-center justify-center w-12 h-12 mx-auto rounded-xl' : 'flex-col items-center justify-center gap-1.5 p-3 text-center rounded-2xl'} text-slate-400 hover:bg-white/5 hover:text-white`}
              >
                <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                {!sidebarCollapsed && <span className="font-bold text-[10px] uppercase tracking-wide">Hub Home</span>}
              </button>
            )}

            {(isHubMode ? activeApp.items.slice(0, 2) : activeApp.items).map((item) => (
              <NavLink
                key={item.to}
                to={`${item.to}${isHubMode ? '?launch=true' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex transition-all duration-300 group ${sidebarCollapsed ? 'items-center justify-center w-12 h-12 mx-auto rounded-xl' : 'flex-col items-center justify-center gap-1.5 p-3 text-center rounded-2xl'} ${isActive ? 'bg-slate-700 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
              >
                <span className={`${sidebarCollapsed ? '' : 'mb-0.5'}`}>{item.icon}</span>
                {!sidebarCollapsed && <span className="font-bold text-[10px] uppercase tracking-wide truncate w-full px-1">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold text-xs">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-white text-xs truncate">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </button>
            {showUserMenu && (
              <div className={`absolute bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-[70] ${sidebarCollapsed ? 'left-full ml-2 w-48' : 'left-0 right-0'}`}>
                <NavLink to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors">
                  <span className="text-sm font-medium">Profile</span>
                </NavLink>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors">
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={mainRef} className={`min-h-screen transition-all duration-300 bg-slate-50 dark:bg-slate-900 flex flex-col ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className={`h-14 md:h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800 fixed top-0 right-0 z-40 flex items-center justify-between px-3 md:px-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:left-20' : 'lg:left-64'} left-0`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></button>
            <div className="hidden md:block"><HeaderBreadcrumbs /></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleNotifications} className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {notifications.some(n => !n.read) && (
                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${hasOpenedNotifications ? 'bg-slate-300' : 'bg-slate-900 dark:bg-white'}`} />
              )}
            </button>
          </div>
        </header>

        <div className="h-14 md:h-16" />
        <div className="p-4 md:p-6 flex-1 overflow-x-hidden">{children}</div>
      </main>

      {/* Notifications Panel */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]" onClick={() => setShowNotifications(false)} />
          <aside className="fixed right-0 top-0 h-screen w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-[90] flex flex-col animate-slideInRight">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-800 text-white">
              <div>
                <h2 className="font-bold text-lg">Notifications</h2>
                <div className="text-[10px] text-slate-400 px-0.5">{loadingNotifications ? 'Updating...' : `${notifications.length} unread`}</div>
              </div>
              <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {Object.keys(groupedNotifications).length === 0 ? (
                <div className="text-center py-20 text-slate-400">No new notifications</div>
              ) : (
                Object.entries(groupedNotifications).map(([group, items]) => {
                  const style = getCategoryStyle(group);
                  return (
                    <div key={group} className="space-y-2">
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${style.text} opacity-60 ml-1`}>{group}</div>
                      <div className="space-y-2">
                        {items.map(n => (
                          <button key={n.id} onClick={() => handleNotificationClick(n)} className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${style.bg} dark:bg-slate-800/40 border-slate-100 dark:border-slate-700 hover:shadow-md`}>
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">{n.title || n.message}</div>
                            <div className="text-[10px] text-slate-500 mt-1">{relativeTime(n.createdAt)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {notifications.length > 0 && <button onClick={markAllRead} className="p-4 text-center text-sm font-bold text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Mark all as read</button>}
          </aside>
        </>
      )}
    </div>
  );
};

export default AppLayout;
