import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { Badge, Field, Input, Select } from '../../ui';
import { Chip, FieldError } from './editor-fields';
import {
  MEETING_TYPES, addMinutes, isOneOnOne, prettyDate, prettyTime, quickDates, weekdayOf,
  type EditorData,
} from './editor-types';

/** Height-animated show/hide for optional fields. */
export const Reveal = ({ show, children }: { show: boolean; children: ReactNode }) => (
  <AnimatePresence initial={false}>
    {show && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        style={{ overflow: 'hidden' }}
        // Padding keeps focus rings from being clipped by the overflow.
        className="-mx-1 px-1 -my-1 py-1"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

const SectionTitle = ({ n, title, hint }: { n: string; title: string; hint?: string }) => (
  <div className="flex items-baseline gap-2.5 mb-3">
    <span className="text-[11px] font-extrabold text-brand bg-brand-soft rounded-md px-1.5 py-0.5">{n}</span>
    <div>
      <h3 className="font-extrabold tracking-tight">{title}</h3>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  </div>
);

/* ───────── Who was present: chips + people suggestions ───────── */
const AttendanceInput = ({ value, onChange, people, invalid }: { value: string[]; onChange: (v: string[]) => void; people: string[]; invalid?: boolean }) => {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const name = raw.trim().replace(/,$/, '').trim();
    if (!name) return;
    if (!value.some((v) => v.toLowerCase() === name.toLowerCase())) onChange([...value, name]);
    setText('');
  };

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    return people.filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()) && (!q || p.toLowerCase().includes(q))).slice(0, 6);
  }, [people, value, text]);

  return (
    <div>
      <div
        onClick={() => ref.current?.focus()}
        className={`flex flex-wrap items-center gap-2 bg-white/70 glass-fill border rounded-xl px-2.5 py-2 min-h-[46px] cursor-text transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 ${invalid ? 'border-bad' : 'border-line'}`}
      >
        <AnimatePresence initial={false}>
          {value.map((n) => (
            <motion.span
              key={n}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-brand-soft text-brand text-sm font-semibold"
            >
              {n}
              <button type="button" aria-label={`Remove ${n}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== n)); }} className="w-5 h-5 rounded-full grid place-items-center hover:bg-brand/15 text-xs">✕</button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={ref}
          value={text}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(text); }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => { add(text); setTimeout(() => setFocused(false), 150); }}
          placeholder={value.length ? 'Add another…' : 'Type a name and press Enter'}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-1 px-1 placeholder:text-muted/70"
        />
      </div>
      <Reveal show={focused && suggestions.length > 0}>
        <div className="flex flex-wrap gap-1.5 pt-2.5">
          {suggestions.map((p) => (
            <Chip key={p} onClick={() => { onChange([...value, p]); setText(''); }}>+ {p}</Chip>
          ))}
        </div>
      </Reveal>
    </div>
  );
};

/* ───────── Step 1 ───────── */
export interface BasicsProps {
  data: EditorData;
  patch: (p: Partial<EditorData>) => void;
  errors: Record<string, string>;
  centers: string[];
  people: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduled: any[];
  canPickScheduled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPickScheduled: (m: any) => void;
  /** 'basics' = type + date + time; 'where' = center, place and attendance. */
  part?: 'basics' | 'where';
}

export const BasicsStep = ({ data, patch, errors, centers, people, scheduled, canPickScheduled, onPickScheduled, part = 'basics' }: BasicsProps) => {
  const one = isOneOnOne(data.meetingType);
  const hasType = !!data.meetingType;
  const dates = quickDates();

  const matching = useMemo(() => {
    if (!canPickScheduled || !data.meetingType) return [];
    const t = data.meetingType.trim().toLowerCase();
    return scheduled.filter((m) => {
      const x = String(m.meetingType || '').trim().toLowerCase();
      return x && (x === t || x.includes(t) || t.includes(x));
    });
  }, [scheduled, data.meetingType, canPickScheduled]);

  const centerOptions = data.center && !centers.includes(data.center) ? [data.center, ...centers] : centers;

  return (
    <div className="space-y-8">
      {part === 'basics' && (
        <>
      {/* What kind of meeting */}
      <section>
        <SectionTitle n="1" title="What kind of meeting was it?" hint="This decides which details we ask for." />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {MEETING_TYPES.map((t) => {
            const on = data.meetingType === t.key;
            return (
              <motion.button
                key={t.key}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => patch({ meetingType: t.key })}
                className={`relative text-left rounded-2xl border px-4 py-3.5 min-h-[64px] transition-colors ${on ? 'border-transparent' : errors.meetingType ? 'border-bad/50 bg-white/70 glass-fill' : 'border-line bg-white/70 glass-fill hover:border-ink/30'}`}
              >
                {on && <motion.span layoutId="type-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-ink shadow-card" />}
                <span className={`relative block font-extrabold text-sm ${on ? 'text-white' : 'text-ink'}`}>{t.key}</span>
                <span className={`relative block text-[11px] mt-0.5 ${on ? 'text-white/70' : 'text-muted'}`}>{t.hint}</span>
              </motion.button>
            );
          })}
        </div>
        <FieldError message={errors.meetingType} />

        <Reveal show={matching.length > 0}>
          <div className="mt-4 rounded-2xl bg-brand-soft/60 border border-brand/15 p-3.5">
            <p className="text-xs font-bold text-brand mb-2">Already scheduled? Start from one and we'll fill the details in.</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {matching.slice(0, 12).map((m) => {
                const on = data.scheduledMeetingId === String(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onPickScheduled(m)}
                    className={`shrink-0 text-left rounded-xl border px-3 py-2 text-xs transition-colors ${on ? 'bg-brand text-white border-brand' : 'bg-white/70 glass-fill border-line hover:border-brand/40'}`}
                  >
                    <span className="block font-bold">{prettyDate(String(m.date).slice(0, 10))}</span>
                    <span className={`block ${on ? 'text-white/80' : 'text-muted'}`}>{prettyTime(m.startTime)} – {prettyTime(m.endTime)}{m.center ? ` · ${m.center}` : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* When */}
      <section>
        <SectionTitle n="2" title="When was it?" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Field label="Date">
              <Input type="date" value={data.date} onChange={(e) => patch({ date: e.target.value, day: weekdayOf(e.target.value) })} className={errors.date ? 'border-bad' : ''} />
            </Field>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {dates.map((d) => <Chip key={d.label} active={data.date === d.value} onClick={() => patch({ date: d.value, day: weekdayOf(d.value) })}>{d.label}</Chip>)}
              <AnimatePresence mode="wait">
                {data.day && (
                  <motion.span key={data.day} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="ml-1">
                    <Badge tone="brand">{data.day}</Badge>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <FieldError message={errors.date} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Field label="Starts">
                <Input type="time" value={data.startTime} onChange={(e) => patch({ startTime: e.target.value })} className={errors.startTime ? 'border-bad' : ''} />
              </Field>
              <FieldError message={errors.startTime} />
            </div>
            <div>
              <Field label="Ends">
                <Input type="time" value={data.endTime} onChange={(e) => patch({ endTime: e.target.value })} className={errors.endTime ? 'border-bad' : ''} />
              </Field>
              <FieldError message={errors.endTime} />
            </div>
            <div className="col-span-2 -mt-1">
              <Reveal show={!!data.startTime}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted font-semibold mr-1">Lasted</span>
                  {[30, 60, 90, 120].map((m) => {
                    const v = addMinutes(data.startTime, m);
                    return <Chip key={m} active={data.endTime === v} onClick={() => patch({ endTime: v })}>{m < 60 ? `${m}m` : m % 60 ? `${m / 60}.5h` : `${m / 60}h`}</Chip>;
                  })}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

        </>
      )}
      {part === 'where' && (
        <>
      {/* Where & who */}
      <AnimatePresence initial={false}>
        {hasType && (
          <motion.section key="where" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
            <SectionTitle n="1" title={one ? 'Who was it with?' : 'Where and who?'} />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Field label="Center">
                  {centerOptions.length > 0 ? (
                    <Select value={data.center} onChange={(e) => patch({ center: e.target.value })} className={errors.center ? 'border-bad' : ''}>
                      <option value="">Choose a center…</option>
                      {centerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  ) : (
                    <Input value={data.center} onChange={(e) => patch({ center: e.target.value })} placeholder="Center name" className={errors.center ? 'border-bad' : ''} />
                  )}
                </Field>
                <FieldError message={errors.center} />
              </div>

              {one ? (
                <div>
                  <Field label="Person's name">
                    <Input value={data.personName} onChange={(e) => patch({ personName: e.target.value })} placeholder="Full name" list="editor-people" className={errors.personName ? 'border-bad' : ''} />
                  </Field>
                  <datalist id="editor-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
                  <FieldError message={errors.personName} />
                </div>
              ) : (
                <div>
                  <Field label="Place">
                    <Input value={data.place} onChange={(e) => patch({ place: e.target.value })} placeholder="Where did it happen?" className={errors.place ? 'border-bad' : ''} />
                  </Field>
                  <FieldError message={errors.place} />
                </div>
              )}
            </div>

            <Reveal show={!one}>
              <div className="grid gap-4 pt-4">
                <div>
                  <span className="block text-xs font-bold text-ink-2 mb-1.5">Who was present</span>
                  <AttendanceInput value={data.attendance} onChange={(attendance) => patch({ attendance })} people={people} invalid={!!errors.attendance} />
                  <FieldError message={errors.attendance} />
                </div>
                <Field label="Present Sant name" hint="Optional">
                  <Input value={data.presentSantName} onChange={(e) => patch({ presentSantName: e.target.value })} placeholder="Name" />
                </Field>
              </div>
            </Reveal>
          </motion.section>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};
