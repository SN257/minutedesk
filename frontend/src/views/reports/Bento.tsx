import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnimatedNumber, Badge } from '../../ui';
import { formatLocalDate } from '../../lib/date';
import { rise, spring } from '../../lib/motion';
import { iconPath, type TIconName } from '../tasks/icons';
import { axis, BarList, C, ChartTip, Legend } from './charts';
import { grainWord, plural, type InsightCtx, type LogDay } from './data';

/* ───────── building blocks ───────── */

/** One tile of the bento grid: a glass card with a soft colour glow in its corner. */
const Tile = ({ className = '', glow = 'brand', children }: { className?: string; glow?: 'brand' | 'good' | 'warn' | 'bad'; children: ReactNode }) => (
  <motion.section variants={rise} className={`relative liquid rounded-[2rem] p-5 sm:p-6 overflow-hidden flex flex-col ${className}`}>
    <span aria-hidden className={`pointer-events-none absolute -right-16 -top-16 w-48 h-48 rounded-full blur-2xl opacity-60 ${glow === 'good' ? 'bg-good/25' : glow === 'warn' ? 'bg-warn/25' : glow === 'bad' ? 'bg-bad/20' : 'bg-brand/15'}`} />
    <div className="relative flex flex-col flex-1 min-h-0">{children}</div>
  </motion.section>
);

const Label = ({ icon, children, right }: { icon: TIconName; children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center gap-2.5 mb-3">
    <span className="w-8 h-8 shrink-0 rounded-xl bg-ink/[0.07] grid place-items-center text-ink-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPath(icon)} /></svg>
    </span>
    <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted flex-1 min-w-0 truncate">{children}</h3>
    {right}
  </div>
);

/** A big ring with the figure in the middle. */
const BigRing = ({ value, color, size = 132, stroke = 12, suffix = '%' }: { value: number | null; color: string; size?: number; stroke?: number; suffix?: string }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (p / 100) * c }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span className="text-3xl font-extrabold tabular-nums leading-none">{value === null ? '–' : <AnimatedNumber value={value} suffix={suffix} />}</span>
      </div>
    </div>
  );
};

const dayColor = (s: LogDay['status']) =>
  s === 'logged' ? 'bg-good' : s === 'missed' ? 'bg-bad/70' : s === 'leave' ? 'bg-warn' : s === 'holiday' ? 'bg-brand' : s === 'weekend' ? 'bg-ink/10' : s === 'pending' ? 'border-2 border-brand/50' : 'bg-ink/10 animate-pulse';

/* ───────── plain-language summary ───────── */
type Tone = 'good' | 'warn' | 'neutral';
const buildSentences = ({ ms, ts, ls, logLoading }: InsightCtx) => {
  const out: { tone: Tone; text: string }[] = [];
  if (ts.total === 0) out.push({ tone: 'neutral', text: 'No tasks were created, due or finished in this period.' });
  else {
    const timing = ts.timed > 0 ? `, ${ts.early + ts.onTime} on time` : '';
    out.push({ tone: ts.done > 0 ? 'good' : 'neutral', text: `You completed ${plural(ts.done, 'task')}${timing}${ts.late > 0 ? ` and ${ts.late} late` : ''}: ${ts.completionPct ?? 0}% of everything on your plate.` });
  }
  if (ts.overdue > 0) out.push({ tone: 'warn', text: `${ts.overdue === 1 ? 'One open task is' : `${ts.overdue} open tasks are`} past due right now.` });
  if (ms.rows.length === 0) out.push({ tone: 'neutral', text: 'No meetings were recorded in this period.' });
  else {
    const top = ms.byCenter[0];
    const trend = ms.prev > 0 ? (ms.rows.length > ms.prev ? `, up from ${ms.prev} before` : ms.rows.length < ms.prev ? `, down from ${ms.prev} before` : ', the same as before') : '';
    out.push({ tone: 'neutral', text: `You held ${plural(ms.rows.length, 'meeting')}${trend}${top && top.name !== 'No center' ? `, most often with ${top.name}` : ''}.` });
  }
  if (logLoading) out.push({ tone: 'neutral', text: 'Reading your work logs…' });
  else if (ls.compliance === null) out.push({ tone: 'neutral', text: 'There are no working days to check in this period yet.' });
  else {
    const days = ls.logged + ls.missed;
    out.push({ tone: ls.missed === 0 ? 'good' : 'warn', text: `You logged ${ls.logged} of ${plural(days, 'working day')}${ls.missed === 0 ? ', a clean record.' : `, with ${ls.missed} to catch up on.`}` });
  }
  return out;
};
const dot: Record<Tone, string> = { good: 'bg-good', warn: 'bg-warn', neutral: 'bg-brand' };

