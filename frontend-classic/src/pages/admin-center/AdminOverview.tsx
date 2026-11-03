import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { staggerContainer } from './kit/motion';
import { useAuth } from '../../contexts/AuthContext';
import { parseLocalDate } from '../../utils/date';
import {
  getAdminAnalyticsOverview,
  getAdminAnalyticsTrends,
  getAdminTopUsers,
  getErrorLogCounts,
  getErrorLogs,
  getActivityLog,
  getSystemHealth,
  getBackups,
  getBroadcastHistory,
  getAllCentersAdmin,
  getRoles,
  type AdminAnalyticsOverview,
  type AdminTrendPoint,
  type AdminActiveUser,
  type ErrorLogEntry,
  type ActivityLogEntry,
  type SystemHealth,
  type BroadcastEntry,
  type CenterEntry,
  type RoleEntry,
} from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import StatTile from './kit/StatTile';
import Badge from './kit/Badge';

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Working late';
};

const AUDIENCE_LABEL: Record<string, string> = {
  all: 'Everyone',
  user: 'Users only',
  super_admin: 'Super admins',
};

const HeroPill = ({ ok, label, detail }: { ok: boolean; label: string; detail: string }) => (
  <div className="flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-full pl-2.5 pr-3.5 py-1.5">
    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
    <span className="text-xs font-semibold text-white">{label}</span>
    <span className="text-xs text-slate-400">{detail}</span>
  </div>
);

