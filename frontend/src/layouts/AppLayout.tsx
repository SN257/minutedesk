import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getNotifications, markNotificationRead } from '../services/api';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const { appearance, updateAppearance } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [hasOpenedNotifications, setHasOpenedNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filterNotificationsByApp = (nList: any[]) => {
    return nList.filter((n: any) => {
      const type = n.type || n.meta?.type || '';
      const cat = n.category || n.meta?.category || 'General';
      const p = location.pathname;

      // Ensure work log reminders do not leak into meetings
      if (p.startsWith('/meetings') || p.startsWith('/add-meeting')) {
        return cat === 'Meeting' || type.includes('meeting');
      }

      if (p.startsWith('/tasks') || p.startsWith('/boards')) {
        return ['Task', 'Assignment'].includes(cat) || type.includes('task') || type.includes('due_date');
      }

      if (p.startsWith('/work-logs')) {
        return cat === 'Worklog' || type.includes('work_log');
      }

      if (p.startsWith('/reports')) {
        return ['System', 'Report', 'Insight'].includes(cat);
      }

      if (p.startsWith('/settings')) {
        return ['System', 'General'].includes(cat);
      }

      return true; // For 'user-dashboard' or root, show all
    });
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const data = await getNotifications();
      let list = Array.isArray(data) ? data : [];
      list = list.filter((n: any) => !n.read);
      list = filterNotificationsByApp(list);
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
        setAppsOpen(false);
        setSettingsOpen(false);
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
    const fn = (e: MouseEvent) => {
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setAppsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

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
        list = filterNotificationsByApp(list);
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(list);
      } catch (e) { }
    };
    poll();
    const id = setInterval(poll, 7000);
    return () => { mounted = false; clearInterval(id); };
  }, [location.pathname]);

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
      path: '/user-dashboard',
      items: [
        { to: '/user-dashboard', label: 'My Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        { to: '/settings', label: 'Settings', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      ]
    },
    {
      id: 'meetings',
      label: 'Meeting Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      path: '/meetings',
      items: [
        { to: '/meetings', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { to: '/meetings/schedule', label: 'Schedule', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { to: '/add-meeting', label: 'Minutes', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { to: '/meetings/reports', label: 'Analytics', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      ]
    },
    {
      id: 'tasks',
      label: 'Project Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      path: '/tasks',
      items: [
        { to: '/tasks', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { to: '/boards', label: 'Manager', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
        { to: '/tasks/reports', label: 'Analytics', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      ]
    },
    {
      id: 'worklog',
      label: 'Work Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      path: '/work-logs',
      items: [
        { to: '/work-logs', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { to: '/work-logs/daily', label: 'Daily Log', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { to: '/work-logs/reports', label: 'Analytics', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      ]
    },
    {
      id: 'insights',
      label: 'Insight Hub',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      path: '/reports',
      items: [
        { to: '/reports', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { to: '/reports/insights', label: 'Analytics', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      ]
    }
  ];

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
      navigate('/user-dashboard');
    }
  };

  const HeaderBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const labelFor = (seg: string) => {
      if (seg === 'meetings') return 'Meetings';
      if (seg === 'tasks') return 'Tasks';
      if (seg === 'work-logs') return 'Work Logs';
      if (seg === 'reports') return 'Reports';
      if (seg === 'dashboard') return 'Overview';
      if (seg === 'user-dashboard') return 'Dashboard';
      if (seg === 'boards') return 'Boards';
      if (seg === 'settings') return 'Settings';
      if (seg === 'add-meeting') return 'Minutes';
      if (seg === 'schedule') return 'Schedule';
      if (seg === 'daily') return 'Daily Log';
      if (seg === 'insights') return 'Insights';
      if (seg === 'new') return 'New';
      if (seg === 'edit') return 'Edit';
      return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    };
    const crumbs = parts.map((p, i) => ({
      to: '/' + parts.slice(0, i + 1).join('/'),
      label: labelFor(p),
    }));

    return (
      <nav className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
        <Link to="/user-dashboard" className="hover:underline text-slate-600 dark:text-slate-400">Dashboard</Link>
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


        {/* Tools / Focused Menu */}
        <div className="px-3 pt-4 mb-4 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-hide">
          <nav className="flex flex-col gap-0.5">
            {isHubMode && (
              <button
                onClick={handleHubHome}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-slate-400 hover:bg-white/5 hover:text-slate-200 ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                {!sidebarCollapsed && <span className="text-[13px] font-semibold">Hub Home</span>}
              </button>
            )}

            {(isHubMode ? activeApp.items.slice(0, 2) : activeApp.items).map((item) => (
              <NavLink
                key={item.to}
                to={`${item.to}${isHubMode ? '?launch=true' : ''}`}
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
              >
                <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>
                {!sidebarCollapsed && <span className="text-[13px] font-semibold truncate">{item.label}</span>}
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <span className="text-sm font-medium">Home</span>
                </NavLink>
                <NavLink to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-sm font-medium">Settings</span>
                </NavLink>
                {user?.role === 'super_admin' && (
                  <NavLink to="/admin/users" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-sm font-medium">User Management</span>
                  </NavLink>
                )}
                <div className="border-t border-slate-700 my-1" />
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  <span className="text-sm font-medium">Sign Out</span>
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
            {/* Apps Launcher */}
            <div className="relative" ref={appsRef}>
              <button
                onClick={() => setAppsOpen(!appsOpen)}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${appsOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Apps"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              {appsOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="grid grid-cols-2 gap-1 p-2 bg-slate-50 dark:bg-slate-800/50">
                    {[
                      { t: 'Meetings', p: '/meetings', ic: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                      { t: 'Boards', p: '/tasks', ic: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                      { t: 'Work Logs', p: '/work-logs', ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { t: 'Analytics', p: '/reports', ic: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
                    ].map(a => (
                      <button
                        key={a.t}
                        onClick={() => { navigate(a.p); setAppsOpen(false); }}
                        className="flex flex-col items-center gap-2.5 p-4 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-slate-100 dark:group-hover:text-slate-900 shadow-sm transition-all group-hover:scale-105">
                          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={a.ic} /></svg>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">{a.t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${settingsOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <span className="font-bold text-slate-800 dark:text-white text-sm">Settings</span>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => updateAppearance({ theme: appearance.theme === 'dark' ? 'light' : 'dark' })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      {appearance.theme === 'dark' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                      )}
                      {appearance.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                      onClick={() => updateAppearance({ compactMode: !appearance.compactMode })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                      {appearance.compactMode ? 'Default Layout' : 'Compact Layout'}
                    </button>
                  </div>
                  <div className="p-1 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => { navigate('/settings'); setSettingsOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      More Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

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
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-700/50 rounded-full blur-2xl pointer-events-none"></div>
              <div className="relative z-10">
                <h2 className="font-black text-xl tracking-tight">Notifications</h2>
                <div className="text-xs font-medium text-slate-400 mt-1">
                  {loadingNotifications ? (
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div> Updating...</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div> {notifications.length} unread alerts</span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowNotifications(false)} className="relative z-10 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all text-slate-300 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/30">
              {Object.keys(groupedNotifications).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1">You're all caught up!</h3>
                  <p className="text-sm text-slate-500">No new alerts for this module.</p>
                </div>
              ) : (
                Object.entries(groupedNotifications).map(([group, items], groupIndex) => (
                  <div key={group} className="space-y-4 animate-fadeUp" style={{ animationDelay: `${groupIndex * 0.1}s` }}>
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group}</span>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    <div className="space-y-3">
                      {items.map(n => (
                        <button key={n.id} onClick={() => handleNotificationClick(n)} className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300 group flex items-start gap-4">
                          <div className="mt-1 w-2.5 h-2.5 rounded-full bg-slate-800 flex-shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_0_4px_rgba(15,23,42,0.1)]"></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 text-sm mb-1 group-hover:text-black transition-colors leading-tight">{n.title || n.message}</div>
                            {n.body && <div className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">{n.body}</div>}
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mt-2">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {relativeTime(n.createdAt)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-white">
                <button onClick={markAllRead} className="w-full py-3.5 text-center text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  Mark all as read
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
};

export default AppLayout;
