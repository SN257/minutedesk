import { useState, useEffect } from "react";
import { getWorkLogApi } from "../services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function WorkLogReports({ isEmbedded = false }: { isEmbedded?: boolean }) {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                // Build the last 30 days list and fetch each day's log concurrently.
                const promises: Promise<any | null>[] = [];
                const dateStrings: string[] = [];
                for (let i = 0; i < 30; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toISOString().split('T')[0];
                    dateStrings.push(dateStr);
                    promises.push(getWorkLogApi(dateStr).catch(() => null));
                }

                const results = await Promise.all(promises);

                // Ensure we have an entry for every date so analytics can mark "Missed" days
                const data = dateStrings.map((dateStr, idx) => {
                    const r = results[idx];
                    if (r && r.date) return r;
                    return { date: dateStr, todayWork: null, tomorrowWork: null };
                }).sort((a, b) => a.date.localeCompare(b.date));

                setLogs(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const exportToCSV = () => {
        let csvContent = 'WORKLOG EXPORT (Last 30 Days)\n\nDate,Status,Today Work,Tomorrow Work\n';
        const todayIso = new Date().toISOString().split('T')[0];
        logs.forEach(l => {
            const isWeekendLocal = [0, 6].includes(new Date(l.date).getDay());
            let status = 'Logged';
            if (isWeekendLocal && !l.todayWork) status = 'Weekend';
            else if (!l.todayWork && l.date < todayIso) status = 'Missed';
            else if (!l.todayWork) status = 'Pending';

            csvContent += `"${new Date(l.date).toLocaleDateString()}","${status}","${(l.todayWork || '').replace(/"/g, '""')}","${(l.tomorrowWork || '').replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `worklog_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Derived Data
    let logged = 0;
    let missed = 0;
    let weekends = 0;

    logs.forEach(l => {
        const d = new Date(l.date);
        const isWkend = [0, 6].includes(d.getDay());
        const isPast = l.date < new Date().toISOString().split('T')[0];

        if (l.todayWork) logged++;
        else if (isWkend) weekends++;
        else if (isPast) missed++;
    });

    const statusData = [
        { name: 'Logged', value: logged, color: '#0f172a' },
        { name: 'Missed', value: missed, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const lengthData = logs.filter(l => l.todayWork).map(l => ({
        name: new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        "Entry Length": l.todayWork?.length || 0
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className={isEmbedded ? "space-y-6 md:space-y-8 animate-fadeUp relative z-20" : "space-y-6 md:space-y-8 animate-fadeUp"}>
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-700/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">WorkLog Analytics</h1>
                    <p className="text-slate-400 font-medium text-sm md:text-base">Track logging compliance and entry density over the last 30 days.</p>
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <button onClick={exportToCSV} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-xl font-bold shadow-lg shadow-black/5 transition-all hover:scale-105 active:scale-95">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6" style={{ animationDelay: '0.1s', animationFillMode: 'both', animationName: 'mdFadeUp', animationDuration: '0.5s' }}>
                    <h2 className="text-base font-extrabold text-slate-900 mb-4">Entry Verbosity (Characters)</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lengthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="Entry Length" fill="#0f172a" radius={[4, 4, 4, 4]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col items-center" style={{ animationDelay: '0.2s', animationFillMode: 'both', animationName: 'mdFadeUp', animationDuration: '0.5s' }}>
                    <h2 className="text-base font-extrabold text-slate-900 w-full text-left mb-2">30-Day Compliance</h2>
                    <div className="flex-1 w-full relative min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{logged + missed}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Expected Logs</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ animationDelay: '0.3s', animationFillMode: 'both', animationName: 'mdFadeUp', animationDuration: '0.5s' }}>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-extrabold text-slate-900">30-Day Extractor Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Logged</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Compliance</th>
                                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Today Entry Snippet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[...logs].reverse().slice(0, 10).map(l => {
                                const isWeekendLocal = [0, 6].includes(new Date(l.date).getDay());
                                let status = 'Logged';
                                if (isWeekendLocal && !l.todayTask) status = 'Weekend';
                                else if (!l.todayTask && new Date(l.date).toISOString().split('T')[0] < new Date().toISOString().split('T')[0]) status = 'Missed';
                                else if (!l.todayTask) status = 'Pending';

                                return (
                                    <tr key={l.date} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-sm text-slate-900 truncate max-w-xs">{new Date(l.date).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${status === 'Missed' ? 'bg-red-50 text-red-600 border-red-200' : status === 'Logged' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-medium text-slate-600 truncate max-w-md">{l.todayTask || 'No entry'}</p>
                                        </td>
                                    </tr>
                                );
                            })}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-sm font-medium text-slate-400">No logs found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`
                @keyframes mdFadeUp { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
