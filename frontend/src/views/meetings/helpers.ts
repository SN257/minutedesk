import { formatClock } from '../../lib/formats';
import { addDaysToDateString, formatLocalDate, parseLocalDate } from '../../lib/date';

export interface Point {
  id?: string;
  text: string;
  category?: 'Decision' | 'Lesson' | 'Information' | string;
  assignee?: string;
  deadline?: string;
  taskId?: string;
}
export interface Note {
  id?: string;
  title?: string;
  points?: Point[];
  important?: boolean;
  followUp?: boolean;
}
export interface Meeting {
  id: string;
  userId?: string;
  center?: string | null;
  personName?: string | null;
  date: string;
  day?: string | null;
  startTime?: string;
  endTime?: string;
  place?: string | null;
  attendance?: string | null;
  presentSantName?: string | null;
  meetingType?: string | null;
  scheduledMeetingId?: string | null;
  agenda?: string[] | null;
  notes?: Note[] | null;
  createdAt?: string;
}
export interface Scheduled {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  meetingType?: string | null;
  center?: string | null;
  participants?: number;
  agenda?: string[] | null;
}

export const MEETING_TYPES = ['SMC', 'One o one', 'HC Meeting', 'Spk Meeting', 'MVK Meeting', 'Others'];
export const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180];

export const isOneOnOne = (type?: string | null) => (type || '').toLowerCase() === 'one o one';

export const d10 = (s?: string | null) => (s || '').slice(0, 10);
export const hhmm = (t?: string | null) => formatClock(t);

export const titleCase = (s?: string | null) =>
  (s || '').split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ');

export const meetingTitle = (m: Pick<Meeting, 'center' | 'personName' | 'meetingType'>) => {
  if (isOneOnOne(m.meetingType)) return m.personName ? `One on one with ${m.personName}` : 'One on one';
  return m.center ? titleCase(m.center) : m.meetingType || 'Meeting';
};

export type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad' | 'dark';
export const typeTone = (type?: string | null): Tone => {
  switch (type) {
    case 'SMC': return 'brand';
    case 'One o one': return 'good';
    case 'HC Meeting': return 'warn';
    case 'Spk Meeting': return 'dark';
    default: return 'neutral';
  }
};
export const categoryTone = (c?: string): Tone => (c === 'Decision' ? 'good' : c === 'Lesson' ? 'brand' : 'neutral');

export const timeRange = (s?: string | null, e?: string | null) => (s ? `${hhmm(s)}${e ? ` – ${hhmm(e)}` : ''}` : '');

export const durationLabel = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${h} hr ${r} min` : `${h} hr${h > 1 ? 's' : ''}`;
};

export const addMinutes = (time: string, mins: number) => {
  const [h, m] = time.split(':').map(Number);
  const total = (((h || 0) * 60 + (m || 0) + mins) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const longDate = (d: string) => formatLocalDate(d10(d), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
export const shortDate = (d: string) => formatLocalDate(d10(d), { weekday: 'short', month: 'short', day: 'numeric' });

export const monthKey = (d: string) => d10(d).slice(0, 7);
export const monthLabel = (key: string) => parseLocalDate(`${key}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const meetingStats = (m: Meeting) => {
  const notes = m.notes || [];
  const points = notes.reduce((a, n) => a + (n.points?.filter((p) => p.text?.trim()).length || 0), 0);
  const allPoints = notes.flatMap((n) => n.points || []);
  return {
    agenda: m.agenda?.length || notes.length,
    points,
    actions: allPoints.filter((p) => p.text?.trim() && (p.assignee || p.taskId)).length,
    decisions: allPoints.filter((p) => p.text?.trim() && p.category === 'Decision').length,
    important: notes.some((n) => n.important),
    followUp: notes.some((n) => n.followUp),
  };
};

