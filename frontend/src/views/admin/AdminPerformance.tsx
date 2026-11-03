import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber, Avatar, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { getAdminUsersOverview, type AdminUserSummary } from '../../lib/api';
import { getLocalDateString } from '../../lib/date';
import { spring } from '../../lib/motion';
import { ErrorNote, G, Pills, RefreshButton, RoleBadge, SearchBox, firstName, onTimeRate, rateTone, scoreOf, timeAgo } from './shared';
import { ATile, KpiTile } from './tiles';
import { UserDrill } from './UserDrill';

interface Row {
  u: AdminUserSummary;
  name: string;
  score: number;
  otr: number | null;
  rate: number;
  rank: number;
  last: number;
}

type Metric = 'score' | 'tasks' | 'logs' | 'otr' | 'rate';

const METRICS: { key: Metric; label: string; pct?: boolean }[] = [
  { key: 'score', label: 'Score' },
  { key: 'tasks', label: 'Tasks done' },
  { key: 'logs', label: 'Work logs' },
  { key: 'otr', label: 'On-time %', pct: true },
  { key: 'rate', label: 'Log compliance %', pct: true },
];

const valueOf = (r: Row, k: Metric | 'last'): number => {
  switch (k) {
    case 'score': return r.score;
    case 'tasks': return r.u.tasksCompleted;
    case 'logs': return r.u.workLogsCount;
    case 'otr': return r.otr ?? -1;
    case 'rate': return r.rate;
    case 'last': return r.last;
    default: return 0;
  }
};

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

const Meter = ({ label, value }: { label: string; value: number | null }) => (
  <div>
    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
      <span>{label}</span><span className="tabular-nums text-ink">{value === null ? '—' : `${value}%`}</span>
    </div>
    <span className="mt-1 block h-1.5 rounded-full bg-ink/[0.08] overflow-hidden">
      <motion.span className="block h-full rounded-full" style={{ background: rateTone(value) }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </span>
  </div>
);

/** A score ring: the arc fills in proportion to the best score on the team. */
const Ring = ({ value, max, size = 64 }: { value: number; max: number; size?: number }) => {
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-ink/10" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} strokeLinecap="round" className="stroke-brand" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - f) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <span className="absolute text-sm font-extrabold tabular-nums"><AnimatedNumber value={value} /></span>
    </span>
  );
};

/** Fixed, hand-placed sparkles so the stage always looks the same. */
const SPARKS = [[8, 18, 7], [18, 52, 5], [27, 12, 6], [36, 38, 4], [46, 8, 5], [58, 30, 7], [67, 14, 4], [76, 46, 6], [86, 20, 5], [93, 40, 7], [14, 74, 4], [88, 70, 5]];

const MEDAL: Record<number, { tint: string; ring: string; label: string }> = {
  1: { label: 'Champion', tint: 'color-mix(in srgb, var(--color-warn) 55%, transparent)', ring: 'conic-gradient(from 0deg, var(--color-warn), var(--color-brand), var(--color-good), var(--color-warn))' },
  2: { label: 'Runner-up', tint: 'color-mix(in srgb, var(--color-good) 45%, transparent)', ring: 'conic-gradient(from 0deg, var(--color-good), var(--color-brand), var(--color-good))' },
  3: { label: 'Third', tint: 'color-mix(in srgb, var(--color-brand) 40%, transparent)', ring: 'conic-gradient(from 0deg, var(--color-brand), var(--color-warn), var(--color-brand))' },
};

