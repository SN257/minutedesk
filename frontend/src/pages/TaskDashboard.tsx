import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBoardsApi, getAllCardsApi, getDailyWorkWarnings } from "../services/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TaskDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [boards, setBoards] = useState<any[]>([]);
    const [cards, setCards] = useState<any[]>([]);
    const [warnings, setWarnings] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [b, c, w] = await Promise.all([
                    getBoardsApi().catch(() => []),
                    getAllCardsApi().catch(() => []),
                    getDailyWorkWarnings().catch(() => [])
                ]);
                setBoards(b || []);
                setCards(c || []);
                setWarnings(w || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const today = new Date().toISOString().split('T')[0];

    // Process Cards
    const activeCards = cards.filter(c => !c.archived);
    const completedCards = cards.filter(c => c.archived);

    const overdueCards = activeCards.filter(c => c.dueDate && c.dueDate < today);
    const dueTodayCards = activeCards.filter(c => c.dueDate === today);

    const formatDate = (ds: string) => {
        try { return new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        catch { return ds || 'No date'; }
    };

    // --- Chart Data Processing ---

    // 1. Task Trends (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const trendData = last7Days.map(dateStr => {
        const createdCount = cards.filter(c => c.createdAt && c.createdAt.startsWith(dateStr)).length;
        const completedCount = completedCards.filter(c => c.updatedAt && c.updatedAt.startsWith(dateStr)).length;
        return {
            name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
            Added: createdCount,
            Completed: completedCount
        };
    });

    // 2. Task Distribution Donut
    const upcomingCount = activeCards.length - overdueCards.length - dueTodayCards.length;
    let distributionData = [
        { name: 'Overdue', value: overdueCards.length, color: '#0f172a' }, // slate-900
        { name: 'Due Today', value: dueTodayCards.length, color: '#334155' }, // slate-700
        { name: 'Upcoming', value: upcomingCount, color: '#64748b' }, // slate-500
        { name: 'Completed', value: completedCards.length, color: '#cbd5e1' }, // slate-300
    ].filter(d => d.value > 0);

    // Fallback if no cards exist
    if (distributionData.length === 0) {
        distributionData = [{ name: 'No Data', value: 1, color: '#f1f5f9' }];
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fadeUp">

            {/* Action Banner */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-700/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Project Hub</h1>
                    <p className="text-slate-400 font-medium text-sm md:text-base">Command center for workflows, tasks, and team productivity.</p>
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <button onClick={() => navigate('/boards')} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-xl font-bold shadow-lg shadow-black/5 transition-all hover:scale-105 active:scale-95">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Open Boards
                    </button>
                </div>
            </div>

            {/* Compliance / Alerts */}
            {(warnings.length > 0 || overdueCards.length > 0) && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-bold">Action Required</h3>
                            <p className="text-slate-600 text-sm mt-1">
                                {overdueCards.length > 0 ? `You have ${overdueCards.length} overdue tasks waiting for your attention.` : ''}
                                {warnings.length > 0 ? ` There are workflow compliancy warnings.` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/boards')} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm transition-colors whitespace-nowrap">
                        Review Tasks
                    </button>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { l: 'Active Boards', v: boards.length, s: 'Live projects', ic: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { l: 'Total Tasks', v: cards.length, s: 'All-time effort', ic: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { l: 'Due Today', v: dueTodayCards.length, s: 'Immediate priority', ic: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { l: 'Completion Rate', v: cards.length ? Math.round((completedCards.length / cards.length) * 100) + '%' : '0%', s: 'Work efficiency', ic: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }
                ].map((st, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 md-si" style={{ animationDelay: `${0.15 + (i * 0.08)}s` }}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border bg-slate-50 text-slate-700 border-slate-200 flex-shrink-0 transition-transform duration-300 hover:scale-105 hover:-rotate-3`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={st.ic} /></svg>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">{st.v}</p>
                            <h4 className="text-xs font-bold text-slate-900 mt-1">{st.l}</h4>
                            <p className="text-[10px] font-medium text-slate-500 mt-0.5">{st.s}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* 7-Day Trend Chart */}
                <div className="col-span-1 xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md-si" style={{ animationDelay: '0.3s' }}>
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900">Task Velocity</h2>
                            <p className="text-xs font-medium text-slate-500">Trailing 7-day performance metrics</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#475569" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="Added" stroke="#475569" strokeWidth={2} fillOpacity={1} fill="url(#colorAdded)" />
                                <Area type="monotone" dataKey="Completed" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Donut Chart */}
                <div className="col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col md-si" style={{ animationDelay: '0.4s' }}>
                    <div className="mb-2">
                        <h2 className="text-base font-extrabold text-slate-900">Task Distribution</h2>
                        <p className="text-xs font-medium text-slate-500">Current state overview</p>
                    </div>
                    <div className="flex-1 min-h-[220px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center text for donut chart */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{cards.length}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total</span>
                        </div>
                    </div>
                    {/* Custom Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                        {distributionData.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></div>
                                <span className="text-xs font-medium text-slate-600 truncate">{d.name} <span className="font-bold text-slate-900 ml-1">({d.value})</span></span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Complex Detailed Table/List Area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden md-si flex flex-col" style={{ animationDelay: '0.5s' }}>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900">Upcoming Action Items</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Your most pressing deadlines across all boards</p>
                    </div>
                    <button onClick={() => navigate('/boards')} className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline transition-colors">View All Boards</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Task Title</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status Focus</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Deadline</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeCards.filter(c => c.dueDate).slice(0, 5).map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                            <p className="font-bold text-sm text-slate-900 truncate max-w-[200px] md:max-w-xs">{t.title}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${t.dueDate < today ? 'bg-slate-900 text-white' :
                                            t.dueDate === today ? 'bg-slate-200 text-slate-800' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {t.dueDate < today ? 'Overdue' : t.dueDate === today ? 'Due Today' : 'Upcoming'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-semibold text-slate-600">
                                            {formatDate(t.dueDate)}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => navigate('/boards')} className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                                            Open Board
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeCards.filter(c => c.dueDate).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-slate-400">
                                        Excellent. No pending deadlines found across any boards.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .animate-fadeUp { animation: mdFadeUp .5s cubic-bezier(.16,1,.3,1) both; }
                .md-si { animation: mdFadeUp .6s cubic-bezier(.16,1,.3,1) both; }
                @keyframes mdFadeUp { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default TaskDashboard;
