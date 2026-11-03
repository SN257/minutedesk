import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { Avatar } from '../../ui';
import { PRIORITIES, bucketOf, dueLabel, labelHex, type ChecklistItem, type Item, type LabelDef, type Priority, type UserRec } from './model';

/** Round tick button with an animated check. 40px tap target, 24px circle. */
export const CheckCircle = ({ done, onToggle, size = 24, label }: { done: boolean; onToggle: () => void; size?: number; label?: string }) => (
  <button
    type="button"
    aria-label={label || (done ? 'Mark as not done' : 'Mark as done')}
    aria-pressed={done}
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    onMouseDown={(e) => e.stopPropagation()}
    className="shrink-0 grid place-items-center w-10 h-10 -m-2 rounded-full group/check"
  >
    <motion.span
      whileTap={{ scale: 0.8 }}
      animate={{ backgroundColor: done ? '#4fb89f' : 'rgba(127,140,150,0)', borderColor: done ? '#4fb89f' : '#4a5c6a' }}
      transition={spring}
      className="grid place-items-center rounded-full border-2 group-hover/check:border-good"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }} transition={{ duration: 0.28 }} />
      </svg>
    </motion.span>
  </button>
);

export const PriorityDot = ({ priority, withLabel }: { priority: Priority | null; withLabel?: boolean }) => {
  if (!priority) return null;
  const p = PRIORITIES.find((x) => x.key === priority)!;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted" title={`${p.label} priority`}>
      <span className={`w-2 h-2 rounded-full ${p.dot}`} />
      {withLabel && p.label}
    </span>
  );
};

export const DueChip = ({ item, today }: { item: Pick<Item, 'dueDate' | 'done'>; today: string }) => {
  if (!item.dueDate) return null;
  const b = bucketOf(item, today);
  const tone = item.done ? 'bg-ink/5 text-muted' : b === 'overdue' ? 'bg-bad/10 text-bad' : b === 'today' ? 'bg-warn/10 text-warn' : 'bg-ink/5 text-ink-2';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${tone}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
      {dueLabel(item.dueDate, today)}
    </span>
  );
};

export const SourceBadge = ({ item }: { item: Item }) =>
  item.kind === 'task' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-ink/5 text-ink-2">Personal</span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft text-brand max-w-[160px] truncate">{item.boardTitle || 'Board'}{item.listTitle ? ` · ${item.listTitle}` : ''}</span>
  );

export const ChecklistChip = ({ list }: { list: ChecklistItem[] }) => {
  if (!list.length) return null;
  const done = list.filter((i) => i.done).length;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${done === list.length ? 'text-good' : 'text-muted'}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></svg>
      {done}/{list.length}
    </span>
  );
};

export const LabelChip = ({ name, defs, active = true, onClick }: { name: string; defs: LabelDef[]; active?: boolean; onClick?: () => void }) => {
  const hex = labelHex(name, defs);
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors"
      style={active ? { background: hex + '24', color: hex, borderColor: hex + '55' } : { background: 'transparent', color: 'var(--color-muted)', borderColor: 'var(--color-line)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: hex }} />
      {name}
    </Tag>
  );
};

export const ProgressBar = ({ pct }: { pct: number }) => (
  <div className="h-2 rounded-full bg-ink/[0.07] overflow-hidden">
    <motion.div className={`h-full rounded-full ${pct === 100 ? 'bg-good' : 'bg-brand'}`} initial={false} animate={{ width: `${pct}%` }} transition={spring} />
  </div>
);

export const userName = (users: UserRec[], id: string | null | undefined, me?: string) =>
  !id ? '' : id === me ? 'You' : (() => { const u = users.find((x) => x.id === id); return u?.name || u?.email || 'Teammate'; })();

export const AssigneeAvatar = ({ users, id, size = 22 }: { users: UserRec[]; id: string | null; size?: number }) => {
  if (!id) return null;
  const u = users.find((x) => x.id === id);
  return <span title={u?.name || u?.email || 'Assigned'}><Avatar name={u?.name || u?.email || '?'} size={size} /></span>;
};

export const Section = ({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="mb-6">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</h4>
      {right}
    </div>
    {children}
  </section>
);
