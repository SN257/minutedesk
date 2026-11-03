import Header from '../components/Header';
import Footer from '../components/Footer';

const Launchpad = () => {

    const launchApp = (path: string) => {
        window.open(`${path}?launch=true`, '_blank');
    };

    const hubs = [
        {
            id: 'meetings', title: 'Meeting Studio', subtitle: 'AI Minutes & Transcripts',
            description: 'Capture every word with precision. Professional grade recording and documentation.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>),
            path: '/meetings', theme: 'from-blue-600 to-indigo-600',
        },
        {
            id: 'tasks', title: 'Project Hub', subtitle: 'Board & Tasks',
            description: 'Dynamic boards for your daily execution. Stay organized and hit every milestone.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>),
            path: '/tasks', theme: 'from-slate-700 to-slate-900',
        },
        {
            id: 'worklogs', title: 'Work Logs', subtitle: 'Effort Tracking',
            description: 'Automated logging of your daily contributions. Build a visible record of success.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
            path: '/work-logs', theme: 'from-emerald-600 to-teal-600',
        },
        {
            id: 'reports', title: 'Reports', subtitle: 'Intelligence Hub',
            description: 'Transform data into decisions. Comprehensive analytics across all your activities.',
            icon: (<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>),
            path: '/reports', theme: 'from-amber-600 to-orange-600',
        },
    ];

    return (
        <div className="relative min-h-screen bg-[#030712] text-white selection:bg-white/20 overflow-x-hidden">
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-blob animation-delay-2000" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header
                    navItems={[
                        { label: 'Platform', href: '/platform', isRoute: true },
                        { label: 'Launchpad', href: '/launchpad', isRoute: true, active: true },
                        { label: 'Capabilities', href: '/capabilities', isRoute: true },
                        { label: 'About', href: '/about', isRoute: true },
                    ]}
                    secondaryNavItems={[
                        { label: 'Docs', href: '/docs', isRoute: true },
                        { label: 'Support', href: '/support', isRoute: true },
                    ]}
                />

                {/* Hero Banner */}
                <section data-section-theme="dark" className="w-full bg-[#030712] pt-16 pb-12 border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-8 md:px-12 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            <span className="text-xs font-bold text-slate-400">Operation Hubs</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
                            Your <span className="bg-gradient-to-r from-slate-300 via-white to-slate-300 bg-clip-text text-transparent">Launchpad</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 leading-relaxed font-light max-w-2xl mx-auto">
                            Launch any module directly. Each hub gives you instant access to the tools you need.
                        </p>
                    </div>
                </section>

                {/* Hub Grid */}
                <section data-section-theme="white" className="w-full py-32 bg-white flex-1">
                    <div className="max-w-7xl mx-auto px-8 md:px-12">
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
                                        <div className="mt-8 flex items-center justify-between">
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

export default Launchpad;
