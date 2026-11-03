import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { rise, spring, stagger } from '../../lib/motion';
import { Badge } from '../../ui';
import {
  isActionCategory, isOneOnOne, prettyDate, prettyTime,
  type EditorData, type Problem,
} from './editor-types';

/** Action points that have an owner and deadline but are not tasks yet. */
export const pendingTaskCount = (d: EditorData): number =>
  d.notes.reduce((n, note) => n + note.points.filter((p) => isActionCategory(p.category) && p.text.trim() && p.assignee && p.deadline && !p.taskId).length, 0);

const Block = ({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) => (
  <motion.section variants={rise} className="liquid rounded-3xl p-4 sm:p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{title}</h3>
      <button type="button" onClick={onEdit} className="text-xs font-bold text-brand hover:bg-brand-soft rounded-lg px-2.5 py-1 transition-colors">Edit</button>
    </div>
    {children}
  </motion.section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex gap-3 py-1.5 text-sm">
    <span className="w-24 sm:w-28 shrink-0 text-muted">{label}</span>
    <span className="font-semibold min-w-0 break-words">{children}</span>
  </div>
);

const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-brand' : 'bg-ink/20'}`}
  >
    <motion.span layout transition={spring} className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-card" style={{ left: on ? 22 : 2 }} />
  </button>
);

export const ReviewStep = ({ data, problems, goTo, autoTasks, setAutoTasks, isEdit }: {
  data: EditorData; problems: Problem[]; goTo: (step: number) => void; autoTasks: boolean; setAutoTasks: (v: boolean) => void; isEdit: boolean;
}) => {
  const one = isOneOnOne(data.meetingType);
  const agenda = data.agenda.filter((a) => a.text.trim());
  const notes = data.notes.filter((n) => n.title.trim() || n.points.some((p) => p.text.trim()));
  const points = notes.flatMap((n) => n.points.filter((p) => p.text.trim()));
  const pending = pendingTaskCount(data);
  const linked = points.filter((p) => p.taskId).length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-extrabold tracking-tight">{isEdit ? 'Ready to update?' : 'One last look'}</h2>
        <p className="text-sm text-muted mt-1">Check the details below. Anything can still be changed after saving.</p>
      </div>

      {problems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mb-4 rounded-2xl border border-warn/30 bg-warn/[0.07] p-4">
          <p className="text-sm font-extrabold text-warn mb-2">A few things need your attention</p>
          <ul className="space-y-1.5">
            {problems.map((p) => (
              <li key={p.field + p.message} className="flex items-center justify-between gap-3 text-sm">
                <span>{p.message}</span>
                <button type="button" onClick={() => goTo(p.step)} className="text-xs font-bold text-warn underline underline-offset-2 shrink-0">Fix</button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3.5">
        <Block title="Basics" onEdit={() => goTo(0)}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {data.meetingType ? <Badge tone="dark">{data.meetingType}</Badge> : <Badge tone="warn">No type</Badge>}
            {data.scheduledMeetingId && <Badge tone="brand">From a scheduled meeting</Badge>}
          </div>
          <Row label="Date">{data.date ? `${prettyDate(data.date)}` : '—'}</Row>
          <Row label="Time">{data.startTime && data.endTime ? `${prettyTime(data.startTime)} – ${prettyTime(data.endTime)}` : '—'}</Row>
        </Block>

        <Block title="Where and who" onEdit={() => goTo(1)}>
          <Row label="Center">{data.center || '—'}</Row>
          {one ? <Row label="With">{data.personName || '—'}</Row> : (
            <>
              <Row label="Place">{data.place || '—'}</Row>
              <Row label="Present">
                {data.attendance.length ? (
                  <span className="flex flex-wrap gap-1.5">{data.attendance.map((a) => <span key={a} className="px-2.5 py-0.5 rounded-full bg-brand-soft text-brand text-xs font-bold">{a}</span>)}</span>
                ) : '—'}
              </Row>
              {data.presentSantName && <Row label="Present Sant">{data.presentSantName}</Row>}
            </>
          )}
        </Block>

        <Block title={`Agenda · ${agenda.length}`} onEdit={() => goTo(2)}>
          {agenda.length === 0 ? <p className="text-sm text-muted">No agenda items.</p> : (
            <ol className="space-y-2.5">
              {agenda.map((a, i) => (
                <li key={a.id} className="flex gap-3">
                  <span className="w-6 h-6 rounded-md bg-brand-soft text-brand text-[11px] font-extrabold grid place-items-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm whitespace-pre-wrap break-words min-w-0 leading-relaxed">{a.text}</p>
                </li>
              ))}
            </ol>
          )}
        </Block>

        <Block title={`Minutes · ${notes.length} section${notes.length === 1 ? '' : 's'}`} onEdit={() => goTo(3)}>
          {notes.length === 0 ? <p className="text-sm text-muted">No minutes yet.</p> : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge>{points.length} point{points.length === 1 ? '' : 's'}</Badge>
                {points.some((p) => p.category === 'Decision') && <Badge tone="brand">{points.filter((p) => p.category === 'Decision').length} decisions</Badge>}
                {points.some((p) => p.category === 'Lesson') && <Badge tone="good">{points.filter((p) => p.category === 'Lesson').length} lessons</Badge>}
                {linked > 0 && <Badge tone="good">✓ {linked} task{linked === 1 ? '' : 's'} linked</Badge>}
              </div>
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id}>
                    <p className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
                      <span className="whitespace-pre-wrap break-words">{n.title.trim() || 'Untitled section'}</span>
                      {n.important && <span className="text-warn">★</span>}
                      {n.followUp && <span className="text-brand">⚑</span>}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {n.points.filter((p) => p.text.trim()).map((p) => (
                        <li key={p.id} className="text-sm text-ink-2 flex gap-2">
                          <span className={`mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 ${p.category === 'Decision' ? 'bg-brand' : p.category === 'Lesson' ? 'bg-good' : 'bg-muted'}`} />
                          <span className="min-w-0 break-words">
                            {p.text}
                            {isActionCategory(p.category) && (p.assignee || p.deadline) && (
                              <span className="text-muted"> · {[p.assignee, p.deadline && prettyDate(p.deadline)].filter(Boolean).join(' · ')}</span>
                            )}
                            {p.taskId && <span className="text-good font-bold"> ✓</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </Block>

        {pending > 0 && (
          <motion.div variants={rise} className="flex items-center gap-4 rounded-2xl border border-brand/20 bg-brand-soft/50 p-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Turn {pending} action point{pending === 1 ? '' : 's'} into tasks?</p>
              <p className="text-xs text-muted mt-0.5">They already have an owner and a deadline. We'll create the tasks when you save.</p>
            </div>
            <Toggle on={autoTasks} onChange={setAutoTasks} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
