import { useEffect, useState } from 'react';
import { getBackups, runBackupNow, downloadBackup, type BackupRecordEntry } from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';
import { motion } from 'framer-motion';
import { staggerContainer } from './kit/motion';

const formatSize = (bytes: string) => {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const AdminBackups = () => {
  const [backups, setBackups] = useState<BackupRecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setBackups(await getBackups());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    setMessage(null);
    try {
      await runBackupNow();
      setMessage('Backup completed and emailed to all super admins.');
      await load();
    } catch (err: any) {
      setMessage(err.message || 'Backup failed.');
    } finally {
      setRunning(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const download = async (b: BackupRecordEntry) => {
    setDownloadingId(b.id);
    try {
      await downloadBackup(b.id, b.filename);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const totalStorage = backups.filter((b) => b.fileExists).reduce((sum, b) => sum + Number(b.sizeBytes), 0);
  const successCount = backups.filter((b) => b.status === 'success').length;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-10">
      <PageHeader
        title="Backups"
        subtitle="A full export runs automatically every night at 2 AM and is emailed to every super admin. The last 14 are also kept here for download."
        actions={
          <button
            onClick={runNow}
            disabled={running}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running…
              </>
            ) : 'Run Backup Now'}
          </button>
        }
      />

      {message && (
        <GlassPanel className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">{message}</p>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassPanel className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Total Backups</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{backups.length}</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Successful</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{successCount}</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Stored on Disk</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatSize(String(totalStorage))}</p>
        </GlassPanel>
      </div>

      <GlassPanel className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <p className="text-sm text-slate-500 px-6 py-16 text-center">No backups yet — click "Run Backup Now" to create the first one.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {backups.map((b) => (
              <div key={b.id}>
                <button
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{new Date(b.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-slate-500">{b.manual ? 'Manual' : 'Scheduled'} · {formatSize(b.sizeBytes)}</p>
                    </div>
                    <Badge variant={b.status === 'success' ? 'success' : 'danger'}>{b.status}</Badge>
                    {b.emailed && <span className="text-[10px] text-slate-500">emailed</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.fileExists ? (
                      <span
                        onClick={(e) => { e.stopPropagation(); download(b); }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {downloadingId === b.id ? 'Downloading…' : 'Download'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">expired</span>
                    )}
                    <svg className={`w-4 h-4 text-slate-500 transition-transform ${expandedId === b.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                {expandedId === b.id && (
                  <div className="px-5 pb-4">
                    {b.tableCounts ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(b.tableCounts).map(([table, count]) => (
                          <div key={table} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <span className="text-slate-500">{table}</span>{' '}
                            <span className="font-bold text-slate-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No row-count breakdown captured for this backup.</p>
                    )}
                    {b.error && <p className="text-xs text-rose-600 mt-2">{b.error}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
};

export default AdminBackups;
