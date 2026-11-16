import { useState } from 'react';
import type { ViewProps } from '../../lib/nav';
import { motion } from 'framer-motion';
import { rise } from '../../lib/motion';
import { getLocalDateString, parseLocalDate } from '../../lib/date';
import { useToast } from '../../lib/toast';
import { deleteMeeting, getMeeting } from '../../lib/api';
import { Avatar, Badge, Button, Card, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { BackLink, ConfirmModal, Ico } from './bits';
import {
  categoryTone, isOneOnOne, longDate, meetingStats, meetingTitle, meetingToText, shortDate, timeRange, type Meeting, type Point,
} from './helpers';

/* Hides the app chrome and tidies cards when printing. */
const PRINT_CSS = `
@media print {
  aside, header, nav, .md-noprint { display: none !important; }
  html, body, #root, *:has(.md-print) { height: auto !important; overflow: visible !important; filter: none !important; transform: none !important; }
  body { background: #fff !important; }
  .md-print { max-width: none !important; }
  .md-print * { box-shadow: none !important; }
  .md-print [data-keep] { break-inside: avoid; }
  @page { margin: 14mm; }
}`;

const PointRow = ({ p }: { p: Point }) => {
  const today = getLocalDateString();
  const late = !!p.deadline && p.deadline.slice(0, 10) < today;
  const dot = p.category === 'Decision' ? 'bg-good' : p.category === 'Lesson' ? 'bg-brand' : 'bg-ink/25';
  return (
    <li className="flex gap-3">
      <span className={`mt-[9px] w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap break-words">
          {p.category && p.category !== 'Information' && <span className="mr-2 align-[1px]"><Badge tone={categoryTone(p.category)}>{p.category}</Badge></span>}
          {p.text}
        </p>
        {(p.assignee || p.deadline || p.taskId) && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {p.assignee && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] pl-1 pr-2.5 py-0.5 text-xs font-semibold text-ink-2">
                <Avatar name={p.assignee} size={18} /> {p.assignee}
              </span>
            )}
            {p.deadline && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${late ? 'bg-warn/10 text-warn' : 'bg-ink/[0.05] text-ink-2'}`}>
                <Ico name="clock" size={12} /> Due {shortDate(p.deadline)}
              </span>
            )}
            {p.taskId && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-good/10 text-good px-2.5 py-0.5 text-xs font-semibold">
                <Ico name="link" size={12} /> Task created
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

const MeetingView = ({ id, go }: { id: string } & Pick<ViewProps, 'go'>) => {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync<Meeting>(() => getMeeting(id), [id]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = () => go('meetings');

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <>
        <BackLink onClick={back}>Meetings</BackLink>
        <Card>
          <Empty icon="🔍" title="We couldn't find that meeting" hint={error || 'It may have been deleted.'}
            action={<div className="flex gap-2 justify-center"><Button variant="soft" onClick={reload}>Try again</Button><Button onClick={back}>Back to meetings</Button></div>} />
        </Card>
      </>
    );
  }

  const m = data;
  const s = meetingStats(m);
  const agenda = (m.agenda || []).filter((a) => a?.trim());
  const notes = m.notes || [];
  const oneOnOne = isOneOnOne(m.meetingType);
  const dt = parseLocalDate(m.date.slice(0, 10));
  const actionItems = notes.flatMap((n) => n.points || []).filter((p) => p.text?.trim() && (p.assignee || p.taskId));

  const copy = async () => {
    const text = meetingToText(m);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    }
    toast('Minutes copied. Paste them anywhere.');
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMeeting(m.id);
      toast('Meeting deleted');
      go('meetings');
    } catch (e) {
      toast((e as Error).message || 'Could not delete the meeting', 'error');
      setBusy(false);
      setConfirmDel(false);
    }
  };

  return (
    <>
      <style>{PRINT_CSS}</style>
      <BackLink onClick={back}>All meetings</BackLink>
      <Stagger className="md-print space-y-5">
        {/* Hero */}
        <motion.div variants={rise} className="rounded-[2rem] hero-ink p-5 sm:p-7 relative overflow-hidden">
          <span aria-hidden className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/10 blur-2xl md-noprint" />
          <div className="relative flex flex-wrap items-start gap-5">
            <div className="w-20 sm:w-24 shrink-0 rounded-3xl bg-white/15 text-center py-3 sm:py-4 leading-none">
              <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">{dt.toLocaleDateString(undefined, { weekday: 'short' })}</p>
              <p className="text-4xl sm:text-5xl font-extrabold tabular-nums my-1.5">{dt.getDate()}</p>
              <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">{dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px] font-extrabold uppercase tracking-wider">
                {m.meetingType && <span className="rounded-md bg-white/15 px-2 py-0.5">{m.meetingType}</span>}
                {s.important && <span className="rounded-md bg-warn/90 text-[#06141b] px-2 py-0.5">Important</span>}
                {s.followUp && <span className="rounded-md bg-white/15 px-2 py-0.5">Follow-up needed</span>}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight break-words leading-tight">{meetingTitle(m)}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm font-semibold opacity-85">
                {m.startTime && <span className="inline-flex items-center gap-1.5"><Ico name="clock" size={15} /> {timeRange(m.startTime, m.endTime)}</span>}
                {m.place && <span className="inline-flex items-center gap-1.5"><Ico name="pin" size={15} /> {m.place}</span>}
                {m.attendance && <span className="inline-flex items-center gap-1.5"><Ico name="users" size={15} /> {m.attendance}</span>}
              </div>
            </div>
          </div>
          <div className="md-noprint relative flex flex-wrap items-center gap-2 mt-6">
            <button type="button" onClick={() => go('meetings', `edit:${m.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-white/70 glass-fill text-ink px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"><Ico name="pencil" size={14} /> Edit</button>
            {[{ l: 'Copy', i: 'copy' as const, f: copy }, { l: 'Print', i: 'print' as const, f: () => window.print() }, { l: 'Delete', i: 'trash' as const, f: () => setConfirmDel(true) }].map((b) => (
              <button key={b.l} type="button" onClick={b.f} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors px-4 py-2.5 text-sm font-bold"><Ico name={b.i} size={14} /> {b.l}</button>
            ))}
          </div>
          {s.points > 0 && (
            <div className="relative grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15">
              {[[agenda.length || s.agenda, 'Agenda'], [s.points, 'Points'], [s.decisions, 'Decisions'], [s.actions, 'Actions']].map(([v, l]) => (
                <div key={l as string}><p className="text-3xl font-extrabold tabular-nums leading-none">{v}</p><p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mt-1.5">{l}</p></div>
              ))}
            </div>
          )}
        </motion.div>

        <div className={`grid gap-5 lg:items-start ${notes.length > 0 ? 'lg:grid-cols-[minmax(0,1fr)_21rem]' : ''}`}>
          {/* Minutes: one document */}
          {(notes.length > 0 || agenda.length === 0) && (
            <Card className="min-w-0 p-0 overflow-hidden">
              {notes.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
                    <h2 className="text-lg font-extrabold tracking-tight">Minutes</h2>
                    <span className="text-xs font-bold text-muted">{notes.length} {notes.length === 1 ? 'section' : 'sections'} · {s.points} {s.points === 1 ? 'point' : 'points'}</span>
                  </div>
                  <div className="divide-y divide-line/70 border-t border-line/70">
                    {notes.map((n, i) => {
                      const pts = (n.points || []).filter((p) => p.text?.trim());
                      return (
                        <section key={n.id || i} data-keep className="px-5 sm:px-7 py-5 sm:py-6">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="w-7 h-7 shrink-0 rounded-lg bg-brand-soft text-brand text-xs font-extrabold grid place-items-center tabular-nums">{i + 1}</span>
                            <h3 className="font-extrabold text-[17px] leading-snug whitespace-pre-wrap break-words min-w-0 flex-1 basis-56">{n.title || `Agenda item ${i + 1}`}</h3>
                            <div className="flex gap-1.5">
                              {n.important && <Badge tone="warn">Important</Badge>}
                              {n.followUp && <Badge tone="brand">Follow-up</Badge>}
                            </div>
                          </div>
                          {pts.length > 0 ? (
                            <ul className="mt-3.5 ml-10 space-y-3">
                              {pts.map((p, j) => <PointRow key={p.id || j} p={p} />)}
                            </ul>
                          ) : (
                            <p className="mt-2 ml-10 text-sm text-muted italic">Nothing was recorded for this item.</p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Empty icon="📝" title="No minutes recorded" hint="This meeting is logged but has no agenda or notes yet."
                  action={<Button onClick={() => go('meetings', `edit:${m.id}`)}>Add minutes</Button>} />
              )}
            </Card>
          )}

          {/* At a glance */}
          {(agenda.length > 0 || actionItems.length > 0 || m.presentSantName || (!oneOnOne && m.center) || (m.day && !oneOnOne)) && (
            <Card className="p-0 overflow-hidden lg:sticky lg:top-0 divide-y divide-line/70">
              {agenda.length > 0 && (
                <section className="p-5">
                  <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-3">Agenda</h2>
                  <ol className="space-y-2">
                    {agenda.map((a, i) => (
                      <li key={i} data-keep className="flex gap-2.5 text-sm">
                        <span className="w-5 shrink-0 text-muted font-bold tabular-nums">{i + 1}.</span>
                        <p className="leading-snug text-ink whitespace-pre-wrap break-words min-w-0">{a}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {actionItems.length > 0 && (
                <section className="p-5">
                  <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-3">Action items</h2>
                  <ul className="space-y-3">
                    {actionItems.map((p, i) => (
                      <li key={i} data-keep className="flex items-start gap-2.5">
                        <Avatar name={p.assignee || '?'} size={24} />
                        <div className="min-w-0">
                          <p className="text-sm text-ink leading-snug break-words">{p.text}</p>
                          <p className="text-xs text-muted mt-0.5">{[p.assignee, p.deadline && `due ${shortDate(p.deadline)}`].filter(Boolean).join(' · ')}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {(m.presentSantName || (!oneOnOne && m.center) || (m.day && !oneOnOne)) && (
                <section className="p-5">
                  <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-3">Details</h2>
                  <dl className="space-y-2.5 text-sm">
                    {m.presentSantName && <div className="flex justify-between gap-4"><dt className="text-muted">Present Sant</dt><dd className="font-semibold text-right">{m.presentSantName}</dd></div>}
                    {!oneOnOne && m.center && <div className="flex justify-between gap-4"><dt className="text-muted">Center</dt><dd className="font-semibold text-right capitalize">{m.center.toLowerCase()}</dd></div>}
                    {m.day && !oneOnOne && <div className="flex justify-between gap-4"><dt className="text-muted">Day</dt><dd className="font-semibold text-right">{m.day}</dd></div>}
                  </dl>
                </section>
              )}
            </Card>
          )}
        </div>
      </Stagger>

      <ConfirmModal
        open={confirmDel}
        title="Delete this meeting?"
        body={<>The minutes for <b>{meetingTitle(m)}</b> on {longDate(m.date)} will be removed for good.</>}
        busy={busy}
        onConfirm={remove}
        onClose={() => !busy && setConfirmDel(false)}
      />
    </>
  );
};

export default MeetingView;
