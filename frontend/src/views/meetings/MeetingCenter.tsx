import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ViewProps } from '../../lib/nav';
import { parseLocalDate } from '../../lib/date';
import { useToast } from '../../lib/toast';
import { deleteMeeting, getMeetings } from '../../lib/api';
import { Badge, Button, Card, Empty, Input, Skeleton, useAsync } from '../../ui';
import { Icon } from '../../shell/icons';
import { BackLink, ConfirmModal, Ico, IconBtn } from './bits';
import { d10, longDate, meetingStats, meetingTitle, monthKey, monthLabel, timeRange, titleCase, typeTone, type Meeting } from './helpers';

const PAGE = 25;
export const NO_CENTER = 'No center';
export const centerOf = (m: Meeting) => (m.center ? titleCase(m.center) : NO_CENTER);

/** Every meeting of one center: search, filter by type, grouped by month, paged. */
const MeetingCenter = ({ name, go }: { name: string } & Pick<ViewProps, 'go'>) => {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync<Meeting[]>(() => getMeetings(), []);
  const [q, setQ] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [del, setDel] = useState<Meeting | null>(null);
  const [busy, setBusy] = useState(false);

  const all = useMemo(
    () => (data || []).filter((m) => centerOf(m) === name).sort((a, b) => d10(b.date).localeCompare(d10(a.date)) || (b.startTime || '').localeCompare(a.startTime || '')),
    [data, name],
  );
  const types = useMemo(() => {
    const c = new Map<string, number>();
    all.forEach((m) => { const t = m.meetingType || 'Others'; c.set(t, (c.get(t) || 0) + 1); });
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);

  const needle = q.trim().toLowerCase();
  const filtered = all.filter((m) => {
    if (type && (m.meetingType || 'Others') !== type) return false;
    if (!needle) return true;
    const hay = [m.place, m.personName, m.meetingType, m.presentSantName, ...(m.agenda || []), ...(m.notes || []).flatMap((n) => [n.title, ...(n.points || []).map((p) => p.text)])].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(needle);
  });
  const visible = filtered.slice(0, shown);
  const groups = useMemo(() => {
    const out: { key: string; items: Meeting[] }[] = [];
    visible.forEach((m) => {
      const k = monthKey(m.date);
      const last = out[out.length - 1];
      if (last && last.key === k) last.items.push(m); else out.push({ key: k, items: [m] });
    });
    return out;
  }, [visible]);

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await deleteMeeting(del.id);
      setData((d) => (d || []).filter((m) => m.id !== del.id));
      toast('Meeting deleted');
    } catch (e) {
      toast((e as Error).message || 'Could not delete the meeting', 'error');
    } finally { setBusy(false); setDel(null); }
  };

  const back = () => go('meetings');

  if (loading && !data) return <div className="space-y-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-40" /><Skeleton className="h-72" /></div>;
  if (error && !data) return <><BackLink onClick={back}>All meetings</BackLink><Card><Empty icon="😕" title="We couldn't load meetings" hint={error} action={<Button variant="soft" onClick={reload}>Try again</Button>} /></Card></>;

  return (
    <>
      <BackLink onClick={back}>All meetings</BackLink>
      <div className="rounded-[2rem] bg-ink text-white p-6 sm:p-8 relative overflow-hidden mb-5">
        <span aria-hidden className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider opacity-70">Center</p>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1 break-words">{name}</h1>
            <p className="mt-2 opacity-80">{all.length} {all.length === 1 ? 'meeting' : 'meetings'}{all[0] ? ` · last on ${longDate(all[0].date)}` : ''}</p>
          </div>
          <button type="button" onClick={() => go('meetings', 'new')} className="inline-flex items-center gap-2 rounded-xl bg-white text-ink px-5 py-3 text-sm font-bold hover:opacity-90 transition-opacity">{Icon.plus(16)} Log minutes</button>
        </div>
      </div>

      <div className="relative mb-3">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{Icon.search(17)}</span>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder={`Search in ${name}`} className="pl-11 !rounded-full !py-3" aria-label="Search this center" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 [scrollbar-width:none]" role="group" aria-label="Filter by type">
        {[[null, all.length] as [string | null, number], ...types].map(([t, n]) => (
          <button key={t ?? 'all'} type="button" aria-pressed={type === t} onClick={() => { setType(t); setShown(PAGE); }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${type === t ? 'bg-ink text-white' : 'bg-ink/[0.06] hover:bg-ink/[0.1] text-ink-2'}`}>
            {t ?? 'All'} <span className="opacity-60 ml-1">{n}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><Empty icon="🔍" title="Nothing matches" hint="Try a different word or type." action={<Button variant="soft" onClick={() => { setQ(''); setType(null); }}>Clear filters</Button>} /></Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="px-1 mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">{monthLabel(g.key)}</h2>
              <ul className="liquid rounded-[1.75rem] divide-y divide-line/70 overflow-hidden">
                <AnimatePresence initial={false}>
                  {g.items.map((m) => {
                    const st = meetingStats(m);
                    const d = parseLocalDate(d10(m.date));
                    return (
                      <motion.li key={m.id} layout exit={{ opacity: 0 }} className="group flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 hover:bg-ink/[0.04] transition-colors">
                        <button type="button" onClick={() => go('meetings', m.id)} className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 text-left">
                          <span className="w-14 shrink-0 rounded-2xl bg-brand-soft text-brand text-center py-2 leading-none">
                            <span className="block text-[10px] font-extrabold uppercase">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                            <span className="block text-xl font-extrabold tabular-nums mt-0.5">{d.getDate()}</span>
                          </span>
                          <span className="min-w-0">
                            <span className="block font-bold truncate">{meetingTitle(m)}</span>
                            <span className="block text-sm text-muted truncate">{[timeRange(m.startTime, m.endTime), m.place].filter(Boolean).join(' · ') || 'No time recorded'}</span>
                          </span>
                        </button>
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          {m.meetingType && <Badge tone={typeTone(m.meetingType)}>{m.meetingType}</Badge>}
                          {st.points > 0 && <Badge>{st.points} {st.points === 1 ? 'point' : 'points'}</Badge>}
                          {st.followUp && <Badge tone="brand">Follow-up</Badge>}
                        </div>
                        <IconBtn label="Delete meeting" tone="danger" onClick={() => setDel(m)}><Ico name="trash" size={16} /></IconBtn>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
          {filtered.length > shown && <div className="text-center"><Button variant="soft" onClick={() => setShown((s) => s + PAGE)}>Show more ({filtered.length - shown} left)</Button></div>}
        </div>
      )}

      <ConfirmModal
        open={!!del}
        title="Delete this meeting?"
        body={del && <>The minutes for <b>{meetingTitle(del)}</b> on {longDate(del.date)} will be removed for good.</>}
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => !busy && setDel(null)}
      />
    </>
  );
};

export default MeetingCenter;
