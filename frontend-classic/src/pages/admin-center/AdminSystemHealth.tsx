import { useEffect, useState } from 'react';
import { getSystemHealth, type SystemHealth } from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';

const DiagnosticRow = ({
  label,
  status,
  detail,
  variant,
}: {
  label: string;
  status: string;
  detail?: string;
  variant: 'success' | 'warning' | 'danger';
}) => (
  <div className="flex items-center justify-between px-5 py-4">
    <div className="flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full ${variant === 'success' ? 'bg-emerald-500 animate-pulse' : variant === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`} />
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      {detail && <span className="text-xs text-slate-500">{detail}</span>}
      <Badge variant={variant}>{status}</Badge>
    </div>
  </div>
);

const AdminSystemHealth = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setHealth(await getSystemHealth());
      setLastChecked(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="System Health"
        subtitle="Live diagnostics for the database, mail service, and server process — no server access required."
        actions={
          <button onClick={load} disabled={loading} className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50">
            {loading ? 'Checking…' : 'Recheck now'}
          </button>
        }
      />

      {loading && !health ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <GlassPanel className="p-0 overflow-hidden divide-y divide-slate-100">
            <DiagnosticRow
              label="Database"
              status={health?.db.ok ? 'Online' : 'Unreachable'}
              detail={health?.db.ok ? `${health.db.latencyMs}ms round-trip` : undefined}
              variant={health?.db.ok ? 'success' : 'danger'}
            />
            <DiagnosticRow
              label="Mail Service (SMTP)"
              status={health?.mail.configured ? 'Configured' : 'Not configured'}
              detail={health?.mail.configured ? 'Notification & backup emails will send' : 'Set SMTP_* env vars to enable email'}
              variant={health?.mail.configured ? 'success' : 'warning'}
            />
            <DiagnosticRow
              label="Scheduled Backups"
              status="Active"
              detail={health?.backupSchedule}
              variant="success"
            />
          </GlassPanel>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassPanel className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Uptime</p>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {health ? `${Math.floor(health.uptimeSeconds / 3600)}h ${Math.floor((health.uptimeSeconds % 3600) / 60)}m` : '—'}
              </p>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Memory (RSS)</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{health?.memory.rssMb ?? 0} MB</p>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Heap Used</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{health?.memory.heapUsedMb ?? 0} MB</p>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Node Version</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{health?.nodeVersion ?? '—'}</p>
            </GlassPanel>
          </div>

          {lastChecked && (
            <p className="text-xs text-slate-500 text-center">
              Last checked {lastChecked.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — auto-refreshes every 30s
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSystemHealth;
