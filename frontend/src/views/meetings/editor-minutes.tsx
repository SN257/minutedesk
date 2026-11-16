import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { addDaysToDateString, getLocalDateString } from '../../lib/date';
import { createTask, createTaskForUser } from '../../lib/api';
import { Avatar, Button, Empty, Input } from '../../ui';
import { Icon } from '../../shell/icons';
import { AutoTextarea, Chip, useClickOutside } from './editor-fields';
import {
  CATEGORIES, blankNote, blankPoint, isActionCategory, prettyDate,
  type Category, type EAgendaItem, type ENote, type EPoint,
} from './editor-types';

export interface PersonOption { id: string; label: string }
export interface MinutesContext { meetingType: string; center: string; date: string }

const firstLine = (s: string) => (s.split('\n').find((l) => l.trim()) || '').trim();

/* ───────── Assignee picker ───────── */
const AssigneePicker = ({ value, people, onChange }: { value: string; people: PersonOption[]; onChange: (name: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  const list = useMemo(() => people.filter((p) => p.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40), [people, q]);

  const pick = (name: string) => { onChange(name); setOpen(false); setQ(''); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 bg-white/70 glass-fill border border-line rounded-xl pl-2.5 pr-3 py-2 text-sm text-left hover:border-ink/30 transition-colors min-h-[42px]"
      >
        {value ? <Avatar name={value} size={22} /> : <span className="w-[22px] h-[22px] rounded-full border border-dashed border-muted/60 grid place-items-center text-muted text-xs">+</span>}
        <span className={`flex-1 truncate ${value ? 'font-semibold' : 'text-muted'}`}>{value || 'Assign to…'}</span>
        <span className="text-muted text-[10px]">▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={spring}
            className="absolute left-0 top-full mt-1.5 z-40 w-full min-w-[230px] bg-white/70 glass-fill border border-line rounded-2xl shadow-pop p-2"
          >
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="!py-2 mb-1.5" />
            <div className="max-h-52 scroll-y">
              <button type="button" onClick={() => pick('')} className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-muted hover:bg-ink/5">Nobody (assign to me)</button>
              {list.map((p) => (
                <button key={p.id} type="button" onClick={() => pick(p.label)} className={`w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg text-sm hover:bg-ink/5 ${p.label === value ? 'bg-brand-soft' : ''}`}>
                  <Avatar name={p.label} size={24} />
                  <span className="truncate font-medium">{p.label}</span>
                </button>
              ))}
              {list.length === 0 && <p className="text-xs text-muted text-center py-4">No one found</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ───────── Category switch ───────── */
const CategorySwitch = ({ id, value, onChange }: { id: string; value: Category; onChange: (c: Category) => void }) => (
  <div className="inline-flex bg-ink/[0.05] rounded-xl p-0.5 shrink-0" role="radiogroup" aria-label="Type of point">
    {CATEGORIES.map((c) => {
      const on = value === c.key;
      return (
        <button key={c.key} type="button" role="radio" aria-checked={on} title={c.hint} onClick={() => onChange(c.key)} className="relative px-2.5 py-1.5 rounded-[10px] text-[11px] font-bold">
          {on && <motion.span layoutId={`cat-${id}`} transition={spring} className="absolute inset-0 bg-white/70 glass-fill rounded-[10px] shadow-card" />}
          <span className={`relative flex items-center gap-1.5 ${on ? c.tone : 'text-muted'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${on ? c.dot : 'bg-muted/40'}`} />
            {c.key === 'Information' ? 'Info' : c.key}
          </span>
        </button>
      );
    })}
  </div>
);

/* ───────── Point row ───────── */
const PointRow = ({ point, canRemove, busy, people, setRef, onPatch, onRemove, onEnter, onBackspaceEmpty, onPasteLines, onMakeTask, onUnlink }: {
  point: EPoint; canRemove: boolean; busy: boolean; people: PersonOption[];
  setRef: (el: HTMLTextAreaElement | null) => void;
  onPatch: (p: Partial<EPoint>) => void; onRemove: () => void; onEnter: () => void; onBackspaceEmpty: () => void;
  onPasteLines: (lines: string[]) => void; onMakeTask: () => void; onUnlink: () => void;
}) => {
  const action = isActionCategory(point.category);

  const keyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter(); }
    else if (e.key === 'Backspace' && point.text === '' && canRemove) { e.preventDefault(); onBackspaceEmpty(); }
  };
  const paste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const lines = e.clipboardData.getData('text').split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) { e.preventDefault(); onPasteLines(lines); }
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      transition={spring}
      className="relative focus-within:z-20 rounded-xl border border-line bg-white/70 glass-fill px-3 py-2.5"
    >
      <div className="flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-2">
        <div className="order-2 sm:order-1 flex-1 min-w-0 basis-full sm:basis-0 flex items-start gap-2">
          <span className="text-brand font-black leading-[1.9] select-none" aria-hidden>➟</span>
          <AutoTextarea
            inputRef={setRef}
            value={point.text}
            onChange={(e) => onPatch({ text: e.target.value })}
            onKeyDown={keyDown}
            onPaste={paste}
            placeholder="What was said or decided? Press Enter for the next point"
            aria-label="Minute point"
            className="text-sm font-medium leading-relaxed py-1 placeholder:text-muted/60"
          />
        </div>
        <div className="order-1 sm:order-2 flex items-center gap-1.5 ml-auto sm:ml-0">
          <CategorySwitch id={point.id} value={point.category} onChange={(category) => onPatch({ category })} />
          {canRemove && (
            <button type="button" aria-label="Remove point" onClick={onRemove} className="w-8 h-8 rounded-lg text-muted hover:text-bad hover:bg-bad/10 grid place-items-center text-sm">✕</button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {action && (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }} transition={spring}
            className="mt-3 pt-3 border-t border-dashed border-line"
          >
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2.5 items-end">
              <div>
                <span className="block text-[11px] font-bold text-muted mb-1">Who is responsible</span>
                <AssigneePicker value={point.assignee} people={people} onChange={(assignee) => onPatch({ assignee })} />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-muted mb-1">Deadline</span>
                <Input type="date" value={point.deadline} onChange={(e) => onPatch({ deadline: e.target.value })} className="!py-2 min-h-[42px]" />
              </div>
              <div className="sm:min-w-[130px]">
                {point.taskId ? (
                  <div className="flex items-center gap-2 justify-between sm:justify-start min-h-[42px]">
                    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="inline-flex items-center gap-1.5 text-xs font-bold text-good bg-good/10 rounded-lg px-2.5 py-2">
                      {Icon.check(14)} Task linked
                    </motion.span>
                    <button type="button" onClick={onUnlink} className="text-[11px] font-semibold text-muted hover:text-bad underline-offset-2 hover:underline">Unlink</button>
                  </div>
                ) : (
                  <Button variant="soft" size="sm" loading={busy} disabled={!point.text.trim()} onClick={onMakeTask} className="w-full min-h-[42px]">
                    {Icon.tasks(14)} Make task
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[{ l: 'Tomorrow', d: 1 }, { l: 'In a week', d: 7 }, { l: 'In 2 weeks', d: 14 }, { l: 'In a month', d: 30 }].map((q) => {
                const v = addDaysToDateString(getLocalDateString(), q.d);
                return <Chip key={q.l} active={point.deadline === v} onClick={() => onPatch({ deadline: v })}>{q.l}</Chip>;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ───────── Section ("note") card ───────── */
const SectionCard = ({ note, index, people, busyId, setRef, onChange, onRemove, onMakeTask, setFocus }: {
  note: ENote; index: number; people: PersonOption[]; busyId: string | null;
  setRef: (id: string, el: HTMLTextAreaElement | null) => void;
  onChange: (n: ENote) => void; onRemove: () => void; onMakeTask: (p: EPoint) => void; setFocus: (id: string | null) => void;
}) => {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 2800);
    return () => clearTimeout(t);
  }, [confirm]);

  const hasContent = !!note.title.trim() || note.points.some((p) => p.text.trim());
  const setPoints = (points: EPoint[]) => onChange({ ...note, points });
  const patchPoint = (id: string, p: Partial<EPoint>) => setPoints(note.points.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const insertAfter = (id: string | null, texts: string[] = ['']) => {
    const fresh = texts.map((t): EPoint => ({ ...blankPoint(), text: t }));
    const at = id ? note.points.findIndex((p) => p.id === id) + 1 : note.points.length;
    const next = [...note.points];
    next.splice(at, 0, ...fresh);
    setPoints(next);
    setFocus(fresh[fresh.length - 1].id);
  };

  const removePoint = (id: string, focusPrev: boolean) => {
    const i = note.points.findIndex((p) => p.id === id);
    const next = note.points.filter((p) => p.id !== id);
    setPoints(next);
    if (focusPrev && next.length) setFocus(next[Math.max(0, i - 1)].id);
  };

  const paste = (id: string, lines: string[]) => {
    const cur = note.points.find((p) => p.id === id);
    if (cur && !cur.text.trim()) {
      const [first, ...rest] = lines;
      const i = note.points.findIndex((p) => p.id === id);
      const fresh = rest.map((t): EPoint => ({ ...blankPoint(), text: t }));
      const next = note.points.map((p) => (p.id === id ? { ...p, text: first } : p));
      next.splice(i + 1, 0, ...fresh);
      setPoints(next);
      setFocus((fresh[fresh.length - 1] || cur).id);
    } else insertAfter(id, lines);
  };

  return (
    <motion.section
      layout="position"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={spring}
      className="relative focus-within:z-10 liquid rounded-3xl p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-xl bg-brand-soft text-brand text-sm font-extrabold grid place-items-center shrink-0 mt-0.5">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <AutoTextarea
            value={note.title}
            onChange={(e) => onChange({ ...note, title: e.target.value.replace(/\n/g, ' ') })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
            placeholder="Section title (optional), e.g. Budget review"
            aria-label="Section title"
            className="text-base font-extrabold tracking-tight placeholder:font-semibold placeholder:text-muted/60 py-1"
          />
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <button
              type="button" onClick={() => onChange({ ...note, important: !note.important })} aria-pressed={note.important}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${note.important ? 'bg-warn/10 text-warn border-warn/30' : 'bg-white/70 glass-fill text-muted border-line hover:text-ink'}`}
            >
              <motion.span animate={{ scale: note.important ? [1, 1.4, 1] : 1, rotate: note.important ? [0, 20, 0] : 0 }} transition={{ duration: 0.35 }}>★</motion.span> Important
            </button>
            <button
              type="button" onClick={() => onChange({ ...note, followUp: !note.followUp })} aria-pressed={note.followUp}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${note.followUp ? 'bg-brand-soft text-brand border-brand/30' : 'bg-white/70 glass-fill text-muted border-line hover:text-ink'}`}
            >
              <motion.span animate={{ scale: note.followUp ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.35 }}>⚑</motion.span> Follow-up
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (hasContent && !confirm ? setConfirm(true) : onRemove())}
          aria-label="Delete section"
          className={`shrink-0 h-8 rounded-lg text-xs font-bold transition-colors px-2 ${confirm ? 'bg-bad text-white' : 'text-muted hover:text-bad hover:bg-bad/10 w-8 text-sm'}`}
        >
          {confirm ? 'Delete?' : '✕'}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {note.points.map((p) => (
            <PointRow
              key={p.id}
              point={p}
              canRemove={note.points.length > 1}
              busy={busyId === p.id}
              people={people}
              setRef={(el) => setRef(p.id, el)}
              onPatch={(patch) => patchPoint(p.id, patch)}
              onRemove={() => removePoint(p.id, false)}
              onEnter={() => insertAfter(p.id)}
              onBackspaceEmpty={() => removePoint(p.id, true)}
              onPasteLines={(lines) => paste(p.id, lines)}
              onMakeTask={() => onMakeTask(p)}
              onUnlink={() => patchPoint(p.id, { taskId: undefined })}
            />
          ))}
        </AnimatePresence>
      </div>

      <button type="button" onClick={() => insertAfter(null)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:bg-brand-soft rounded-lg px-2.5 py-1.5 -ml-1 transition-colors">
        {Icon.plus(15)} Add a point
      </button>
    </motion.section>
  );
};

/* ───────── Step 3 ───────── */
export const MinutesStep = ({ notes, update, agenda, people, ctx }: {
  notes: ENote[]; update: (fn: (prev: ENote[]) => ENote[]) => void; agenda: EAgendaItem[]; people: PersonOption[]; ctx: MinutesContext;
}) => {
  const onChange = (next: ENote[]) => update(() => next);
  const toast = useToast();
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [focusReq, setFocusReq] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Move focus once the requested textarea exists (new rows mount a render later).
  useEffect(() => {
    if (!focusReq) return;
    const el = refs.current[focusReq];
    if (el) {
      el.focus();
      const n = el.value.length;
      try { el.setSelectionRange(n, n); } catch { /* ignore */ }
      setFocusReq(null);
    }
  });

  const agendaTitles = useMemo(() => agenda.map((a) => firstLine(a.text)).filter(Boolean), [agenda]);
  const missingFromAgenda = agendaTitles.filter((t) => !notes.some((n) => n.title.trim() === t));

  // Sections are created empty: the agenda's sub-points are NOT copied into the minutes.
  const addFromAgenda = () => {
    const fresh = missingFromAgenda.map((t) => blankNote(t));
    onChange([...notes.filter((n) => n.title.trim() || n.points.some((p) => p.text.trim())), ...fresh]);
    toast(`Added ${fresh.length} section${fresh.length === 1 ? '' : 's'} from your agenda`);
  };
  const addSection = () => {
    const n = blankNote();
    onChange([...notes, n]);
    setFocusReq(n.points[0].id);
  };

  const makeTask = async (note: ENote, point: EPoint) => {
    if (!point.text.trim()) { toast('Write the point first', 'error'); return; }
    setBusyId(point.id);
    try {
      const person = point.assignee ? people.find((u) => u.label === point.assignee) : undefined;
      const where = [ctx.meetingType || 'meeting', ctx.center && `at ${ctx.center}`, ctx.date && `on ${prettyDate(ctx.date)}`].filter(Boolean).join(' ');
      const topic = firstLine(note.title);
      const body = {
        title: `[${point.category}] ${point.text.trim()}`,
        description: `Created from a ${where}.${topic ? ` Topic: ${topic}.` : ''}`,
        dueDate: point.deadline || undefined,
      };
      const task = person ? await createTaskForUser(person.id, body) : await createTask(body);
      update((prev) => prev.map((n) => (n.id === note.id ? { ...n, points: n.points.map((p) => (p.id === point.id ? { ...p, taskId: String(task.id) } : p)) } : n)));
      toast(person ? `Task created for ${person.label}` : point.assignee ? `Couldn't find ${point.assignee}, so the task is yours` : 'Task added to your list');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the task', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">What was discussed?</h2>
          <p className="text-sm text-muted mt-1 max-w-md">Write the minutes in sections. Mark a point as a Decision or Lesson to give it an owner and deadline, and turn it into a task. You can leave this empty and fill it in later.</p>
        </div>
        <div className="flex items-center gap-2">
          {missingFromAgenda.length > 0 && notes.length > 0 && (
            <Button variant="soft" size="sm" onClick={addFromAgenda}>Add agenda topics ({missingFromAgenda.length})</Button>
          )}
          <Button size="sm" onClick={addSection}>{Icon.plus(14)} Add section</Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <Empty
          icon="🗒️"
          title="No minutes yet"
          hint={agendaTitles.length ? 'Start with one section for each agenda topic, or add your own. They begin empty so you can fill them in as you go.' : 'Add a section to begin, or skip this step and save the meeting now.'}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {agendaTitles.length > 0 && <Button variant="soft" onClick={addFromAgenda}>One section per agenda topic</Button>}
              <Button onClick={addSection}>Add a section</Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {notes.map((n, i) => (
              <SectionCard
                key={n.id}
                note={n}
                index={i}
                people={people}
                busyId={busyId}
                setRef={(id, el) => { refs.current[id] = el; }}
                setFocus={setFocusReq}
                onChange={(next) => update((prev) => prev.map((x) => (x.id === n.id ? next : x)))}
                onRemove={() => update((prev) => prev.filter((x) => x.id !== n.id))}
                onMakeTask={(p) => makeTask(n, p)}
              />
            ))}
          </AnimatePresence>
          <motion.button
            layout="position" type="button" onClick={addSection} whileTap={{ scale: 0.99 }}
            className="w-full rounded-2xl border-2 border-dashed border-line text-muted hover:text-ink hover:border-ink/25 py-4 text-sm font-bold transition-colors"
          >
            + Add another section
          </motion.button>
        </div>
      )}
    </div>
  );
};

