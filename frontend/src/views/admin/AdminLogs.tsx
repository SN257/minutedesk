import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, Badge, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { getActivityLog, getErrorLogCounts, getErrorLogs, updateErrorLogStatus, type ErrorLogEntry } from '../../lib/api';
import { ErrorNote, G, Pills, RefreshButton, SearchBox, fmtStamp, timeAgo } from './shared';
import { ATile, KpiTile } from './tiles';

const METHOD_TONE: Record<string, 'good' | 'brand' | 'warn' | 'bad' | 'neutral'> = { GET: 'neutral', POST: 'good', PUT: 'brand', PATCH: 'brand', DELETE: 'bad' };

/* ───────── Activity ───────── */
const dayLabel = (iso: string) => {
  const d = new Date(iso), t = new Date();
  const same = (x: Date, y: Date) => x.toDateString() === y.toDateString();
  const y = new Date(); y.setDate(t.getDate() - 1);
  return same(d, t) ? 'Today' : same(d, y) ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
};
const statusTone = (c?: number | null) => (c && c >= 500 ? 'bad' : c && c >= 400 ? 'warn' : 'good');
const DOT = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' } as const;

const ActivityLog = () => {
  const [limit, setLimit] = useState(200);
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('all');
  const { data, loading, error, reload } = useAsync(() => getActivityLog(limit), [limit]);

  const entries = data ?? [];
  const counts = useMemo(() => entries.reduce<Record<string, number>>((a, e) => ({ ...a, [e.method]: (a[e.method] || 0) + 1 }), {}), [entries]);
  const rows = entries.filter((e) => {
    const s = q.trim().toLowerCase();
    return (method === 'all' || e.method === method) && (!s || e.path.toLowerCase().includes(s) || (e.userEmail || '').toLowerCase().includes(s));
  });
  const stats = useMemo(() => {
    const errs = entries.filter((e) => (e.statusCode ?? 0) >= 400).length;
    const ms = entries.filter((e) => e.durationMs != null);
    const people = new Set(entries.map((e) => e.userEmail).filter(Boolean)).size;
    return { errs, avg: ms.length ? Math.round(ms.reduce((a, e) => a + (e.durationMs ?? 0), 0) / ms.length) : 0, people };
  }, [entries]);
  const days = useMemo(() => {
    const m = new Map<string, typeof rows>();
    rows.forEach((e) => { const k = dayLabel(e.createdAt); m.set(k, [...(m.get(k) || []), e]); });
    return [...m.entries()];
  }, [rows]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KpiTile icon={G.refresh} label="Requests" value={entries.length} sub={`last ${limit} recorded`} glow="brand" />
        <KpiTile icon={G.users} label="People" value={stats.people} sub="active in this window" glow="good" />
        <KpiTile icon={G.check} label="Avg speed" value={stats.avg} sub="milliseconds per request" glow="warn" />
        <KpiTile icon={G.trash} label="Problems" value={stats.errs} sub="4xx and 5xx answers" glow="bad" />
      </div>

      <ATile glow="brand">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Filter by person or path" />
          <div className="inline-flex rounded-full bg-ink/[0.06] p-1" role="group" aria-label="How many entries">
            {[100, 200, 500].map((n) => (
              <button key={n} type="button" aria-pressed={limit === n} onClick={() => setLimit(n)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${limit === n ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>Last {n}</button>
            ))}
          </div>
          <RefreshButton onClick={reload} busy={loading} />
        </div>
        <div className="mt-4"><Pills value={method} onChange={setMethod} items={[{ key: 'all', label: 'All', count: entries.length }, ...Object.entries(counts).map(([m, c]) => ({ key: m, label: m, count: c }))]} /></div>
      </ATile>

      {error && <ErrorNote message={error} onRetry={reload} />}

      <ATile glow="good">
        {loading && !data ? (
          <div className="space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <Empty icon="🍃" title={entries.length ? 'Nothing matches' : 'No activity recorded yet'} hint={entries.length ? 'Try clearing the filters.' : 'Every create, update and delete will show up here.'} />
        ) : (
          <div className="max-h-[62vh] overflow-y-auto scroll-y pr-1">
            {days.map(([day, list]) => (
              <section key={day} className="mb-5 last:mb-0">
                <h4 className="sticky top-0 z-10 -mx-1 px-1 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted bg-white/60 rounded-lg">{day} <span className="text-ink/60">· {list.length}</span></h4>
                <ol className="relative mt-2 ml-3 border-l-2 border-ink/10 space-y-1">
                  {list.map((e) => {
                    const tone = statusTone(e.statusCode);
                    return (
                      <li key={e.id} className="relative pl-5 py-2 group rounded-r-2xl hover:bg-white/40 transition-colors">
                        <span className={`absolute -left-[7px] top-4 w-3 h-3 rounded-full ring-4 ring-white/70 ${DOT[tone]}`} />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Badge tone={METHOD_TONE[e.method] || 'neutral'}>{e.method}</Badge>
                          <span className="font-mono text-xs text-ink-2 break-all min-w-0 flex-1">{e.path}</span>
                          <span className={`text-xs font-extrabold tabular-nums ${tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-good'}`}>{e.statusCode ?? '—'}</span>
                          <span className="text-[11px] text-muted tabular-nums w-14 text-right">{e.durationMs != null ? `${e.durationMs}ms` : '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted" title={fmtStamp(e.createdAt)}>
                          {e.userEmail ? <Avatar name={e.userEmail} size={18} /> : null}
                          <span className="truncate">{e.userEmail || <em>anonymous</em>}</span>
                          <span>· {timeAgo(e.createdAt)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </ATile>
    </div>
  );
};

/* ───────── Error tickets ───────── */
type Status = ErrorLogEntry['status'];
const STATUS: Record<Status, { label: string; tone: 'bad' | 'warn' | 'good' }> = {
  open: { label: 'Open', tone: 'bad' },
  in_progress: { label: 'In progress', tone: 'warn' },
  resolved: { label: 'Resolved', tone: 'good' },
};

interface Group {
  key: string;
  message: string;
  source: ErrorLogEntry['source'];
  status: Status;
  items: ErrorLogEntry[];
  first: string;
  last: string;
  critical: boolean;
}

const groupErrors = (entries: ErrorLogEntry[]): Group[] => {
  const map = new Map<string, ErrorLogEntry[]>();
  entries.forEach((e) => {
    const k = `${e.source}:${e.message}`;
    map.set(k, [...(map.get(k) || []), e]);
  });
  return [...map.entries()]
    .map(([key, list]) => {
      const items = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const status: Status = items.some((i) => i.status === 'open') ? 'open' : items.some((i) => i.status === 'in_progress') ? 'in_progress' : 'resolved';
      return {
        key, items, status, message: items[0].message, source: items[0].source,
        first: items[items.length - 1].createdAt, last: items[0].createdAt,
        critical: items[0].source === 'backend' && (items[0].statusCode ?? 0) >= 500,
      };
    })
    .sort((a, b) => new Date(b.last).getTime() - new Date(a.last).getTime());
};

const Tickets = () => {
  const toast = useToast();
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(
    () => getErrorLogs({ source: source === 'all' ? undefined : source, status: status === 'all' ? undefined : status }),
    [source, status],
  );
  const counts = useAsync(() => getErrorLogCounts().catch(() => null), []);
  const groups = useMemo(() => groupErrors(data ?? []), [data]);

  const change = async (g: Group, next: Status) => {
    const targets = g.items.filter((i) => i.status !== next);
    if (!targets.length) return;
    setBusy(g.key);
    try {
      await Promise.all(targets.map((t) => updateErrorLogStatus(t.id, next)));
      toast(`Ticket marked ${STATUS[next].label.toLowerCase()}.`);
      reload();
      counts.reload();
    } catch (e: any) {
      toast(e?.message || 'Could not update that ticket.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const c = counts.data;
  const RAIL = { open: 'bg-bad', in_progress: 'bg-warn', resolved: 'bg-good' } as const;
  const GL: Record<Status, 'bad' | 'warn' | 'good'> = { open: 'bad', in_progress: 'warn', resolved: 'good' };
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-3 gap-4 sm:gap-5">
        {(['open', 'in_progress', 'resolved'] as Status[]).map((k) => {
          const n = k === 'open' ? c?.open : k === 'in_progress' ? c?.inProgress : c?.resolved;
          return (
            <ATile key={k} glow={GL[k]} onClick={() => setStatus(status === k ? 'all' : k)} className={`!p-4 sm:!p-5 ${status === k ? 'ring-2 ring-ink/70' : ''}`}>
              <p className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none">{n ?? '—'}</p>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted mt-3 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${RAIL[k]}`} />{STATUS[k].label}</p>
            </ATile>
          );
        })}
      </div>

      <ATile glow="brand">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Pills value={source} onChange={setSource} items={[{ key: 'all', label: 'All sources' }, { key: 'frontend', label: 'Frontend' }, { key: 'backend', label: 'Backend' }]} />
          <Pills value={status} onChange={setStatus} items={[{ key: 'all', label: 'Any status' }, { key: 'open', label: 'Open' }, { key: 'in_progress', label: 'In progress' }, { key: 'resolved', label: 'Resolved' }]} />
          <RefreshButton className="ml-auto" busy={loading} onClick={() => { reload(); counts.reload(); }} />
        </div>
      </ATile>

      {error && <ErrorNote message={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : groups.length === 0 ? (
        <div className="liquid rounded-[2rem]"><Empty icon="🎉" title="No tickets here" hint="Nothing matches these filters, which is good news." /></div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {groups.map((g) => {
              const isOpen = open === g.key;
              const latest = g.items[0];
              return (
                <motion.li key={g.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="liquid rounded-[1.75rem] overflow-hidden relative">
                  <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1.5 ${RAIL[g.status]}`} />
                  <div className="p-4 sm:p-5 pl-5 sm:pl-6 flex items-start gap-3 sm:gap-4">
                    <div className="shrink-0 w-14 text-center rounded-2xl bg-white/50 border border-white/70 py-2">
                      <p className="text-lg font-extrabold tabular-nums leading-none">{g.items.length}<span className="text-xs text-muted">×</span></p>
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted mt-1">times</p>
                    </div>
                    <button onClick={() => setOpen(isOpen ? null : g.key)} className="flex-1 min-w-0 text-left" aria-expanded={isOpen}>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge tone={g.source === 'backend' ? 'dark' : 'brand'}>{g.source}</Badge>
                        <Badge tone={STATUS[g.status].tone}>{STATUS[g.status].label}</Badge>
                        {g.critical && <Badge tone="bad">Server error</Badge>}
                        <span className="text-[11px] font-bold text-muted">last {timeAgo(g.last)}</span>
                      </div>
                      <p className={`text-sm font-semibold break-words ${isOpen ? '' : 'line-clamp-2'}`}>{g.message}</p>
                    </button>
                    <div className="hidden sm:inline-flex rounded-full bg-ink/[0.06] p-1 shrink-0" role="group" aria-label="Ticket status">
                      {(['open', 'in_progress', 'resolved'] as Status[]).map((st) => (
                        <button key={st} type="button" disabled={busy === g.key} onClick={() => change(g, st)} aria-pressed={g.status === st}
                          className={`relative px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${g.status === st ? 'text-white' : 'text-muted hover:text-ink'}`}>
                          {g.status === st && <motion.span layoutId={`st-${g.key}`} transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
                          <span className="relative">{STATUS[st].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:hidden px-5 pb-4 flex flex-wrap gap-1.5">
                    {(['open', 'in_progress', 'resolved'] as Status[]).map((st) => (
                      <Button key={st} size="sm" variant={g.status === st ? 'primary' : 'soft'} className="!rounded-full" disabled={busy === g.key || g.status === st} onClick={() => change(g, st)}>{STATUS[st].label}</Button>
                    ))}
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-5 sm:px-6 pb-5 pt-4 border-t border-white/60 space-y-3">
                          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div><dt className="text-muted font-bold">First seen</dt><dd className="font-semibold mt-0.5">{fmtStamp(g.first)}</dd></div>
                            <div><dt className="text-muted font-bold">Last seen</dt><dd className="font-semibold mt-0.5">{fmtStamp(g.last)}</dd></div>
                            <div className="min-w-0"><dt className="text-muted font-bold">Where</dt><dd className="font-mono mt-0.5 truncate">{latest.path || '—'}</dd></div>
                            <div className="min-w-0"><dt className="text-muted font-bold">Who</dt><dd className="font-semibold mt-0.5 truncate">{latest.userEmail || 'anonymous'}</dd></div>
                          </dl>
                          {latest.stack ? (
                            <pre className="text-[11px] leading-relaxed font-mono bg-ink text-white/85 rounded-2xl p-3.5 max-h-56 overflow-auto whitespace-pre scroll-y">{latest.stack}</pre>
                          ) : (
                            <p className="text-xs text-muted">No stack trace was captured.</p>
                          )}
                          {g.items.length > 1 && (
                            <div>
                              <p className="text-[11px] font-bold text-muted mb-1">Recent occurrences</p>
                              <ul className="text-xs text-ink-2 space-y-0.5">
                                {g.items.slice(0, 5).map((o) => (
                                  <li key={o.id} className="flex justify-between gap-3"><span className="truncate">{o.userEmail || 'anonymous'}</span><span className="text-muted whitespace-nowrap">{fmtStamp(o.createdAt)}</span></li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

const AdminLogs = () => {
  const [tab, setTab] = useState<'tickets' | 'activity'>('tickets');
  const { data: counts } = useAsync(() => getErrorLogCounts().catch(() => null), []);
  const items = [{ key: 'tickets' as const, label: 'Error tickets', count: counts?.open }, { key: 'activity' as const, label: 'Activity feed', count: undefined }];
  return (
    <Stagger className="space-y-4 sm:space-y-5">
      <div className="inline-flex rounded-full liquid p-1 gap-0.5" role="tablist">
        {items.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`relative px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${tab === t.key ? 'text-white' : 'text-muted hover:text-ink'}`}>
            {tab === t.key && <motion.span layoutId="logs-tab" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
            <span className="relative inline-flex items-center gap-2">{t.label}{t.count ? <span className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-extrabold grid place-items-center ${tab === t.key ? 'bg-white/25' : 'bg-bad text-white'}`}>{t.count}</span> : null}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div initial="show" animate="show">{tab === 'tickets' ? <Tickets /> : <ActivityLog />}</motion.div>
        </motion.div>
      </AnimatePresence>
    </Stagger>
  );
};
export default AdminLogs;
