import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMeetings, getScheduledMeetings } from "../services/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getLocalDateString, parseLocalDate } from '../utils/date';

interface Meeting {
    id: string;
    personName?: string;
    center: string;
    date: string;
    startTime: string;
    endTime?: string;
    meetingType: string;
    createdAt: string;
    scheduledMeetingId?: string;
}

const MeetingDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [scheduled, setScheduled] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [m, s] = await Promise.all([
                    getMeetings().catch(() => []),
                    getScheduledMeetings().catch(() => [])
                ]);
                setMeetings(m || []);
                setScheduled(s || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const today = getLocalDateString();
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const isFuture = (d: string, st?: string) => {
        if (!d) return false;
        if (d > today) return true;
        if (d === today) {
            if (!st) return false;
            const [h, m] = st.split(':').map(Number);
            if (h > currentH) return true;
            if (h === currentH && m > currentM) return true;
        }
        return false;
    };

    const scheduledMapped = scheduled.map(sm => ({
        id: sm.id,
        center: sm.center || sm.title || 'Scheduled',
        personName: sm.personName,
        date: sm.date || sm.scheduledDate,
        startTime: sm.startTime,
        endTime: sm.endTime,
        meetingType: sm.meetingType || 'scheduled',
        createdAt: sm.createdAt || sm.date || ''
    }));

    const allM = [...meetings, ...scheduledMapped];
    const upcoming = allM.filter(m => isFuture(m.date, m.startTime))
        .sort((a, b) => {
            if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

    const recent = [...meetings]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    const todayCount = allM.filter(m => m.date === today && m.meetingType !== 'scheduled').length;

    const pastUnlogged = scheduledMapped.filter(sm => {
        if (!sm.date) return false;
        if (sm.date < today) return true;
        if (sm.date === today) {
            if (!sm.startTime) return true;
            const [h, m] = sm.startTime.split(':').map(Number);
            if (h < currentH || (h === currentH && m <= currentM)) return true;
        }
        return false;
    }).filter(sm => !meetings.some(m => m.scheduledMeetingId === sm.id));

    const formatDate = (ds: string) => {
        try { return parseLocalDate(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
        catch { return ds; }
    };

    // --- Chart Data Processing ---

    // 1. Meeting Trends (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return getLocalDateString(d);
    });

    const trendData = last7Days.map(dateStr => {
        const heldCount = meetings.filter(m => m.date === dateStr).length;
        const scheduledCount = scheduledMapped.filter(sm => sm.date === dateStr).length;
        return {
            name: parseLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
            Scheduled: scheduledCount,
            Completed: heldCount
        };
    });

    // 2. Meeting Type Distribution Donut
    const typeCounts: Record<string, number> = {};
    meetings.forEach(m => {
        const type = m.meetingType || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const definedColors = ['#0f172a', '#334155', '#64748b', '#cbd5e1', '#e2e8f0'];
    let distributionData = Object.keys(typeCounts).map((key, index) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: typeCounts[key],
        color: definedColors[index % definedColors.length]
    })).sort((a, b) => b.value - a.value);

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
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Meeting Studio</h1>
                    <p className="text-slate-400 font-medium text-sm md:text-base">Command center for scheduling, tracking, and capturing minutes.</p>
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <button onClick={() => navigate('/add-meeting/new')} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-xl font-bold shadow-lg shadow-black/5 transition-all hover:scale-105 active:scale-95">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Capture Minutes
                    </button>
                    <button onClick={() => navigate('/meetings/schedule')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-bold border border-white/10 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Schedule
                    </button>
                </div>
            </div>

            {/* Compliance Alerts */}
            {pastUnlogged.length > 0 && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-bold">Action Required</h3>
                            <p className="text-slate-600 text-sm mt-1">You have {pastUnlogged.length} past scheduled meeting(s) without recorded minutes. Please log them.</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/add-meeting/new')} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-sm transition-colors whitespace-nowrap">
                        Resolve Now
                    </button>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { l: 'Total Captured', v: meetings.length, s: 'All-time official minutes', ic: 'M5 13l4 4L19 7' },
                    { l: 'Upcoming Events', v: upcoming.length, s: 'Scheduled future events', ic: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { l: 'Today\'s Load', v: todayCount, s: 'Meetings held today', ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { l: 'Flagged Missing', v: pastUnlogged.length, s: 'Unlogged past meetings', ic: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
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
                            <h2 className="text-base font-extrabold text-slate-900">Meeting Velocity</h2>
                            <p className="text-xs font-medium text-slate-500">Trailing 7-day scheduled vs completed metrics</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.4} />
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
                                <Area type="monotone" dataKey="Scheduled" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorScheduled)" />
                                <Area type="monotone" dataKey="Completed" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Donut Chart */}
                <div className="col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col md-si" style={{ animationDelay: '0.4s' }}>
                    <div className="mb-2">
                        <h2 className="text-base font-extrabold text-slate-900">Meeting Categories</h2>
                        <p className="text-xs font-medium text-slate-500">Distribution of logged minutes</p>
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{meetings.length}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total</span>
                        </div>
                    </div>
                    {/* Custom Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                        {distributionData.slice(0, 4).map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></div>
                                <span className="text-[10px] font-bold text-slate-600 truncate">{d.name} <span className="text-slate-900 ml-0.5">({d.value})</span></span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Complex Detailed Table/List Area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden md-si flex flex-col" style={{ animationDelay: '0.5s' }}>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900">Official Minutes Ledger</h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Your most recently captured meeting minutes</p>
                    </div>
                    <button onClick={() => navigate('/meetings')} className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline transition-colors">View All Logs</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Meeting Topic / Location</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Class</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Logged</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recent.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => navigate(`/add-meeting/${m.id}`)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                                                {(m.center || 'M')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 truncate max-w-[200px] md:max-w-xs">{m.center}</p>
                                                {m.personName && <p className="text-[10px] font-bold text-slate-500 mt-0.5">{m.personName}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-600`}>
                                            {m.meetingType || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-semibold text-slate-600">
                                            {formatDate(m.date)}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-400">
                                            {m.startTime} {m.endTime && `- ${m.endTime}`}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-bold text-slate-500 group-hover:text-slate-900 bg-white border border-slate-200 group-hover:border-slate-400 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                                            View Minutes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {recent.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-slate-400">
                                        No minutes captured yet. Record your first meeting to populate this table.
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

export default MeetingDashboard;
