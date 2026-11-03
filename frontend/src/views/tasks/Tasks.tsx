import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useT } from '../../lib/siteConfig';
import { AnimatePresence, motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { getCardApi } from '../../lib/api';
import { addDaysToDateString, getLocalDateString } from '../../lib/date';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { AnimatedNumber, Button, Card, Input, Modal, Ring, Select } from '../../ui';
import { Icon } from '../../shell/icons';
import { BoardsArea } from './BoardsArea';
import { NewTaskModal } from './NewTaskModal';
import { iconPath } from './icons';
import { TaskCalendar } from './TaskCalendar';
import { TaskDrawer } from './TaskDrawer';
import { TaskList, type GroupBy, type SortBy } from './TaskList';
import { PRIORITIES, bucketOf, dateOfTimestamp, dueLabel, normCard, parseQuickAdd, type Item, type Priority } from './model';
import { useTasksData } from './useTasksData';

type View = 'list' | 'board' | 'calendar';
type Scope = 'all' | 'today' | 'upcoming' | 'overdue' | 'done';

const VIEW_KEY = 'md2.tasks.view';
const loadView = (): View => { try { const v = localStorage.getItem(VIEW_KEY); return v === 'board' || v === 'calendar' ? v : 'list'; } catch { return 'list'; } };

const EMPTY: Record<Scope, { icon: string; title: string; hint: string }> = {
  all: { icon: '🌤️', title: 'A clear day ahead', hint: 'Type a task in the box above and press Enter. Add #tomorrow or #fri to set a date.' },
  today: { icon: '☕', title: 'Nothing due today', hint: 'Enjoy the breathing room, or pull something forward from Upcoming.' },
  upcoming: { icon: '🗓️', title: 'Nothing coming up', hint: 'Anything you schedule for later will show up here.' },
  overdue: { icon: '🎉', title: 'Nothing is overdue', hint: 'You are all caught up.' },
  done: { icon: '🌱', title: 'Nothing finished yet', hint: 'Tick a task off and it will land here.' },
};

const Stat = ({ label, value, tone, hint, onClick }: { label: string; value: number; tone: string; hint: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="liquid rounded-[1.75rem] p-4 sm:p-5 text-left hover:-translate-y-0.5 transition-transform">
    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
    <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums mt-1 ${tone}`}><AnimatedNumber value={value} /></p>
    <p className="text-xs text-muted mt-0.5">{hint}</p>
  </button>
);

const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: 'list', label: 'List', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { key: 'board', label: 'Board', icon: iconPath('board') },
  { key: 'calendar', label: 'Calendar', icon: iconPath('planner') },
];

const Tasks = ({ param, go }: ViewProps) => {
  const t = useT();
  const data = useTasksData();
  const toast = useToast();
  const today = getLocalDateString();
  const [view, setViewState] = useState<View>(loadView);
  const setView = (v: View) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };
  const [scope, setScope] = useState<Scope>('all');
  const [q, setQ] = useState('');
  const [prio, setPrio] = useState('');
  const [source, setSource] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('due');
  const [sortBy, setSortBy] = useState<SortBy>('due');
  const [qa, setQa] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const triedIds = useRef(new Set<string>());

  const isNew = param === 'new';
  const selectedId = param && !isNew ? param : null;
  const current = selectedId ? data.findItem(selectedId) : null;

  const { loading, findItem, upsertCard } = data;
  useEffect(() => {
    if (!selectedId || loading || findItem(selectedId) || triedIds.current.has(selectedId)) return;
    triedIds.current.add(selectedId);
    getCardApi(selectedId)
      .then((raw) => { if (!raw?.id) throw new Error('missing'); upsertCard(normCard(raw)); })
      .catch(() => { toast("We couldn't find that task. It may have been deleted.", 'info'); go('tasks'); });
  }, [selectedId, loading, findItem, upsertCard, toast, go]);

  /* keyboard: N = new task, / = search, Esc = clear selection */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' && !param) { e.preventDefault(); go('tasks', 'new'); }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === 'Escape') setSelected((s) => (s.size ? new Set() : s));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, param]);

  const items = data.myItems;

  const stats = useMemo(() => {
    const weekStart = addDaysToDateString(today, -6);
    const weekEnd = addDaysToDateString(today, 7);
    let doneWeek = 0, overdue = 0, dueToday = 0, upcoming = 0, done = 0, openWeek = 0;
    for (const it of items) {
      const b = bucketOf(it, today);
      if (b === 'done') { done++; const d = dateOfTimestamp(it.doneAt); if (d && d >= weekStart) doneWeek++; }
      else if (b === 'overdue') { overdue++; openWeek++; }
      else if (b === 'today') { dueToday++; openWeek++; }
      else if (b === 'upcoming') { upcoming++; if (it.dueDate! <= weekEnd) openWeek++; }
    }
    const scopeN = doneWeek + openWeek;
    return { doneWeek, overdue, dueToday, upcoming, done, open: items.length - done, pct: scopeN ? Math.round((doneWeek / scopeN) * 100) : null };
  }, [items, today]);

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => items.filter((it) => {
    if (scope !== 'all') {
      const b = bucketOf(it, today);
      if (scope === 'upcoming' ? !(b === 'upcoming' || b === 'none') : b !== scope) return false;
    }
    if (prio && (prio === 'none' ? it.priority : it.priority !== prio)) return false;
    if (source && (source === 'personal' ? it.kind !== 'task' : it.boardId !== source)) return false;
    if (needle && !`${it.title} ${it.description} ${it.labels.join(' ')} ${it.boardTitle || ''}`.toLowerCase().includes(needle)) return false;
    return true;
  }), [items, scope, prio, source, needle, today]);

  const filtering = !!(prio || source || needle);
  const clearFilters = () => { setQ(''); setPrio(''); setSource(''); };

  const parsed = useMemo(() => parseQuickAdd(qa, today), [qa, today]);
  const quickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.title || adding) return;
    setAdding(true);
    const t = await data.addTask(parsed.title, parsed.dueDate);
    setAdding(false);
    if (!t) return;
    setQa('');
    toast(parsed.dueDate ? `Added for ${dueLabel(parsed.dueDate, today).toLowerCase()}` : 'Task added');
    if (scope === 'done' || scope === 'overdue' || (scope === 'today' && parsed.dueDate !== today)) setScope('all');
  };

  /* bulk actions */
  const picked = useMemo(() => items.filter((i) => selected.has(i.key)), [items, selected]);
  const bulkDone = () => {
    picked.filter((i) => !i.done).forEach((i) => (i.kind === 'task' ? data.patchTask(i.id, { completed: true, status: 'done' }) : data.patchCard(i.id, { archived: true })));
    toast(`${picked.length} marked done`, 'success'); setSelected(new Set());
  };
  const bulkPriority = (p: string) => {
    if (!p) return;
    const cards = picked.filter((i) => i.kind === 'card');
    cards.forEach((i) => data.patchCard(i.id, { priority: p as Priority }));
    toast(cards.length ? `Priority set on ${cards.length}` : 'Priority only applies to board cards', cards.length ? 'success' : 'info');
  };
  const bulkDue = (d: string) => {
    picked.forEach((i) => (i.kind === 'task' ? data.patchTask(i.id, { dueDate: d || null }) : data.patchCard(i.id, { dueDate: d || null })));
    toast(`Due date set on ${picked.length}`, 'success');
  };
  const bulkDelete = async () => {
    const list = [...picked];
    setConfirmDel(false); setSelected(new Set());
    for (const i of list) await data.removeItem(i);
  };

  const close = () => go('tasks');
  const scopes: { key: Scope; label: string; n?: number }[] = [
    { key: 'all', label: 'All', n: stats.open }, { key: 'today', label: 'Today', n: stats.dueToday }, { key: 'upcoming', label: 'Upcoming', n: stats.upcoming },
    { key: 'overdue', label: 'Overdue', n: stats.overdue }, { key: 'done', label: 'Done', n: stats.done },
  ];
  const selectCls = '!rounded-full !py-2 !text-xs !font-bold !w-auto min-w-[8.5rem]';

  return (
    <div className={view === 'board' ? '' : 'pb-20'}>
      {view !== 'board' && (<>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('tasks.title')}</h1>
          <p className="text-muted mt-1">{stats.open === 0 ? 'Nothing open right now. Nice.' : `${stats.open} open${stats.overdue ? `, ${stats.overdue} overdue` : ''} · press N for a new task, / to search`}</p>
        </div>
        <Button onClick={() => go('tasks', 'new')}>{Icon.plus(16)} {t('tasks.new')}</Button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <div className="liquid rounded-[1.75rem] p-4 sm:p-5 flex items-center gap-4">
          <Ring value={stats.pct} size={68} stroke={8} label="Week" color="var(--color-good)" />
          <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">This week</p><p className="text-2xl font-extrabold tabular-nums"><AnimatedNumber value={stats.doneWeek} /></p><p className="text-xs text-muted">completed</p></div>
        </div>
        <Stat label="Due today" value={stats.dueToday} tone="text-warn" hint="to finish today" onClick={() => { setView('list'); setScope('today'); }} />
        <Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? 'text-bad' : 'text-ink'} hint={stats.overdue ? 'need attention' : 'all clear'} onClick={() => { setView('list'); setScope('overdue'); }} />
        <Stat label="Upcoming" value={stats.upcoming} tone="text-ink" hint="scheduled ahead" onClick={() => { setView('list'); setScope('upcoming'); }} />
      </div>

      {/* Toolbar */}
      <Card className="p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{Icon.search(16)}</span>
            <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks, labels or boards   ( / )" aria-label="Search tasks" className="!pl-11 !rounded-full !py-2.5" />
          </div>
          <div className="inline-flex rounded-full bg-ink/[0.06] p-1" role="tablist" aria-label="View">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" role="tab" aria-selected={view === v.key} onClick={() => setView(v.key)}
                className={`relative rounded-full px-3.5 py-2 text-sm font-bold inline-flex items-center gap-2 transition-colors ${view === v.key ? 'text-white' : 'text-muted hover:text-ink'}`}>
                {view === v.key && <motion.span layoutId="tasks-view" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
                <svg className="relative" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={v.icon} /></svg>
                <span className="relative hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
              {scopes.map((s) => (
                <button key={s.key} type="button" onClick={() => setScope(s.key)} aria-pressed={scope === s.key}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${scope === s.key ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-ink/[0.06]'}`}>
                  {s.label}{s.n !== undefined && <span className={`ml-1.5 text-[11px] ${scope === s.key ? 'opacity-70' : 'opacity-60'}`}>{s.n}</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Select value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Filter by priority" className={selectCls}>
                <option value="">All priorities</option>
                {PRIORITIES.slice().reverse().map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                <option value="none">No priority</option>
              </Select>
              <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source" className={selectCls}>
                <option value="">All sources</option>
                <option value="personal">Personal</option>
                {data.boards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </Select>
              {view === 'list' && (
                <>
                  <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} aria-label="Group by" className={selectCls}>
                    <option value="due">Group: Due date</option><option value="priority">Group: Priority</option><option value="source">Group: Source</option><option value="none">No grouping</option>
                  </Select>
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} aria-label="Sort by" className={selectCls}>
                    <option value="due">Sort: Due date</option><option value="priority">Sort: Priority</option><option value="title">Sort: Title</option><option value="recent">Sort: Recently done</option>
                  </Select>
                </>
              )}
              {filtering && <button type="button" onClick={clearFilters} className="text-xs font-bold text-brand hover:underline px-1">Clear</button>}
            </div>
          </div>
      </Card>

      </>)}

      {data.error && (
        <Card className="p-5 flex flex-wrap items-center gap-3 mb-4">
          <p className="text-sm text-bad font-semibold flex-1">{data.error}</p>
          <Button variant="soft" onClick={() => data.reload()}>Try again</Button>
        </Card>
      )}

      {/* Quick add */}
      {view === 'list' && (
        <form onSubmit={quickAdd} className="liquid rounded-full pl-5 pr-2 py-2 mb-4 flex items-center gap-3">
          <span className="text-muted">{Icon.plus(18)}</span>
          <input value={qa} onChange={(e) => setQa(e.target.value)} disabled={adding} aria-label="Quick add a task" placeholder="Add a task and press Enter, e.g. Call Sam #tomorrow"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] py-1.5 placeholder:text-muted/70" />
          <AnimatePresence>
            {qa.trim() && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring} className="flex items-center gap-2">
                {parsed.dueDate && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-warn/10 text-warn whitespace-nowrap">{dueLabel(parsed.dueDate, today)}</span>}
                <Button type="submit" loading={adding} disabled={!parsed.title} className="!rounded-full">Add</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={spring}>
          {view === 'list' && (
            <TaskList
              items={filtered} groupBy={groupBy} sortBy={sortBy} today={today} loading={data.loading} users={data.users} me={data.me}
              selected={selected} onSelect={setSelected} onToggle={data.toggleDone} onOpen={(it: Item) => go('tasks', it.id)} data={data}
              empty={filtering ? { icon: '🔍', title: 'Nothing matches', hint: 'Try different words or clear the filters.' } : EMPTY[scope]}
            />
          )}
          {view === 'board' && <BoardsArea data={data} onOpen={(id) => go('tasks', id)} />}
          {view === 'calendar' && (
            <TaskCalendar items={filtered} today={today} onOpen={(it) => go('tasks', it.id)} onAdd={(title, date) => data.addTask(title, date)} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && view === 'list' && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={spring} className="sticky bottom-[88px] md:bottom-4 z-30 mt-5 flex justify-center">
            <div className="glass-pop rounded-full p-2 pl-5 flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
              <span className="text-sm font-extrabold tabular-nums whitespace-nowrap">{selected.size} selected</span>
              <Button size="sm" onClick={bulkDone} className="!rounded-full">{Icon.check(14)} Done</Button>
              <Select value="" onChange={(e) => bulkPriority(e.target.value)} aria-label="Set priority" className="!rounded-full !py-1.5 !text-xs !font-bold !w-auto min-w-[7.5rem]">
                <option value="">Priority…</option>
                {PRIORITIES.slice().reverse().map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </Select>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-muted">
                Due
                <input type="date" aria-label="Set due date" onChange={(e) => e.target.value && bulkDue(e.target.value)} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-brand" />
              </label>
              <Button size="sm" variant="soft" onClick={() => setConfirmDel(true)} className="!rounded-full text-bad">Delete</Button>
              <button type="button" onClick={() => setSelected(new Set())} aria-label="Clear selection" className="w-8 h-8 rounded-full hover:bg-ink/[0.08] text-muted">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title={`Delete ${selected.size} ${selected.size === 1 ? 'item' : 'items'}?`}>
        <p className="text-sm text-ink-2">This removes them for good. It cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="soft" onClick={() => setConfirmDel(false)}>Keep them</Button>
          <Button variant="danger" onClick={bulkDelete}>Delete</Button>
        </div>
      </Modal>

      <TaskDrawer item={current} open={!!current} onClose={close} data={data} />
      <NewTaskModal open={isNew} onClose={close} data={data} />
    </div>
  );
};

export default Tasks;
