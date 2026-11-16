import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../lib/siteConfig';
import { AnimatePresence, motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { Button, Card, Stagger } from '../../ui';
import { isYesterdayWorkLogMissing } from '../../lib/api';
import { formatLocalDate, getLocalDateString, parseLocalDate } from '../../lib/date';
import { spring } from '../../lib/motion';
import { DatePickerButton } from '../../ui/datepicker';
import { DateStrip } from './DateStrip';
import { Editor } from './Editor';
import { HeatCalendar } from './HeatCalendar';
import { StreakCard, WeekCard } from './SideCards';
import { dayStatus, lastDays, loadLogs, peekLog, STREAK_WINDOW, useLogStore } from './logStore';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string | null, today: string): s is string =>
  !!s && DATE_RE.test(s) && getLocalDateString(parseLocalDate(s)) === s && s <= today;

/** One size for every button in this header, so "Back to today" and "Pick a date" always match. */
const PILL = 'inline-flex items-center justify-center gap-2 liquid rounded-full h-10 px-4 text-sm font-bold whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity';

const WorkLog = ({ param, go }: ViewProps) => {
  const t = useT();
  const today = getLocalDateString();
  const date = validDate(param, today) ? param : today;
  useLogStore();

  const [missing, setMissing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Warm the cache: newest days first so the strip + streak fill in quickly.
  useEffect(() => {
    let stop = false;
    void loadLogs(lastDays(STREAK_WINDOW, today), 10, () => stop);
    return () => { stop = true; };
  }, [today]);

  useEffect(() => {
    isYesterdayWorkLogMissing().then((r) => setMissing(r?.missing ? r.date : null)).catch(() => {});
  }, []);

  // Once the missing day gets written, the banner should go away by itself.
  const stillMissing = missing && dayStatus(peekLog(missing)) === 'empty' && !dismissed && date !== missing;

  const select = (d: string) => go('worklog', d === today ? null : d);
  const missingLabel = useMemo(() => (missing ? formatLocalDate(missing, { weekday: 'long', day: 'numeric', month: 'short' }) : ''), [missing]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3 sm:mb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('worklog.title')}</h1>
          <p className="text-muted mt-1">{t('worklog.sub')}</p>
        </div>
        <div className="flex items-center gap-2">
          {date !== today && <button type="button" onClick={() => select(today)} className={PILL}>Back to today</button>}
          <DatePickerButton value={date} max={today} onChange={(d) => validDate(d, today) && select(d)}
            className={PILL}
            mark={(d) => { const st = dayStatus(peekLog(d)); return st === 'logged' ? 'logged' : st === 'leave' ? 'leave' : st === 'holiday' ? 'holiday' : null; }}
            onMonth={(ym) => {
              // fill in the dots: look up this month's days (never the future)
              const days: string[] = [];
              for (let n = 1; n <= 31; n++) { const d = `${ym}-${String(n).padStart(2, '0')}`; if (d.slice(0, 7) === ym && d <= today && getLocalDateString(parseLocalDate(d)) === d) days.push(d); }
              void loadLogs(days.reverse(), 8, () => false);
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
            Pick a date
          </DatePickerButton>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {stillMissing && missing && (
          <motion.div
            key="banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 12 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={spring} className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 liquid rounded-2xl pl-4 pr-3 py-2.5 border-l-4 !border-l-warn">
              <p className="flex-1 basis-56 text-sm"><span className="font-bold">{missingLabel} is not logged yet.</span> <span className="text-ink-2">It only takes a minute.</span></p>
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" onClick={() => select(missing)} className="!rounded-full">Write it now</Button>
                <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="w-8 h-8 rounded-full text-muted hover:bg-ink/5 grid place-items-center">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Stagger>
        <div className="space-y-3 sm:space-y-5">
          <DateStrip selected={date} today={today} onSelect={select} />
          <div className="grid xl:grid-cols-[minmax(0,1fr)_21rem] gap-3 sm:gap-5 items-stretch">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={date} className="min-w-0 h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <Editor date={date} today={today} />
              </motion.div>
            </AnimatePresence>
            <Card className="overflow-hidden divide-y divide-line/70 min-w-0">
              <StreakCard today={today} bare />
              <WeekCard today={today} onPick={select} bare />
              <HeatCalendar selected={date} today={today} onPick={select} bare />
            </Card>
          </div>
        </div>
      </Stagger>
    </div>
  );
};

export default WorkLog;
