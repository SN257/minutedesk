import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Support = () => {
    const navigate = useNavigate();

    const faqs = [
        { q: 'How do I schedule a new meeting?', a: 'Navigate to the Meeting Studio via the Launchpad and click "Schedule". Fill in the meeting type, center, and agenda to reserve your slot.' },
        { q: 'Can I export my reports to CSV?', a: 'Yes. Open the Reports module, apply any desired filters, and click the "Export" button in the top-right corner of the table view.' },
        { q: 'How do I create a new Kanban board?', a: 'Go to the Project Hub, then click the "+ New Board" button. Give your board a title and start adding lists and cards right away.' },
        { q: 'What happens if I miss a work log entry?', a: 'Missed entries are highlighted in the calendar view. You can always backfill a log by navigating to the missed date and entering your data retroactively.' },
        { q: 'How do I assign tasks from a meeting?', a: 'During meeting recording, use the "Add Task" option on any discussion point. Assign it to a team member with a deadline — it will auto-create a card in Project Hub.' },
        { q: 'Is my data encrypted?', a: 'Absolutely. All data is encrypted in transit and at rest using bank-level AES-256 encryption. We take security very seriously.' },
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
                        { label: 'Launchpad', href: '/launchpad', isRoute: true },
                        { label: 'Capabilities', href: '/capabilities', isRoute: true },
                        { label: 'About', href: '/about', isRoute: true },
                    ]}
                    secondaryNavItems={[
                        { label: 'Docs', href: '/docs', isRoute: true },
                        { label: 'Support', href: '/support', isRoute: true, active: true },
                    ]}
                />

                {/* Hero */}
                <section data-section-theme="dark" className="w-full bg-[#030712] pt-16 pb-20 border-b border-white/5">
                    <div className="max-w-4xl mx-auto px-8 md:px-12 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <span className="text-xs font-bold text-slate-400">Help Center</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
                            How can we <span className="bg-gradient-to-r from-slate-300 via-white to-slate-300 bg-clip-text text-transparent">help?</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 leading-relaxed font-light max-w-2xl mx-auto">
                            Find answers to common questions or get in touch with our support team.
                        </p>
                    </div>
                </section>

                {/* FAQ (White) */}
                <section data-section-theme="white" className="w-full py-32 bg-white flex-1">
                    <div className="max-w-4xl mx-auto px-8 md:px-12">
                        <div className="flex flex-col items-center mb-16 text-center">
                            <div className="text-xs font-bold text-slate-400 mb-4">Common Questions</div>
                            <h2 className="text-4xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
                        </div>

                        <div className="space-y-4">
                            {faqs.map((faq, idx) => (
                                <details key={idx} className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                                    <summary className="flex items-center justify-between cursor-pointer px-8 py-6 list-none">
                                        <span className="text-base font-bold text-slate-900 pr-4">{faq.q}</span>
                                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0 group-open:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </summary>
                                    <div className="px-8 pb-6">
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{faq.a}</p>
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contact CTA (Dark) */}
                <section data-section-theme="dark" className="w-full py-24 bg-[#030712] border-t border-white/5">
                    <div className="max-w-4xl mx-auto px-8 md:px-12">
                        <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-12 md:p-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-slate-400 flex items-center justify-center mb-8 shadow-2xl mx-auto">
                                <svg className="w-7 h-7 text-[#030712]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-3xl font-extrabold text-white mb-4">Still need help?</h3>
                            <p className="text-slate-400 font-medium max-w-md mx-auto mb-8">Our support team is available around the clock. Reach out and we'll get back to you within hours.</p>

                            {/* Contact Details */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                                <a href="tel:+917778814530" className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</div>
                                        <div className="text-sm font-bold text-white">+91 77788 14530</div>
                                    </div>
                                </a>
                                <a href="mailto:sidzt186@gmail.com" className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</div>
                                        <div className="text-sm font-bold text-white">sidzt186@gmail.com</div>
                                    </div>
                                </a>
                            </div>

                            <button onClick={() => navigate('/platform')} className="group px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-2xl hover:scale-105 transition-all">
                                <span className="flex items-center gap-3 justify-center">
                                    Back to Platform
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </span>
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
                @keyframes dropdown{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
                .animate-dropdown{animation:dropdown .18s cubic-bezier(.16,1,.3,1) forwards}
                ::-webkit-scrollbar{width:0}
            `}</style>
        </div>
    );
};

export default Support;
