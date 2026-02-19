import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

/* ───────────────────── Documentation Data ───────────────────── */

interface DocArticle {
    id: string;
    title: string;
    description: string;
    content: string[];
    icon: string;
    badge?: string;
}

interface DocSection {
    id: string;
    title: string;
    description: string;
    icon: string;
    articles: DocArticle[];
}

const DOCS: DocSection[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        description: 'Set up your workspace and get productive in minutes.',
        icon: 'M13 10V3L4 14h7v7l9-11h-7z',
        articles: [
            {
                id: 'quick-start',
                title: 'Quick Start Guide',
                description: 'Go from zero to productive in under 5 minutes.',
                icon: 'M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4z',
                content: [
                    'Sign in to MinuteDesk with your company email and password.',
                    'You\'ll land on the Home page — your gateway to every module. Click "Command Center" in the header or navigate to any Hub to start.',
                    'The Dashboard (Home Hub → Overview) gives you a bird\'s-eye view of upcoming meetings, pending tasks, overdue items, and recent work logs.',
                    'Use the sidebar to switch between Activity Hubs: Meeting Hub, Project Hub, Work Hub, and Insight Hub.',
                    'Each Hub has its own Dashboard and focused tools — explore them to tailor your workflow.',
                ],
            },
            {
                id: 'navigation',
                title: 'Navigating the Platform',
                description: 'Understand the layout, sidebar, and hub system.',
                icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
                content: [
                    'MinuteDesk uses a Hub-based architecture. The sidebar displays Activity Hubs — clickable tiles that switch the sidebar\'s Tools section to show that hub\'s pages.',
                    'The header breadcrumb trail always shows where you are, so you can navigate back in one click.',
                    'Click the collapse button (double chevrons) in the top-left to minimize the sidebar and reclaim screen space.',
                    'On mobile, tap the hamburger menu to open the sidebar. Press Escape or tap the overlay to close it.',
                    'Notifications appear via the bell icon in the header. Unread notifications are indicated by a dot. Click any notification to navigate directly to the relevant item.',
                ],
            },
            {
                id: 'account-setup',
                title: 'Account & Profile',
                description: 'Manage your name, email, and password.',
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                content: [
                    'Open Settings from the sidebar (Home Hub → Settings) or the profile dropdown in the header.',
                    'In the "Profile" tab, update your display name or email address. Changes take effect immediately after saving.',
                    'In the "Security" tab, change your password. You\'ll need to enter your current password for verification.',
                    'Your avatar is generated automatically from your initials. A custom avatar upload is coming soon.',
                ],
            },
        ],
    },
    {
        id: 'meetings',
        title: 'Meeting Hub',
        description: 'Schedule, record, and manage meeting minutes like a pro.',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        articles: [
            {
                id: 'schedule-meeting',
                title: 'Scheduling Meetings',
                description: 'Reserve time slots, send invites, and manage your calendar.',
                icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                content: [
                    'Navigate to Meeting Hub → Schedule to open the calendar view.',
                    'Click a date or the "Schedule Meeting" button to create a new scheduled meeting.',
                    'Fill in the meeting type, location/center, date, time, and optionally add attendees from the team directory.',
                    'Scheduled meetings appear on the calendar with color-coded tags. Click any meeting to view or edit its details.',
                    'Meetings that have been used to create minutes are marked accordingly — preventing duplicate entries.',
                ],
            },
            {
                id: 'meeting-minutes',
                title: 'Recording Minutes',
                description: 'Capture discussions, decisions, and action items in real time.',
                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                content: [
                    'Go to Meeting Hub → Minutes to see all recorded meetings or click "+ New" to start a fresh minute.',
                    'The meeting form lets you enter the title, type, date, attendees, discussion points, decisions made, and action items.',
                    'Each discussion point can have nested action items that are automatically converted into tasks in the Project Hub.',
                    'You can attach agenda items, link to scheduled meetings, and mark attendees as "present" or "absent".',
                    'After saving, the meeting minute is viewable in a clean, print-ready format — great for sharing or archiving.',
                ],
            },
            {
                id: 'meeting-dashboard',
                title: 'Meetings Dashboard',
                description: 'Track all your meetings and their summaries.',
                icon: 'M4 6h16M4 12h16M4 18h16',
                content: [
                    'The Meeting Hub Dashboard provides an overview of all upcoming and past meetings.',
                    'Use the search and filter controls to find meetings by title, date range, type, or participants.',
                    'Each meeting card shows key information: title, date, number of attendees, and status.',
                    'Click any meeting card to view its full minutes or edit it.',
                ],
            },
        ],
    },
    {
        id: 'project-hub',
        title: 'Project Hub',
        description: 'Manage tasks with Kanban boards, checklists, and more.',
        icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        articles: [
            {
                id: 'boards',
                title: 'Boards & Lists',
                description: 'Create Kanban boards to organize work visually.',
                icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
                content: [
                    'Navigate to Project Hub → Manager to see all your boards.',
                    'Click "+ New Board" to create a board. Give it a descriptive title.',
                    'Inside a board, create lists (columns) to represent workflow stages — e.g., "To Do", "In Progress", "Done".',
                    'Drag and drop cards between lists to update their status. Card order is preserved.',
                    'Board titles are editable inline — just click the title at the top of the board page.',
                ],
            },
            {
                id: 'cards',
                title: 'Cards & Checklists',
                description: 'Track individual work items with rich card details.',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                content: [
                    'Click "+ Add Card" at the bottom of any list to create a new card.',
                    'Card fields include: title, description, due date, assignee, priority, labels, and a checklist.',
                    'Checklists let you break a card into smaller sub-tasks. Completing all checklist items automatically marks the card as done.',
                    'Conversely, archiving a card marks all its checklist items as complete.',
                    'Use the card options menu (⋮) to Move, Copy, Share (link), Archive, or permanently Delete a card.',
                    'Comments can be added to any card for team discussion directly in context.',
                ],
            },
            {
                id: 'task-dashboard',
                title: 'Tasks Dashboard',
                description: 'A unified view of all your tasks across boards.',
                icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
                content: [
                    'The Project Hub Dashboard aggregates tasks from all boards into one view.',
                    'Tasks with overdue due dates are highlighted with warning indicators.',
                    'Use this view to quickly identify bottlenecks and reprioritize work without opening individual boards.',
                ],
            },
        ],
    },
    {
        id: 'work-hub',
        title: 'Work Hub',
        description: 'Log daily work, track progress, and stay accountable.',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        articles: [
            {
                id: 'daily-log',
                title: 'Daily Work Logs',
                description: 'Record what you did today and plan for tomorrow.',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                content: [
                    'Navigate to Work Hub → Daily Log to fill in your daily work log.',
                    'Each log has two sections: "Today\'s Work" and "Tomorrow\'s Plan".',
                    'You can mark a day as "On Leave" or "Holiday" to skip the log without it counting as missed.',
                    'Use the date navigator (← / →) to view or backfill logs from previous days.',
                    'Missed logs are flagged automatically — the system checks yesterday\'s entry and alerts you on the dashboard if it\'s missing.',
                ],
            },
            {
                id: 'work-dashboard',
                title: 'Work Dashboard',
                description: 'Overview of work log completion and streaks.',
                icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
                content: [
                    'The Work Hub Dashboard shows a calendar heatmap of your work log completion.',
                    'Green tiles indicate completed logs, yellow indicates partial, and red indicates missed.',
                    'Track your logging streak and aim for 100% completion across the week.',
                ],
            },
        ],
    },
    {
        id: 'insight-hub',
        title: 'Insight Hub',
        description: 'Reports, analytics, and data-driven insights.',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        articles: [
            {
                id: 'reports-overview',
                title: 'Reports Overview',
                description: 'Summary analytics for meetings, tasks, and productivity.',
                icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
                content: [
                    'Navigate to Insight Hub → Dashboard for a high-level summary of your workspace activity.',
                    'Key metrics include: meetings conducted, tasks completed, overdue items, and work log completion rate.',
                    'Charts update in real time as you add or complete items across the platform.',
                ],
            },
            {
                id: 'analytics',
                title: 'Advanced Analytics',
                description: 'Deep-dive into trends, comparisons, and patterns.',
                icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                content: [
                    'The Analytics page (Insight Hub → Analytics) provides drill-down reports.',
                    'Filter by date range, team member, meeting type, or project board to isolate specific trends.',
                    'Visualizations include bar charts, line graphs, and summary cards for quick pattern recognition.',
                    'Use these insights to optimize meeting frequency, identify workload imbalances, and improve team throughput.',
                ],
            },
        ],
    },
    {
        id: 'settings',
        title: 'Settings & Security',
        description: 'Customize your workspace and manage your account.',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        articles: [
            {
                id: 'profile-settings',
                title: 'Profile Settings',
                description: 'Update your display name, email, and preferences.',
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                content: [
                    'Navigate to Settings from the sidebar or the profile dropdown.',
                    'The Profile tab lets you update your display name and email address.',
                    'Changes are saved immediately and reflected across all hubs.',
                ],
            },
            {
                id: 'security',
                title: 'Password & Security',
                description: 'Change your password and manage session security.',
                icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
                content: [
                    'In the Security tab, enter your current password and a new password to update your credentials.',
                    'All sessions use HTTP-only cookies — your token is never exposed to client-side JavaScript.',
                    'Data is encrypted in transit via HTTPS and at rest with AES-256 encryption.',
                    'Logout from all sessions by clicking "Sign out" from any profile menu.',
                ],
            },
            {
                id: 'appearance',
                title: 'Appearance & Theme',
                description: 'Toggle dark mode and compact layout.',
                icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
                content: [
                    'MinuteDesk supports Light and Dark themes. Toggle between them in Settings → Appearance.',
                    'Compact mode reduces padding across the app for denser information display — ideal for power users.',
                    'Theme preference is saved per-user and persists across sessions.',
                ],
            },
        ],
    },
];

