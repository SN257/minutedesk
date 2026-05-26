import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
    label: string;
    href: string;
    isRoute?: boolean;
    active?: boolean;
}

interface HeaderProps {
    navItems: NavItem[];
    /** Items shown after a divider in the nav pill */
    secondaryNavItems?: NavItem[];
}

const Header = ({ navItems, secondaryNavItems }: HeaderProps) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [headerTheme, setHeaderTheme] = useState<'light' | 'dark'>('light');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const theme = entry.target.getAttribute('data-section-theme');
                        setHeaderTheme(theme === 'white' ? 'light' : 'dark');
                    }
                });
            },
            { threshold: [0.1], rootMargin: '-80px 0px -90% 0px' }
        );

        document.querySelectorAll('section[data-section-theme]').forEach((section) => {
            observer.observe(section);
        });

        const handleClickOutside = (e: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const isDark = (!scrolled || headerTheme === 'dark');

    return (
        <>
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                ? headerTheme === 'light'
                    ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm shadow-slate-200/50'
                    : 'bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-sm shadow-black/30'
                : 'bg-transparent'
                }`}>
                <div className="w-full px-5 lg:px-8">
                    <div className="flex items-center justify-between h-[72px] gap-4">

                        {/* ── Brand / Logo ── */}
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 flex-shrink-0 group"
                            aria-label="MinuteDesk Home"
                        >
                            {/* Logo mark */}
                            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${isDark
                                ? 'bg-slate-800 border border-white/15 shadow-lg shadow-black/20'
                                : 'bg-slate-900 shadow-lg shadow-slate-900/20'
                                }`}>
                                <svg
                                    className="w-[18px] h-[18px] text-white"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {/* Subtle glow ring on hover */}
                                <span className={`absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-offset-1 transition-all duration-300 ${isDark ? 'group-hover:ring-white/30' : 'group-hover:ring-slate-900/20'
                                    }`} />
                            </div>

                            {/* Wordmark */}
                            <div className="flex flex-col justify-center text-left ml-1">
                                <p className={`text-lg md:text-xl font-extrabold leading-tight transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    MinuteDesk
                                </p>
                            </div>
                        </button>

                        {/* ── Center Nav (Desktop) ── */}
                        <nav className="hidden lg:flex items-center" aria-label="Main navigation">
                            {/* Pill container */}
                            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-full transition-all duration-500 ${scrolled
                                ? headerTheme === 'light'
                                    ? 'bg-slate-100/80 border border-slate-200'
                                    : 'bg-white/[0.05] border border-white/10'
                                : 'bg-white/[0.06] border border-white/10 backdrop-blur-sm'
                                }`}>
                                {navItems.map((item) => (
                                    item.isRoute ? (
                                        <button
                                            key={item.label}
                                            onClick={() => navigate(item.href)}
                                            className={`relative px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 group ${item.active
                                                ? isDark ? 'bg-white/15 text-white' : 'bg-slate-900 text-white'
                                                : isDark
                                                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                                                }`}
                                        >
                                            {item.label}
                                        </button>
                                    ) : (
                                        <a
                                            key={item.label}
                                            href={item.href}
                                            className={`relative px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 group ${item.active
                                                ? isDark ? 'bg-white/15 text-white' : 'bg-slate-900 text-white'
                                                : isDark
                                                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                                                }`}
                                        >
                                            {item.label}
                                        </a>
                                    )
                                ))}

                                {/* Divider + secondary items */}
                                {secondaryNavItems && secondaryNavItems.length > 0 && (
                                    <>
                                        <span className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />
                                        {secondaryNavItems.map((item) => (
                                            item.isRoute ? (
                                                <button
                                                    key={item.label}
                                                    onClick={() => navigate(item.href)}
                                                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 ${isDark
                                                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/70'
                                                        }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ) : (
                                                <a
                                                    key={item.label}
                                                    href={item.href}
                                                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 ${isDark
                                                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/70'
                                                        }`}
                                                >
                                                    {item.label}
                                                </a>
                                            )
                                        ))}
                                    </>
                                )}
                            </div>
                        </nav>

                        {/* ── Right Actions ── */}
                        <div className="flex items-center gap-2 flex-shrink-0">

                            {/* Notification Bell */}
                            <button
                                className={`relative p-2 rounded-md transition-colors duration-200 ${isDark
                                    ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                aria-label="Notifications"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
                                </svg>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white/20 animate-pulse" />
                            </button>

                            {/* Divider */}
                            <div className={`hidden sm:block w-px h-6 mx-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

                            {/* ── User Profile Dropdown ── */}
                            <div className="relative" ref={profileDropdownRef}>
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className={`flex items-center p-1 rounded-md transition-colors duration-200 ${isDark
                                        ? 'hover:bg-white/10 text-white'
                                        : 'hover:bg-slate-100 text-slate-900'
                                        } ${profileDropdownOpen ? (isDark ? 'bg-white/10' : 'bg-slate-100') : ''}`}
                                    aria-label="User menu"
                                    aria-expanded={profileDropdownOpen}
                                >
                                    {/* Avatar only (compact) */}
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${isDark
                                        ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white ring-1 ring-white/20'
                                        : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white ring-1 ring-slate-900/20'
                                        }`}>
                                        {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                                    </div>
                                </button>

                                {/* Dropdown Panel */}
                                {profileDropdownOpen && (
                                    <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/80 overflow-hidden z-50 animate-dropdown">
                                        {/* User info header */}
                                        <div className="px-4 py-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{user?.name ?? 'User'}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{user?.email ?? 'user@minutedesk.com'}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Active Session</span>
                                            </div>
                                        </div>

                                        {/* Menu items */}
                                        <div className="py-2">
                                            <button
                                                onClick={() => { navigate('/settings'); setProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group"
                                            >
                                                <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
                                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </span>
                                                <div className="text-left">
                                                    <p className="font-semibold text-[13px]">Settings</p>
                                                    <p className="text-[11px] text-slate-400">Preferences & account</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => { navigate('/user-dashboard'); setProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group"
                                            >
                                                <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
                                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </span>
                                                <div className="text-left">
                                                    <p className="font-semibold text-[13px]">Command Center</p>
                                                    <p className="text-[11px] text-slate-400">Go to dashboard</p>
                                                </div>
                                            </button>

                                            {user?.role === 'super_admin' && (
                                                <button
                                                    onClick={() => { navigate('/admin/users'); setProfileDropdownOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group"
                                                >
                                                    <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
                                                        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                    </span>
                                                    <div className="text-left">
                                                        <p className="font-semibold text-[13px]">User Management</p>
                                                        <p className="text-[11px] text-slate-400">Manage all users</p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>

                                        {/* Divider + Logout */}
                                        <div className="border-t border-slate-100 py-2">
                                            <button
                                                onClick={async () => { await logout(); setProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors group"
                                            >
                                                <span className="w-7 h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center transition-colors flex-shrink-0">
                                                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                </span>
                                                <p className="font-semibold text-[13px]">Sign out</p>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Mobile Hamburger ── */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className={`lg:hidden p-2 rounded-xl transition-all duration-200 ${isDark
                                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                aria-label="Toggle mobile menu"
                                aria-expanded={mobileMenuOpen}
                            >
                                <div className="w-5 h-5 flex flex-col justify-center gap-[5px]">
                                    <span className={`block h-0.5 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''} ${isDark ? 'bg-white' : 'bg-slate-900'}`} />
                                    <span className={`block h-0.5 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 scale-x-0' : ''} ${isDark ? 'bg-white' : 'bg-slate-900'}`} />
                                    <span className={`block h-0.5 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''} ${isDark ? 'bg-white' : 'bg-slate-900'}`} />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Mobile Menu Panel ── */}
                <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className={`border-t px-4 py-4 space-y-1 ${headerTheme === 'light' && scrolled
                        ? 'bg-white/95 border-slate-200'
                        : 'bg-[#030712]/95 border-white/10'
                        } backdrop-blur-xl`}>
                        {[...navItems, ...(secondaryNavItems || [])].map((item) => (
                            item.isRoute ? (
                                <button
                                    key={item.label}
                                    onClick={() => { navigate(item.href); setMobileMenuOpen(false); }}
                                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${headerTheme === 'light' && scrolled
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ) : (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${headerTheme === 'light' && scrolled
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {item.label}
                                </a>
                            )
                        ))}
                        <div className="pt-2">
                            <button
                                onClick={() => { navigate('/user-dashboard'); setMobileMenuOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Command Center
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navbar Spacer */}
            <div className="h-[72px] w-full shrink-0" />
        </>
    );
};

export default Header;