/** Plain-text version of the minutes, for "Copy as text". */
export const meetingToText = (m: Meeting) => {
  const L: string[] = [];
  L.push('MEETING MINUTES');
  L.push(`${meetingTitle(m)}${m.meetingType && !isOneOnOne(m.meetingType) ? ` – ${m.meetingType}` : ''}`);
  L.push('');
  L.push(`Date: ${longDate(m.date)}`);
  if (m.startTime) L.push(`Time: ${timeRange(m.startTime, m.endTime)}`);
  if (m.place) L.push(`Place: ${m.place}`);
  if (m.presentSantName) L.push(`Present Sant: ${m.presentSantName}`);
  if (m.attendance) L.push(`Attendance: ${m.attendance}`);
  const agenda = (m.agenda || []).filter((a) => a?.trim());
  if (agenda.length) {
    L.push('', 'AGENDA');
    agenda.forEach((a, i) => L.push(`${i + 1}. ${a}`));
  }
  const notes = m.notes || [];
  if (notes.length) {
    L.push('', 'MINUTES');
    notes.forEach((n, i) => {
      const flags = [n.important && '[IMPORTANT]', n.followUp && '[FOLLOW-UP]'].filter(Boolean).join(' ');
      L.push('', `${notes.length > 1 ? `${i + 1}. ` : ''}${n.title || `Agenda item ${i + 1}`}${flags ? ` ${flags}` : ''}`);
      (n.points || []).filter((p) => p.text?.trim()).forEach((p) => {
        const meta = [p.assignee && `Assignee: ${p.assignee}`, p.deadline && `Due: ${shortDate(p.deadline)}`].filter(Boolean).join(', ');
        L.push(`  • ${p.category ? `[${p.category}] ` : ''}${p.text}${meta ? ` (${meta})` : ''}`);
      });
    });
  }
  return L.join('\n');
};

/** The list view remembers which tab you were on. */
const TAB_KEY = 'md2.meetings.tab';
export type ListTab = 'logged' | 'scheduled';
export const getListTab = (): ListTab => {
  try { return sessionStorage.getItem(TAB_KEY) === 'scheduled' ? 'scheduled' : 'logged'; } catch { return 'logged'; }
};
export const setListTab = (t: ListTab) => {
  try { sessionStorage.setItem(TAB_KEY, t); } catch { /* ignore */ }
};

/* ───────── filters shared by the meeting lists ───────── */
export type MeetingPeriod = 'any' | 'week' | 'month' | 'lastmonth' | '90d' | 'year';
export const MEETING_PERIODS: { value: MeetingPeriod; label: string }[] = [
  { value: 'any', label: 'Any time' }, { value: 'week', label: 'This week' }, { value: 'month', label: 'This month' },
  { value: 'lastmonth', label: 'Last month' }, { value: '90d', label: 'Last 90 days' }, { value: 'year', label: 'This year' },
];
export const inMeetingPeriod = (date: string, p: MeetingPeriod, today: string) => {
  const d = d10(date);
  if (p === 'any') return true;
  if (p === 'week') { const from = addDaysToDateString(today, -((parseLocalDate(today).getDay() + 6) % 7)); return d >= from && d <= addDaysToDateString(from, 6); }
  if (p === 'month') return d.slice(0, 7) === today.slice(0, 7);
  if (p === 'lastmonth') { const x = parseLocalDate(`${today.slice(0, 7)}-01`); const prev = new Date(x.getFullYear(), x.getMonth() - 1, 1); return d.slice(0, 7) === `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`; }
  if (p === '90d') return d >= addDaysToDateString(today, -89) && d <= today;
  return d.slice(0, 4) === today.slice(0, 4);
};
export const MEETING_FLAGS: { value: string; label: string; hint: string }[] = [
  { value: 'actions', label: 'Has action items', hint: 'Points with an owner or a task' },
  { value: 'decisions', label: 'Has decisions', hint: 'At least one decision was recorded' },
  { value: 'important', label: 'Marked important', hint: 'An agenda item is flagged important' },
  { value: 'followup', label: 'Needs follow-up', hint: 'An agenda item is flagged for follow-up' },
];
/** A meeting matches when it has every flag that is switched on. */
export const matchesFlags = (m: Meeting, flags: string[]) => {
  if (!flags.length) return true;
  const st = meetingStats(m);
  return flags.every((f) => (f === 'actions' ? st.actions > 0 : f === 'decisions' ? st.decisions > 0 : f === 'important' ? st.important : st.followUp));
};
