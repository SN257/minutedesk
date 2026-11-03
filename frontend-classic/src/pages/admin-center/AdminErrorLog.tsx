import { useEffect, useMemo, useState } from 'react';
import { getErrorLogs, updateErrorLogStatus, type ErrorLogEntry } from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';
import { motion } from 'framer-motion';
import { staggerContainer } from './kit/motion';

const STATUS_VARIANT: Record<string, 'danger' | 'warning' | 'success'> = {
  open: 'danger',
  in_progress: 'warning',
  resolved: 'success',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

interface Group {
  key: string;
  message: string;
  source: string;
  status: ErrorLogEntry['status'];
  occurrences: ErrorLogEntry[];
  firstSeen: string;
  lastSeen: string;
  severity: 'critical' | 'warning';
}

const groupErrors = (entries: ErrorLogEntry[]): Group[] => {
  const map = new Map<string, ErrorLogEntry[]>();
  for (const e of entries) {
    const key = `${e.source}:${e.message}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries())
    .map(([key, occurrences]) => {
      const sorted = [...occurrences].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const anyOpen = occurrences.some((o) => o.status === 'open');
      const anyInProgress = occurrences.some((o) => o.status === 'in_progress');
      const status = anyOpen ? 'open' : anyInProgress ? 'in_progress' : 'resolved';
      const severity: Group['severity'] = sorted[0].source === 'backend' && (sorted[0].statusCode ?? 0) >= 500 ? 'critical' : 'warning';
      return {
        key,
        message: sorted[0].message,
        source: sorted[0].source,
        status,
        occurrences: sorted,
        firstSeen: sorted[sorted.length - 1].createdAt,
        lastSeen: sorted[0].createdAt,
        severity,
      };
    })
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
};

const AdminErrorLog = () => {
  const [entries, setEntries] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await getErrorLogs({ source: sourceFilter || undefined, status: statusFilter || undefined }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [sourceFilter, statusFilter]);

  const groups = useMemo(() => groupErrors(entries), [entries]);

  const changeStatus = async (group: Group, status: 'open' | 'in_progress' | 'resolved') => {
    setUpdatingKey(group.key);
    try {
      await Promise.all(group.occurrences.map((o) => updateErrorLogStatus(o.id, status)));
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5 pb-10">
      <PageHeader
        title="Error Log"
        subtitle="Backend and frontend crashes, grouped and tracked as tickets — no SSH access needed to find out something broke."
        actions={
          <button onClick={load} className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            Refresh
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {['', 'frontend', 'backend'].map((s) => (
          <button
            key={s || 'all-source'}
            onClick={() => setSourceFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sourceFilter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : 'All Sources'}
          </button>
        ))}
        <span className="w-px bg-slate-200 mx-1" />
        {['', 'open', 'in_progress', 'resolved'].map((s) => (
          <button
            key={s || 'all-status'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            {s ? STATUS_LABELS[s] : 'All Statuses'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <GlassPanel className="py-20 text-center">
          <p className="text-sm text-slate-500">No tickets match these filters. 🎉</p>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <GlassPanel key={g.key} className="overflow-hidden">
              <button onClick={() => setExpanded(expanded === g.key ? null : g.key)} className="w-full text-left px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={STATUS_VARIANT[g.status]}>{STATUS_LABELS[g.status]}</Badge>
                    <Badge variant={g.severity === 'critical' ? 'danger' : 'warning'}>{g.severity}</Badge>
                    <Badge variant="neutral">{g.source}</Badge>
                    {g.occurrences.length > 1 && <Badge variant="navy">×{g.occurrences.length}</Badge>}
                    <span className="text-[11px] text-slate-500">last seen {new Date(g.lastSeen).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 truncate">{g.message}</p>
                  {g.occurrences[0].path && <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{g.occurrences[0].path}</p>}
                </div>
                <svg className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${expanded === g.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {expanded === g.key && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  {g.occurrences.length > 1 && (
                    <p className="text-xs text-slate-500 mb-3">
                      {g.occurrences.length} occurrences · first seen {new Date(g.firstSeen).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {g.occurrences[0].userEmail && <p className="text-xs text-slate-500 mb-2"><strong className="text-slate-700">Last user:</strong> {g.occurrences[0].userEmail}</p>}
                  {g.occurrences[0].stack && (
                    <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">{g.occurrences[0].stack}</pre>
                  )}
                  <div className="flex gap-2 mt-4">
                    {(['open', 'in_progress', 'resolved'] as const).map((s) => (
                      <button
                        key={s}
                        disabled={updatingKey === g.key || g.status === s}
                        onClick={() => changeStatus(g, s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${g.status === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900'}`}
                      >
                        Mark {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </GlassPanel>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AdminErrorLog;
