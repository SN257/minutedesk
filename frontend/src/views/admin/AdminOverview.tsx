import { useState } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, Badge, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { Icon } from '../../shell/icons';
import {
  getActivityLog, getAdminAnalyticsOverview, getAdminAnalyticsTrends, getAdminTopUsers, getAllCentersAdmin, getBackups,
  getBroadcastHistory, getErrorLogCounts, getErrorLogs,
  type ActivityLogEntry, type AdminActiveUser, type AdminAnalyticsOverview, type AdminTrendPoint, type BackupRecordEntry,
  type BroadcastEntry, type CenterEntry, type ErrorLogEntry,
} from '../../lib/api';
import { parseLocalDate } from '../../lib/date';
import { C, ErrorNote, G, fmtBytes, timeAgo, tooltipStyle, type TabKey } from './shared';
import { ATile, ATitle, KpiTile } from './tiles';

interface OverviewData {
  ov: AdminAnalyticsOverview;
  trends: AdminTrendPoint[];
  top: AdminActiveUser[];
  counts: { open: number; inProgress: number; resolved: number; total: number } | null;
  openErrors: ErrorLogEntry[];
  activity: ActivityLogEntry[];
  backups: BackupRecordEntry[];
  broadcasts: BroadcastEntry[];
  centers: CenterEntry[];
}

const loadOverview = async (): Promise<OverviewData> => {
  const [ov, trends, top, counts, openErrors, activity, backups, broadcasts, centers] = await Promise.all([
    getAdminAnalyticsOverview(),
    getAdminAnalyticsTrends(14),
    getAdminTopUsers(5).catch(() => [] as AdminActiveUser[]),
    getErrorLogCounts().catch(() => null),
    getErrorLogs({ status: 'open' }).catch(() => [] as ErrorLogEntry[]),
    getActivityLog(8).catch(() => [] as ActivityLogEntry[]),
    getBackups().catch(() => [] as BackupRecordEntry[]),
    getBroadcastHistory().catch(() => [] as BroadcastEntry[]),
    getAllCentersAdmin().catch(() => [] as CenterEntry[]),
  ]);
  return { ov, trends, top, counts, openErrors, activity, backups, broadcasts, centers };
};

const METHOD_TONE: Record<string, 'good' | 'brand' | 'warn' | 'bad' | 'neutral'> = { GET: 'neutral', POST: 'good', PUT: 'brand', PATCH: 'brand', DELETE: 'bad' };

type Series = 'Meetings' | 'Board cards' | 'Sign-ups';
const SERIES: { key: Series; color: string; dash?: string }[] = [
  { key: 'Meetings', color: C.brand },
  { key: 'Board cards', color: C.ink },
  { key: 'Sign-ups', color: C.muted, dash: '4 3' },
];

