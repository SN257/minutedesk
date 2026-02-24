import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Apps = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const launchApp = (path: string) => window.open(`${path}?launch=true`, '_blank');

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const hubs = [
        {
            id: 'meetings', title: 'Meeting Studio', subtitle: 'AI Minutes & Transcripts',
            description: 'Capture every word with precision. Professional grade recording, transcription, and documentation.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>),
            path: '/meetings', theme: 'from-slate-600 to-slate-800',
            shortcuts: [{ l: 'Schedule', p: '/meetings/schedule' }, { l: 'New Minutes', p: '/add-meeting/new' }, { l: 'View All', p: '/meetings' }],
        },
        {
            id: 'tasks', title: 'Project Hub', subtitle: 'Board & Tasks',
            description: 'Dynamic Kanban boards for workflow orchestration. Organize with drag-and-drop cards and checklists.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>),
            path: '/tasks', theme: 'from-slate-700 to-slate-900',
            shortcuts: [{ l: 'Boards', p: '/boards' }, { l: 'Task Manager', p: '/tasks' }],
        },
        {
            id: 'worklogs', title: 'Work Logs', subtitle: 'Effort Tracking',
            description: 'Automated logging of your daily contributions. Build a visible record of accomplishments.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
            path: '/work-logs', theme: 'from-slate-500 to-slate-700',
            shortcuts: [{ l: "Today's Log", p: '/work-logs/daily' }, { l: 'Overview', p: '/work-logs' }],
        },
        {
            id: 'reports', title: 'Reports', subtitle: 'Intelligence Hub',
            description: 'Transform data into decisions. Comprehensive analytics with advanced filtering and CSV export.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>),
            path: '/reports', theme: 'from-slate-600 to-slate-900',
            shortcuts: [{ l: 'Insights', p: '/reports/insights' }, { l: 'Overview', p: '/reports' }],
        },
    ];

    return (
        <div className="relative min-h-screen bg-[#030712] text-white selection:bg-white/20 overflow-x-hidden">
            {/* Mesh BG */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-600/15 blur-[120px] rounded-full animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-500/15 blur-[120px] rounded-full animate-blob animation-delay-2000" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">

                {/* ─── SHARED HEADER ─── */}
                <Header
                    navItems={[
                        { label: 'Home', href: '/', isRoute: true },
                        { label: 'Apps', href: '/apps', isRoute: true, active: true },
                    ]}
                    secondaryNavItems={[
                        { label: 'Command Center', href: '/meetings', isRoute: true },
                    ]}
                />

                {/* ═══ SECTION 1 — HERO (Dark) ═══ */}
                <section data-section-theme="dark" className="relative overflow-hidden bg-[#030712]" style={{ minHeight: '480px', scrollMarginTop: '72px' }}>
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(148,163,184,0.06),transparent_50%)]" />
                        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                    </div>

                    <div className="relative max-w-7xl mx-auto px-8 md:px-12 lg:px-10 flex flex-col items-center justify-center" style={{ minHeight: '480px' }}>
                        <div className="flex justify-center mb-10">
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                <span className="text-sm font-semibold text-slate-300 tracking-wide">Application Directory</span>
                            </div>
                        </div>

                        <div className="text-center max-w-4xl mx-auto mb-10">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
                                {greeting()},
                                <span className="block mt-2 bg-gradient-to-r from-slate-300 via-white to-slate-300 bg-clip-text text-transparent">{user?.name?.split(' ')[0] ?? 'there'}</span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-400 leading-relaxed font-light max-w-2xl mx-auto">
                                Your unified workspace. Launch any module directly, or use shortcuts to jump into specific workflows.
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 text-slate-500">
                            {[
                                { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Encrypted' },
                                { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: '99.9% Uptime' },
                                { icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: '4 Modules' },
                            ].map(t => (
                                <div key={t.label} className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24"><path d={t.icon} /></svg>
                                    <span className="text-sm font-semibold">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ SECTION 2 — LAUNCHPAD (White) ═══ */}
                <section data-section-theme="white" className="w-full py-32 bg-white">
                    <div className="max-w-7xl mx-auto px-8 md:px-12">
                        <div className="flex flex-col items-center mb-16 text-center">
                            <div className="text-xs font-bold text-slate-400 mb-4">Your Modules</div>
                            <h2 className="text-4xl font-extrabold text-slate-900">Application Launchpad</h2>
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
                                            <div className="text-white">{hub.icon}</div>
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <p className="text-[10px] font-bold text-slate-400 mb-2">{hub.subtitle}</p>
                                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 leading-tight">{hub.title}</h3>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">{hub.description}</p>
                                        </div>

                                        {/* Shortcuts */}
                                        <div className="mt-6 flex flex-wrap gap-2 mb-6">
                                            {hub.shortcuts.map(s => (
                                                <button key={s.l} onClick={(e) => { e.stopPropagation(); launchApp(s.p); }}
                                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm">
                                                    {s.l}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mt-auto flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 opacity-20" />
                                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">Launch Module</span>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center transition-all duration-300 group-hover:bg-slate-900 group-hover:translate-x-1 group-hover:scale-110">
                                                <svg className="w-5 h-5 text-slate-900 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ SECTION 3 — WORKFLOWS (Dark) ═══ */}
                <section data-section-theme="dark" className="w-full bg-[#030712] py-32 text-white border-y border-white/5">
                    <div className="max-w-7xl mx-auto px-8 md:px-12">
                        <div className="flex items-center gap-4 mb-16">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    <span className="text-xs font-bold text-slate-400">Quick Actions</span>
                                </div>
                                <h2 className="text-3xl font-extrabold text-white">Workflow Shortcuts</h2>
                            </div>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {[
                                {
                                    title: 'Meeting Workflows', color: 'text-slate-300',
                                    items: [
                                        { l: 'Schedule a new meeting', p: '/meetings/schedule' },
                                        { l: 'Create meeting minutes', p: '/add-meeting/new' },
                                        { l: 'View all meeting records', p: '/meetings' },
                                    ]
                                },
                                {
                                    title: 'Project Workflows', color: 'text-slate-300',
                                    items: [
                                        { l: 'Open Kanban boards', p: '/boards' },
                                        { l: 'Manage tasks & cards', p: '/tasks' },
                                        { l: 'Review project status', p: '/tasks' },
                                    ]
                                },
                                {
                                    title: 'Tracking Workflows', color: 'text-slate-300',
                                    items: [
                                        { l: "Fill today's work log", p: '/work-logs/daily' },
                                        { l: 'Browse log history', p: '/work-logs' },
                                        { l: 'Plan tomorrow\'s tasks', p: '/work-logs/daily' },
                                    ]
                                },
                                {
                                    title: 'Analytics Workflows', color: 'text-slate-300',
                                    items: [
                                        { l: 'View reports overview', p: '/reports' },
                                        { l: 'Access deep insights', p: '/reports/insights' },
                                        { l: 'Export data to CSV', p: '/reports' },
                                    ]
                                },
                            ].map((group) => (
                                <div key={group.title} className="group flex flex-col h-full gap-6 p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`text-xl font-extrabold ${group.color}`}>{group.title}</h3>
                                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        {group.items.map((item) => (
                                            <button key={item.l} onClick={() => launchApp(item.p)} className="w-full flex items-center gap-3 group/item text-left">
                                                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-slate-600 opacity-30 group-hover/item:opacity-100 transition-opacity flex-shrink-0" />
                                                <span className="text-sm text-slate-400 font-medium group-hover/item:text-white transition-colors">{item.l}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">Quick Access</span>
                                        <svg className="w-5 h-5 text-white/20 group-hover:text-white transition-colors translate-x-4 group-hover:translate-x-0 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ SECTION 4 — CTA (White) ═══ */}
                <section data-section-theme="white" className="w-full py-32 bg-white relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">
                        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                            <div className="absolute inset-0">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-700/30 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-600/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-slate-400 flex items-center justify-center mb-10 shadow-2xl mx-auto">
                                    <svg className="w-8 h-8 text-[#030712]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">Ready to launch?</h2>
                                <p className="text-lg text-slate-400 font-medium max-w-lg mx-auto mb-10">Jump into your Command Center and take control of your day with all your tools in one place.</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button onClick={() => navigate('/meetings')} className="group relative px-10 py-5 bg-white text-slate-900 font-bold text-base rounded-2xl overflow-hidden shadow-2xl hover:scale-105 transition-all">
                                        <span className="relative z-10 flex items-center gap-3 justify-center">
                                            Open Command Center
                                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        </span>
                                    </button>
                                    <button onClick={() => navigate('/settings')} className="px-10 py-5 text-white font-bold text-base rounded-2xl border-2 border-white/20 hover:bg-white/10 transition-all hover:scale-105">
                                        Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══ SHARED FOOTER ═══ */}
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

export default Apps;
