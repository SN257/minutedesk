import { useEffect, useState } from 'react';
import { getActivityLog, type ActivityLogEntry } from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';

const METHOD_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  POST: 'success',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'danger',
};

const AdminActivityLog = () => {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await getActivityLog(300));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.path.toLowerCase().includes(q) || (e.userEmail || '').toLowerCase().includes(q) || e.method.toLowerCase().includes(q);
  });

  const methodCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.method] = (acc[e.method] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Activity Log"
        subtitle="Every meaningful action (create/update/delete) taken across the platform."
        actions={
          <button onClick={load} className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            Refresh
          </button>
        }
      />

      {Object.keys(methodCounts).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(methodCounts).map(([method, count]) => (
            <GlassPanel key={method} className="px-4 py-2.5 flex items-center gap-2">
              <Badge variant={METHOD_VARIANT[method] || 'neutral'}>{method}</Badge>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{count}</span>
            </GlassPanel>
          ))}
        </div>
      )}

      <GlassPanel className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by user, path, or method…"
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 px-6 py-16 text-center">No activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">When</th>
                  <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">User</th>
                  <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">Action</th>
                  <th className="text-right px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} className={i < filtered.length - 1 ? 'border-b border-slate-100' : ''}>
                    <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-3 text-slate-700 whitespace-nowrap">{e.userEmail || <span className="text-slate-400 italic">anonymous</span>}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <Badge variant={METHOD_VARIANT[e.method] || 'neutral'}>{e.method}</Badge>
                      <span className="text-slate-500 font-mono text-xs ml-2">{e.path}</span>
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <span className={`text-xs font-bold ${e.statusCode && e.statusCode >= 400 ? 'text-rose-600' : 'text-slate-500'}`}>{e.statusCode ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default AdminActivityLog;