const AdminOverview = ({ onTab }: { onTab: (t: TabKey) => void }) => {
  const { data, loading, error, reload } = useAsync(loadOverview, []);
  const [show, setShow] = useState<Record<Series, boolean>>({ Meetings: true, 'Board cards': true, 'Sign-ups': false });

  const openTickets = data?.counts?.open ?? data?.openErrors.length ?? null;
  const chart = (data?.trends ?? []).map((t) => ({
    name: parseLocalDate(t.day.slice(0, 10)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Meetings: t.meetings,
    'Board cards': t.cards,
    'Sign-ups': t.signups,
  }));
  const maxTop = Math.max(1, ...(data?.top ?? []).map((t) => t.actionCount));
  const lastBackup = data?.backups[0];
  const lastBroadcast = data?.broadcasts[0];
  const activeCenters = data?.centers.filter((c) => c.isActive).length ?? 0;
  const ov = data?.ov;
  const total14 = chart.reduce((n, d) => n + d.Meetings + d['Board cards'], 0);

  return (
    <Stagger className="space-y-3 sm:space-y-5">
      {error && <ErrorNote message={error} onRetry={reload} />}

      {/* Figures */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-5">
        <KpiTile icon={G.users} label="People" value={ov ? ov.totalUsers : null} sub={ov ? `${ov.superAdmins} super admin${ov.superAdmins === 1 ? '' : 's'}` : undefined} glow="brand" onClick={() => onTab('people')} />
        <KpiTile icon={G.bolt} label="Active this week" value={ov ? ov.activeUsers7d : null} sub={ov ? `${ov.activeUsers30d} in 30 days` : undefined} glow="good" onClick={() => onTab('performance')} />
        <KpiTile icon={Icon.meetings(18)} label="Meetings" value={ov ? ov.totalMeetings : null} sub={ov ? `${ov.totalCards} board cards` : undefined} glow="brand" />
        <KpiTile icon={Icon.tasks(18)} label="Tasks" value={ov ? ov.totalTasks : null} sub={ov ? `${ov.activeCards} cards active` : undefined} glow="warn" />
        <KpiTile icon={Icon.worklog(18)} label="Work logs" value={ov ? ov.totalWorkLogs : null} glow="good" />
        <KpiTile icon={G.building} label="Centers" value={data ? data.centers.length : null} sub={data ? `${activeCenters} active` : undefined} glow="warn" onClick={() => onTab('setup')} />
      </div>

      {/* Growth + most active */}
      <div className="grid xl:grid-cols-12 gap-3 sm:gap-5">
        <ATile className="xl:col-span-8" glow="brand">
          <ATitle
            icon={Icon.reports(16)}
            right={
              <div className="flex flex-wrap gap-1.5">
                {SERIES.map((s) => (
                  <button key={s.key} type="button" onClick={() => setShow((p) => ({ ...p, [s.key]: !p[s.key] }))} aria-pressed={show[s.key]}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${show[s.key] ? 'bg-ink/[0.08] text-ink' : 'text-muted/60 hover:text-ink'}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: show[s.key] ? s.color : C.line }} />{s.key}
                  </button>
                ))}
              </div>
            }
          >
            Growth · last 14 days
          </ATitle>
          {!loading && chart.length > 0 && (
            <p className="flex items-end gap-3 mb-2"><span className="text-5xl font-extrabold tracking-tight tabular-nums leading-none">{total14}</span><span className="pb-1 text-sm font-bold text-ink-2">meetings and cards added</span></p>
          )}
          {loading ? (
            <Skeleton className="h-64" />
          ) : chart.length === 0 ? (
            <Empty icon="📈" title="No activity yet" hint="Once people start using the app, growth shows up here." />
          ) : (
            <div className="h-64 -ml-3 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {SERIES.map((s, i) => (
                      <linearGradient key={s.key} id={`ov-g${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} width={34} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: C.line }} />
                  {SERIES.map((s, i) => (
                    <Area key={s.key} hide={!show[s.key]} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} fill={`url(#ov-g${i})`} animationDuration={900} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ATile>

        <ATile className="xl:col-span-4" glow="good">
          <ATitle icon={G.bolt}>Most active</ATitle>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (data?.top.length ?? 0) === 0 ? (
            <Empty icon="🌱" title="Nobody yet" hint="Activity will rank people here." />
          ) : (
            <ul className="space-y-4">
              {data!.top.map((t, i) => (
                <li key={t.userId} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs font-extrabold text-muted tabular-nums">{i + 1}</span>
                  <Avatar name={t.userEmail} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{t.userEmail || 'Unknown'}</p>
                      <span className="text-xs font-bold tabular-nums text-ink-2">{t.actionCount}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink/[0.07] mt-1.5 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(t.actionCount / maxTop) * 100}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-brand" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ATile>
      </div>

      {/* Activity, tickets, backup, announcement */}
      <div className="grid xl:grid-cols-12 gap-3 sm:gap-5">
        <ATile className="xl:col-span-5" glow="brand">
          <ATitle icon={Icon.worklog(16)} right={<Button size="sm" variant="ghost" onClick={() => onTab('logs')}>See all</Button>}>Recent activity</ATitle>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : (data?.activity.length ?? 0) === 0 ? (
            <Empty icon="🍃" title="Quiet so far" hint="Actions taken in the app will appear here." />
          ) : (
            <ul className="divide-y divide-line/70">
              {data!.activity.map((a) => (
                <li key={a.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3 min-w-0">
                  <Badge tone={METHOD_TONE[a.method] || 'neutral'}>{a.method}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-ink-2 truncate">{a.path}</p>
                    <p className="text-[11px] text-muted truncate">{a.userEmail || 'anonymous'}</p>
                  </div>
                  <span className="text-[11px] text-muted whitespace-nowrap">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </ATile>

        <ATile className="xl:col-span-4" glow={openTickets ? 'bad' : 'good'}>
          <ATitle
            icon={G.board}
            right={
              <>
                {data?.counts && <Badge tone={data.counts.open ? 'bad' : 'good'}>{data.counts.open} open</Badge>}
                <Button size="sm" variant="ghost" onClick={() => onTab('logs')}>Triage</Button>
              </>
            }
          >
            Open tickets
          </ATitle>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11" />)}</div>
          ) : (data?.openErrors.length ?? 0) === 0 ? (
            <div className="flex-1 grid place-items-center text-center py-4"><div><p className="text-3xl mb-2">🎉</p><p className="font-bold">No open tickets</p><p className="text-xs text-muted mt-0.5">Nothing is broken right now.</p></div></div>
          ) : (
            <ul className="divide-y divide-line/70">
              {data!.openErrors.slice(0, 5).map((e) => (
                <li key={e.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3 min-w-0">
                  <Badge tone={e.source === 'backend' ? 'dark' : 'brand'}>{e.source}</Badge>
                  <p className="text-sm text-ink-2 flex-1 min-w-0 line-clamp-2 break-words">{e.message}</p>
                  <span className="text-[11px] text-muted whitespace-nowrap pt-0.5">{timeAgo(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </ATile>

        <div className="xl:col-span-3 grid gap-3 sm:gap-5">
          <ATile glow="good" onClick={() => onTab('system')}>
            <ATitle icon={G.db}>Last backup</ATitle>
            {loading ? <Skeleton className="h-12" /> : lastBackup ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-extrabold tracking-tight">{timeAgo(lastBackup.createdAt)}</p>
                  <p className="text-xs text-muted truncate">{lastBackup.manual ? 'Manual' : 'Scheduled'} · {fmtBytes(lastBackup.sizeBytes)}</p>
                </div>
                <Badge tone={lastBackup.status === 'success' ? 'good' : 'bad'}>{lastBackup.status === 'success' ? 'Saved' : 'Failed'}</Badge>
              </div>
            ) : <p className="text-sm text-muted">No backups yet. Run one from System.</p>}
          </ATile>
          <ATile glow="warn" onClick={() => onTab('system')}>
            <ATitle icon={G.send}>Last announcement</ATitle>
            {loading ? <Skeleton className="h-12" /> : lastBroadcast ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-extrabold tracking-tight truncate">{lastBroadcast.title}</p>
                  <p className="text-xs text-muted truncate">{timeAgo(lastBroadcast.createdAt)} · reached {lastBroadcast.recipientCount}</p>
                </div>
                <Badge tone="neutral">{lastBroadcast.audience === 'all' ? 'Everyone' : lastBroadcast.audience === 'user' ? 'Users' : 'Admins'}</Badge>
              </div>
            ) : <p className="text-sm text-muted">Nothing sent yet. Share news from System.</p>}
          </ATile>
        </div>
      </div>
    </Stagger>
  );
};
export default AdminOverview;
