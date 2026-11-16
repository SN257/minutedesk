// OWNED BY the meeting-editor agent. Contract (do not change the props):
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import {
  createMeeting, createTask, createTaskForUser, getAllUsers, getCenters, getMeeting, getScheduledMeeting,
  getScheduledMeetings, updateMeeting, updateTask,
} from '../../lib/api';
import { Button, Empty, Skeleton } from '../../ui';
import { Icon } from '../../shell/icons';
import { AgendaStep } from './editor-agenda';
import { BasicsStep, Reveal } from './editor-basics';
import { clearDraft, loadDraft, saveDraft, type Draft } from './editor-draft';
import { MinutesStep, type PersonOption } from './editor-minutes';
import { ReviewStep, pendingTaskCount } from './editor-review';
import { STEPS } from './editor-stepper';
import { titleCase } from './helpers';
import { parseLocalDate } from '../../lib/date';
import {
  blankNote, emptyData, fromScheduled, fromServerMeeting, hasContent, isActionCategory, toAgendaItems, toPayload, validate, weekdayOf,
  type EditorData, type ENote,
} from './editor-types';

export interface MeetingEditorProps {
  /** 'new' to create, otherwise the meeting id to edit. */
  id: string | 'new';
  /** Optional prefill, e.g. when starting from a scheduled meeting. */
  scheduledMeetingId?: string | null;
  /** Called after a successful save or when the user cancels. */
  onDone: (savedId?: string) => void;
}

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
  center: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, transition: { duration: 0.14 } }),
};

const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Only the fields a scheduled meeting actually has - never blank out what the user already typed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scheduledPatch = (s: any, current: EditorData): Partial<EditorData> => {
  const f = fromScheduled(s) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    const empty = v === '' || v === null || (Array.isArray(v) && v.length === 0);
    if (!empty) out[k] = v;
  }
  out.scheduledMeetingId = f.scheduledMeetingId;
  if (!out.agenda) out.agenda = current.agenda;
  return out as Partial<EditorData>;
};

