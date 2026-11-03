import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { staggerContainer } from './kit/motion';
import { parseLocalDate } from '../../utils/date';
import {
  getAdminUsersOverview,
  getAdminUserDetail,
  type AdminUserSummary,
  type AdminUserDetail,
} from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';

const PIE_COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

const TIMELINESS_VARIANT: Record<string, 'success' | 'info' | 'danger'> = { early: 'success', onTime: 'info', late: 'danger' };
const TIMELINESS_LABEL: Record<string, string> = { early: 'Early', onTime: 'On Time', late: 'Late' };
const TimelinessBadge = ({ value }: { value: 'early' | 'onTime' | 'late' | null }) =>
  value ? <Badge variant={TIMELINESS_VARIANT[value]}>{TIMELINESS_LABEL[value]}</Badge> : null;

const rateColor = (rate: number, good = 80, warn = 50) => (rate >= good ? '#059669' : rate >= warn ? '#d97706' : '#e11d48');

const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return 'never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// createdAt/timestamp fields — real point-in-time values, safe to parse directly.
const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
// Pure DATE columns (meeting date, due dates, work-log date) — must parse as local calendar
// date, not UTC, or timezones behind UTC show the previous day.
const fmtDate = (dateStr?: string) => (dateStr ? parseLocalDate(dateStr.slice(0, 10)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

const Spinner = ({ className = 'py-16' }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
  </div>
);

// Icons for the merged timeline feed.
const ICONS = {
  meeting: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  ),
  task: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  card: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  ),
  worklog: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  activity: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  ),
};

// Circular progress ring — the centerpiece of the profile hero, replacing plain number tiles.
const Ring = ({ value, label, sub, size = 108 }: { value: number | null; label: string; sub?: string; size?: number }) => {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value ?? 0;
  const color = value === null ? '#cbd5e1' : rateColor(pct);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (Math.min(pct, 100) / 100) * circumference }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-slate-900 tabular-nums">{value === null ? '—' : `${value}%`}</span>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-700 mt-2 text-center">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 text-center mt-0.5">{sub}</p>}
    </div>
  );
};

const MiniDonut = ({ title, data }: { title: string; data: { label: string; count: number }[] }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <GlassPanel className="p-5">
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">No data yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="label" innerRadius={35} outerRadius={58} paddingAngle={3}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
            {data.map((d, i) => (
              <div key={d.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {d.label} ({d.count})
              </div>
            ))}
          </div>
        </>
      )}
    </GlassPanel>
  );
};

type TimelineEntry = {
  key: string;
  date: string;
  kind: keyof typeof ICONS;
  iconBg: string;
  title: string;
  sub?: string;
  badge?: React.ReactNode;
};

