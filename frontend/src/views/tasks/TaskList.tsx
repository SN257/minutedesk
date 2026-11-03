import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { Card, Empty, Select, Skeleton } from '../../ui';
import { PRIORITIES, bucketOf, priorityRank, type Bucket, type Item, type Priority, type UserRec } from './model';
import { AssigneeAvatar, CheckCircle, ChecklistChip, DueChip, LabelChip, PriorityDot } from './parts';
import type { TasksData } from './useTasksData';

export type GroupBy = 'due' | 'priority' | 'source' | 'none';
export type SortBy = 'due' | 'priority' | 'title' | 'recent';

const COLS = 'md:grid-cols-[1.75rem_minmax(0,1fr)_8rem_7.5rem_11rem_2rem]';

const sourceOf = (i: Item) => (i.kind === 'task' ? 'Personal' : i.boardTitle || 'Board');

const comparator = (sort: SortBy) => (a: Item, b: Item) => {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const due = (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  const title = a.title.localeCompare(b.title);
  if (sort === 'priority') return pr || due || title;
  if (sort === 'title') return title;
  if (sort === 'recent') return (b.doneAt || '').localeCompare(a.doneAt || '') || due || title;
  return due || pr || title;
};

interface Group { key: string; title: string; tone: string; items: Item[]; collapsed?: boolean }

const buildGroups = (items: Item[], by: GroupBy, sort: SortBy, today: string): Group[] => {
  const cmp = comparator(sort);
  const sorted = [...items].sort(cmp);
  if (by === 'none') return sorted.length ? [{ key: 'all', title: 'All tasks', tone: 'text-ink', items: sorted }] : [];
  if (by === 'due') {
    const defs: { key: Bucket; title: string; tone: string }[] = [
      { key: 'overdue', title: 'Overdue', tone: 'text-bad' }, { key: 'today', title: 'Today', tone: 'text-warn' },
      { key: 'upcoming', title: 'Upcoming', tone: 'text-ink' }, { key: 'none', title: 'No date', tone: 'text-ink' }, { key: 'done', title: 'Done', tone: 'text-good' },
    ];
    return defs.map((d) => ({ key: d.key, title: d.title, tone: d.tone, items: sorted.filter((i) => bucketOf(i, today) === d.key), collapsed: d.key === 'done' })).filter((g) => g.items.length);
  }
  if (by === 'priority') {
    const defs: { key: string; title: string; tone: string; match: (i: Item) => boolean }[] = [
      ...PRIORITIES.slice().reverse().map((p) => ({ key: p.key, title: p.label, tone: p.key === 'urgent' ? 'text-bad' : p.key === 'high' ? 'text-warn' : 'text-ink', match: (i: Item) => i.priority === p.key })),
      { key: 'none', title: 'No priority', tone: 'text-muted', match: (i: Item) => !i.priority },
    ];
    return defs.map((d) => ({ key: d.key, title: d.title, tone: d.tone, items: sorted.filter(d.match) })).filter((g) => g.items.length);
  }
  const map = new Map<string, Item[]>();
  sorted.forEach((i) => { const k = sourceOf(i); (map.get(k) || map.set(k, []).get(k)!).push(i); });
  return [...map.entries()].sort((a, b) => (a[0] === 'Personal' ? -1 : b[0] === 'Personal' ? 1 : a[0].localeCompare(b[0]))).map(([k, list]) => ({ key: k, title: k, tone: 'text-ink', items: list }));
};

const Tick = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
  <button
    type="button" role="checkbox" aria-checked={on} aria-label={label}
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-[18px] h-[18px] rounded-md border-2 grid place-items-center transition-colors ${on ? 'bg-ink border-ink text-white' : 'border-line hover:border-ink/50 text-transparent'}`}
  >
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
  </button>
);

const DueCell = ({ item, today, onChange }: { item: Item; today: string; onChange: (v: string | null) => void }) => {
  const [edit, setEdit] = useState(false);
  if (edit) {
    return (
      <input
        type="date" autoFocus defaultValue={item.dueDate || ''}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => setEdit(false)}
        onChange={(e) => { onChange(e.target.value || null); setEdit(false); }}
        className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-brand"
      />
    );
  }
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); setEdit(true); }} className="rounded-md hover:bg-ink/[0.06] px-1 -mx-1 py-0.5 text-left" aria-label="Change due date">
      {item.dueDate ? <DueChip item={item} today={today} /> : <span className="text-xs font-semibold text-muted/70">+ Date</span>}
    </button>
  );
};

const Row = ({ item, today, users, me, selected, anySelected, onSelect, onToggle, onOpen, data }: {
  item: Item; today: string; users: UserRec[]; me: string; selected: boolean; anySelected: boolean;
  onSelect: () => void; onToggle: (i: Item) => void; onOpen: (i: Item) => void; data: TasksData;
}) => {
  const patchDue = (v: string | null) => (item.kind === 'task' ? data.patchTask(item.id, { dueDate: v }) : data.patchCard(item.id, { dueDate: v }));
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }} transition={spring} className="list-none">
      <div
        role="button" tabIndex={0}
        onClick={() => onOpen(item)}
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(item); }}
        className={`group grid grid-cols-[1.75rem_minmax(0,1fr)_auto] ${COLS} items-center gap-x-3 px-4 py-2.5 min-h-[54px] cursor-pointer outline-none transition-colors ${selected ? 'bg-brand-soft/60' : 'hover:bg-ink/[0.03] focus-visible:bg-ink/[0.05]'}`}
      >
        <span className={`transition-opacity ${selected || anySelected ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'}`}>
          <Tick on={selected} onChange={onSelect} label={`Select ${item.title}`} />
        </span>
        <div className="min-w-0 flex items-center gap-3">
          <CheckCircle done={item.done} onToggle={() => onToggle(item)} size={22} />
          <div className="min-w-0">
            <p className={`text-[15px] font-semibold leading-snug break-words ${item.done ? 'text-muted line-through decoration-muted/50' : 'text-ink'}`}>{item.title}</p>
            {(item.labels.length > 0 || item.checklist.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {item.labels.slice(0, 3).map((l) => <LabelChip key={l} name={l} defs={[]} />)}
                <ChecklistChip list={item.checklist} />
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
          {item.kind === 'card' ? (
            <Select
              value={item.priority || ''} aria-label="Priority"
              onChange={(e) => data.patchCard(item.id, { priority: (e.target.value || null) as Priority | null })}
              className="!py-1 !px-2 !text-xs !font-semibold !rounded-lg !border-transparent !bg-transparent hover:!bg-ink/[0.06]"
            >
              <option value="">No priority</option>
              {PRIORITIES.slice().reverse().map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          ) : <span className="text-xs text-muted/50 px-2">—</span>}
        </div>
        <div className="md:block hidden"><DueCell item={item} today={today} onChange={patchDue} /></div>
        <div className="hidden md:block min-w-0">
          {item.kind === 'task'
            ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-ink/5 text-ink-2">Personal</span>
            : <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft text-brand max-w-full truncate">{item.boardTitle || 'Board'}{item.listTitle ? ` · ${item.listTitle}` : ''}</span>}
        </div>
        <div className="hidden md:flex justify-end">{item.kind === 'card' && item.assignee && item.assignee !== me ? <AssigneeAvatar users={users} id={item.assignee} /> : null}</div>
        {/* phone: due + priority stacked on the right */}
        <div className="md:hidden flex flex-col items-end gap-1">
          <DueChip item={item} today={today} />
          <PriorityDot priority={item.priority} />
        </div>
      </div>
    </motion.li>
  );
};

export const TaskList = ({ items, groupBy, sortBy, today, loading, users, me, selected, onSelect, onToggle, onOpen, data, empty }: {
  items: Item[]; groupBy: GroupBy; sortBy: SortBy; today: string; loading: boolean; users: UserRec[]; me: string;
  selected: Set<string>; onSelect: (s: Set<string>) => void; onToggle: (i: Item) => void; onOpen: (i: Item) => void; data: TasksData;
  empty: { icon: string; title: string; hint: string };
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => buildGroups(items, groupBy, sortBy, today), [items, groupBy, sortBy, today]);

  if (loading) return <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[54px]" />)}</div>;
  if (groups.length === 0) return <Card><Empty icon={empty.icon} title={empty.title} hint={empty.hint} /></Card>;

  const toggleKey = (k: string) => { const n = new Set(selected); if (n.has(k)) n.delete(k); else n.add(k); onSelect(n); };
  const toggleGroup = (g: Group) => {
    const all = g.items.every((i) => selected.has(i.key));
    const n = new Set(selected);
    g.items.forEach((i) => (all ? n.delete(i.key) : n.add(i.key)));
    onSelect(n);
  };

  return (
    <div className="space-y-4">
      <div className={`hidden md:grid ${COLS} gap-x-3 px-4 text-[11px] font-extrabold uppercase tracking-wider text-muted`}>
        <span /><span>Task</span><span className="px-2">Priority</span><span>Due</span><span>Source</span><span />
      </div>
      {groups.map((g) => {
        const isOpen = open[g.key] ?? !g.collapsed;
        const allSel = g.items.length > 0 && g.items.every((i) => selected.has(i.key));
        return (
          <Card key={g.key} className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line/70">
              <Tick on={allSel} onChange={() => toggleGroup(g)} label={`Select all in ${g.title}`} />
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [g.key]: !isOpen }))} aria-expanded={isOpen} className="flex items-center gap-2 flex-1 text-left">
                <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="text-muted inline-flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></motion.span>
                <h3 className={`text-xs font-extrabold uppercase tracking-wider ${g.tone}`}>{g.title}</h3>
                <span className="text-[11px] font-bold text-muted bg-ink/5 rounded-full px-2 py-0.5">{g.items.length}</span>
              </button>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="divide-y divide-line/60 overflow-hidden m-0 p-0">
                  <AnimatePresence initial={false}>
                    {g.items.map((it) => (
                      <Row key={it.key} item={it} today={today} users={users} me={me} selected={selected.has(it.key)} anySelected={selected.size > 0} onSelect={() => toggleKey(it.key)} onToggle={onToggle} onOpen={onOpen} data={data} />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
};