const AdminOverview = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<AdminTrendPoint[]>([]);
  const [topUsers, setTopUsers] = useState<AdminActiveUser[]>([]);
  const [errorCounts, setErrorCounts] = useState<{ open: number; inProgress: number; resolved: number; total: number } | null>(null);
  const [recentErrors, setRecentErrors] = useState<ErrorLogEntry[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastBroadcast, setLastBroadcast] = useState<BroadcastEntry | null>(null);
  const [centers, setCenters] = useState<CenterEntry[]>([]);
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ov, tr, tu, ec, re, ra, h, backups, broadcasts, ctrs, rls] = await Promise.all([
          getAdminAnalyticsOverview(),
          getAdminAnalyticsTrends(14),
          getAdminTopUsers(5),
          getErrorLogCounts(),
          getErrorLogs({ status: 'open' }),
          getActivityLog(6),
          getSystemHealth().catch(() => null),
          getBackups().catch(() => []),
          getBroadcastHistory().catch(() => []),
          getAllCentersAdmin().catch(() => []),
          getRoles().catch(() => []),
        ]);
        setOverview(ov);
        setTrends(tr);
        setTopUsers(tu);
        setErrorCounts(ec);
        setRecentErrors(re.slice(0, 5));
        setRecentActivity(ra);
        setHealth(h);
        if (backups.length > 0) setLastBackup(backups[0].createdAt);
        if (broadcasts.length > 0) setLastBroadcast(broadcasts[0]);
        setCenters(ctrs);
        setRoles(rls);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-9 h-9 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const chartData = trends.map((t) => ({
    name: parseLocalDate(t.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Signups: t.signups,
    Meetings: t.meetings,
  }));

  const activeCenters = centers.filter((c) => c.isActive).length;
  const maxAction = Math.max(...topUsers.map((u) => u.actionCount), 1);
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-black p-8">
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-slate-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-10 w-72 h-72 bg-slate-700/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-400">{greeting()}, {firstName}</p>
            <h1 className="text-3xl font-black text-white mt-1 tracking-tight">Command Center</h1>
            <p className="text-sm text-slate-400 mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} — everything running across the platform, at a glance.
            </p>
          </div>
          <Link
            to="/admin-center/broadcast"
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-lg flex-shrink-0"
          >
            + Broadcast
          </Link>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2.5">
          <HeroPill ok={!!health?.db.ok} label="Database" detail={health?.db.ok ? `${health.db.latencyMs}ms` : 'down'} />
          <HeroPill ok={!!health?.mail.configured} label="Mail" detail={health?.mail.configured ? 'configured' : 'not set up'} />
          <HeroPill ok={true} label="Uptime" detail={health ? `${Math.floor(health.uptimeSeconds / 3600)}h ${Math.floor((health.uptimeSeconds % 3600) / 60)}m` : '—'} />
          <Link to="/admin-center/health" className="text-xs font-bold text-slate-300 hover:text-white transition-colors ml-1">
            Full diagnostics →
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile
          label="Total Users"
          value={overview?.totalUsers ?? 0}
          sub={`${overview?.superAdmins ?? 0} super admin${overview?.superAdmins === 1 ? '' : 's'}`}
          trend={trends.map((t) => t.signups)}
          to="/admin-center/users"
          iconBg="bg-gradient-to-br from-slate-700 to-slate-950"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatTile
          label="Active (7d)"
          value={overview?.activeUsers7d ?? 0}
          sub={`${overview?.activeUsers30d ?? 0} in last 30d`}
          to="/admin-center/analytics"
          iconBg="bg-gradient-to-br from-slate-700 to-slate-950"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatTile
          label="Total Meetings"
          value={overview?.totalMeetings ?? 0}
          trend={trends.map((t) => t.meetings)}
          to="/admin-center/analytics"
          iconBg="bg-gradient-to-br from-slate-700 to-slate-950"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatTile
          label="Active Tasks"
          value={overview?.activeCards ?? 0}
          sub={`${overview?.archivedCards ?? 0} completed`}
          trend={trends.map((t) => t.cards)}
          to="/admin-center/analytics"
          iconBg="bg-gradient-to-br from-slate-700 to-slate-950"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatTile
          label="Total Work Logs"
          value={overview?.totalWorkLogs ?? 0}
          to="/admin-center/analytics"
          iconBg="bg-gradient-to-br from-slate-700 to-slate-950"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatTile
          label="Centers"
          value={activeCenters}
          sub={`${centers.length} total · ${roles.length} roles`}
          to="/admin-center/centers"
          iconBg="bg-gradient-to-br from-slate-700 to-slate-950"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      {/* Growth chart */}
      <GlassPanel className="p-6">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Growth — Last 14 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="overviewSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="overviewMeetings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#0f172a' }} />
            <Area type="monotone" dataKey="Signups" stroke="#0f172a" fill="url(#overviewSignups)" strokeWidth={2} />
            <Area type="monotone" dataKey="Meetings" stroke="#64748b" fill="url(#overviewMeetings)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: activity + leaderboard */}
        <div className="lg:col-span-2 space-y-6">
          <GlassPanel className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Recent Activity</h2>
              <Link to="/admin-center/activity" className="text-xs font-bold text-slate-600 hover:text-slate-900">View all →</Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500 px-5 py-10 text-center">No activity yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        <span className="font-semibold text-slate-900">{a.userEmail || 'anonymous'}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="font-mono text-xs text-slate-500">{a.method} {a.path}</span>
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">{timeAgo(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Most Active Users</h2>
              <Link to="/admin-center/analytics" className="text-xs font-bold text-slate-600 hover:text-slate-900">Full report →</Link>
            </div>
            {topUsers.length === 0 ? (
              <p className="text-sm text-slate-500 px-5 py-10 text-center">No activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {topUsers.map((u, i) => (
                  <div key={u.userId} className="px-5 py-3 flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                        i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.userEmail || u.userId}</p>
                      <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-900"
                          style={{ width: `${(u.actionCount / maxAction) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-black text-slate-900 tabular-nums flex-shrink-0">{u.actionCount}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Right: tickets, backup, broadcast, composition */}
        <div className="space-y-6">
          <GlassPanel className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Open Tickets
                {errorCounts && errorCounts.open > 0 && <Badge variant="danger">{errorCounts.open}</Badge>}
              </h2>
              <Link to="/admin-center/errors" className="text-xs font-bold text-slate-600 hover:text-slate-900">View all →</Link>
            </div>
            {recentErrors.length === 0 ? (
              <p className="text-sm text-slate-500 px-5 py-8 text-center">No open errors 🎉</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentErrors.map((e) => (
                  <div key={e.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={e.source === 'backend' ? 'danger' : 'warning'}>{e.source}</Badge>
                      <span className="text-[11px] text-slate-400">{timeAgo(e.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{e.message}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Last Broadcast</h2>
            {lastBroadcast ? (
              <>
                <p className="text-base font-black text-slate-900 truncate">{lastBroadcast.title}</p>
                <p className="text-xs text-slate-500 mt-1">{AUDIENCE_LABEL[lastBroadcast.audience] ?? lastBroadcast.audience} · {timeAgo(lastBroadcast.createdAt)}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">None sent yet.</p>
            )}
            <Link to="/admin-center/broadcast" className="inline-block mt-3 text-xs font-bold text-slate-600 hover:text-slate-900">
              Send one →
            </Link>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Last Backup</h2>
            <p className="text-2xl font-black text-slate-900">
              {lastBackup ? new Date(lastBackup).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'None yet'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lastBackup ? new Date(lastBackup).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : health?.backupSchedule}
            </p>
            <Link to="/admin-center/backups" className="inline-block mt-3 text-xs font-bold text-slate-600 hover:text-slate-900">
              Manage backups →
            </Link>
          </GlassPanel>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminOverview;
