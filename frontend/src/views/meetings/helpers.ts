import { formatClock } from '../../lib/formats';
import { formatLocalDate, parseLocalDate } from '../../lib/date';

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
