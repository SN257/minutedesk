import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/siteConfig';
import { AnimatePresence, motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { spring } from '../../lib/motion';
import { getLocalDateString, parseLocalDate } from '../../lib/date';
import { useToast } from '../../lib/toast';
import { createScheduledMeeting, deleteScheduledMeeting, getCenters, getScheduledMeetings, updateScheduledMeeting } from '../../lib/api';
import { Badge, Button, Card, Field, Input, Select, Skeleton, Stagger, useAsync } from '../../ui';
import { BackLink, Ico } from './bits';
import {
  DURATIONS, MEETING_TYPES, addMinutes, d10, durationLabel, hhmm, longDate, setListTab, shortDate, timeRange, titleCase, toMinutes, typeTone,
  type Scheduled,
} from './helpers';

/* ───────────────────────── Form (used in the screen below and in a Drawer on the list) ───────────────────────── */

interface AgendaRow { k: number; text: string; fresh?: boolean }
let rowKey = 0;
const mkRow = (text = '', fresh = false): AgendaRow => ({ k: ++rowKey, text, fresh });

export const ScheduleForm = ({ initial, defaultDate, existing = [], onDone, onCancel, onDateChange }: {
  initial?: Scheduled | null;
  defaultDate?: string;
  existing?: Scheduled[];
  onDone: (kind: 'created' | 'updated' | 'deleted') => void;
  onCancel?: () => void;
  onDateChange?: (date: string) => void;
}) => {
  const toast = useToast();
  const today = getLocalDateString();
  const [date, setDate] = useState(d10(initial?.date) || defaultDate || today);
  const [start, setStart] = useState(hhmm(initial?.startTime) || '10:00');
  const [duration, setDuration] = useState(initial?.duration || 30);
  const [type, setType] = useState(initial?.meetingType || '');
  const [center, setCenter] = useState(initial?.center || '');
  const [people, setPeople] = useState(String(initial?.participants ?? 3));
  const [agenda, setAgenda] = useState<AgendaRow[]>(() => (initial?.agenda?.length ? initial.agenda.map((a) => mkRow(a)) : [mkRow()]));
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [tried, setTried] = useState(false);
  const centers = useAsync(() => getCenters().catch(() => []), []);

  // The calendar on the full screen can change the day for us.
  useEffect(() => { if (defaultDate && defaultDate !== date) setDate(defaultDate); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [defaultDate]);

  const centerOptions = useMemo(() => {
    const names = (centers.data || []).filter((c) => c.isActive !== false).map((c) => titleCase(c.name));
    if (center && !names.some((n) => n.toLowerCase() === center.toLowerCase())) names.unshift(center);
    return names;
  }, [centers.data, center]);

  const end = addMinutes(start || '00:00', duration);
  const isPast = !initial && date < today;
  const clashes = useMemo(() => {
    if (!start) return [];
    const s = toMinutes(start);
    const e = s + duration;
    return existing.filter((x) => x.id !== initial?.id && d10(x.date) === date && toMinutes(x.startTime) < e && s < toMinutes(x.endTime));
  }, [existing, initial, date, start, duration]);

  const problem = !date ? 'Pick a date.' : !start ? 'Pick a start time.' : isPast ? 'Pick today or a day in the future.' : '';

  const save = async () => {
    setTried(true);
    if (problem) return;
    setSaving(true);
    const payload = {
      date,
      startTime: start,
      endTime: end,
      duration,
      meetingType: type || null,
      center: center || null,
      participants: Math.max(1, parseInt(people, 10) || 1),
      agenda: agenda.map((a) => a.text.trim()).filter(Boolean),
    };
    try {
      if (initial) await updateScheduledMeeting(initial.id, payload);
      else await createScheduledMeeting(payload);
      toast(initial ? 'Meeting updated' : 'Meeting scheduled');
      onDone(initial ? 'updated' : 'created');
    } catch (e) {
      toast((e as Error).message || 'Could not save the meeting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    setSaving(true);
    try {
      await deleteScheduledMeeting(initial.id);
      toast('Scheduled meeting deleted');
      onDone('deleted');
    } catch (e) {
      toast((e as Error).message || 'Could not delete the meeting', 'error');
      setSaving(false);
    }
  };

  const setRow = (k: number, text: string) => setAgenda((r) => r.map((x) => (x.k === k ? { ...x, text, fresh: false } : x)));
  const addRowAfter = (k: number) => setAgenda((r) => {
    const i = r.findIndex((x) => x.k === k);
    const next = [...r];
    next.splice(i + 1, 0, mkRow('', true));
    return next;
  });
  const dropRow = (k: number) => setAgenda((r) => (r.length > 1 ? r.filter((x) => x.k !== k) : [mkRow()]));

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input type="date" value={date} min={initial ? undefined : today} onChange={(e) => { setDate(e.target.value); onDateChange?.(e.target.value); }} />
        </Field>
        <Field label="Starts at">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Length">
          <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{durationLabel(d)}</option>)}
          </Select>
        </Field>
        <div>
          <span className="block text-xs font-bold text-ink-2 mb-1.5">Ends at</span>
          <div className="px-3.5 py-2.5 text-sm font-semibold tabular-nums rounded-xl bg-ink/[0.04] text-ink-2">{end}</div>
        </div>
      </div>

      {clashes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 rounded-xl bg-warn/10 text-warn px-3.5 py-2.5 text-xs font-semibold">
          <Ico name="bell" size={15} />
          <span>Heads up: this overlaps with {clashes.map((c) => `${titleCase(c.center) || c.meetingType || 'a meeting'} (${timeRange(c.startTime, c.endTime)})`).join(', ')}.</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Choose a type</option>
            {[...new Set([...MEETING_TYPES, ...(type ? [type] : [])])].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Center">
          <Select value={center} onChange={(e) => setCenter(e.target.value)}>
            <option value="">{centers.loading ? 'Loading…' : 'Choose a center'}</option>
            {centerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
      <div className="max-w-[10rem]">
        <Field label="Expected people">
          <Input type="number" min={1} value={people} onChange={(e) => setPeople(e.target.value)} />
        </Field>
      </div>

      <div>
        <span className="block text-xs font-bold text-ink-2 mb-1.5">Agenda <span className="font-medium text-muted">(optional)</span></span>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {agenda.map((r, i) => (
              <motion.div key={r.k} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring} className="flex items-center gap-2">
                <span className="w-6 text-xs font-bold text-muted text-right tabular-nums">{i + 1}</span>
                <Input
                  value={r.text}
                  autoFocus={r.fresh}
                  placeholder="What needs to be discussed?"
                  onChange={(e) => setRow(r.k, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (r.text.trim()) addRowAfter(r.k); } }}
                />
                <button type="button" onClick={() => dropRow(r.k)} aria-label="Remove agenda item" className="w-9 h-9 shrink-0 rounded-lg grid place-items-center text-muted hover:text-bad hover:bg-bad/10"><Ico name="x" size={15} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button type="button" onClick={() => addRowAfter(agenda[agenda.length - 1].k)} className="mt-2 ml-8 text-xs font-bold text-brand hover:underline">+ Add another item</button>
      </div>

      {tried && problem && <p className="text-xs font-semibold text-bad">{problem}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" loading={saving} size="lg" className="flex-1 sm:flex-none">{initial ? 'Save changes' : 'Schedule meeting'}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>}
        {initial && (
          <div className="ml-auto flex items-center gap-2">
            {confirmDel ? (
              <>
                <span className="text-xs font-semibold text-muted">Delete for good?</span>
                <Button type="button" size="sm" variant="danger" onClick={remove} loading={saving}>Yes, delete</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDel(false)} disabled={saving}>No</Button>
              </>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmDel(true)} className="text-bad hover:text-bad"><Ico name="trash" size={15} /> Delete</Button>
            )}
          </div>
        )}
      </div>
    </form>
  );
};

/* ───────────────────────── Full scheduling screen (#/meetings/schedule) ───────────────────────── */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Schedule = ({ go }: ViewProps) => {
  const t = useT();
  const today = getLocalDateString();
  const { data, loading, error, reload } = useAsync<Scheduled[]>(() => getScheduledMeetings(undefined, undefined, true), []);
  const all = data || [];
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
  const [editing, setEditing] = useState<Scheduled | null>(null);
  const [dir, setDir] = useState(1);
  const formRef = useRef<HTMLDivElement>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, Scheduled[]>();
    all.forEach((m) => { const k = d10(m.date); map.set(k, [...(map.get(k) || []), m]); });
    map.forEach((list) => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [all]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= total; d++) out.push(getLocalDateString(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const month = (delta: number) => { setDir(delta); setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1)); };
  const pick = (d: string) => {
    setSelected(d);
    if (d.slice(0, 7) !== getLocalDateString(cursor).slice(0, 7)) { const p = parseLocalDate(d); setCursor(new Date(p.getFullYear(), p.getMonth(), 1)); }
  };
  const edit = (m: Scheduled | null) => {
    setEditing(m);
    if (m) pick(d10(m.date));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const leave = () => { setListTab('scheduled'); go('meetings'); };

  const dayList = byDate.get(selected) || [];

  return (
    <Stagger>
      <BackLink onClick={leave}>Meetings</BackLink>
      <Card className="p-5 sm:p-6 mb-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-brand-soft text-brand grid place-items-center"><Ico name="calendar" size={22} /></span>
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t('schedule.title')}</h1>
          <p className="text-muted mt-0.5 text-sm">1. Pick a day &nbsp;·&nbsp; 2. Set the time &nbsp;·&nbsp; 3. Add an agenda</p>
        </div>
        <span className="text-xs font-bold rounded-full bg-ink/[0.06] px-3.5 py-2">{longDate(selected)}</span>
      </Card>

      <div className="grid lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-3 space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold tracking-tight">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setDir(-1); const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(today); }} className="px-3 h-9 rounded-lg text-xs font-bold text-muted hover:text-ink hover:bg-ink/5">Today</button>
                <button type="button" onClick={() => month(-1)} aria-label="Previous month" className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/5"><Ico name="left" size={18} /></button>
                <button type="button" onClick={() => month(1)} aria-label="Next month" className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-ink hover:bg-ink/5"><Ico name="right" size={18} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center mb-1">
              {WEEKDAYS.map((w) => <span key={w} className="text-[10px] font-extrabold uppercase tracking-wider text-muted py-1">{w}</span>)}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={getLocalDateString(cursor)} initial={{ opacity: 0, x: 24 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 * dir }} transition={{ duration: 0.18 }} className="grid grid-cols-7 gap-y-1">
                {cells.map((d, i) => {
                  if (!d) return <span key={i} />;
                  const count = byDate.get(d)?.length || 0;
                  const sel = d === selected;
                  const past = d < today;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => pick(d)}
                      aria-label={shortDate(d)}
                      aria-pressed={sel}
                      className={`relative h-12 sm:h-14 rounded-2xl text-sm font-bold transition-colors ${sel ? 'text-white' : past ? 'text-muted/60 hover:bg-ink/5' : count > 0 ? 'text-ink bg-brand-soft/60 hover:bg-brand-soft' : 'text-ink hover:bg-ink/5'}`}
                    >
                      {sel && <motion.span layoutId="cal-sel" transition={spring} className="absolute inset-0.5 rounded-2xl bg-ink" />}
                      {d === today && !sel && <span className="absolute inset-0.5 rounded-2xl ring-2 ring-brand/40" />}
                      <span className="relative tabular-nums">{Number(d.slice(8))}</span>
                      {count > 0 && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {Array.from({ length: Math.min(count, 3) }).map((_, j) => <span key={j} className={`w-1 h-1 rounded-full ${sel ? 'bg-white/70 glass-fill' : 'bg-brand'}`} />)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold tracking-tight">{selected === today ? 'Today' : shortDate(selected)}</h3>
              <span className="text-xs font-semibold text-muted">{dayList.length === 0 ? 'Free' : `${dayList.length} scheduled`}</span>
            </div>
            {loading && !data ? (
              <Skeleton className="h-16" />
            ) : error ? (
              <p className="text-sm text-bad">{error} <button className="underline font-semibold" onClick={reload}>Try again</button></p>
            ) : dayList.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">Nothing booked on this day. Fill in the form to add something.</p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {dayList.map((m) => (
                    <motion.button
                      key={m.id}
                      layout
                      type="button"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      whileHover={{ y: -2 }} transition={spring}
                      onClick={() => edit(m)}
                      className={`w-full text-left flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-colors ${editing?.id === m.id ? 'bg-brand-soft ring-2 ring-brand/40' : 'bg-ink/[0.04] hover:bg-ink/[0.08]'}`}
                    >
                      <div className="text-sm font-extrabold tabular-nums w-24 shrink-0">{hhmm(m.startTime)}<span className="text-muted font-semibold"> – {hhmm(m.endTime)}</span></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{titleCase(m.center) || m.meetingType || 'Meeting'}</p>
                        {m.agenda && m.agenda.length > 0 && <p className="text-xs text-muted truncate">{m.agenda.length} agenda {m.agenda.length === 1 ? 'item' : 'items'}</p>}
                      </div>
                      {m.meetingType && <Badge tone={typeTone(m.meetingType)}>{m.meetingType}</Badge>}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 lg:sticky lg:top-2" ref={formRef}>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-lg font-extrabold tracking-tight">{editing ? 'Edit meeting' : 'New meeting'}</h2>
              {editing && <button type="button" onClick={() => setEditing(null)} className="text-xs font-bold text-brand hover:underline">Schedule a new one instead</button>}
            </div>
            <ScheduleForm
              key={editing?.id || 'new'}
              initial={editing}
              defaultDate={selected}
              existing={all}
              onDateChange={pick}
              onDone={(kind) => { reload(); if (kind !== 'created') setEditing(null); if (kind === 'created') setListTab('scheduled'); }}
              onCancel={editing ? () => setEditing(null) : undefined}
            />
          </Card>
        </div>
      </div>
    </Stagger>
  );
};

export default Schedule;
