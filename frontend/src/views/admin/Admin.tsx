import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '../../lib/siteConfig';
import type { ViewProps } from '../../lib/nav';
import { useAuth } from '../../lib/auth';
import { spring } from '../../lib/motion';
import { Empty } from '../../ui';
import { useHealth, useSpin, type TabKey } from './shared';
import AdminOverview from './AdminOverview';
import AdminPeople from './AdminPeople';
import AdminPerformance from './AdminPerformance';
import AdminFollowUp from './AdminFollowUp';
import AdminLogs from './AdminLogs';
import AdminSystem from './AdminSystem';
import AdminSetup from './AdminSetup';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { key: 'people', label: 'People', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { key: 'performance', label: 'Performance', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
  { key: 'followup', label: 'Follow-up', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
  { key: 'logs', label: 'Logs', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { key: 'system', label: 'System', icon: 'M5 3h14a2 2 0 012 2v4H3V5a2 2 0 012-2zM3 13h18v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zM7 7h.01M7 17h.01' },
  { key: 'setup', label: 'Setup', icon: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6' },
];

const SUBS: Record<TabKey, string> = {
  overview: 'Everything running across the workspace, at a glance.',
  people: 'Accounts, roles and access.',
  performance: 'Who is delivering, who is on time, and where to lend a hand.',
  followup: 'One person’s work, meetings and work log, and a nudge when something slips.',
  logs: 'What people did, and what broke.',
  system: 'Server health, backups and announcements.',
  setup: 'Centers, roles and branding.',
};

/** A live status chip: a pulsing dot plus a short reading. */
const Status = ({ ok, label, detail }: { ok: boolean | null; label: string; detail: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-ink/[0.06] pl-3 pr-3.5 py-1.5 text-xs font-bold">
    <span className="relative flex w-2 h-2">
      {ok === true && <span className="absolute inset-0 rounded-full bg-good animate-ping opacity-60" />}
      <span className={`relative w-2 h-2 rounded-full ${ok === null ? 'bg-muted/50' : ok ? 'bg-good' : 'bg-bad'}`} />
    </span>
    {label}<span className="font-semibold text-muted">{detail}</span>
  </span>
);

const Admin = ({ param, go }: ViewProps) => {
  const t = useT();
  const { hasAdmin, canAdmin } = useAuth();
  const hl = useHealth(30000, canAdmin('system'));
  const { spin, icon: spinIcon } = useSpin(hl.loading);
  if (!hasAdmin) return <Empty icon="🔒" title="Admins only" hint="This workspace is reserved for admins." />;

  const tabs = TABS.filter((t) => canAdmin(t.key));
  const tab: TabKey = tabs.some((t) => t.key === param) ? (param as TabKey) : (tabs[0]?.key ?? 'overview');
  const setTab = (k: TabKey) => go('admin', k === tabs[0]?.key ? null : k);
  const h = hl.health;

  return (
    <div>
      {/* Control bar: title, live status, section tabs */}
      <div className="liquid rounded-[2rem] p-4 sm:p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider text-brand">{t('admin.eyebrow')}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">{t('admin.title')}</h1>
            <p className="text-muted mt-1.5 text-sm">{SUBS[tab]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAdmin('system') && <>
            <Status ok={h ? h.db.ok : null} label="Database" detail={h ? (h.db.ok ? `${h.db.latencyMs}ms` : 'down') : '…'} />
            <Status ok={h ? true : null} label="Server" detail={h ? `up ${Math.floor(h.uptimeSeconds / 3600)}h ${Math.floor((h.uptimeSeconds % 3600) / 60)}m` : '…'} />
            <Status ok={h ? h.mail.configured : null} label="Mail" detail={h ? (h.mail.configured ? 'ready' : 'not set up') : '…'} />
            <button type="button" onClick={() => { spin(); hl.reload(); }} aria-label="Recheck health" title="Recheck health" className="w-9 h-9 rounded-full bg-ink/[0.06] hover:bg-ink/[0.12] grid place-items-center transition-colors">{spinIcon}</button>
            </>}
          </div>
        </div>

        <nav className="mt-5 -mx-4 px-4 sm:-mx-6 sm:px-6 overflow-x-auto [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,transparent,#000_18px,#000_calc(100%-18px),transparent)]" aria-label="Admin sections">
          <div className="inline-flex gap-1 rounded-full bg-ink/[0.05] p-1" role="tablist">
            {tabs.map((t) => {
              const on = tab === t.key;
              return (
                <button key={t.key} type="button" role="tab" aria-selected={on} ref={on ? (el) => el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) : undefined} onClick={() => setTab(t.key)}
                  className={`relative shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${on ? 'text-white' : 'text-muted hover:text-ink'}`}>
                  {on && <motion.span layoutId="admin-tab" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
                  <svg className="relative" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
        >
          {tab === 'overview' && <AdminOverview onTab={setTab} />}
          {tab === 'people' && <AdminPeople />}
          {tab === 'performance' && <AdminPerformance />}
          {tab === 'followup' && <AdminFollowUp />}
          {tab === 'logs' && <AdminLogs />}
          {tab === 'system' && <AdminSystem />}
          {tab === 'setup' && <AdminSetup />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
export default Admin;