/* ───────────────────── Component ───────────────────── */

const Documentation = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(DOCS[0].id);
    const [activeArticle, setActiveArticle] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(t);
    }, []);

    const currentSection = DOCS.find(s => s.id === activeSection) || DOCS[0];

    // Search filter
    const filteredSections = searchQuery.trim()
        ? DOCS.map(s => ({
            ...s,
            articles: s.articles.filter(a =>
                a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.content.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
            ),
        })).filter(s => s.articles.length > 0)
        : DOCS;

    const handleArticleClick = (sectionId: string, articleId: string) => {
        setActiveSection(sectionId);
        setActiveArticle(articleId);
        setMobileSidebarOpen(false);
        if (contentRef.current) {
            contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSectionClick = (sectionId: string) => {
        setActiveSection(sectionId);
        setActiveArticle(null);
        setMobileSidebarOpen(false);
        if (contentRef.current) {
            contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative min-h-screen bg-[#030712] text-white selection:bg-white/20 overflow-x-hidden">
            {/* BG orbs */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-blob animation-delay-2000" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header
                    navItems={[
                        { label: 'Platform', href: '/platform', isRoute: true },
                        { label: 'Launchpad', href: '/launchpad', isRoute: true },
                        { label: 'Capabilities', href: '/capabilities', isRoute: true },
                        { label: 'About', href: '/about', isRoute: true },
                    ]}
                    secondaryNavItems={[
                        { label: 'Docs', href: '/docs', isRoute: true, active: true },
                        { label: 'Support', href: '/support', isRoute: true },
                    ]}
                />

                {/* ─── Hero ─── */}
                <section data-section-theme="dark" className="w-full bg-[#030712] pt-16 pb-14 border-b border-white/5">
                    <div className={`max-w-6xl mx-auto px-6 md:px-12 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <span className="text-xs font-bold text-slate-400">Documentation</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-5">
                            Everything you need to{' '}
                            <span className="bg-gradient-to-r from-slate-300 via-white to-slate-300 bg-clip-text text-transparent">know</span>
                        </h1>
                        <p className="text-base md:text-lg text-slate-400 leading-relaxed font-light max-w-2xl mx-auto mb-8">
                            Comprehensive guides, tutorials, and references for every feature in MinuteDesk.
                        </p>

                        {/* Search */}
                        <div className="max-w-xl mx-auto relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                id="docs-search"
                                type="text"
                                placeholder="Search documentation..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all backdrop-blur-sm"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* ─── Docs Body (white) ─── */}
                <section data-section-theme="white" className="w-full bg-white flex-1">
                    <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-280px)]">

                        {/* Mobile sidebar toggle */}
                        <button
                            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                            className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
                            aria-label="Toggle documentation nav"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                        </button>

                        {/* Mobile overlay */}
                        {mobileSidebarOpen && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
                        )}

                        {/* ── Sidebar ── */}
                        <aside className={`
                            fixed lg:sticky top-0 left-0 h-full lg:h-auto lg:top-0
                            w-[300px] lg:w-[280px] xl:w-[300px]
                            bg-white lg:bg-transparent
                            border-r border-slate-100
                            overflow-y-auto
                            z-50 lg:z-auto
                            transition-transform duration-300 lg:translate-x-0
                            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                            flex-shrink-0
                        `}>
                            <nav className="p-6 lg:py-10 lg:pr-6 lg:pl-8">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Sections</div>
                                <div className="space-y-1">
                                    {filteredSections.map(section => (
                                        <div key={section.id}>
                                            <button
                                                onClick={() => handleSectionClick(section.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${activeSection === section.id && !activeArticle
                                                        ? 'bg-slate-900 text-white shadow-lg'
                                                        : activeSection === section.id
                                                            ? 'bg-slate-100 text-slate-900'
                                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                            >
                                                <svg className={`w-4 h-4 flex-shrink-0 ${activeSection === section.id && !activeArticle ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                                                </svg>
                                                <span className="text-[13px] font-bold truncate">{section.title}</span>
                                            </button>

                                            {/* Sub-articles */}
                                            {activeSection === section.id && (
                                                <div className="ml-4 pl-4 border-l-2 border-slate-100 mt-1 space-y-0.5">
                                                    {section.articles.filter(a =>
                                                        !searchQuery || filteredSections.find(s => s.id === section.id)?.articles.some(fa => fa.id === a.id)
                                                    ).map(article => (
                                                        <button
                                                            key={article.id}
                                                            onClick={() => handleArticleClick(section.id, article.id)}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${activeArticle === article.id
                                                                    ? 'bg-slate-900 text-white shadow-md'
                                                                    : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            {article.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Quick links */}
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Quick Links</div>
                                    <div className="space-y-1">
                                        <button onClick={() => navigate('/support')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            Support Center
                                        </button>
                                        <button onClick={() => navigate('/platform')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Platform Overview
                                        </button>
                                    </div>
                                </div>
                            </nav>
                        </aside>

                        {/* ── Content Area ── */}
                        <div ref={contentRef} className="flex-1 min-w-0 px-6 md:px-10 lg:px-14 py-10 lg:py-14 overflow-y-auto">
                            {activeArticle ? (
                                /* ── Single Article View ── */
                                (() => {
                                    const article = currentSection.articles.find(a => a.id === activeArticle);
                                    if (!article) return null;
                                    return (
                                        <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                            {/* Back */}
                                            <button
                                                onClick={() => setActiveArticle(null)}
                                                className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-900 mb-8 transition-colors group"
                                            >
                                                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                Back to {currentSection.title}
                                            </button>

                                            {/* Article header */}
                                            <div className="mb-10">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={article.icon} /></svg>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{currentSection.title}</span>
                                                    </div>
                                                </div>
                                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">{article.title}</h2>
                                                <p className="text-base text-slate-500 font-medium">{article.description}</p>
                                            </div>

                                            {/* Steps */}
                                            <div className="space-y-0">
                                                {article.content.map((step, idx) => (
                                                    <div key={idx} className="flex gap-5 group">
                                                        {/* Step indicator */}
                                                        <div className="flex flex-col items-center flex-shrink-0">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm">
                                                                {idx + 1}
                                                            </div>
                                                            {idx < article.content.length - 1 && (
                                                                <div className="w-px h-full bg-slate-100 my-1" />
                                                            )}
                                                        </div>
                                                        {/* Step content */}
                                                        <div className="pb-8 pt-1">
                                                            <p className="text-sm text-slate-600 leading-relaxed font-medium group-hover:text-slate-900 transition-colors">{step}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Next / Prev */}
                                            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                                                {(() => {
                                                    const artIdx = currentSection.articles.findIndex(a => a.id === activeArticle);
                                                    const prev = artIdx > 0 ? currentSection.articles[artIdx - 1] : null;
                                                    const next = artIdx < currentSection.articles.length - 1 ? currentSection.articles[artIdx + 1] : null;
                                                    return (
                                                        <>
                                                            {prev ? (
                                                                <button onClick={() => handleArticleClick(currentSection.id, prev.id)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors group">
                                                                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                                    {prev.title}
                                                                </button>
                                                            ) : <span />}
                                                            {next ? (
                                                                <button onClick={() => handleArticleClick(currentSection.id, next.id)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors group">
                                                                    {next.title}
                                                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                                </button>
                                                            ) : <span />}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                /* ── Section Overview ── */
                                <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    {/* Section header */}
                                    <div className="mb-12">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentSection.icon} /></svg>
                                            </div>
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">{currentSection.title}</h2>
                                        <p className="text-base text-slate-500 font-medium max-w-xl">{currentSection.description}</p>
                                    </div>

                                    {/* Article cards */}
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                                        {currentSection.articles.map((article) => (
                                            <button
                                                key={article.id}
                                                onClick={() => handleArticleClick(currentSection.id, article.id)}
                                                className="text-left p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xl transition-all duration-300 group"
                                            >
                                                <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={article.icon} /></svg>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 mb-1.5">{article.title}</h3>
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-3">{article.description}</p>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                                                    Read more
                                                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Search results empty */}
                                    {searchQuery && filteredSections.length === 0 && (
                                        <div className="text-center py-20">
                                            <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p className="text-slate-400 font-semibold">No results for "{searchQuery}"</p>
                                            <p className="text-sm text-slate-300 mt-1">Try a different search term</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ─── CTA (Dark) ─── */}
                <section data-section-theme="dark" className="w-full py-24 bg-[#030712] border-t border-white/5">
                    <div className="max-w-4xl mx-auto px-8 md:px-12">
                        <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-12 md:p-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-slate-400 flex items-center justify-center mb-8 shadow-2xl mx-auto">
                                <svg className="w-7 h-7 text-[#030712]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <h3 className="text-3xl font-extrabold text-white mb-4">Can't find what you need?</h3>
                            <p className="text-slate-400 font-medium max-w-md mx-auto mb-8">Our support team is always happy to help. Reach out and we'll guide you through anything.</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={() => navigate('/support')} className="group px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-2xl hover:scale-105 transition-all">
                                    <span className="flex items-center gap-3 justify-center">
                                        Visit Support
                                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </span>
                                </button>
                                <button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>

            <style>{`
                @keyframes blob{0%{transform:scale(1) translate(0,0)}33%{transform:scale(1.1) translate(30px,-50px)}66%{transform:scale(.9) translate(-20px,20px)}100%{transform:scale(1) translate(0,0)}}
                .animate-blob{animation:blob 7s infinite}
                .animation-delay-2000{animation-delay:2s}
                @keyframes dropdown{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
                .animate-dropdown{animation:dropdown .18s cubic-bezier(.16,1,.3,1) forwards}
                ::-webkit-scrollbar{width:0}
            `}</style>
        </div>
    );
};

export default Documentation;