const MeetingEditor = ({ id, scheduledMeetingId = null, onDone }: MeetingEditorProps) => {
  const toast = useToast();
  const isEdit = id !== 'new';

  const [data, setData] = useState<EditorData>(emptyData);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [shake, setShake] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoTasks, setAutoTasks] = useState(true);

  const [centers, setCenters] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name?: string; email?: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scheduled, setScheduled] = useState<any[]>([]);

  const topRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const latest = useRef({ data, step, dirty });
  latest.current = { data, step, dirty };
  /** Task title/due date as first loaded, so edits to already-linked points can be pushed to their tasks. */
  const taskSnap = useRef<Map<string, { title: string; dueDate: string }>>(new Map());

  /* ───────── Load ───────── */
  useEffect(() => {
    let alive = true;
    doneRef.current = false;
    setLoading(true);
    setLoadError(null);
    setDirty(false);
    setDraft(null);
    setStep(0);
    setReached(isEdit ? STEPS.length - 1 : 0);

    getCenters().then((c) => alive && setCenters((c || []).filter((x) => x.isActive !== false).map((x) => x.name))).catch(() => {});
    getAllUsers().then((u) => alive && setUsers(u || [])).catch(() => {});
    if (!isEdit) getScheduledMeetings().then((s) => alive && setScheduled(Array.isArray(s) ? s : [])).catch(() => {});

    (async () => {
      let base = emptyData();
      if (isEdit) {
        const m = await getMeeting(id);
        base = fromServerMeeting(m);
        // Older meetings keep their agenda only on the scheduled meeting they came from.
        if (base.agenda.length === 0 && base.scheduledMeetingId) {
          try { base.agenda = toAgendaItems((await getScheduledMeeting(base.scheduledMeetingId))?.agenda); } catch { /* optional */ }
        }
      } else if (scheduledMeetingId) {
        try {
          base = { ...base, ...scheduledPatch(await getScheduledMeeting(scheduledMeetingId), base) };
        } catch { /* start blank if the scheduled meeting can't be read */ }
      }
      return base;
    })()
      .then((base) => {
        if (!alive) return;
        taskSnap.current = new Map(
          base.notes.flatMap((n) => n.points.filter((p) => p.taskId).map((p) => [p.id, { title: `[${p.category}] ${p.text.trim()}`, dueDate: p.deadline }] as const)),
        );
        setData(base);
        const d = loadDraft(id, scheduledMeetingId);
        if (d && hasContent(d.data)) setDraft(d);
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'Could not load this meeting'))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [id, scheduledMeetingId, isEdit, attempt]);

  /* ───────── Edit helpers (all mark the editor as changed) ───────── */
  const patch = useCallback((p: Partial<EditorData>) => {
    setDirty(true);
    setData((d) => ({ ...d, ...p }));
  }, []);
  const updateNotes = useCallback((fn: (prev: ENote[]) => ENote[]) => {
    setDirty(true);
    setData((d) => ({ ...d, notes: fn(d.notes) }));
  }, []);
  const pickScheduled = useCallback((s: unknown) => {
    setDirty(true);
    setData((d) => ({ ...d, ...scheduledPatch(s, d) }));
    toast('Details filled in from the scheduled meeting', 'info');
  }, [toast]);

  /* ───────── Autosave draft ───────── */
  useEffect(() => {
    if (loading || draft || !dirty || doneRef.current || !hasContent(data)) return;
    const t = setTimeout(() => {
      const at = Date.now();
      if (saveDraft(id, scheduledMeetingId, { data, step, savedAt: at })) setSavedAt(at);
    }, 700);
    return () => clearTimeout(t);
  }, [data, step, dirty, draft, loading, id, scheduledMeetingId]);

  // Flush on leave so the last few keystrokes are never lost.
  useEffect(() => () => {
    const l = latest.current;
    if (!doneRef.current && l.dirty && hasContent(l.data)) saveDraft(id, scheduledMeetingId, { data: l.data, step: l.step, savedAt: Date.now() });
  }, [id, scheduledMeetingId]);

  /* ───────── Derived ───────── */
  const problems = useMemo(() => validate(data), [data]);
  const errors = useMemo(() => {
    if (!showErrors) return {};
    const m: Record<string, string> = {};
    problems.forEach((p) => { if (!m[p.field]) m[p.field] = p.message; });
    return m;
  }, [problems, showErrors]);
  const people: PersonOption[] = useMemo(
    () => users.map((u) => ({ id: u.id, label: (u.name || u.email || '').trim() })).filter((p) => p.label),
    [users],
  );
  const peopleNames = useMemo(() => people.map((p) => p.label), [people]);

  /* ───────── Navigation ───────── */
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const go = (to: number) => {
    if (to === step || to < 0 || to >= STEPS.length) return;
    if (to > step) {
      const first = problems.find((p) => p.step >= step && p.step < to);
      if (first) {
        setShowErrors(true);
        setShake((s) => s + 1);
        toast(first.message, 'error');
        return;
      }
    }
    // Entering the minutes: keep the sections in step with the agenda (add new, drop removed-and-empty, follow renames).
    if (to === 3) {
      const first = (t: string) => t.split('\n')[0].trim();
      const written = (n: ENote) => n.points.some((p) => p.text.trim());
      let notes = data.notes.filter((n) => !(n.agendaId && !written(n) && !data.agenda.some((a) => a.id === n.agendaId)));
      data.agenda.forEach((a) => {
        const t = first(a.text);
        const i = notes.findIndex((n) => n.agendaId === a.id);
        if (i >= 0) {
          const n = notes[i];
          if (t && t !== n.agendaTitle && n.title.trim() === (n.agendaTitle || '')) notes[i] = { ...n, title: t, agendaTitle: t };
          else if (t && t !== n.agendaTitle) notes[i] = { ...n, agendaTitle: t };
          return;
        }
        if (!t) return;
        // A section that already carries this title (older drafts): link it so later renames follow.
        const same = notes.findIndex((n) => !n.agendaId && n.title.trim() === t);
        if (same >= 0) { notes[same] = { ...notes[same], agendaId: a.id, agendaTitle: t }; return; }
        // An empty, unlinked section whose title no longer matches any agenda item is the old name of this item: rename it.
        const old = notes.findIndex((n) => !n.agendaId && !written(n) && n.title.trim() && !data.agenda.some((x) => first(x.text) === n.title.trim()));
        if (old >= 0) { notes[old] = { ...notes[old], title: t, agendaId: a.id, agendaTitle: t }; return; }
        notes = [...notes, { ...blankNote(t), agendaId: a.id, agendaTitle: t }];
      });
      notes = notes.filter((n) => n.title.trim() || written(n));
      if (JSON.stringify(notes) !== JSON.stringify(data.notes)) patch({ notes });
    }
    setDir(to > step ? 1 : -1);
    setStep(to);
    setReached((r) => Math.max(r, to));
    setTimeout(scrollTop, 30);
  };

  const cancel = () => {
    if (dirty && hasContent(data)) toast('Draft kept - it will be here when you come back', 'info');
    onDone();
  };

  const restore = () => {
    if (!draft) return;
    setData(draft.data);
    setDir(1);
    setStep(draft.step);
    setReached(Math.max(draft.step, isEdit ? STEPS.length - 1 : draft.step));
    setDirty(true);
    setDraft(null);
    toast('Draft restored');
  };
  const discard = () => {
    clearDraft(id, scheduledMeetingId);
    setDraft(null);
  };

  /* ───────── Save ───────── */
  const createPendingTasks = async (d: EditorData): Promise<EditorData> => {
    let failed = 0;
    const notes: ENote[] = [];
    for (const n of d.notes) {
      const points = [];
      for (const p of n.points) {
        if (isActionCategory(p.category) && p.text.trim() && p.assignee && p.deadline && !p.taskId) {
          try {
            const person = people.find((x) => x.label === p.assignee);
            const body = {
              title: `[${p.category}] ${p.text.trim()}`,
              description: `Created from a ${d.meetingType || 'meeting'}${d.center ? ` at ${d.center}` : ''}.${n.title.trim() ? ` Topic: ${n.title.trim().split('\n')[0]}.` : ''}`,
              dueDate: p.deadline,
            };
            const t = person ? await createTaskForUser(person.id, body) : await createTask(body);
            points.push({ ...p, taskId: String(t.id) });
            continue;
          } catch { failed += 1; }
        }
        points.push(p);
      }
      notes.push({ ...n, points });
    }
    if (failed) toast(`${failed} task${failed === 1 ? '' : 's'} couldn't be created, but your meeting will still be saved`, 'info');
    return { ...d, notes };
  };

  const syncLinkedTasks = async (d: EditorData) => {
    const jobs: Promise<unknown>[] = [];
    d.notes.forEach((n) => n.points.forEach((p) => {
      const was = p.taskId && taskSnap.current.get(p.id);
      if (!was || !p.text.trim() || !isActionCategory(p.category)) return;
      const title = `[${p.category}] ${p.text.trim()}`;
      if (title !== was.title || p.deadline !== was.dueDate) {
        jobs.push(updateTask(p.taskId as string, { title, ...(p.deadline ? { dueDate: p.deadline } : {}) }).catch(() => {}));
      }
    }));
    await Promise.all(jobs);
  };

  const save = async () => {
    const first = problems[0];
    if (first) {
      setShowErrors(true);
      setShake((s) => s + 1);
      toast(first.message, 'error');
      setDir(first.step > step ? 1 : -1);
      setStep(first.step);
      return;
    }
    setSaving(true);
    try {
      let working: EditorData = { ...data, day: data.day || weekdayOf(data.date) };
      if (autoTasks && pendingTaskCount(working) > 0) working = await createPendingTasks(working);
      if (isEdit) await syncLinkedTasks(working);
      const payload: Record<string, unknown> = toPayload(working);
      if (isEdit) {
        // An update ignores undefined, so clear fields that no longer apply (e.g. switched to a one-on-one).
        for (const k of ['personName', 'day', 'place', 'attendance', 'presentSantName', 'center', 'scheduledMeetingId']) payload[k] = payload[k] ?? null;
      }
      const saved = isEdit ? await updateMeeting(id, payload) : await createMeeting(payload);
      doneRef.current = true;
      clearDraft(id, scheduledMeetingId);
      toast(isEdit ? 'Meeting updated' : 'Meeting saved');
      onDone(String(saved?.id ?? (isEdit ? id : '')) || undefined);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the meeting. Your draft is safe.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ───────── Render ───────── */
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pt-2" aria-busy>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Empty
        icon="😕"
        title="We couldn't open this meeting"
        hint={loadError}
        action={<div className="flex justify-center gap-2"><Button variant="soft" onClick={() => onDone()}>Go back</Button><Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button></div>}
      />
    );
  }

  const last = step === STEPS.length - 1;
  const linked = data.scheduledMeetingId;

  const heads = ["Let's set the scene", 'Where and who?', "What's on the agenda?", 'What was discussed?', 'Almost done'];
  const nextHints = ['Type, date and time', 'Center, place and people', 'What was planned', 'What was discussed', 'Check it and save'];
  const one = data.meetingType === 'One o one';
  const passTitle = one ? (data.personName ? `One on one with ${data.personName}` : 'One on one') : data.center ? titleCase(data.center) : data.meetingType || 'Your meeting';
  const pd = data.date ? parseLocalDate(data.date) : null;
  const agendaN = data.agenda.filter((a) => a.text.trim()).length;
  const pointsN = data.notes.reduce((n, x) => n + x.points.filter((q) => q.text.trim()).length, 0);

  return (
    <div ref={topRef} className="max-w-6xl mx-auto scroll-mt-4 flex flex-col max-md:min-h-[100cqh]">
      {/* Header strip */}
      <div className="liquid rounded-[2rem] p-3 sm:p-4 mb-3 sm:mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="button" onClick={cancel} aria-label="Close editor" className="shrink-0 w-11 h-11 rounded-full bg-ink/[0.06] hover:bg-ink/[0.12] grid place-items-center text-muted hover:text-ink transition-colors">✕</button>
        <div className="min-w-0 flex-1 basis-52">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand">{isEdit ? 'Edit minutes' : 'Log minutes'} · Step {step + 1} of {STEPS.length}</p>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight truncate">{heads[step]}</h1>
        </div>
        <nav aria-label="Progress" className="flex items-center gap-1 rounded-full bg-ink/[0.05] p-1">
          {STEPS.map((st, i) => {
            const active = i === step;
            const done = i < step;
            const clickable = i <= reached || i === step + 1;
            return (
              <button key={st.key} type="button" disabled={!clickable} onClick={() => clickable && go(i)} aria-current={active ? 'step' : undefined}
                className={`relative rounded-full px-3 py-2 text-sm font-bold inline-flex items-center gap-1.5 transition-colors disabled:cursor-default ${active ? 'text-white' : done ? 'text-ink' : 'text-muted'}`}>
                {active && <motion.span layoutId="ed-pill" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
                <span className={`relative w-5 h-5 rounded-full grid place-items-center text-[11px] font-extrabold ${active ? 'bg-white/20' : done ? 'bg-good/20 text-good' : 'bg-ink/10'}`}>{done ? Icon.check(12) : i + 1}</span>
                <span className={`relative ${active ? '' : 'hidden md:inline'}`}>{st.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Draft restore prompt */}
      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-2xl border border-brand/25 bg-brand-soft/60 p-4 flex flex-wrap items-center gap-3">
              <span className="text-xl" aria-hidden>🗂️</span>
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-bold">You have an unsaved draft</p>
                <p className="text-xs text-muted">Last edited {new Date(draft.savedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Pick up where you left off?</p>
              </div>
              <div className="flex gap-2">
                <Button variant="soft" size="sm" onClick={discard}>Start fresh</Button>
                <Button size="sm" onClick={restore}>Restore draft</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link to a scheduled meeting (nothing is ever locked) */}
      <Reveal show={!!linked}>
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-brand-soft/60 border border-brand/15 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-brand">Linked to a scheduled meeting. Everything here stays editable.</span>
          <button type="button" onClick={() => patch({ scheduledMeetingId: null })} className="font-bold text-muted hover:text-ink shrink-0">Unlink</button>
        </div>
      </Reveal>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_19rem] gap-3 sm:gap-5 items-start">
        <div className="min-w-0">
      <div inert={!!draft} className={`min-w-0 ${draft ? 'opacity-50 transition-opacity' : 'transition-opacity'}`}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
            {step === 0 && (
              <div className="liquid rounded-3xl p-4 sm:p-6">
                <BasicsStep
                  data={data}
                  patch={patch}
                  errors={errors}
                  centers={centers}
                  people={peopleNames}
                  scheduled={scheduled}
                  canPickScheduled={!isEdit}
                  onPickScheduled={pickScheduled}
                />
              </div>
            )}
            {step === 1 && (
              <div className="liquid rounded-3xl p-4 sm:p-6">
                <BasicsStep part="where" data={data} patch={patch} errors={errors} centers={centers} people={peopleNames} scheduled={scheduled} canPickScheduled={!isEdit} onPickScheduled={pickScheduled} />
              </div>
            )}
            {step === 2 && <AgendaStep items={data.agenda} onChange={(agenda) => patch({ agenda })} />}
            {step === 3 && (
              <MinutesStep
                notes={data.notes}
                update={updateNotes}
                agenda={data.agenda}
                people={people}
                ctx={{ meetingType: data.meetingType, center: data.center, date: data.date }}
              />
            )}
            {step === 4 && (
              <ReviewStep data={data} problems={problems} goTo={go} autoTasks={autoTasks} setAutoTasks={setAutoTasks} isEdit={isEdit} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>


        </div>

        {/* Meeting pass: live ticket */}
        <aside aria-label="Meeting pass" className="hidden xl:block sticky top-0 liquid rounded-[2rem] overflow-hidden">
          <div className="hero-ink p-5 relative overflow-hidden">
            <span aria-hidden className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-xl" />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-60">Meeting pass</p>
            <div className="relative flex items-end gap-4 mt-3">
              <div className="leading-none">
                <p className="text-5xl font-extrabold tabular-nums">{pd ? pd.getDate() : '–'}</p>
                <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-70 mt-1.5">{pd ? pd.toLocaleDateString(undefined, { month: 'short', weekday: 'short' }) : 'No date'}</p>
              </div>
              <p className="text-lg font-bold leading-snug break-words min-w-0 pb-0.5">{passTitle}</p>
            </div>
            {data.meetingType && <span className="relative inline-block mt-4 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider">{data.meetingType}</span>}
          </div>
          <div className="border-t-2 border-dashed border-line" />
          <div className="p-5 space-y-3 text-sm">
            {[
              { l: 'Time', v: data.startTime ? `${data.startTime}${data.endTime ? ` – ${data.endTime}` : ''}` : '' },
              { l: 'Place', v: data.place },
              { l: 'Attending', v: data.attendance.length ? `${data.attendance.length} people` : '' },
            ].map((r) => (
              <div key={r.l} className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">{r.l}</span>
                <span className={`font-semibold text-right truncate ${r.v ? '' : 'text-muted/60'}`}>{r.v || '—'}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-2xl bg-ink/[0.05] px-3 py-2.5"><p className="text-2xl font-extrabold tabular-nums leading-none">{agendaN}</p><p className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Agenda</p></div>
              <div className="rounded-2xl bg-ink/[0.05] px-3 py-2.5"><p className="text-2xl font-extrabold tabular-nums leading-none">{pointsN}</p><p className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Points</p></div>
            </div>
            {savedAt && <p className="text-xs text-muted flex items-center gap-1.5 pt-1"><span className="w-1.5 h-1.5 rounded-full bg-good" /> Draft saved {timeLabel(savedAt)}</p>}
          </div>
        </aside>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 md:bottom-4 z-30 mt-auto pt-3 sm:pt-5">
        <div className="glass-pop rounded-[2rem] p-2.5 sm:p-3 flex items-center gap-3 sm:gap-5">
          <button type="button" onClick={() => (step === 0 ? cancel() : go(step - 1))} className="shrink-0 rounded-full px-5 py-3 text-sm font-bold text-ink-2 hover:bg-ink/[0.06] transition-colors">
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          <div className="min-w-0 flex-1 hidden sm:block text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{last ? 'Last step' : 'Up next'}</p>
            <p className="text-sm font-bold truncate">{last ? 'Review and save your minutes' : `${STEPS[step + 1].label} · ${nextHints[step + 1]}`}</p>
          </div>
          <span className="hidden md:flex items-center gap-1.5 shrink-0" aria-hidden>
            {STEPS.map((st, i) => <span key={st.key} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-ink' : i < step ? 'w-1.5 bg-ink/60' : 'w-1.5 bg-ink/20'}`} />)}
          </span>
          <motion.div key={shake} className="ml-auto sm:ml-0 shrink-0" initial={{ x: 0 }} animate={{ x: shake ? [0, -8, 8, -5, 5, 0] : 0 }} transition={{ duration: 0.4 }}>
            {last ? (
              <Button size="lg" loading={saving} onClick={save} className="!rounded-full !px-8">
                {Icon.check(18)} {isEdit ? 'Update minutes' : 'Save minutes'}
              </Button>
            ) : (
              <Button size="lg" onClick={() => go(step + 1)} className="!rounded-full !px-8">
                {step === 3 && data.notes.length === 0 ? 'Skip minutes' : 'Next'} {Icon.arrow(18)}
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MeetingEditor;
