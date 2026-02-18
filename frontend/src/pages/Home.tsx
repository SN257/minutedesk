import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
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

    const hubs = [
        {
            id: 'meetings',
            title: 'Meeting Studio',
            subtitle: 'AI Minutes & Transcripts',
            description: 'Capture every word with precision. Professional grade recording and documentation.',
            icon: (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            ),
            path: '/meetings',
            theme: 'from-blue-600 to-indigo-600',
            bgGlow: 'bg-blue-500/10'
        },
        {
            id: 'tasks',
            title: 'Project Hub',
            subtitle: 'Board & Tasks',
            description: 'Dynamic boards for your daily execution. Stay organized and hit every milestone.',
            icon: (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
            path: '/tasks',
            theme: 'from-slate-700 to-slate-900',
            bgGlow: 'bg-slate-500/10'
        },
        {
            id: 'worklogs',
            title: 'Work Logs',
            subtitle: 'Effort Tracking',
            description: 'Automated logging of your daily contributions. Build a visible record of success.',
            icon: (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            path: '/work-logs',
            theme: 'from-emerald-600 to-teal-600',
            bgGlow: 'bg-emerald-500/10'
        },
        {
            id: 'reports',
            title: 'Reports',
            subtitle: 'Intelligence Hub',
            description: 'Transform data into decisions. Comprehensive analytics across all your activities.',
            icon: (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            path: '/reports',
            theme: 'from-amber-600 to-orange-600',
            bgGlow: 'bg-amber-500/10'
        },
    ];

    const knowledgeItems = [
        {
            title: 'Meeting Studio',
            description: 'The comprehensive engine for capturing organizational memory. Facilitates recording, transcribing, and structured documentation of diverse meeting types.',
            features: [
                'Structured Documentation: Specialized templates for SMC, HC, Spk, and MVK meeting types.',
                'Intelligent Point Tracking: Categorize discussions into Decisions, Lessons, and Information.',
                'Automated Tasking: Turn meeting decisions directly into executable tasks with deadlines.',
                'Unified Attendance: Streamlined participant tracking with real-time user searching.'
            ],
            color: 'text-blue-400',
            bg: 'bg-blue-500/5'
        },
        {
            title: 'Project Hub',
            description: 'A professional-grade Kanban ecosystem designed for workflow orchestration and high-velocity execution of complex projects.',
            features: [
                'Dynamic Board Management: Organize work across custom boards, lists, and drag-and-drop cards.',
                'Task Enrichment: Enhance cards with labels, priorities, checklists, and threaded comments.',
                'Seamless Coordination: Assign tasks to team members and track overdue items visually.',
                'Workflow Mobility: Support for task duplication, archiving, and cross-list movement.'
            ],
            color: 'text-slate-400',
            bg: 'bg-slate-500/5'
        },
        {
            title: 'Work Logs',
            description: 'A vital synchronization tool for individual transparency. Enables consistent tracking of daily progress and strategic future roadmapping.',
            features: [
                'Dual-Pane Tracking: Simultaneously log today\'s accomplishments and tomorrow\'s objectives.',
                'Consistency Compliance: Integrated word counters and leave/holiday markers for precision.',
                'Historical Context: Navigate a full calendar history to review past performance and logs.',
                'Centralized Submission: Rapid save-and-submit workflow to keep the workspace logs updated.'
            ],
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/5'
        },
        {
            title: 'Reports & Analytics',
            description: 'The platform\'s analytical core, aggregating cross-module data into high-fidelity intelligence for informed decision-making.',
            features: [
                'Cross-Module Synthesis: Aggregate data from Meeting Studio and Project Hub into unified views.',
                'Decision Intelligence: Extract dedicated reports for Lessons Learned and Key Decisions.',
                'Advanced Table Control: Sorting, specific column management, and powerful data searching.',
                'High-Fidelity Filtering: Slice data by assignee, category, priority, or specific meeting parameters.'
            ],
            color: 'text-amber-400',
            bg: 'bg-amber-500/5'
        }
    ];

    const roadmapItems = [
        {
            app: 'Meeting Studio',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            directions: [
                { page: 'Schedule', action: 'Plan future meetings by pre-defining centers, types, and core agendas to lock-in operational slots.' },
                { page: 'Meeting Recording', action: 'Input real-time minutes, assign tasks to center leads, and track attendance during active sessions.' },
                { page: 'View Minutes', action: 'Retrieve historical transcripts and summaries to review past Decisions and action items.' }
            ]
        },
        {
            app: 'Project Hub',
            color: 'text-slate-400',
            bg: 'bg-slate-500/10',
            directions: [
                { page: 'Board View', action: 'Initialize projects by creating boards. Drag-and-drop cards across lists to visualize the "To Do" to "Done" flow.' },
                { page: 'Card Details', action: 'Add checklists, priority markers, and labels (Bug/Feature) to high-fidelity tasks for team clarity.' },
                { page: 'Task Manager', action: 'Use the global search and priority filters to identify urgent roadblocks across all active boards.' }
            ]
        },
        {
            app: 'Work Logs',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            directions: [
                { page: 'Daily Logger', action: 'Record today\'s specific accomplishments and roadblocks. Mark leave or holiday status if applicable.' },
                { page: 'Future Roadmap', action: 'Explicitly plan tomorrow\'s top 3 priorities in the secondary pane to ensure shift-to-shift momentum.' },
                { page: 'History Calendar', action: 'Navigate back through the calendar to review compliance and previous contribution records.' }
            ]
        },
        {
            app: 'Reports',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            directions: [
                { page: 'Intelligence Streams', action: 'Toggle between Meeting and Task data. Filter by category (Lessons/Decisions) for specific insights.' },
                { page: 'Advanced Filters', action: 'Slice datasets by assignee, importance, or date range using the table-top filtering controls.' },
                { page: 'Export Engine', action: 'Generate professional CSV files of filtered intelligence for external stakeholder reporting.' }
            ]
        }
    ];

    const launchApp = (path: string) => {
        window.open(`${path}?launch=true`, '_blank');
    };

    return (
        <div className="relative min-h-screen bg-[#030712] text-white selection:bg-white/20 overflow-x-hidden">
            {/* Animated Mesh Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-blob animation-delay-2000"></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full animate-blob animation-delay-4000"></div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col min-h-screen">

                {/* ─── PREMIUM HEADER ─── */}
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
                                <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${(!scrolled || headerTheme === 'dark')
                                    ? 'bg-slate-800 border border-white/15 shadow-lg shadow-black/20'
                                    : 'bg-slate-900 shadow-lg shadow-slate-900/20'
                                    }`}>
                                    <svg
                                        className={`w-[18px] h-[18px] transition-colors ${(!scrolled || headerTheme === 'dark') ? 'text-white' : 'text-white'}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {/* Subtle glow ring on hover */}
                                    <span className={`absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-offset-1 transition-all duration-300 ${(!scrolled || headerTheme === 'dark') ? 'group-hover:ring-white/30' : 'group-hover:ring-slate-900/20'
                                        }`} />
                                </div>

                                {/* Wordmark (left-aligned, larger for emphasis) */}
                                <div className="flex flex-col justify-center text-left ml-1">
                                    <p className={`text-lg md:text-xl font-extrabold leading-tight transition-colors ${(!scrolled || headerTheme === 'dark') ? 'text-white' : 'text-slate-900'}`}>
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
                                    {[
                                        { label: 'Platform', href: '#platform' },
                                        { label: 'Launchpad', href: '#launchpad' },
                                        { label: 'Capabilities', href: '#capabilities' },
                                        { label: 'About', href: '#about' },
                                    ].map((item) => (
                                        <a
                                            key={item.label}
                                            href={item.href}
                                            className={`relative px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 group ${(!scrolled || headerTheme === 'dark')
                                                ? 'text-slate-300 hover:text-white hover:bg-white/10'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                                                }`}
                                        >
                                            {item.label}
                                        </a>
                                    ))}

                                    {/* Divider */}
                                    <span className={`w-px h-4 mx-1 ${(!scrolled || headerTheme === 'dark') ? 'bg-white/10' : 'bg-slate-300'}`} />

                                    <a
                                        href="#support"
                                        className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 ${(!scrolled || headerTheme === 'dark')
                                            ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                            : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/70'
                                            }`}
                                    >
                                        Support
                                    </a>
                                </div>
                            </nav>

                            {/* ── Right Actions ── */}
                            <div className="flex items-center gap-2 flex-shrink-0">

                                {/* Notification Bell */}
                                <button
                                    className={`relative p-2 rounded-md transition-colors duration-200 ${(!scrolled || headerTheme === 'dark')
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
                                <div className={`hidden sm:block w-px h-6 mx-2 ${(!scrolled || headerTheme === 'dark') ? 'bg-white/10' : 'bg-slate-200'}`} />

                                {/* ── User Profile Dropdown ── */}
                                <div className="relative" ref={profileDropdownRef}>
                                    <button
                                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                        className={`flex items-center p-1 rounded-md transition-colors duration-200 ${(!scrolled || headerTheme === 'dark')
                                            ? 'hover:bg-white/10 text-white'
                                            : 'hover:bg-slate-100 text-slate-900'
                                            } ${profileDropdownOpen ? ((!scrolled || headerTheme === 'dark') ? 'bg-white/10' : 'bg-slate-100') : ''}`}
                                        aria-label="User menu"
                                        aria-expanded={profileDropdownOpen}
                                    >
                                        {/* Avatar only (compact) */}
                                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${(!scrolled || headerTheme === 'dark')
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
                                                    onClick={() => { navigate('/meetings'); setProfileDropdownOpen(false); }}
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
                                    className={`lg:hidden p-2 rounded-xl transition-all duration-200 ${(!scrolled || headerTheme === 'dark')
                                        ? 'text-slate-300 hover:text-white hover:bg-white/10'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                    aria-label="Toggle mobile menu"
                                    aria-expanded={mobileMenuOpen}
                                >
                                    <div className="w-5 h-5 flex flex-col justify-center gap-[5px]">
                                        <span className={`block h-0.5 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''} ${(!scrolled || headerTheme === 'dark') ? 'bg-white' : 'bg-slate-900'}`} />
                                        <span className={`block h-0.5 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 scale-x-0' : ''} ${(!scrolled || headerTheme === 'dark') ? 'bg-white' : 'bg-slate-900'}`} />
                                        <span className={`block h-0.5 rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''} ${(!scrolled || headerTheme === 'dark') ? 'bg-white' : 'bg-slate-900'}`} />
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
                            {[
                                { label: 'Platform', href: '#platform' },
                                { label: 'Launchpad', href: '#launchpad' },
                                { label: 'Capabilities', href: '#capabilities' },
                                { label: 'About', href: '#about' },
                                { label: 'Support', href: '#support' },
                            ].map((item) => (
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
                            ))}
                            <div className="pt-2">
                                <button
                                    onClick={() => { navigate('/meetings'); setMobileMenuOpen(false); }}
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

                {/* Navbar Spacer to prevent content overlap */}
                <div className="h-[72px] w-full shrink-0"></div>

                {/* Section 1: Premium Hero Section */}
                <section id="platform" data-section-theme="white" className="relative overflow-hidden bg-white" style={{ minHeight: 'calc(100vh - 72px)', scrollMarginTop: '72px' }}>
                    {/* Sophisticated Background */}
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(148,163,184,0.05),transparent_50%)]"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(100,116,139,0.05),transparent_50%)]"></div>
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)',
                            backgroundSize: '60px 60px'
                        }}></div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-2 md:px-12 lg:px-10 pt-6 pb-6 flex flex-col items-center justify-center min-h-[calc(100vh-72px)]">
                        {/* Premium Badge */}
                        <div className="flex justify-center mb-12">
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-900 text-white shadow-xl">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-semibold tracking-wide">Enterprise-Grade Platform</span>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="text-center max-w-5xl mx-auto mb-8">
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
                                Elevate Your Team's
                                <span className="block mt-3 bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 bg-clip-text text-transparent">Productivity</span>
                            </h1>

                            <p className="text-xl md:text-2xl text-slate-600 leading-relaxed mb-12 max-w-3xl mx-auto font-light">
                                The complete workspace solution that brings meetings, projects, and analytics together in one powerful platform.
                            </p>

                            {/* CTA Section */}
                            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-12">
                                <button onClick={() => navigate('/meetings')} className="group relative px-10 py-5 bg-slate-900 text-white font-bold text-lg rounded-2xl overflow-hidden shadow-2xl hover:shadow-slate-900/30 transition-all hover:scale-105">
                                    <span className="relative z-10 flex items-center gap-3">
                                        Launch Platform
                                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </button>
                                <button className="px-10 py-5 bg-white text-slate-900 font-bold text-lg rounded-2xl border-2 border-slate-900 hover:bg-slate-900 hover:text-white transition-all hover:scale-105 shadow-lg">
                                    Schedule Demo
                                </button>
                            </div>

                            {/* Trust Indicators */}
                            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-slate-500">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-semibold">Bank-Level Security</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                    </svg>
                                    <span className="text-sm font-semibold">99.9% Uptime</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                    </svg>
                                    <span className="text-sm font-semibold">10K+ Teams</span>
                                </div>
                            </div>
                        </div>

                        {/* Feature Grid removed per design request */}
                    </div>
                </section>

                {/* Section 2: About Us (Slate) */}
                <section id="about" data-section-theme="dark" className="w-full py-32 bg-[#030712] relative overflow-hidden border-y border-white/5">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full"></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <span className="text-[10px] font-bold text-slate-400">Our Mission</span>
                                </div>
                                <h2 className="text-5xl font-extrabold text-white leading-tight">
                                    Architecting the future <br />
                                    <span className="text-slate-500 italic">of professional focus.</span>
                                </h2>
                                <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-xl">
                                    MinuteDesk was born from a realization that visibility is the catalyst for growth. We've engineered the first unified OS that treats your time as your most valuable infrastructure asset.
                                </p>
                                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                    <div>
                                        <p className="text-4xl font-extrabold text-white mb-2">100%</p>
                                        <p className="text-[10px] font-bold text-slate-500">Unified Visibility</p>
                                    </div>
                                    <div>
                                        <p className="text-4xl font-extrabold text-white mb-2">24/7</p>
                                        <p className="text-[10px] font-bold text-slate-500">Active Intelligence</p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="relative bg-[#0f172a]/40 backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.02] -rotate-45 translate-x-24 -translate-y-24"></div>
                                    <div className="relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-slate-400 flex items-center justify-center mb-10 shadow-2xl">
                                            <svg className="w-8 h-8 text-[#030712]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-extrabold text-white mb-4">The Command Center</h3>
                                        <p className="text-slate-400 font-medium leading-relaxed">
                                            We operate at the intersection of task management and deep work analytics. Our goal is simple: eliminate fragmentation and automate the bureaucratic manual labor of reporting and tracking.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <main className="flex-1 w-full flex flex-col items-center">
                    {/* Section 3: Launchpad (White) */}
                    <section id="launchpad" data-section-theme="white" className="w-full py-32 bg-white">
                        <div className="max-w-7xl mx-auto px-8 md:px-12">
                            <div className="flex flex-col items-center mb-16 text-center">
                                <div className="text-xs font-bold text-slate-400 mb-4 text-center">Operation Hubs</div>
                                <h2 className="text-4xl font-extrabold text-slate-900">Your Launchpad</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                                {hubs.map((hub) => (
                                    <div
                                        key={hub.id}
                                        onClick={() => launchApp(hub.path)}
                                        className="group relative bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 hover:border-slate-300 hover:bg-white hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col h-full min-h-[440px] overflow-hidden"
                                    >
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${hub.theme} flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
                                                <div className="text-white">
                                                    {hub.icon}
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <p className="text-[10px] font-bold text-slate-400 mb-2">{hub.subtitle}</p>
                                                <h3 className="text-2xl font-extrabold text-slate-900 mb-4 leading-tight">{hub.title}</h3>
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">
                                                    {hub.description}
                                                </p>
                                            </div>
                                            <div className="mt-8 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900 opacity-20"></div>
                                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">Launch Module</span>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center transition-all duration-300 group-hover:bg-slate-900 group-hover:translate-x-1 group-hover:scale-110">
                                                    <svg className="w-5 h-5 text-slate-900 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Section 4: Module Intelligence (Slate) */}
                    <section id="capabilities" data-section-theme="dark" className="w-full bg-[#030712] py-32 text-white border-y border-white/5">
                        <div className="max-w-7xl mx-auto px-8 md:px-12">
                            <div className="flex items-center gap-4 mb-16">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        <span className="text-xs font-bold text-slate-400">Platform Blueprint</span>
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-white">Module Intelligence</h2>
                                </div>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {knowledgeItems.map((item, idx) => (
                                    <div key={idx} className="group flex flex-col h-full gap-6 p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 shadow-2xl">
                                        <div className="flex items-center justify-between">
                                            <h3 className={`text-2xl font-extrabold ${item.color}`}>
                                                {item.title}
                                            </h3>
                                            <div className={`w-2 h-2 rounded-full ${item.bg} animate-pulse`}></div>
                                        </div>

                                        <div className="flex-1">
                                            <p className="text-slate-400 font-medium leading-relaxed mb-6">
                                                {item.description}
                                            </p>

                                            <div className="space-y-4">
                                                <p className="text-xs font-bold text-slate-500">Core Capabilities</p>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {item.features.map((feature, fIdx) => (
                                                        <div key={fIdx} className="flex items-start gap-3 group/item h-[40px]">
                                                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${item.color.replace('text-', 'bg-')} opacity-30 group-hover/item:opacity-100 transition-opacity flex-shrink-0`}></div>
                                                            <span className="text-sm text-slate-400 font-medium group-hover/item:text-slate-200 transition-colors line-clamp-2">
                                                                {feature}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-6 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500">Operational Excellence</span>
                                            <svg className="w-5 h-5 text-white/20 group-hover:text-white transition-colors translate-x-4 group-hover:translate-x-0 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Section 5: Operational Roadmap (White) */}
                    <section data-section-theme="white" className="w-full py-32 bg-white relative overflow-hidden">
                        <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">
                            <div className="flex flex-col items-center mb-24">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 shadow-sm mb-6">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    <span className="text-xs font-bold text-slate-500">System Blueprint</span>
                                </div>
                                <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight text-center">
                                    Operational <span className="text-slate-400 italic font-medium">Roadmap</span>
                                </h2>
                                <p className="text-slate-500 font-medium mt-6 text-center max-w-xl leading-relaxed">
                                    Master the platform architecture. A step-by-step guide to navigating your enterprise command center.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                                {roadmapItems.map((item, idx) => (
                                    <div key={idx} className="relative group">
                                        {/* Background Progress Line */}
                                        <div className="absolute left-6 top-24 bottom-0 w-[2px] bg-slate-100 hidden lg:block"></div>

                                        <div className="relative mb-12">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="text-4xl font-extrabold text-slate-100 group-hover:text-slate-200 transition-colors">
                                                    0{idx + 1}
                                                </div>
                                                <div className={`h-[2px] flex-1 ${item.color.replace('text-', 'bg-')} opacity-20`}></div>
                                            </div>
                                            <h3 className="text-xl font-extrabold text-slate-900 mb-2">{item.app}</h3>
                                            <div className="w-8 h-1 bg-slate-900 rounded-full"></div>
                                        </div>

                                        <div className="space-y-10">
                                            {item.directions.map((dir, dIdx) => (
                                                <div key={dIdx} className="relative pl-10">
                                                    {/* Step Circle */}
                                                    <div className="absolute left-[21px] top-1.5 w-2 h-2 rounded-full bg-white border-2 border-slate-300 group-hover:border-slate-900 transition-colors z-10"></div>

                                                    <div className="flex flex-col gap-2">
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{dir.page}</h4>
                                                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl group-hover:bg-white group-hover:shadow-xl group-hover:border-slate-200 transition-all duration-300">
                                                            <p className="text-sm font-medium text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                                                                {dir.action}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </main>

                {/* Footer (Slate) */}
                <footer className="py-8 px-8 md:px-12 bg-[#030712] border-t border-white/5">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-slate-500">MinuteDesk Infrastructure v2.4</span>
                        </div>

                        <div className="flex gap-8">
                            <span className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Privacy</span>
                            <span className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Infrastructure</span>
                            <span className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Documentation</span>
                        </div>
                    </div>
                </footer>
            </div>

            <style>{`
                @keyframes blob {
                    0% { transform: scale(1) translate(0px, 0px); }
                    33% { transform: scale(1.1) translate(30px, -50px); }
                    66% { transform: scale(0.9) translate(-20px, 20px); }
                    100% { transform: scale(1) translate(0px, 0px); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                .animate-fade-in {
                    animation: fadeIn 1s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 4s ease-in-out infinite;
                }
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.98); }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 3s ease-in-out infinite;
                }
                @keyframes dropdown {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-dropdown {
                    animation: dropdown 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                ::-webkit-scrollbar {
                    width: 0px;
                }
            `}</style>
        </div>
    );
};

export default Home;
