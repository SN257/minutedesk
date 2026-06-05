import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const About = () => {
    const navigate = useNavigate();

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
                        { label: 'Capabilities', href: '/capabilities', isRoute: true },
                        { label: 'About', href: '/about', isRoute: true, active: true },
                    ]}
                    secondaryNavItems={[
                        { label: 'Docs', href: '/docs', isRoute: true },
                        { label: 'Support', href: '/support', isRoute: true },
                    ]}
                />

                {/* About Hero (Dark) */}
                <section data-section-theme="dark" className="w-full py-32 bg-[#030712] relative overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full" />
                    </div>

                    <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <span className="text-[10px] font-bold text-slate-400">Our Mission</span>
                                </div>
                                <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
                                    Architecting the future <br />
                                    <span className="text-slate-500 italic">of professional focus.</span>
                                </h1>
                                <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-xl">
                                    Nexus was born from a realization that visibility is the catalyst for growth. We've engineered the first unified OS that treats your time as your most valuable infrastructure asset.
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
                                <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="relative bg-[#0f172a]/40 backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.02] -rotate-45 translate-x-24 -translate-y-24" />
                                    <div className="relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-slate-400 flex items-center justify-center mb-10 shadow-2xl">
                                            <svg className="w-8 h-8 text-[#030712]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
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

                {/* Values (White) */}
                <section data-section-theme="white" className="w-full py-32 bg-white">
                    <div className="max-w-7xl mx-auto px-8 md:px-12">
                        <div className="flex flex-col items-center mb-20 text-center">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 shadow-sm mb-6">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                <span className="text-xs font-bold text-slate-500">Our Principles</span>
                            </div>
                            <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight">What We <span className="text-slate-400 italic font-medium">Stand For</span></h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    title: 'Radical Transparency',
                                    description: 'Every decision, every task, every minute — fully visible. We believe that when teams see the whole picture, they make better decisions.',
                                    icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
                                },
                                {
                                    title: 'Zero Friction',
                                    description: 'Tools should get out of your way. We obsess over removing every unnecessary click, every redundant form field, every context switch.',
                                    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                                },
                                {
                                    title: 'Engineered Quality',
                                    description: 'Built by engineers who care about details. Every pixel, every interaction, every data flow is crafted to enterprise-grade standards.',
                                    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                                },
                            ].map((v) => (
                                <div key={v.title} className="group bg-slate-50 border border-slate-200 rounded-[2.5rem] p-10 hover:bg-white hover:shadow-2xl hover:border-slate-300 transition-all duration-500">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={v.icon} /></svg>
                                    </div>
                                    <h3 className="text-xl font-extrabold text-slate-900 mb-4">{v.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{v.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA (Dark) */}
                <section data-section-theme="dark" className="w-full py-32 bg-[#030712] border-t border-white/5">
                    <div className="max-w-4xl mx-auto px-8 md:px-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-slate-400 flex items-center justify-center mb-10 shadow-2xl mx-auto">
                            <svg className="w-8 h-8 text-[#030712]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Ready to get started?</h2>
                        <p className="text-lg text-slate-400 font-medium max-w-lg mx-auto mb-10">
                            Join the teams already transforming their workflow with Nexus. Launch your command center today.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onClick={() => navigate('/platform')} className="group relative px-10 py-5 bg-white text-slate-900 font-bold text-base rounded-2xl overflow-hidden shadow-2xl hover:scale-105 transition-all">
                                <span className="relative z-10 flex items-center gap-3 justify-center">
                                    Go to Platform
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </span>
                            </button>
                            <button onClick={() => navigate('/support')} className="px-10 py-5 text-white font-bold text-base rounded-2xl border-2 border-white/20 hover:bg-white/10 transition-all hover:scale-105">
                                Contact Support
                            </button>
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

export default About;
