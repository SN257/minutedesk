import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isYesterdayWorkLogMissing, getDailyWorkWarnings, getWorkLogApi } from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getLocalDateString, parseLocalDate } from "../utils/date";

const WorkLogDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [missingLog, setMissingLog] = useState<{ missing: boolean; date: string } | null>(null);
    const [warnings, setWarnings] = useState<any[]>([]);
    const [weeklyLogs, setWeeklyLogs] = useState<any[]>([]);

    const todayDateStr = getLocalDateString();

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);

                // Build last 7 days and fetch logs concurrently
                const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return getLocalDateString(d);
                });

                const promises = last7Days.map(dateStr => getWorkLogApi(dateStr).catch(() => null));
                const results = await Promise.all(promises);

                const m = await isYesterdayWorkLogMissing().catch(() => null);
                const w = await getDailyWorkWarnings().catch(() => []);

                setMissingLog(m);
                setWarnings(w || []);

                const processedLogs = last7Days.map((dateStr, index) => {
                    const log = results[index];
                    const d = parseLocalDate(dateStr);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    const hasLog = !!(log && (log.todayWork?.trim().length > 0 || log.todayOnLeave || log.todayHoliday));

                    return {
                        dateStr,
                        shortDay: d.toLocaleDateString('en-US', { weekday: 'short' }),
                        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        hasLog,
                        logData: log || { date: dateStr, todayWork: null, todayOnLeave: false, todayHoliday: false },
                        isWeekend,
                        isToday: dateStr === todayDateStr
                    };
                });

                setWeeklyLogs(processedLogs.reverse()); // latest first for table
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [todayDateStr]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Chart Data Preparation (Chronological)
    const chartData = [...weeklyLogs].reverse().map(l => ({
        name: l.shortDay,
        Logged: l.hasLog ? 100 : (l.isWeekend ? 60 : 20), // non-zero heights for visibility
        status: l.hasLog ? 'Logged' : (l.isWeekend ? 'Weekend' : (l.isToday ? 'Pending' : 'Missed')),
        fill: l.hasLog ? '#0f172a' : (l.isWeekend ? '#e2e8f0' : '#cbd5e1')
    }));

    const compliantDays = weeklyLogs.filter(l => l.hasLog || l.isWeekend || l.isToday).length;
    const missingCount = 7 - compliantDays;

    return (
        <div className="space-y-6 md:space-y-8 animate-fadeUp">

            {/* Action Banner */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-700/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Work Hub</h1>
                    <p className="text-slate-400 font-medium text-sm md:text-base">Monitor your daily productivity and track your daily logs.</p>
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <button onClick={() => navigate('/work-logs/daily')} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-xl font-bold shadow-lg shadow-black/5 transition-all hover:scale-105 active:scale-95">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Fill Today's Log
                    </button>
                </div>
            </div>

            {/* Compliance Alerts */}
            {missingLog?.missing && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-bold">Incomplete Record: {missingLog.date}</h3>
                            <p className="text-slate-600 text-sm mt-1">You missed logging your work yesterday. Please backfill it to maintain compliance.</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/work-logs/daily')} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm transition-colors whitespace-nowrap">
                        Log Work Now
                    </button>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 md-si" style={{ animationDelay: '0.15s' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-slate-50 text-slate-700 border-slate-200 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">{Math.round((compliantDays / 7) * 100)}%</p>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">7-Day Compliance</h4>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">Logs submitted vs required</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 md-si" style={{ animationDelay: '0.2s' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-slate-50 text-slate-700 border-slate-200 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">{missingCount}</p>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">Missing Logs</h4>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">In the past 7 days</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 md-si" style={{ animationDelay: '0.25s' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-slate-50 text-slate-700 border-slate-200 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">{warnings.length}</p>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">Active Warnings</h4>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">Workflow bottlenecks</p>
                    </div>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* 7-Day Graph */}
                <div className="col-span-1 xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md-si flex flex-col" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900">Weekly Consistency</h2>
                            <p className="text-xs font-medium text-slate-500">Visual compliance for the last 7 days</p>
                        </div>
                    </div>
                    <div className="h-48 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const p = payload[0].payload as any;
                                            const status = p.status || (p.Logged === 100 ? 'Logged' : 'Missed');
                                            const color = status === 'Logged' ? '#0f172a' : (status === 'Weekend' ? '#64748b' : '#ef4444');
                                            return (
                                                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl">
                                                    <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                                                    <p className="text-xs font-semibold mt-1" style={{ color }}>{status}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="Logged" radius={[6, 6, 6, 6]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Workflow Status List */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm flex flex-col md-si" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                    <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-slate-900">System Logs</h2>
                    </div>
                    <div className="p-4 flex-1">
                        {warnings.length === 0 && !missingLog?.missing ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                    <svg className="w-8 h-8 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="text-slate-900 font-bold font-lg mb-1">Perfect Score</p>
                                <p className="text-sm font-medium text-slate-500">All checklists and trackers compliant.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {warnings.map((w, idx) => (
                                    <div key={`w-${idx}`} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></div>
                                        <p className="text-sm font-semibold text-slate-700 leading-relaxed">{w.message || 'Workflow warning detected'}</p>
                                    </div>
                                ))}
                                {warnings.length === 0 && missingLog?.missing && (
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-8">
                                        <p className="text-sm font-semibold text-slate-500 text-center">No structural warnings.<br />Just backfill your missed log.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Daily Breakdown Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden md-si flex flex-col" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900">7-Day Ledger</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Detailed view of your recent work submissions</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {weeklyLogs.map(l => (
                                <tr key={l.dateStr} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <p className="font-bold text-sm text-slate-900">{l.shortDay}, {l.fullDate}</p>
                                            {l.isToday && <span className="text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded-md">TODAY</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {l.hasLog ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> Logged
                                            </span>
                                        ) : l.isToday ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Pending
                                            </span>
                                        ) : l.isWeekend ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-400">
                                                Weekend
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div> Missed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {l.hasLog ? (
                                            <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]">
                                                {l.logData.todayHoliday ? "Holiday" : l.logData.todayOnLeave ? "On Leave" : l.logData.todayWork}
                                            </p>
                                        ) : (
                                            <p className="text-xs font-medium text-slate-400 italic">No entry found</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(!l.hasLog && !l.isWeekend && !l.isToday) || l.isToday ? (
                                            <button onClick={() => navigate('/work-logs/daily')} className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                                                Update
                                            </button>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-300">Locked</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
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

export default WorkLogDashboard;
