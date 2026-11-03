import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';
import {
  getAdminAnalyticsOverview,
  getAdminAnalyticsTrends,
  getAdminUsersOverview,
  getAdminBreakdowns,
  type AdminAnalyticsOverview,
  type AdminTrendPoint,
  type AdminUserSummary,
  type AdminBreakdowns,
} from '../../services/api';
import { parseLocalDate, getLocalDateString } from '../../utils/date';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';
import { motion } from 'framer-motion';
import { staggerContainer } from './kit/motion';

const RANGE_OPTIONS = [7, 30, 90];
const PIE_COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

type SortKey = 'score' | 'name' | 'meetingsCount' | 'tasksCompleted' | 'cardsCount' | 'workLogsCount' | 'lastActive' | 'onTimeRate' | 'logCompliance';

const onTimeRate = (u: AdminUserSummary): number | null => {
  const total = u.timeliness.early + u.timeliness.onTime + u.timeliness.late;
  return total > 0 ? Math.round(((u.timeliness.early + u.timeliness.onTime) / total) * 100) : null;
};

const score = (u: AdminUserSummary) => {
  const base = u.meetingsCount + u.cardsCount + u.workLogsCount + u.tasksCompleted * 2;
  const otr = onTimeRate(u);
  const timelinessBonus = otr !== null ? (otr - 50) / 10 : 0;
  const complianceBonus = (u.workLogCompliance.rate - 50) / 10;
  return Math.round(base + timelinessBonus + complianceBonus);
};