/* ───────── the page ───────── */
export const Bento = (ctx: InsightCtx) => {
  const { ms, ts, ls, logLoading, bounds, go } = ctx;
  const compliance = logLoading ? null : ls.compliance;
  const sentences = buildSentences(ctx);
  const delta = ms.prev > 0 ? ms.rows.length - ms.prev : null;
  const lastDays = ls.days.slice(-14);
  const recent = ms.rows.slice(0, 5);

  const attention: { text: string; cta: string; run: () => void; tone: 'bad' | 'warn' }[] = [];
  if (ts.overdue > 0) attention.push({ text: `${plural(ts.overdue, 'open task')} ${ts.overdue === 1 ? 'is' : 'are'} past due`, cta: 'Open tasks', run: () => go('tasks'), tone: 'bad' });
  if (!logLoading && ls.missed > 0) attention.push({ text: `${plural(ls.missed, 'working day')} not logged`, cta: 'Catch up', run: () => go('worklog'), tone: 'warn' });
  if (ms.followUps > 0) attention.push({ text: `${plural(ms.followUps, 'meeting note')} flagged for follow-up`, cta: 'See meetings', run: () => go('meetings'), tone: 'warn' });

  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">
      {/* Tasks: the big one */}
      <Tile className="sm:col-span-2 xl:col-span-6 xl:row-span-2" glow="brand">
        <Label icon="checklist" right={<Legend items={[{ label: 'Completed', color: C.brand }, { label: 'Open backlog', color: C.warn }]} />}>Tasks</Label>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums leading-none"><AnimatedNumber value={ts.done} /></p>
          <p className="pb-1.5 text-sm font-bold text-ink-2">{ts.done === 1 ? 'task finished' : 'tasks finished'}</p>
          {ts.completionPct !== null && <Badge tone="good">{ts.completionPct}% of {ts.total}</Badge>}
        </div>
        <p className="text-xs text-muted mt-1.5">Per {grainWord(ts.grain)}: finished, and the open backlog at the end of it</p>
        {ts.total === 0 ? (
          <p className="text-sm text-muted mt-6">Tasks that are created, due or finished in this range show up here.</p>
        ) : (
          <div className="flex-1 min-h-[15rem] mt-4 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ts.trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="bg-done" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: 'var(--color-brand)', stopOpacity: 0.35 }} /><stop offset="100%" style={{ stopColor: 'var(--color-brand)', stopOpacity: 0 }} /></linearGradient>
                  <linearGradient id="bg-open" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: 'var(--color-warn)', stopOpacity: 0.28 }} /><stop offset="100%" style={{ stopColor: 'var(--color-warn)', stopOpacity: 0 }} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 5" />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="open" name="Open backlog" stroke={C.warn} strokeWidth={2} fill="url(#bg-open)" animationDuration={1000} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke={C.brand} strokeWidth={2.5} fill="url(#bg-done)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Tile>

      {/* Completion ring */}
      <Tile className="xl:col-span-3" glow="brand">
        <Label icon="complete">Completion</Label>
        <div className="flex-1 grid place-items-center py-1"><BigRing value={ts.completionPct} color="var(--color-brand)" /></div>
        <p className="text-xs text-muted text-center mt-2">{ts.done} of {ts.total} tasks</p>
      </Tile>

      {/* On time ring */}
      <Tile className="xl:col-span-3" glow="good">
        <Label icon="clock">On time</Label>
        <div className="flex-1 grid place-items-center py-1"><BigRing value={ts.onTimePct} color="var(--color-good)" /></div>
        <p className="text-xs text-muted text-center mt-2">{ts.timed > 0 ? `${ts.early} early · ${ts.onTime} on the day · ${ts.late} late` : 'no due dates yet'}</p>
      </Tile>

      {/* Streak */}
      <Tile className="xl:col-span-3" glow="warn">
        <Label icon="flag">Streak</Label>
        <p className="flex items-end gap-2"><span className="text-6xl font-black tracking-tight tabular-nums leading-none">{logLoading ? '–' : <AnimatedNumber value={ls.current} />}</span><span className="pb-1.5 text-sm font-bold text-ink-2">{ls.current === 1 ? 'day' : 'days'} in a row</span></p>
        <p className="text-xs text-muted mt-2">Longest: {logLoading ? '–' : ls.longest} {ls.longest === 1 ? 'day' : 'days'}</p>
        <div className="mt-auto pt-4">
          <div className="flex gap-1.5" aria-label="Last 14 days">
            {lastDays.map((d) => <span key={d.date} title={`${formatLocalDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.status}`} className={`h-6 flex-1 rounded-md ${dayColor(d.status)}`} />)}
          </div>
          <p className="text-[10px] font-semibold text-muted mt-1.5">Last 14 days</p>
        </div>
      </Tile>

      {/* Work log ring */}
      <Tile className="xl:col-span-3" glow="good">
        <Label icon="edit">Work log</Label>
        <div className="flex-1 grid place-items-center py-1"><BigRing value={compliance} color="var(--color-good)" size={112} stroke={11} /></div>
        <p className="text-xs text-muted text-center mt-2">{logLoading ? 'checking…' : ls.compliance === null ? 'no working days yet' : `${ls.logged} of ${ls.logged + ls.missed} days · ${ls.leave + ls.holiday} off`}</p>
      </Tile>

      {/* Meetings */}
      <Tile className="sm:col-span-2 xl:col-span-5" glow="brand">
        <Label icon="planner" right={delta !== null && <Badge tone={delta >= 0 ? 'good' : 'warn'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs before</Badge>}>Meetings</Label>
        <p className="flex items-end gap-3"><span className="text-5xl font-extrabold tracking-tight tabular-nums leading-none"><AnimatedNumber value={ms.rows.length} /></span><span className="pb-1 text-sm font-bold text-ink-2">{ms.rows.length === 1 ? 'meeting' : 'meetings'}</span></p>
        <p className="text-xs text-muted mt-1.5">Per {grainWord(ms.grain)}</p>
        {ms.rows.length === 0 ? (
          <p className="text-sm text-muted mt-5">No meetings in this range. Try a longer one, or log minutes from the Meetings page.</p>
        ) : (
          <div className="h-44 mt-4 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ms.series} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 5" />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgb(127 140 150 / 0.12)' }} />
                <Bar dataKey="value" name="Meetings" fill={C.brand} radius={[8, 8, 3, 3]} maxBarSize={36} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Tile>

      {/* By center */}
      <Tile className="xl:col-span-3" glow="warn">
        <Label icon="members">By center</Label>
        {ms.byCenter.length === 0 ? <p className="text-sm text-muted">No centers yet.</p> : <BarList items={ms.byCenter.slice(0, 5)} />}
        {ms.byType.length > 0 && <p className="text-[11px] text-muted mt-auto pt-4">{ms.byType.slice(0, 3).map((t) => `${t.name} ${t.value}`).join(' · ')}</p>}
      </Tile>

      {/* Needs attention */}
      <Tile className="sm:col-span-2 xl:col-span-4" glow="bad">
        <Label icon="flag">Needs attention</Label>
        {attention.length === 0 ? (
          <p className="text-sm text-good font-semibold py-2">Nothing needs your attention. Nice work.</p>
        ) : (
          <ul className="space-y-2.5">
            {attention.map((a) => (
              <li key={a.text} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${a.tone === 'bad' ? 'bg-bad/10' : 'bg-warn/10'}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${a.tone === 'bad' ? 'bg-bad' : 'bg-warn'}`} />
                <span className="flex-1 min-w-0 text-sm font-semibold">{a.text}</span>
                <button type="button" onClick={a.run} className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold hover:bg-white transition-colors">{a.cta}</button>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      {/* Recent meetings */}
      <Tile className="sm:col-span-2 xl:col-span-7" glow="brand">
        <Label icon="planner">Recent meetings</Label>
        {recent.length === 0 ? <p className="text-sm text-muted">Nothing recorded in this range.</p> : (
          <ul className="divide-y divide-line/70">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="w-11 shrink-0 text-center rounded-xl bg-brand-soft text-brand py-1 leading-none">
                  <p className="text-[9px] font-extrabold uppercase">{formatLocalDate(m.date, { month: 'short' })}</p>
                  <p className="text-base font-extrabold tabular-nums">{formatLocalDate(m.date, { day: 'numeric' })}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{m.center || m.person || `${m.type} meeting`}</p>
                  <p className="text-xs text-muted truncate">{m.type}{m.start ? ` · ${m.start}${m.end ? `–${m.end}` : ''}` : ''}</p>
                </div>
                {m.followUps.length > 0 ? <Badge tone="warn">{plural(m.followUps.length, 'follow-up')}</Badge> : <span className="text-xs text-muted">{plural(m.notes, 'note')}</span>}
              </li>
            ))}
          </ul>
        )}
      </Tile>

      {/* In plain words */}
      <Tile className="sm:col-span-2 xl:col-span-5" glow="good">
        <Label icon="description">In plain words</Label>
        <ul className="space-y-3">
          {sentences.map((s, i) => (
            <motion.li key={s.text} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 + i * 0.05 }} className="flex gap-3 text-[15px] leading-relaxed">
              <span className={`mt-2 w-2 h-2 rounded-full shrink-0 ${dot[s.tone]}`} />
              <span>{s.text}</span>
            </motion.li>
          ))}
        </ul>
        {ls.capped && <p className="text-[11px] text-muted mt-auto pt-3">Work-log numbers cover the latest 60 days of this range ({bounds.days} days selected).</p>}
      </Tile>
    </motion.div>
  );
};