const buildTimeline = (detail: AdminUserDetail): TimelineEntry[] => {
  const items: TimelineEntry[] = [];

  detail.meetings.recent.forEach((m) =>
    items.push({
      key: `meeting-${m.id}`,
      date: m.date,
      kind: 'meeting',
      iconBg: 'bg-gradient-to-br from-slate-700 to-slate-950',
      title: `Logged meeting — ${m.meetingType || 'Unspecified'}`,
      sub: [m.center, m.place].filter(Boolean).join(' · ') || undefined,
    }),
  );

  detail.tasks.recent.forEach((t) =>
    items.push({
      key: `task-${t.id}`,
      date: t.dueDate || t.createdAt,
      kind: 'task',
      iconBg: t.completed ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-slate-500 to-slate-700',
      title: t.title,
      sub: t.completed ? 'Task completed' : `Task ${t.status}`,
      badge: <TimelinessBadge value={t.timeliness} />,
    }),
  );

  detail.cards.recent.forEach((c) =>
    items.push({
      key: `card-${c.id}`,
      date: c.dueDate || detail.user.createdAt,
      kind: 'card',
      iconBg: c.archived ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-slate-500 to-slate-700',
      title: c.title,
      sub: c.archived ? 'Board card completed' : `Board card — ${c.priority || 'no priority'}`,
      badge: <TimelinessBadge value={c.timeliness} />,
    }),
  );

  detail.workLogs.recent.forEach((w) =>
    items.push({
      key: `worklog-${w.date}`,
      date: w.date,
      kind: 'worklog',
      iconBg: w.todayOnLeave || w.todayHoliday ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-slate-600 to-slate-900',
      title: w.todayOnLeave ? 'Marked on leave' : w.todayHoliday ? 'Marked holiday' : 'Work log submitted',
      sub: w.todayWork || undefined,
    }),
  );

  detail.activity.recent.forEach((a, i) =>
    items.push({
      key: `activity-${i}`,
      date: a.createdAt,
      kind: 'activity',
      iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600',
      title: `${a.method} ${a.path}`,
    }),
  );

  return items.filter((i) => !!i.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const AdminUserActivity = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('user'));
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await getAdminUsersOverview();
        setUsers(u);
        const fromUrl = searchParams.get('user');
        if (fromUrl && u.some((x) => x.id === fromUrl)) setSelectedId(fromUrl);
        else if (u.length > 0) setSelectedId(u[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectUser = (id: string) => {
    setSelectedId(id);
    setSearchParams({ user: id }, { replace: true });
  };

  useEffect(() => {
    if (!selectedId) return;
    setLoadingDetail(true);
    getAdminUserDetail(selectedId)
      .then(setDetail)
      .catch((err) => console.error(err))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const filtered = users.filter(
    (u) => (u.name || '').toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const timeline = useMemo(() => (detail ? buildTimeline(detail) : []), [detail]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-10">
      <PageHeader title="User Activity" subtitle="Every meeting, task, card and work log, broken down per user." />

      {/* Search + horizontal avatar-ring switcher */}
      <GlassPanel className="p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 mb-4"
        />
        {loadingList ? (
          <Spinner className="py-8" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No users match.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-1 px-1">
            {filtered.map((u) => {
              const active = selectedId === u.id;
              const ringColor = rateColor(u.workLogCompliance.rate, 90, 70);
              return (
                <button key={u.id} onClick={() => selectUser(u.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-20 group">
                  <div
                    className={`w-16 h-16 rounded-full p-[3px] transition-transform group-hover:scale-105 ${active ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                    style={{ background: `conic-gradient(${ringColor} ${u.workLogCompliance.rate}%, #e2e8f0 0)` }}
                  >
                    <div className="w-full h-full rounded-full bg-white p-[2px]">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-950 flex items-center justify-center text-white font-black text-base">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold truncate w-full text-center ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                    {(u.name || u.email).split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </GlassPanel>

      <AnimatePresence mode="wait">
        {loadingDetail || !detail ? (
          <GlassPanel key="loading" className="py-24 text-center">
            <Spinner className="" />
          </GlassPanel>
        ) : (
          <motion.div key={detail.user.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
            {/* Profile hero with activity rings */}
            <GlassPanel className="p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-950 flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
                    {(detail.user.name || detail.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xl font-black text-slate-900 truncate">{detail.user.name || <span className="italic text-slate-400 font-normal">No name</span>}</p>
                      <Badge variant={detail.user.role === 'super_admin' ? 'navy' : 'neutral'}>{detail.user.role}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{detail.user.email}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Joined {fmtDateTime(detail.user.createdAt)}
                      {detail.user.timezone && ` · ${detail.user.timezone}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center lg:justify-end gap-6 flex-shrink-0">
                  <Ring
                    value={detail.tasks.total > 0 ? Math.round((detail.tasks.completed / detail.tasks.total) * 100) : null}
                    label="Task Completion"
                    sub={`${detail.tasks.completed}/${detail.tasks.total} done`}
                  />
                  <Ring
                    value={(() => {
                      const t = detail.tasks.timeliness;
                      const c = detail.cards.timeliness;
                      const total = t.early + t.onTime + t.late + c.early + c.onTime + c.late;
                      return total > 0 ? Math.round(((t.early + t.onTime + c.early + c.onTime) / total) * 100) : null;
                    })()}
                    label="On-Time Rate"
                    sub="tasks & cards"
                  />
                  <Ring value={detail.workLogs.compliance.rate} label="Log Compliance" sub={`${detail.workLogs.compliance.missedDays} missed`} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">{detail.meetings.total}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meetings</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">{detail.cards.active}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Cards</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">{detail.workLogs.total}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Work Logs</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">{detail.activity.last7d}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active (7d)</p>
                </div>
              </div>
            </GlassPanel>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MiniDonut title="Meetings by Type" data={detail.meetings.byType} />
              <MiniDonut title="Tasks by Status" data={detail.tasks.byStatus} />
              <MiniDonut title="Cards by Priority" data={detail.cards.byPriority} />
            </div>

            {detail.workLogs.compliance.missedRecentDates.length > 0 && (
              <GlassPanel className="p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Missed Work Log Days (Last 30 Days)</h3>
                </div>
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  {detail.workLogs.compliance.missedRecentDates.map((d) => (
                    <span key={d} className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {fmtDate(d)}
                    </span>
                  ))}
                </div>
              </GlassPanel>
            )}

            {/* Unified chronological activity timeline — replaces separate per-category tables */}
            <GlassPanel className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Activity Timeline</h3>
                <p className="text-xs text-slate-500 mt-0.5">Meetings, tasks, cards, work logs, and platform actions, in one story.</p>
              </div>
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-500 px-5 py-10 text-center">No activity recorded yet.</p>
              ) : (
                <div className="relative px-5 py-5">
                  <div className="absolute left-[31px] top-5 bottom-5 w-px bg-slate-200" />
                  <div className="space-y-5">
                    {timeline.map((item) => (
                      <div key={item.key} className="relative flex items-start gap-4">
                        <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0 ${item.iconBg}`}>
                          {ICONS[item.kind]}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                            {item.badge}
                          </div>
                          {item.sub && <p className="text-xs text-slate-500 truncate mt-0.5">{item.sub}</p>}
                        </div>
                        <span className="text-[11px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                          {item.kind === 'activity' ? timeAgo(item.date) : fmtDate(item.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminUserActivity;
