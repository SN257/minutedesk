import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedNumber, Badge, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { useToast } from '../../lib/toast';
import {
  downloadBackup, getBackups, getBroadcastHistory, runBackupNow, sendBroadcast,
  type BackupRecordEntry, type BroadcastEntry,
} from '../../lib/api';
import { ConfirmModal, ErrorNote, G, RefreshButton, fmtBytes, fmtStamp, timeAgo, useHealth, useLast } from './shared';
import { ATile, ATitle } from './tiles';

const TONE_BG = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' } as const;

/** One service as a glass chip with a glowing light. */
const Service = ({ label, status, detail, tone }: { label: string; status: string; detail?: string; tone: 'good' | 'warn' | 'bad' }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/45 border border-white/70 px-4 py-3 min-w-0">
    <span className="relative flex w-3 h-3 shrink-0">
      {tone === 'good' && <span className="absolute inset-0 rounded-full bg-good animate-ping opacity-50" />}
      <span className={`relative w-3 h-3 rounded-full ${TONE_BG[tone]}`} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-extrabold leading-tight">{label}</p>
      {detail && <p className="text-[11px] text-muted truncate">{detail}</p>}
    </div>
    <Badge tone={tone}>{status}</Badge>
  </div>
);

/** A ring gauge: memory in use against the process's resident size. */
const Gauge = ({ value, max, label, unit }: { value: number; max: number; label: string; unit: string }) => {
  const size = 96, r = 40, c = 2 * Math.PI * r, f = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="flex items-center gap-4">
      <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} className="stroke-ink/10" />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} strokeLinecap="round" className="stroke-brand" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - f) }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        <span className="absolute text-sm font-extrabold tabular-nums">{Math.round(f * 100)}%</span>
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="text-2xl font-extrabold tabular-nums leading-tight"><AnimatedNumber value={value} /> <span className="text-sm text-muted font-bold">{unit}</span></p>
        <p className="text-[11px] text-muted">of {max} {unit} reserved</p>
      </div>
    </div>
  );
};