const Podium = ({ rows, onOpen }: { rows: Row[]; onOpen: (r: Row) => void }) => {
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean) as Row[]; // 2nd, 1st, 3rd
  const H: Record<number, number> = { 1: 150, 2: 108, 3: 80 };
  return (
    <div className="relative pt-6">
      {/* spotlight cone and drifting sparkles */}
      <motion.div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-6 w-[70%] h-[115%] rounded-[50%] blur-2xl"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-warn) 45%, transparent), color-mix(in srgb, var(--color-brand) 12%, transparent) 55%, transparent 75%)' }}
        animate={{ opacity: [0.55, 0.95, 0.55], scaleX: [0.96, 1.04, 0.96] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
      {SPARKS.map(([x, y, sz], i) => (
        <motion.span key={i} aria-hidden className="pointer-events-none absolute rounded-full bg-warn"
          style={{ left: `${x}%`, top: `${y}%`, width: sz, height: sz, boxShadow: '0 0 10px 2px color-mix(in srgb, var(--color-warn) 60%, transparent)' }}
          animate={{ opacity: [0, 1, 0], y: [0, -14, -28], scale: [0.4, 1.1, 0.4] }}
          transition={{ duration: 3 + (i % 4) * 0.7, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }} />
      ))}

      <div className="relative flex items-end justify-center gap-3 sm:gap-6">
        {order.map((r, i) => {
          const first = r.rank === 1;
          const m = MEDAL[r.rank];
          const av = first ? 76 : 58;
          return (
            <button key={r.u.id} type="button" onClick={() => onOpen(r)} className="group flex-1 max-w-[220px] min-w-0 flex flex-col items-center text-center focus-visible:outline-none">
              <motion.div
                initial={{ opacity: 0, y: -60, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 130, damping: 12, delay: 0.7 + (first ? 0.25 : i * 0.1) }}
                className="flex flex-col items-center min-w-0 w-full"
              >
                <motion.div className="relative" animate={{ y: [0, first ? -7 : -4, 0] }} transition={{ duration: first ? 3.2 : 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}>
                  {first && (
                    <motion.span aria-hidden className="absolute -top-7 left-1/2 text-2xl z-10 origin-bottom" style={{ x: '-50%' }}
                      animate={{ rotate: [-10, 10, -10], y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>👑</motion.span>
                  )}
                  <span className="relative grid place-items-center rounded-full p-[4px]" style={{ width: av + 8, height: av + 8 }}>
                    <motion.span aria-hidden className="absolute inset-0 rounded-full" style={{ background: m.ring }}
                      animate={{ rotate: 360 }} transition={{ duration: first ? 5 : 9, repeat: Infinity, ease: 'linear' }} />
                    <span className="relative rounded-full bg-white/80 p-[3px]"><Avatar name={r.name} size={av} /></span>
                  </span>
                </motion.div>
                <p className="text-sm sm:text-base font-extrabold mt-3 truncate w-full group-hover:text-brand transition-colors">{firstName(r.u)}</p>
                <p className="text-[11px] text-muted truncate w-full">{r.u.tasksCompleted} tasks done · {r.u.workLogsCount} logs</p>
              </motion.div>

              <motion.div
                initial={{ height: 0 }}
                animate={{ height: H[r.rank] }}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 120, damping: 15, delay: 0.1 + (3 - r.rank) * 0.18 }}
                className="relative mt-3 w-full rounded-t-[1.5rem] border border-white/70 border-b-0 flex flex-col items-center pt-3 overflow-hidden shadow-[inset_0_1px_0_rgb(255_255_255/0.85)]"
                style={{ background: `linear-gradient(180deg, ${m.tint}, color-mix(in srgb, ${m.tint} 15%, transparent))` }}
              >
                {/* big faded rank numeral */}
                <span aria-hidden className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7rem] leading-none font-black text-white/35 select-none">{r.rank}</span>
                {/* light sweep */}
                <motion.span aria-hidden className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-[20deg] bg-gradient-to-r from-transparent via-white/55 to-transparent"
                  animate={{ x: ['0%', '420%'] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.5 + i * 0.8, ease: 'easeInOut' }} />
                <span className="relative text-3xl sm:text-4xl font-extrabold tabular-nums leading-none"><AnimatedNumber value={r.score} /></span>
                <span className="relative text-[10px] font-extrabold uppercase tracking-[0.16em] mt-1.5 text-ink-2">{m.label}</span>
              </motion.div>
            </button>
          );
        })}
      </div>
      {/* stage floor */}
      <div aria-hidden className="h-2.5 rounded-full bg-gradient-to-r from-transparent via-ink/20 to-transparent blur-[2px] -mt-0.5" />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-2xl bg-white/40 border border-white/60 px-2.5 py-2 text-center min-w-0">
    <p className="text-base font-extrabold tabular-nums leading-none">{value}</p>
    <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted mt-1 truncate">{label}</p>
  </div>
);

const AdminPerformance = () => {
  const { data, loading, error, reload } = useAsync(getAdminUsersOverview, []);
  const [q, setQ] = useState('');
  const [metric, setMetric] = useState<Metric>('score');
  const [sel, setSel] = useState<{ id: string; name: string; lastActive: string | null } | null>(null);

  const rows: Row[] = useMemo(() => {
    const base = (data ?? []).map((u) => ({
      u, name: u.name || u.email, score: scoreOf(u), otr: onTimeRate(u), rate: u.workLogCompliance.rate, rank: 0,
      last: u.lastActive ? new Date(u.lastActive).getTime() : 0,
    }));
    [...base].sort((a, b) => b.score - a.score).forEach((r, i) => { r.rank = i + 1; });
    return base;
  }, [data]);

  const ranked = useMemo(() => [...rows].sort((a, b) => a.rank - b.rank), [rows]);
  const cards = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => !s || `${r.u.name || ''} ${r.u.email}`.toLowerCase().includes(s)).sort((a, b) => valueOf(b, metric) - valueOf(a, metric));
  }, [rows, q, metric]);

  const open = (r: Row) => setSel({ id: r.u.id, name: r.name, lastActive: r.u.lastActive });
  const maxScore = Math.max(1, ...rows.map((r) => r.score));
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const team = {
    points: rows.reduce((a, r) => a + Math.max(0, r.score), 0),
    done: rows.reduce((a, r) => a + r.u.tasksCompleted, 0),
    total: rows.reduce((a, r) => a + r.u.tasksCount, 0),
    otr: avg(rows.map((r) => r.otr)),
    rate: avg(rows.map((r) => r.rate)),
  };

  const exportCsv = () => {
    const head = 'Rank,Name,Email,Role,Score,Tasks completed,Tasks total,Work logs,On-time %,Log compliance %,Last active\n';
    const body = ranked
      .map((r) => [r.rank, r.u.name || '', r.u.email, r.u.role, r.score, r.u.tasksCompleted, r.u.tasksCount, r.u.workLogsCount, r.otr ?? '', r.rate, r.u.lastActive || ''].map(csvCell).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_${getLocalDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!rows.length) return <div className="liquid rounded-[2rem]"><Empty icon="🏁" title="No one to compare yet" hint="As people finish tasks and write daily work logs, the leaderboard fills in." /></div>;

  return (
    <Stagger className="space-y-4 sm:space-y-5">
      {/* Toolbar: find, export, and what the cards are ranked by */}
      <ATile glow="brand">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Find someone" />
          <Button size="sm" variant="soft" onClick={exportCsv} className="!rounded-full">{G.download} Export CSV</Button>
          <RefreshButton onClick={reload} busy={loading} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Rank by</span>
          <Pills value={metric} onChange={setMetric} items={METRICS.map((m) => ({ key: m.key, label: m.label }))} />
        </div>
      </ATile>

      {/* Team at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KpiTile icon={G.users} label="Team points" value={team.points} sub={`${rows.length} ${rows.length === 1 ? 'person' : 'people'}`} glow="brand" />
        <KpiTile icon={G.check} label="Tasks done" value={team.done} sub={`of ${team.total} assigned`} glow="good" />
        <KpiTile icon={G.refresh} label="On time" value={team.otr ?? 0} sub={team.otr === null ? 'no finished tasks yet' : 'average finish rate'} glow="warn" />
        <KpiTile icon={G.download} label="Log habit" value={team.rate} sub="average work-log rate" glow="brand" />
      </div>

      {/* Podium */}
      {!q.trim() && ranked.length >= 2 && (
        <ATile glow="warn">
          <div className="mb-2">
            <h3 className="text-base font-extrabold tracking-tight">Top performers</h3>
            <p className="text-xs text-muted mt-0.5 max-w-xl">Score = 2 × tasks completed + daily work logs, nudged by on-time rate and log compliance.</p>
          </div>
          <Podium rows={ranked} onOpen={open} />
        </ATile>
      )}

      {/* Player cards */}
      {cards.length === 0 ? (
        <div className="liquid rounded-[2rem]"><Empty icon="🔎" title="No one matches that" hint="Try another name or email." /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {cards.map((r, i) => (
            <motion.button
              key={r.u.id}
              type="button"
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: Math.min(i, 8) * 0.03 }}
              whileHover={{ y: -4 }}
              onClick={() => open(r)}
              className="liquid rounded-[1.75rem] p-5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex flex-col gap-4 min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative shrink-0">
                  <Avatar name={r.name} size={48} />
                  <span className={`absolute -bottom-1 -left-1 min-w-[22px] h-[22px] px-1 rounded-full text-[10px] font-extrabold grid place-items-center border-2 border-white/80 ${r.rank === 1 ? 'bg-ink text-white' : 'bg-white/80 text-ink'}`}>{r.rank}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold truncate leading-tight">{r.name}</p>
                  <div className="mt-1"><RoleBadge role={r.u.role} /></div>
                </div>
                <Ring value={r.score} max={maxScore} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Tasks done" value={<>{r.u.tasksCompleted}<span className="text-muted font-bold">/{r.u.tasksCount}</span></>} />
                <Stat label="Still open" value={Math.max(0, r.u.tasksCount - r.u.tasksCompleted)} />
                <Stat label="Work logs" value={r.u.workLogsCount} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Meter label="On time" value={r.otr} />
                <Meter label="Log habit" value={r.rate} />
              </div>
              <p className="text-[11px] text-muted">Last active {timeAgo(r.u.lastActive)}</p>
            </motion.button>
          ))}
        </div>
      )}

      <UserDrill selection={sel} onClose={() => setSel(null)} />
    </Stagger>
  );
};
export default AdminPerformance;
