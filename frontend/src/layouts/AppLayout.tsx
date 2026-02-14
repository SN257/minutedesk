import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markNotificationRead } from '../services/api';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
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
      // hide already-read notifications (we delete on read server-side)
      list = list.filter((n: any) => !n.read);
      // sort: unread first, then newest
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
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      return `${Math.floor(diff / 86400)}d`;
    } catch { return ''; }
  };

  const markAllRead = async () => {
    const ids = notifications.map(n => n.id);
    // optimistic: clear notifications UI because backend will delete them
    setNotifications([]);
    try {
      await Promise.all(ids.map((id) => markNotificationRead(id).catch(() => id)));
    } catch (e) {
      // if something failed, reload notifications to resync
      await loadNotifications();
    }
  };

  // Close notifications with ESC key and prevent body scroll when open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    
    // Prevent body scroll when notifications or mobile menu open
    // Use overflow hidden instead of fixing body position which breaks mobile scrolling
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

  // Pointer-to-scroll fallback for mouse drag while using mobile/touch emulation
  useEffect(() => {
    // Enable only when the environment indicates touch-capable / mobile-like (emulator)
    const isTouchLike = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(hover: none)').matches);
    if (!isTouchLike) return;

    const el = mainRef.current;
    if (!el) return;

    let dragging = false;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Some emulators deliver pointerType 'mouse' for mouse drag — handle mouse pointers
      if (e.pointerType === 'mouse') {
        dragging = true;
        lastY = e.clientY;
        // prevent accidental text selection while dragging
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
    'Meeting': { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-200' },
    'Task': { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-200' },
    'Assignment': { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-200' },
    'Reminder': { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-200' },
    'System': { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-200' },
  };

  const getCategoryStyle = (category: string) => categoryColors[category] || categoryColors['General'];

  const toggleNotifications = async () => {
    if (!showNotifications) {
      await loadNotifications();
      // remember that user opened the panel at least once
      setHasOpenedNotifications(true);
    }
    setShowNotifications(!showNotifications);
  };

  // Poll notifications periodically so new arrivals appear without a page refresh
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
      } catch (e) {
        // ignore polling errors
      }
    };

    // initial fetch
    poll();
    const id = setInterval(poll, 7000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleNotificationClick = async (n: any) => {
    try {
      if (!n.read) {
        await markNotificationRead(n.id);
        // backend deletes the notification, remove it from UI
        setNotifications((prev) => prev.filter((it) => it.id !== n.id));
      }
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }

    if (n.link) {
      navigate(n.link);
      setShowNotifications(false);
    }
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      to: '/meetings',
      label: 'Schedule Meeting',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      to: '/add-meeting',
      label: 'Meeting Minutes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      to: '/boards',
      label: 'Task Manager',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
    {
      to: '/work-logs',
      label: 'Work Log',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const HeaderBreadcrumbs = () => {
    const location = useLocation();

    const parts = location.pathname.split('/').filter(Boolean);

    const labelFor = (seg: string) => {
      if (seg === 'meetings') return 'Schedule';
      if (seg === 'add-meeting') return 'Meeting Minutes';
      if (seg === 'boards') return 'Boards';
      if (seg === 'reports') return 'Reports';
      if (seg === 'settings') return 'Settings';
      if (seg === 'work-logs') return 'Work Log';
      if (seg === 'dashboard') return 'Dashboard';
      // likely an id -> show generic "Detail"
      if (/^[0-9a-fA-F-]{6,}$/.test(seg)) return 'Detail';
      return seg.charAt(0).toUpperCase() + seg.slice(1);
    };

    const crumbs = parts.map((p, i) => ({
      to: '/' + parts.slice(0, i + 1).join('/'),
      label: labelFor(p),
    }));

    return (
      <div className="flex items-center">


        <nav className="flex items-center space-x-2 text-sm text-slate-600">
          <Link to="/dashboard" className="hover:underline text-slate-600">Dashboard</Link>
          {crumbs.length > 0 && <span className="text-slate-300">/</span>}
          {crumbs.map((c, idx) => (
            <span key={c.to} className="flex items-center gap-2">
              <Link to={c.to} className="hover:underline text-slate-600">{c.label}</Link>
              {idx < crumbs.length - 1 && <span className="text-slate-300">/</span>}
            </span>
          ))}
        </nav>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <aside
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl z-40 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none lg:pointer-events-auto'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className={`h-14 md:h-16 flex items-center border-b border-white/20 transition-all ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 md:w-7 md:h-7 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg md:text-xl text-white">MinuteDesk</span>
            )}
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 md:p-3 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-white text-slate-800 shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="font-medium text-sm md:text-base">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Section at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700/50">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700/50 transition-colors ${sidebarCollapsed ? 'justify-center' : ''
                }`}
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-800 font-semibold text-sm shadow-md flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
              {!sidebarCollapsed && (
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className={`absolute bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 ${sidebarCollapsed ? 'left-full ml-2 w-48' : 'left-0 right-0'
                }`}>
                <NavLink
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium">Profile</span>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          }`}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Top Header Bar */}
        <header className="h-14 md:h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* Breadcrumbs - Hidden on mobile */}
            <div className="hidden md:block">
              <HeaderBreadcrumbs />
            </div>
            
            {/* Mobile: Just show current page */}
            <div className="md:hidden">
              <h1 className="text-base font-semibold text-slate-900 truncate max-w-[150px]">
                {navItems.find(item => location.pathname === item.to)?.label || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Quick Actions */}
            <button
              onClick={() => navigate('/meetings')}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-medium rounded-xl hover:from-slate-900 hover:to-slate-900 transition-all shadow-lg shadow-slate-800/25 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Meeting</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={toggleNotifications} 
                className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" 
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {
                  (() => {
                    const unreadCount = notifications.filter((n) => !n.read).length;
                    if (unreadCount === 0) return null;
                    if (!hasOpenedNotifications) {
                      return (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium text-white bg-red-600 rounded-full">{unreadCount}</span>
                      );
                    }
                    // Panel has been opened before — show a small dot for new arrivals
                    return <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full" />;
                  })()
                }
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3 sm:p-4 md:p-6 w-full">
          {children}
        </div>
      </main>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Notification Panel - Rendered at root level to properly overlay everything */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-lg z-40 transition-all duration-300" onClick={() => setShowNotifications(false)} />
          <aside className="fixed right-0 top-0 h-screen max-w-full sm:max-w-md md:max-w-lg w-full bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-3 md:p-4 shadow-lg flex-shrink-0">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-white/10 rounded-lg">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg md:text-xl font-bold">Notifications</div>
                    <div className="text-xs md:text-sm text-slate-300">{loadingNotifications ? 'Loading...' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}</div>
                  </div>
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {notifications.some(n => !n.read) && (
                <button onClick={markAllRead} className="text-xs md:text-sm text-slate-200 hover:text-white flex items-center gap-2 px-2.5 md:px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all min-h-[44px]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark all as read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-white scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100" style={{ height: 'calc(100vh - 140px)' }}>
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {loadingNotifications && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-700"></div>
                </div>
              )}
              {Object.keys(groupedNotifications).length === 0 && !loadingNotifications && (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
                    </svg>
                  </div>
                  <div className="text-xl font-semibold text-slate-700 mb-2">All caught up!</div>
                  <div className="text-sm text-slate-500">You have no new notifications</div>
                </div>
              )}

              {Object.entries(groupedNotifications).map(([group, items]) => {
                const style = getCategoryStyle(group);
                return (
                  <div key={group} className="space-y-3">
                    <div className="flex items-center gap-2 px-1 sticky top-0 bg-gradient-to-r from-slate-50 to-white py-2 z-10">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${style.badge} ${style.text}`}>
                        {group}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{items.length}</span>
                    </div>
                    <div className="space-y-3">
                      {items.map((n: any) => (
                        <button 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)} 
                          className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group ${
                            n.read 
                              ? 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md' 
                              : `${style.bg} border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm`
                          }`}
                        >
                          <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
                            n.read ? 'bg-slate-100 text-slate-600' : `${style.badge} ${style.text}`
                          }`}>
                            {n.actor?.name ? n.actor.name.charAt(0).toUpperCase() : '🔔'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="text-base font-semibold text-slate-800 group-hover:text-slate-900 line-clamp-2">{n.title || n.message}</div>
                              {!n.read && <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1 shadow-sm" />}
                            </div>
                            {n.message && n.title && <div className="text-sm text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">{n.message}</div>}
                            <div className="flex items-center gap-3 mt-3">
                              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {relativeTime(n.createdAt)}
                              </div>
                              {n.link && (
                                <div className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                  View details
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AppLayout;
