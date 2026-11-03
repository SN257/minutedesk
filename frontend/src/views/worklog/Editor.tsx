import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Button, Skeleton, Spinner } from '../../ui';
import { formatLocalDate } from '../../lib/date';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import { fetchLog, peekLog, saveLog, wordCount, type WorkLogEntry } from './logStore';

type Form = Omit<WorkLogEntry, 'date'>;
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const toForm = (l: WorkLogEntry | null | undefined): Form => ({
  todayWork: l?.todayWork || '',
  tomorrowWork: l?.tomorrowWork || '',
  todayOnLeave: !!l?.todayOnLeave,
  todayHoliday: !!l?.todayHoliday,
  tomorrowOnLeave: !!l?.tomorrowOnLeave,
  tomorrowHoliday: !!l?.tomorrowHoliday,
});

const AUTOSAVE_MS = 1600;

/* ───────── pieces ───────── */
const Switch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`inline-flex items-center gap-2.5 pl-2 pr-3.5 py-2 min-h-[40px] rounded-full border text-sm font-semibold transition-colors ${checked ? 'bg-brand-soft border-brand/30 text-brand' : 'bg-white border-line text-muted hover:text-ink hover:border-ink/25'}`}
  >
    <span className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-ink/15'}`}>
      <motion.span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-card"
        animate={{ x: checked ? 16 : 0 }}
        transition={spring}
      />
    </span>
    {label}
  </button>
);

const LINE_H = 36;

/** A ruled page: handwriting font, every line sits on a rule, and a margin line runs down the left.
 *  It fills whatever height its card is given, and grows with the text when that needs more room.
 *  Every item you have written gets a small arrow in the margin, centred on its first line. */
const AutoArea = ({ value, onChange, placeholder, dim, id }: { value: string; onChange: (v: string) => void; placeholder: string; dim?: boolean; id: string }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const [need, setNeed] = useState(252);
  const [marks, setMarks] = useState<{ top: number; filled: boolean }[]>([]);
  const [scroll, setScroll] = useState(0);
  const [width, setWidth] = useState(0);
  const lines = value.split('\n');

  // Re-measure when the box changes width: long items wrap onto more rows.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Collapse the box to nothing to read how tall the text really is, then give the height back to the layout.
    el.style.height = '0px';
    const n = Math.min(Math.max(el.scrollHeight, 252), 720);
    el.style.height = '';
    setNeed((c) => (c === n ? c : n));
    // Where does each written item start? Read it from an invisible copy of the text that wraps the same way.
    const rows = Array.from(mirror.current?.children ?? []) as HTMLElement[];
    // The first line always carries an arrow (a quiet one while it is empty); every other line only once it has text.
    const next = rows.flatMap((r, i) => (lines[i]?.trim() ? [{ top: r.offsetTop, filled: true }] : i === 0 ? [{ top: r.offsetTop, filled: false }] : []));
    setMarks((c) => (c.length === next.length && c.every((v, i) => v.top === next[i].top && v.filled === next[i].filled) ? c : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, width]);

  return (
    <div ref={wrap} className="relative flex-1" style={{ minHeight: need }}>
      <span aria-hidden className="absolute inset-y-0 left-11 w-px bg-bad/35" />
      {/* margin arrows */}
      <div aria-hidden className="absolute inset-y-0 left-0 w-11 overflow-hidden pointer-events-none">
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          <AnimatePresence initial={false}>
            {marks.map((m, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}
                className={`absolute left-0 w-11 grid place-items-center transition-colors ${m.filled ? 'text-brand' : 'text-muted/60'}`}
                style={{ top: m.top + LINE_H / 2 - 11, height: 22 }}
              >
                {/* a hand-drawn arrow: a slightly wobbly shaft and a loose head */}
                <svg width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11.6C8 10.6 12.5 11.4 20 10.8" />
                  <path d="M15.2 5.6C17.4 7.1 19.2 8.8 21 10.9C19 12.8 16.9 14.6 15.4 16.8" />
                </svg>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
      {/* invisible copy used only to measure where each item starts */}
      <div ref={mirror} aria-hidden className="invisible absolute inset-x-0 top-0 pointer-events-none whitespace-pre-wrap break-words font-hand text-[25px] leading-[36px] pl-[3.4rem] pr-3">
        {lines.map((l, i) => <div key={i}>{l || '\u200b'}</div>)}
      </div>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => setScroll(e.currentTarget.scrollTop)}
        placeholder={placeholder}
        className={`note-lines absolute inset-0 block w-full h-full resize-none overflow-y-auto bg-transparent outline-none font-hand text-[25px] leading-[36px] pl-[3.4rem] pr-3 py-0 text-ink placeholder:text-muted/60 transition-opacity ${dim ? 'opacity-60 focus:opacity-100' : ''}`}
      />
    </div>
  );
};

const SaveIndicator = ({ state, onRetry }: { state: SaveState; onRetry: () => void }) => (
  <div className="h-6 flex items-center text-xs font-semibold" aria-live="polite">
    <AnimatePresence mode="wait" initial={false}>
      {state === 'saving' && (
        <motion.span key="saving" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center gap-1.5 text-muted"><Spinner size={12} /> Saving…</motion.span>
      )}
      {state === 'saved' && (
        <motion.span key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center gap-1.5 text-good">
          <motion.svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
          </motion.svg>
          Saved
        </motion.span>
      )}
      {state === 'dirty' && (
        <motion.span key="dirty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-muted"><span className="w-1.5 h-1.5 rounded-full bg-warn" /> Unsaved changes</motion.span>
      )}
      {state === 'error' && (
        <motion.button key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onRetry} className="flex items-center gap-1.5 text-bad underline underline-offset-2">Couldn't save — tap to retry</motion.button>
      )}
      {state === 'idle' && (
        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-muted/80 font-medium">Autosaves as you type</motion.span>
      )}
    </AnimatePresence>
  </div>
);

