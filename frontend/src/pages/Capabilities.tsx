import Header from '../components/Header';
import Footer from '../components/Footer';

const Capabilities = () => {
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
            app: 'Meeting Studio', color: 'text-blue-400', bg: 'bg-blue-500/10',
            directions: [
                { page: 'Schedule', action: 'Plan future meetings by pre-defining centers, types, and core agendas to lock-in operational slots.' },
                { page: 'Meeting Recording', action: 'Input real-time minutes, assign tasks to center leads, and track attendance during active sessions.' },
                { page: 'View Minutes', action: 'Retrieve historical transcripts and summaries to review past Decisions and action items.' }
            ]
        },
        {
            app: 'Project Hub', color: 'text-slate-400', bg: 'bg-slate-500/10',
            directions: [
                { page: 'Board View', action: 'Initialize projects by creating boards. Drag-and-drop cards across lists to visualize the "To Do" to "Done" flow.' },
                { page: 'Card Details', action: 'Add checklists, priority markers, and labels (Bug/Feature) to high-fidelity tasks for team clarity.' },
                { page: 'Task Manager', action: 'Use the global search and priority filters to identify urgent roadblocks across all active boards.' }
            ]
        },
        {
            app: 'Work Logs', color: 'text-emerald-400', bg: 'bg-emerald-500/10',
            directions: [
                { page: 'Daily Logger', action: 'Record today\'s specific accomplishments and roadblocks. Mark leave or holiday status if applicable.' },
                { page: 'Future Roadmap', action: 'Explicitly plan tomorrow\'s top 3 priorities in the secondary pane to ensure shift-to-shift momentum.' },
                { page: 'History Calendar', action: 'Navigate back through the calendar to review compliance and previous contribution records.' }
            ]
        },
        {
            app: 'Reports', color: 'text-amber-400', bg: 'bg-amber-500/10',
            directions: [
                { page: 'Intelligence Streams', action: 'Toggle between Meeting and Task data. Filter by category (Lessons/Decisions) for specific insights.' },
                { page: 'Advanced Filters', action: 'Slice datasets by assignee, importance, or date range using the table-top filtering controls.' },
                { page: 'Export Engine', action: 'Generate professional CSV files of filtered intelligence for external stakeholder reporting.' }
            ]
        }
    ];

    return (
        <div className="relative min-h-screen bg-[#030712] text-white selection:bg-white/20 overflow-x-hidden">
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-blob animation-delay-2000" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full animate-blob animation-delay-4000" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header
                    navItems={[
                        { label: 'Platform', href: '/platform', isRoute: true },
                        { label: 'Launchpad', href: '/launchpad', isRoute: true },
                        { label: 'Capabilities', href: '/capabilities', isRoute: true, active: true },
                        { label: 'About', href: '/about', isRoute: true },
                    ]}
                    secondaryNavItems={[
                        { label: 'Docs', href: '/docs', isRoute: true },
                        { label: 'Support', href: '/support', isRoute: true },
                    ]}
                />

                {/* Module Intelligence (Dark) */}
                <section data-section-theme="dark" className="w-full bg-[#030712] py-32 text-white border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-8 md:px-12">
                        <div className="flex items-center gap-4 mb-16">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    <span className="text-xs font-bold text-slate-400">Platform Blueprint</span>
                                </div>
                                <h2 className="text-3xl font-extrabold text-white">Module Intelligence</h2>
                            </div>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {knowledgeItems.map((item, idx) => (
                                <div key={idx} className="group flex flex-col h-full gap-6 p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 shadow-2xl">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`text-2xl font-extrabold ${item.color}`}>{item.title}</h3>
                                        <div className={`w-2 h-2 rounded-full ${item.bg} animate-pulse`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-slate-400 font-medium leading-relaxed mb-6">{item.description}</p>
                                        <div className="space-y-4">
                                            <p className="text-xs font-bold text-slate-500">Core Capabilities</p>
                                            <div className="grid grid-cols-1 gap-3">
                                                {item.features.map((feature, fIdx) => (
                                                    <div key={fIdx} className="flex items-start gap-3 group/item h-[40px]">
                                                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${item.color.replace('text-', 'bg-')} opacity-30 group-hover/item:opacity-100 transition-opacity flex-shrink-0`} />
                                                        <span className="text-sm text-slate-400 font-medium group-hover/item:text-slate-200 transition-colors line-clamp-2">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-6 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">Operational Excellence</span>
                                        <svg className="w-5 h-5 text-white/20 group-hover:text-white transition-colors translate-x-4 group-hover:translate-x-0 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Operational Roadmap (White) */}
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
                                    <div className="absolute left-6 top-24 bottom-0 w-[2px] bg-slate-100 hidden lg:block" />
                                    <div className="relative mb-12">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="text-4xl font-extrabold text-slate-100 group-hover:text-slate-200 transition-colors">0{idx + 1}</div>
                                            <div className={`h-[2px] flex-1 ${item.color.replace('text-', 'bg-')} opacity-20`} />
                                        </div>
                                        <h3 className="text-xl font-extrabold text-slate-900 mb-2">{item.app}</h3>
                                        <div className="w-8 h-1 bg-slate-900 rounded-full" />
                                    </div>
                                    <div className="space-y-10">
                                        {item.directions.map((dir, dIdx) => (
                                            <div key={dIdx} className="relative pl-10">
                                                <div className="absolute left-[21px] top-1.5 w-2 h-2 rounded-full bg-white border-2 border-slate-300 group-hover:border-slate-900 transition-colors z-10" />
                                                <div className="flex flex-col gap-2">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{dir.page}</h4>
                                                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl group-hover:bg-white group-hover:shadow-xl group-hover:border-slate-200 transition-all duration-300">
                                                        <p className="text-sm font-medium text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">{dir.action}</p>
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

                <Footer />
            </div>

            <style>{`
                @keyframes blob{0%{transform:scale(1) translate(0,0)}33%{transform:scale(1.1) translate(30px,-50px)}66%{transform:scale(.9) translate(-20px,20px)}100%{transform:scale(1) translate(0,0)}}
                .animate-blob{animation:blob 7s infinite}
                .animation-delay-2000{animation-delay:2s}
                .animation-delay-4000{animation-delay:4s}
                @keyframes dropdown{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
                .animate-dropdown{animation:dropdown .18s cubic-bezier(.16,1,.3,1) forwards}
                ::-webkit-scrollbar{width:0}
            `}</style>
        </div>
    );
};

export default Capabilities;
