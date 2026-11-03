import Header from '../components/Header';
import Footer from '../components/Footer';

const Platform = () => {


    return (
        <div className="relative min-h-screen bg-[#030712] text-white selection:bg-white/20 overflow-x-hidden">
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-blob animation-delay-2000" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header
                    navItems={[
                        { label: 'Platform', href: '/platform', isRoute: true, active: true },
                        { label: 'Launchpad', href: '/launchpad', isRoute: true },
                        { label: 'Capabilities', href: '/capabilities', isRoute: true },
                        { label: 'About', href: '/about', isRoute: true },
                    ]}
                    secondaryNavItems={[
                        { label: 'Docs', href: '/docs', isRoute: true },
                        { label: 'Support', href: '/support', isRoute: true },
                    ]}
                />

                {/* Hero */}
                <section data-section-theme="white" className="relative overflow-hidden bg-white" style={{ minHeight: 'calc(100vh - 72px)', scrollMarginTop: '72px' }}>
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(148,163,184,0.05),transparent_50%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(100,116,139,0.05),transparent_50%)]" />
                        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                    </div>

                    <div className="relative max-w-7xl mx-auto px-2 md:px-12 lg:px-10 pt-6 pb-6 flex flex-col items-center justify-center min-h-[calc(100vh-72px)]">
                        <div className="flex justify-center mb-12">
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-900 text-white shadow-xl">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-semibold tracking-wide">Enterprise-Grade Platform</span>
                            </div>
                        </div>

                        <div className="text-center max-w-5xl mx-auto mb-8">
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
                                Elevate Your Team's
                                <span className="block mt-3 bg-gradient-to-r from-slate-700 via-slate-900 to-slate-700 bg-clip-text text-transparent">Productivity</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-slate-600 leading-relaxed mb-12 max-w-3xl mx-auto font-light">
                                The complete workspace solution that brings meetings, projects, and analytics together in one powerful platform.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-12">
                                <button onClick={() => window.open('/user-dashboard', '_blank')} className="group relative px-10 py-5 bg-slate-900 text-white font-bold text-lg rounded-2xl overflow-hidden shadow-2xl hover:shadow-slate-900/30 transition-all hover:scale-105">
                                    <span className="relative z-10 flex items-center gap-3">
                                        Launch Platform
                                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                <button className="px-10 py-5 bg-white text-slate-900 font-bold text-lg rounded-2xl border-2 border-slate-900 hover:bg-slate-900 hover:text-white transition-all hover:scale-105 shadow-lg">
                                    Schedule Demo
                                </button>
                            </div>
                            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-slate-500">
                                {[
                                    { icon: 'M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z', label: 'Bank-Level Security' },
                                    { icon: 'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z', label: '99.9% Uptime' },
                                    { icon: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z', label: '10K+ Teams' },
                                ].map(t => (
                                    <div key={t.label} className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d={t.icon} clipRule="evenodd" /></svg>
                                        <span className="text-sm font-semibold">{t.label}</span>
                                    </div>
                                ))}
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

export default Platform;
