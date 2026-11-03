import { useNavigate } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();

    return (
        <footer className="py-8 px-8 md:px-12 bg-[#030712] border-t border-white/5">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-500">Nexus Infrastructure v2.4</span>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-2">
                    <button onClick={() => navigate('/')} className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Home</button>
                    <button onClick={() => navigate('/platform')} className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Platform</button>
                    <button onClick={() => navigate('/launchpad')} className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Launchpad</button>
                    <button onClick={() => navigate('/capabilities')} className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Capabilities</button>
                    <button onClick={() => navigate('/about')} className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">About</button>
                    <button onClick={() => navigate('/docs')} className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Docs</button>
                    <button onClick={() => navigate('/support')} className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors">Support</button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