const Clock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" /></svg>
);

/** One page of the notebook: a glass card with tape on top, a handwritten title, a time note, then the ruled page. */
const Panel = ({ icon, title, hint, off, stamp, children, switches }: { icon: 'done' | 'next'; title: string; hint: string; off: boolean; stamp: string; children: React.ReactNode; switches: React.ReactNode }) => (
  <div className="relative liquid rounded-[2rem] pt-8 pb-4 flex flex-col h-full">
    <span aria-hidden className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 rounded-[3px] bg-warn/35 rotate-[-2deg] shadow-sm" />
    <div className="px-5 sm:px-6">
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 shrink-0 rounded-2xl grid place-items-center ${icon === 'done' ? 'bg-good/15 text-good' : 'bg-brand-soft text-brand'}`}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={icon === 'done' ? 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3' : 'M5 12h14M12 5l7 7-7 7'} />
          </svg>
        </span>
        <h3 className="font-hand text-[30px] font-bold leading-none truncate">{title}</h3>
      </div>
      <div className="flex items-center justify-between gap-3 mt-2.5 min-h-[28px]">
        <p className="text-xs text-muted min-w-0">{off ? 'Marked as a day off.' : hint}</p>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-warn/15 text-ink-2 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"><Clock />{stamp}</span>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 mb-4">{switches}</div>
    </div>
    <div className="border-t border-line/70 pt-2 flex-1 flex flex-col min-h-0">{children}</div>
  </div>
);

/* ───────── editor ───────── */
export const Editor = ({ date, today }: { date: string; today: string }) => {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const cached = peekLog(date);
  const [form, setForm] = useState<Form>(() => toForm(cached));
  const [ready, setReady] = useState(cached !== undefined);
  const [loadErr, setLoadErr] = useState(false);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(t); }, []);

  const formRef = useRef(form);
  const readyRef = useRef(ready);
  const touched = useRef(false);
  const pending = useRef<Form | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);

  // Always refresh from the server, but never clobber what the user has already typed.
  useEffect(() => {
    let alive = true;
    fetchLog(date, true).then((r) => {
      if (!alive) return;
      if (r === undefined) { if (!readyRef.current) setLoadErr(true); return; }
      if (!touched.current) { const f = toForm(r); formRef.current = f; setForm(f); }
      readyRef.current = true;
      setReady(true);
      setLoadErr(false);
    });
    return () => { alive = false; };
  }, [date, tick]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const f = pending.current;
    if (!f) return;
    pending.current = null;
    if (mounted.current) setState('saving');
    try {
      await saveLog(date, f);
      if (mounted.current) { setState(pending.current ? 'dirty' : 'saved'); setSavedAt(new Date()); }
    } catch {
      if (!pending.current) pending.current = f;
      if (mounted.current) setState('error');
      else toastRef.current(`Couldn't save your work log for ${formatLocalDate(date, { day: 'numeric', month: 'short' })}`, 'error');
    }
  }, [date]);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Save anything pending when leaving this date / view.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; void flushRef.current(); };
  }, []);

  const change = (patch: Partial<Form>) => {
    touched.current = true;
    const next = { ...formRef.current, ...patch };
    formRef.current = next;
    pending.current = next;
    setForm(next);
    setState('dirty');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flushRef.current(), AUTOSAVE_MS);
  };

  const saveNow = useCallback(async () => {
    if (!readyRef.current) return;
    if (!pending.current) pending.current = formRef.current;
    await flushRef.current();
    toastRef.current('Work log saved');
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void saveNow(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [saveNow]);

  const isToday = date === today;
  const offToday = form.todayOnLeave || form.todayHoliday;
  const offTomorrow = form.tomorrowOnLeave || form.tomorrowHoliday;
  const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const stamp = savedAt ? `Saved ${clock(savedAt)}` : isToday ? clock(now) : 'Past entry';

  if (loadErr && !ready) {
    return (
      <div className="liquid rounded-[2rem] p-8 text-center">
        <p className="font-bold">We couldn't open this day's log</p>
        <p className="text-sm text-muted mt-1">We won't let you type over it until it's loaded, so nothing gets lost.</p>
        <Button className="mt-4" variant="soft" onClick={() => { setLoadErr(false); setTick((t) => t + 1); }}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-hand text-4xl sm:text-5xl font-bold leading-none">{formatLocalDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            {isToday && <Badge tone="brand">Today</Badge>}
          </div>
          <SaveIndicator state={state} onRetry={() => void flushRef.current()} />
        </div>
        <Button size="lg" onClick={() => void saveNow()} loading={state === 'saving'} disabled={!ready} className="!rounded-full">Save</Button>
      </div>

      {!ready ? (
        <div className="grid lg:grid-cols-2 gap-5"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5 items-stretch flex-1">
          <Panel
            stamp={stamp} icon="done" title={isToday ? 'What did you do today?' : 'What did you do that day?'} hint="One item per line keeps reports tidy." off={offToday}
            switches={<>
              <Switch checked={form.todayOnLeave} onChange={(v) => change({ todayOnLeave: v })} label={isToday ? 'On leave today' : 'On leave'} />
              <Switch checked={form.todayHoliday} onChange={(v) => change({ todayHoliday: v })} label={isToday ? 'Holiday today' : 'Holiday'} />
            </>}
          >
            <AutoArea id="wl-today" value={form.todayWork} onChange={(v) => change({ todayWork: v })} dim={offToday} placeholder={'One thing per line…\nShipped the invoice export\nReviewed Priya\'s pull request'} />
            <div className="flex justify-between mt-3 px-5 sm:px-6 pb-1 text-xs text-muted">
              <span>{offToday ? 'Writing is optional, and the day still counts for your streak.' : `${form.todayWork.split('\n').filter((l) => l.trim()).length} ${form.todayWork.split('\n').filter((l) => l.trim()).length === 1 ? 'item' : 'items'}`}</span>
              <span className="tabular-nums shrink-0 ml-3">{wordCount(form.todayWork)} words</span>
            </div>
          </Panel>
          <Panel
            stamp={stamp} icon="next" title={isToday ? 'Planned for tomorrow?' : 'Planned for the next day?'} hint="Each line becomes a task on your board automatically." off={offTomorrow}
            switches={<>
              <Switch checked={form.tomorrowOnLeave} onChange={(v) => change({ tomorrowOnLeave: v })} label="On leave" />
              <Switch checked={form.tomorrowHoliday} onChange={(v) => change({ tomorrowHoliday: v })} label="Holiday" />
            </>}
          >
            <AutoArea id="wl-tomorrow" value={form.tomorrowWork} onChange={(v) => change({ tomorrowWork: v })} dim={offTomorrow} placeholder={'Plan the next day, one item per line…'} />
            <div className="flex justify-between mt-3 px-5 sm:px-6 pb-1 text-xs text-muted">
              <span>{offTomorrow ? 'No tasks will be created for a day off.' : `${form.tomorrowWork.split('\n').filter((l) => l.trim()).length} ${form.tomorrowWork.split('\n').filter((l) => l.trim()).length === 1 ? 'task' : 'tasks'} will be created`}</span>
              <span className="tabular-nums shrink-0 ml-3">{wordCount(form.tomorrowWork)} words</span>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
};