/* ───────── Health ───────── */
const Health = () => {
  const { health, error, loading, lastChecked, reload } = useHealth(30000);
  const up = health?.uptimeSeconds ?? 0;
  const allGood = !!health && health.db.ok && health.mail.configured;
  const bad = !!health && !health.db.ok;
  const tone: 'good' | 'warn' | 'bad' = !health ? 'warn' : bad ? 'bad' : allGood ? 'good' : 'warn';
  const headline = !health ? 'Checking the servers…' : bad ? 'The database is not answering' : allGood ? 'All systems running smoothly' : 'Running, with one thing to set up';
  return (
    <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
      <ATile glow={tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : 'warn'} className="lg:col-span-3">
        <div className="flex items-start gap-4">
          <span className="relative grid place-items-center w-16 h-16 shrink-0">
            <motion.span aria-hidden className={`absolute inset-0 rounded-full opacity-30 ${TONE_BG[tone]}`} animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.05, 0.3] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
            <span className={`relative w-9 h-9 rounded-full ${TONE_BG[tone]}`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">System status</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight mt-0.5">{headline}</h2>
            <p className="text-xs text-muted mt-1">{lastChecked ? `Checked ${lastChecked.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · refreshes every 30 seconds` : 'Live diagnostics'}</p>
          </div>
          <RefreshButton label="Recheck" busy={loading && !!health} onClick={reload} />
        </div>
        {error && !health && <div className="mt-4"><ErrorNote message={error} onRetry={reload} /></div>}
        {!health && !error ? (
          <div className="mt-5 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : health ? (
          <div className="mt-5 grid sm:grid-cols-1 gap-2.5">
            <Service label="Database" tone={health.db.ok ? 'good' : 'bad'} status={health.db.ok ? 'Online' : 'Unreachable'} detail={health.db.ok ? `${health.db.latencyMs}ms round trip` : undefined} />
            <Service label="Mail (SMTP)" tone={health.mail.configured ? 'good' : 'warn'} status={health.mail.configured ? 'Configured' : 'Not set up'} detail={health.mail.configured ? 'Notification and backup emails will send' : 'Set the SMTP_* variables to enable email'} />
            <Service label="Scheduled backups" tone="good" status="Active" detail={health.backupSchedule} />
          </div>
        ) : null}
      </ATile>

      <ATile glow="brand" className="lg:col-span-2">
        <ATitle icon={G.refresh}>Server</ATitle>
        {health ? (
          <div className="space-y-5">
            <Gauge value={health.memory.heapUsedMb} max={Math.max(health.memory.rssMb, health.memory.heapUsedMb)} label="Heap in use" unit="MB" />
            <div className="grid grid-cols-3 gap-2">
              {[['Uptime', `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`], ['Memory', `${health.memory.rssMb} MB`], ['Node', health.nodeVersion]].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-white/45 border border-white/70 px-3 py-2.5 min-w-0">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted">{l}</p>
                  <p className="text-sm font-extrabold tabular-nums truncate">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ) : <Skeleton className="h-40" />}
      </ATile>
    </div>
  );
};

/* ───────── Backups ───────── */
const Backups = () => {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(getBackups, []);
  const [confirm, setConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [dl, setDl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = data ?? [];
  const storage = list.filter((b) => b.fileExists).reduce((s, b) => s + Number(b.sizeBytes), 0);

  const run = async () => {
    setRunning(true);
    try {
      await runBackupNow();
      toast('Backup finished and emailed to all super admins.');
      setConfirm(false);
      reload();
    } catch (e: any) {
      toast(e?.message || 'The backup did not complete.', 'error');
    } finally {
      setRunning(false);
    }
  };
  const download = async (b: BackupRecordEntry) => {
    setDl(b.id);
    try { await downloadBackup(b.id, b.filename); } catch (e: any) { toast(e?.message || 'Download failed.', 'error'); } finally { setDl(null); }
  };

  return (
    <ATile glow="good" className="min-w-0">
      <ATitle icon={G.download} right={<Button size="sm" className="!rounded-full" onClick={() => setConfirm(true)}>Run backup now</Button>}>Backup vault</ATitle>
      <p className="text-xs text-muted -mt-1 mb-4 max-w-md">A full export runs every night and is emailed to every super admin. Recent ones are kept here for download.</p>
      {list.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="rounded-2xl bg-white/45 border border-white/70 px-4 py-3"><p className="text-3xl font-extrabold tabular-nums leading-none">{list.length}</p><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted mt-1.5">On record</p></div>
          <div className="rounded-2xl bg-white/45 border border-white/70 px-4 py-3"><p className="text-3xl font-extrabold tabular-nums leading-none">{fmtBytes(storage)}</p><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted mt-1.5">Stored</p></div>
        </div>
      )}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : list.length === 0 ? (
        <Empty icon="🗄️" title="No backups yet" hint="The first scheduled run will appear here." />
      ) : (
        <ul className="relative ml-2 border-l-2 border-ink/10 max-h-[420px] overflow-y-auto scroll-y pr-1 space-y-2">
          {list.map((b) => {
            const isOpen = expanded === b.id;
            const counts = b.tableCounts ? Object.entries(b.tableCounts) : [];
            return (
              <li key={b.id} className="relative pl-5 py-2 rounded-r-2xl hover:bg-white/40 transition-colors">
                <span className={`absolute -left-[7px] top-4 w-3 h-3 rounded-full ring-4 ring-white/70 ${b.status === 'success' ? 'bg-good' : 'bg-bad'}`} />
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => counts.length && setExpanded(isOpen ? null : b.id)} className="min-w-0 flex-1 text-left" disabled={!counts.length}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={b.status === 'success' ? 'good' : 'bad'}>{b.status === 'success' ? 'Saved' : 'Failed'}</Badge>
                      <span className="text-sm font-semibold">{timeAgo(b.createdAt)}</span>
                      <span className="text-[11px] text-muted">{b.manual ? 'Manual' : 'Scheduled'}{b.emailed ? ' · emailed' : ''}</span>
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{b.filename} · {fmtBytes(b.sizeBytes)}{counts.length ? ` · ${isOpen ? 'hide' : 'show'} contents` : ''}</p>
                    {b.status === 'failed' && b.error && <p className="text-xs text-bad mt-0.5 break-words">{b.error}</p>}
                  </button>
                  {b.fileExists ? (
                    <Button size="sm" variant="soft" className="!rounded-full" loading={dl === b.id} onClick={() => download(b)}>{G.download}</Button>
                  ) : (
                    <span className="text-[11px] text-muted whitespace-nowrap">{b.status === 'success' ? 'File expired' : ''}</span>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 pt-3">
                        {counts.map(([t, n]) => (
                          <span key={t} className="text-[11px] bg-white/50 border border-white/70 rounded-full px-2.5 py-1"><span className="font-mono text-ink-2">{t}</span> <span className="font-bold tabular-nums">{n}</span></span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal open={confirm} title="Run a backup now?" confirmLabel="Run backup and email" loading={running} onConfirm={run} onClose={() => setConfirm(false)}>
        <p>This exports the <strong>entire live database</strong> and <strong>emails the file to every super admin</strong>.</p>
        <p className="text-muted">Nightly backups already run on their own, so only do this if you need a fresh copy right now. Large databases can take a little while.</p>
      </ConfirmModal>
    </ATile>
  );
};

/* ───────── Broadcast ───────── */
type Audience = 'all' | 'user' | 'super_admin';
const AUD: Record<Audience, string> = { all: 'Everyone', user: 'Regular users', super_admin: 'Super admins only' };

const Broadcast = () => {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(getBroadcastHistory, []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [aud, setAud] = useState<Audience>('all');
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const held = useLast(confirm ? { title, aud } : null);

  const ask = (e: FormEvent) => { e.preventDefault(); if (title.trim()) setConfirm(true); };
  const send = async () => {
    setSending(true);
    try {
      const r: BroadcastEntry = await sendBroadcast({ title: title.trim(), body: body.trim() || undefined, audience: aud });
      toast(`Announcement sent to ${r.recipientCount} ${r.recipientCount === 1 ? 'person' : 'people'}.`);
      setTitle(''); setBody(''); setConfirm(false);
      reload();
    } catch (e: any) {
      toast(e?.message || 'Could not send the announcement.', 'error');
    } finally {
      setSending(false);
    }
  };

  const field = 'w-full rounded-xl bg-white/50 border border-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10';
  const lbl = 'block text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted mb-1.5';
  return (
    <ATile glow="warn" className="min-w-0">
      <ATitle icon={G.send}>Announcements</ATitle>
      <form onSubmit={ask} className="space-y-3">
        <label className="block"><span className={lbl}>Headline</span><input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maintenance tonight at 10 PM" maxLength={120} /></label>
        <label className="block"><span className={lbl}>Message (optional)</span><textarea className={`${field} resize-none`} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a little detail so people know what to expect." /></label>
        <div>
          <span className={lbl}>Send to</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Audience">
            {(Object.keys(AUD) as Audience[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={aud === k} onClick={() => setAud(k)} className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${aud === k ? 'bg-ink text-white' : 'bg-white/50 border border-white/70 text-muted hover:text-ink'}`}>{AUD[k]}</button>
            ))}
          </div>
        </div>

        {/* what people will see */}
        <div className="rounded-2xl bg-white/55 border border-white/70 p-3.5 flex gap-3 items-start">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-ink text-white grid place-items-center">{G.send}</span>
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-muted">Preview · notification</p>
            <p className="text-sm font-extrabold break-words">{title.trim() || <span className="text-muted font-medium">Your headline appears here</span>}</p>
            {body.trim() && <p className="text-xs text-muted break-words line-clamp-2">{body.trim()}</p>}
          </div>
        </div>
        <div className="flex justify-end"><Button type="submit" className="!rounded-full" disabled={!title.trim()}>{G.send} Review and send</Button></div>
      </form>

      <div className="mt-5 pt-4 border-t border-white/60">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted mb-2">Sent so far</p>
        {error && <ErrorNote message={error} onRetry={reload} />}
        {loading && !data ? <Skeleton className="h-14" /> : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted py-3">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto scroll-y pr-1">
            {data!.map((b) => (
              <li key={b.id} className="rounded-2xl bg-white/45 border border-white/70 px-3.5 py-3 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold break-words min-w-0">{b.title}</p>
                  <Badge tone="neutral">{AUD[b.audience]}</Badge>
                </div>
                {b.body && <p className="text-xs text-muted mt-0.5 line-clamp-2 break-words">{b.body}</p>}
                <p className="text-[11px] text-muted mt-1">{fmtStamp(b.createdAt)} · reached {b.recipientCount}{b.sentByEmail ? ` · by ${b.sentByEmail}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal open={confirm} title="Send this announcement?" confirmLabel="Send now" loading={sending} onConfirm={send} onClose={() => setConfirm(false)}>
        <p>“<strong>{held?.title}</strong>” will be delivered to <strong>{held ? AUD[held.aud].toLowerCase() : ''}</strong> straight away.</p>
        <p className="text-muted">Announcements can’t be recalled once sent.</p>
      </ConfirmModal>
    </ATile>
  );
};

const AdminSystem = () => (
  <Stagger className="space-y-4 sm:space-y-5">
    <Health />
    <div className="grid xl:grid-cols-2 gap-4 sm:gap-5 items-start">
      <Backups />
      <Broadcast />
    </div>
  </Stagger>
);
export default AdminSystem;