const timeAgo = (iso: string | null) => {
  if (!iso) return 'never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const SortHeader = ({ label, sortKey, active, dir, onClick, align = 'left' }: { label: string; sortKey: SortKey; active: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void; align?: 'left' | 'right' }) => (
  <th
    onClick={() => onClick(sortKey)}
    className={`px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      {active === sortKey && <span className="text-slate-900">{dir === 'desc' ? '↓' : '↑'}</span>}
    </span>
  </th>
);

interface QuadrantPoint {
  id: string;
  name: string;
  x: number; // on-time rate %
  y: number; // work-log compliance %
  z: number; // activity volume, drives bubble size
  isTop: boolean;
}

const QUADRANT_LABELS = [
  { label: 'Elite', sub: 'on-time · reliable', x: '78%', y: '6%', align: 'right' as const },
  { label: 'Reliable', sub: 'logs regularly, slower delivery', x: '4%', y: '6%', align: 'left' as const },
  { label: 'Fast Mover', sub: 'on-time, inconsistent logging', x: '78%', y: '78%', align: 'right' as const },
  { label: 'Needs Attention', sub: 'behind on both fronts', x: '4%', y: '78%', align: 'left' as const },
];

const QuadrantDot = (props: any) => {
  const { cx, cy, payload } = props;
  const r = Math.max(6, Math.min(22, Math.sqrt(payload.z) * 3));
  if (payload.isTop) {
    return (
      <g style={{ cursor: 'pointer' }}>
        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 2" />
        <circle cx={cx} cy={cy} r={r} fill="#0f172a" stroke="#f59e0b" strokeWidth={2} />
        <text x={cx} y={cy - r - 9} textAnchor="middle" fontSize={10} fontWeight={800} fill="#b45309">TOP</text>
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={r} fill="#0f172a" fillOpacity={0.75} stroke="#0f172a" strokeWidth={1} style={{ cursor: 'pointer' }} />;
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<AdminTrendPoint[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [breakdowns, setBreakdowns] = useState<AdminBreakdowns | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = async (days: number) => {
    setLoading(true);
    try {
      const [ov, tr, us, bd] = await Promise.all([
        getAdminAnalyticsOverview(),
        getAdminAnalyticsTrends(days),
        getAdminUsersOverview(),
        getAdminBreakdowns(),
      ]);
      setOverview(ov);
      setTrends(tr);
      setUsers(us);
      setBreakdowns(bd);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(range); }, [range]);

  const exportCsv = () => {
    const header = 'Day,Signups,Meetings,Tasks\n';
    const rows = trends.map((t) => `${t.day},${t.signups},${t.meetings},${t.cards}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_trends_${range}d_${getLocalDateString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportUsersCsv = () => {
    const header = 'Name,Email,Role,Meetings,Tasks Completed,Tasks Total,Cards,Work Logs,Last Active,Score\n';
    const rows = sortedUsers
      .map((u) => `"${u.name || ''}",${u.email},${u.role},${u.meetingsCount},${u.tasksCompleted},${u.tasksCount},${u.cardsCount},${u.workLogsCount},${u.lastActive || ''},${score(u)}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_performance_${getLocalDateString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((u) => `${u.name || ''} ${u.email}`.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
    const dir = sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'name':
          av = (a.name || a.email).toLowerCase();
          bv = (b.name || b.email).toLowerCase();
          return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
        case 'lastActive':
          av = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          bv = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          break;
        case 'score':
          av = score(a);
          bv = score(b);
          break;
        case 'onTimeRate':
          av = onTimeRate(a) ?? -1;
          bv = onTimeRate(b) ?? -1;
          break;
        case 'logCompliance':
          av = a.workLogCompliance.rate;
          bv = b.workLogCompliance.rate;
          break;
        default:
          av = a[sortKey] as number;
          bv = b[sortKey] as number;
      }
      return ((av as number) - (bv as number)) * dir;
    });
    return list;
  }, [filteredUsers, sortKey, sortDir]);

  if (loading && trends.length === 0) {
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
    Tasks: t.cards,
  }));

  const maxScore = Math.max(...sortedUsers.map(score), 1);

  const topUserId = users.length > 0 ? [...users].sort((a, b) => score(b) - score(a))[0].id : null;
  const quadrantData: QuadrantPoint[] = users.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    x: onTimeRate(u) ?? 0,
    y: u.workLogCompliance.rate,
    z: Math.max(u.meetingsCount + u.cardsCount + u.workLogsCount + u.tasksCompleted, 1),
    isTop: u.id === topUserId,
  }));

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-10">
      <PageHeader
        title="Analytics"
        subtitle="Cross-user activity trends, distribution, and individual performance across the platform."
        actions={
          <>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1">
              {RANGE_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${range === d ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button onClick={exportCsv} className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
              Export CSV
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: overview?.totalUsers ?? 0 },
          { label: 'Total Meetings', value: overview?.totalMeetings ?? 0 },
          { label: 'Total Tasks', value: overview?.totalTasks ?? 0 },
          { label: 'Total Work Logs', value: overview?.totalWorkLogs ?? 0 },
        ].map((s) => (
          <GlassPanel key={s.label} className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{s.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{s.value}</p>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel className="p-6">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Growth — Last {range} Days</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="analyticsSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#0f172a' }} />
            <Area type="monotone" dataKey="Signups" stroke="#0f172a" fill="url(#analyticsSignups)" strokeWidth={2} />
            <Area type="monotone" dataKey="Meetings" stroke="#64748b" fill="#64748b" fillOpacity={0.08} strokeWidth={2} />
            <Area type="monotone" dataKey="Tasks" stroke="#94a3b8" fillOpacity={0} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="p-6">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Meetings by Type</h2>
          {breakdowns && breakdowns.meetingTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={breakdowns.meetingTypes} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {breakdowns.meetingTypes.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-16">No meetings yet.</p>
          )}
          {breakdowns && breakdowns.meetingTypes.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {breakdowns.meetingTypes.map((m, i) => (
                <div key={m.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {m.label} ({m.count})
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="p-6">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Active Tasks by Priority</h2>
          {breakdowns && breakdowns.taskPriorities.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={breakdowns.taskPriorities} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {breakdowns.taskPriorities.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-16">No active tasks yet.</p>
          )}
          {breakdowns && breakdowns.taskPriorities.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {breakdowns.taskPriorities.map((t, i) => (
                <div key={t.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {t.label} ({t.count})
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Performance Quadrant — where every user stands, at a glance */}
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Performance Quadrant</h2>
            <p className="text-xs text-slate-500 mt-0.5">On-time delivery vs. work-log discipline — bubble size is activity volume. The dashed ring marks the top overall performer.</p>
          </div>
        </div>
        {quadrantData.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-16">No users yet.</p>
        ) : (
          <div className="relative mt-4">
            <div className="pointer-events-none absolute inset-0">
              {QUADRANT_LABELS.map((q) => (
                <div
                  key={q.label}
                  className={`absolute ${q.align === 'right' ? 'text-right' : 'text-left'}`}
                  style={{ left: q.x, top: q.y, transform: q.align === 'right' ? 'translateX(-100%)' : undefined }}
                >
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300">{q.label}</p>
                  <p className="hidden sm:block text-[10px] text-slate-300">{q.sub}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name="On-Time %" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Log Compliance %" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <ZAxis type="number" dataKey="z" range={[60, 500]} />
                <ReferenceLine x={50} stroke="#cbd5e1" strokeDasharray="4 4" />
                <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                  formatter={(value: number, key: string) => [`${value}${key === 'z' ? '' : '%'}`, key === 'x' ? 'On-Time' : key === 'y' ? 'Log Compliance' : 'Activity']}
                  labelFormatter={() => ''}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as QuadrantPoint;
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-sm">
                        <p className="font-bold text-slate-900 mb-1">{p.name}{p.isTop && <span className="ml-1 text-amber-600">★ Top</span>}</p>
                        <p className="text-slate-500">On-time <span className="font-bold text-slate-900">{p.x}%</span></p>
                        <p className="text-slate-500">Log compliance <span className="font-bold text-slate-900">{p.y}%</span></p>
                        <p className="text-slate-500">Activity volume <span className="font-bold text-slate-900">{p.z}</span></p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={quadrantData}
                  shape={QuadrantDot}
                  onClick={(data: any) => navigate(`/admin-center/user-activity?user=${data.id}`)}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassPanel>

      {/* User Performance leaderboard */}
      <GlassPanel className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Full Leaderboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">Every user's meetings, tasks, cards, and work logs — click a row for the full breakdown.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 w-48"
            />
            <button onClick={exportUsersCsv} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap">
              Export CSV
            </button>
          </div>
        </div>

        {sortedUsers.length === 0 ? (
          <p className="text-sm text-slate-500 px-6 py-10 text-center">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">Rank</th>
                  <SortHeader label="User" sortKey="name" active={sortKey} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="Meetings" sortKey="meetingsCount" active={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                  <SortHeader label="Tasks Done" sortKey="tasksCompleted" active={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                  <SortHeader label="Cards" sortKey="cardsCount" active={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                  <SortHeader label="Work Logs" sortKey="workLogsCount" active={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                  <SortHeader label="On-Time %" sortKey="onTimeRate" active={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                  <SortHeader label="Log Compliance" sortKey="logCompliance" active={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                  <SortHeader label="Last Active" sortKey="lastActive" active={sortKey} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="Score" sortKey="score" active={sortKey} dir={sortDir} onClick={handleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u, i) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin-center/user-activity?user=${u.id}`)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                          i === 0 && sortKey === 'score' && sortDir === 'desc' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-950 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate max-w-[160px]">{u.name || u.email}</p>
                          {u.role === 'super_admin' && <Badge variant="navy">Admin</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">{u.meetingsCount}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900 tabular-nums">{u.tasksCompleted}</span>
                      <span className="text-slate-400 text-xs"> /{u.tasksCount}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">{u.cardsCount}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">{u.workLogsCount}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {(() => {
                        const otr = onTimeRate(u);
                        if (otr === null) return <span className="text-slate-300">—</span>;
                        return <span className={`font-bold tabular-nums ${otr >= 80 ? 'text-emerald-600' : otr >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{otr}%</span>;
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className={`font-bold tabular-nums ${u.workLogCompliance.rate >= 90 ? 'text-emerald-600' : u.workLogCompliance.rate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {u.workLogCompliance.rate}%
                      </span>
                      {u.workLogCompliance.missedDays > 0 && <span className="text-slate-400 text-[11px]"> ({u.workLogCompliance.missedDays} missed)</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{timeAgo(u.lastActive)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-900" style={{ width: `${(score(u) / maxScore) * 100}%` }} />
                        </div>
                        <span className="font-black text-slate-900 tabular-nums w-8 text-right">{score(u)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
};

export default AdminAnalytics;
