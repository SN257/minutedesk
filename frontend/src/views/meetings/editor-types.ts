import { addDaysToDateString, getLocalDateString, parseLocalDate } from '../../lib/date';

/* ───────── Editor state types ───────── */
export type Category = 'Information' | 'Decision' | 'Lesson';

export interface EPoint {
  id: string;
  text: string;
  category: Category;
  assignee: string;
  deadline: string;
  taskId?: string;
}

export interface ENote {
  id: string;
  title: string;
  points: EPoint[];
  important: boolean;
  followUp: boolean;
  /** Set when the section was created from an agenda item, so it can follow that item. Never sent to the server. */
  agendaId?: string;
  agendaTitle?: string;
}

export interface EAgendaItem {
  id: string;
  /** One whole agenda block: the headline plus any sub-point lines, exactly as typed or pasted. */
  text: string;
}

export interface EditorData {
  meetingType: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  center: string;
  place: string;
  personName: string;
  presentSantName: string;
  attendance: string[];
  scheduledMeetingId: string | null;
  agenda: EAgendaItem[];
  notes: ENote[];
}

export const MEETING_TYPES: { key: string; hint: string }[] = [
  { key: 'SMC', hint: 'Regular committee meeting' },
  { key: 'One o one', hint: 'Just you and one person' },
  { key: 'HC Meeting', hint: 'Core team meeting' },
  { key: 'Spk Meeting', hint: 'Speaker meeting' },
  { key: 'MVK Meeting', hint: 'MVK gathering' },
  { key: 'Others', hint: 'Anything else' },
];

export const CATEGORIES: { key: Category; tone: string; dot: string; hint: string }[] = [
  { key: 'Information', tone: 'text-ink-2', dot: 'bg-muted', hint: 'Just something to note' },
  { key: 'Decision', tone: 'text-brand', dot: 'bg-brand', hint: 'Something we decided' },
  { key: 'Lesson', tone: 'text-good', dot: 'bg-good', hint: 'Something we learned' },
];

export const isOneOnOne = (t: string) => t === 'One o one';
export const isActionCategory = (c: Category) => c === 'Decision' || c === 'Lesson';

/* ───────── Ids & factories ───────── */
let seq = 0;
export const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const blankPoint = (): EPoint => ({ id: uid(), text: '', category: 'Information', assignee: '', deadline: '' });
export const blankNote = (title = ''): ENote => ({ id: uid(), title, points: [blankPoint()], important: false, followUp: false });

export const emptyData = (): EditorData => ({
  meetingType: '',
  date: getLocalDateString(),
  day: weekdayOf(getLocalDateString()),
  startTime: '',
  endTime: '',
  center: '',
  place: '',
  personName: '',
  presentSantName: '',
  attendance: [],
  scheduledMeetingId: null,
  agenda: [],
  notes: [],
});

/* ───────── Dates & times ───────── */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const weekdayOf = (date: string): string => {
  if (!date) return '';
  const d = parseLocalDate(date);
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()];
};

export const prettyDate = (date: string): string => {
  if (!date) return '';
  const d = parseLocalDate(date);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const quickDates = () => {
  const today = getLocalDateString();
  return [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDaysToDateString(today, 1) },
    { label: 'Yesterday', value: addDaysToDateString(today, -1) },
  ];
};

export const addMinutes = (time: string, mins: number): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return '';
  const total = (Number(m[1]) * 60 + Number(m[2]) + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const prettyTime = (time: string): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (!m) return time || '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

/* ───────── Normalising server data ───────── */
const agendaText = (a: unknown): string => {
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') {
    const o = a as { title?: string; text?: string };
    return o.title || o.text || '';
  }
  return '';
};

export const toAgendaItems = (list: unknown): EAgendaItem[] =>
  (Array.isArray(list) ? list : []).map(agendaText).filter((t) => t.trim()).map((text) => ({ id: uid(), text }));

export const splitAttendance = (v: unknown): string[] =>
  typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v.map(String) : [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toNotes = (list: any): ENote[] =>
  (Array.isArray(list) ? list : []).map((n) => ({
    id: String(n?.id || uid()),
    title: String(n?.title || ''),
    important: !!n?.important,
    followUp: !!n?.followUp,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    points: (Array.isArray(n?.points) ? n.points : []).map((p: any): EPoint => ({
      id: String(p?.id || uid()),
      text: String(p?.text || ''),
      category: p?.category === 'Decision' || p?.category === 'Lesson' ? p.category : 'Information',
      assignee: String(p?.assignee || ''),
      deadline: String(p?.deadline || ''),
      taskId: p?.taskId ? String(p.taskId) : undefined,
    })),
  }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromServerMeeting = (m: any): EditorData => ({
  meetingType: m?.meetingType || '',
  date: m?.date ? String(m.date).slice(0, 10) : '',
  day: m?.day || weekdayOf(m?.date ? String(m.date).slice(0, 10) : ''),
  startTime: m?.startTime || '',
  endTime: m?.endTime || '',
  center: m?.center || '',
  place: m?.place || '',
  personName: m?.personName || '',
  presentSantName: m?.presentSantName || '',
  attendance: splitAttendance(m?.attendance),
  scheduledMeetingId: m?.scheduledMeetingId ? String(m.scheduledMeetingId) : null,
  agenda: toAgendaItems(m?.agenda),
  notes: toNotes(m?.notes),
});

/** Fields a scheduled meeting can fill in. Agenda is included but never locked. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromScheduled = (s: any): Partial<EditorData> => {
  const date = s?.date ? String(s.date).slice(0, 10) : '';
  return {
    meetingType: s?.meetingType || '',
    date,
    day: weekdayOf(date),
    startTime: s?.startTime || '',
    endTime: s?.endTime || '',
    center: s?.center || '',
    place: s?.place || '',
    personName: s?.personName || '',
    presentSantName: s?.presentSantName || '',
    attendance: splitAttendance(s?.attendance),
    scheduledMeetingId: s?.id ? String(s.id) : null,
    agenda: toAgendaItems(s?.agenda),
  };
};

/* ───────── Validation ───────── */
export interface Problem {
  step: number;
  field: string;
  message: string;
}

export const validate = (d: EditorData): Problem[] => {
  const out: Problem[] = [];
  const one = isOneOnOne(d.meetingType);
  if (!d.meetingType) out.push({ step: 0, field: 'meetingType', message: 'Pick what kind of meeting this was' });
  if (!d.center.trim()) out.push({ step: 1, field: 'center', message: 'Choose a center' });
  if (one && !d.personName.trim()) out.push({ step: 1, field: 'personName', message: 'Who was the one-on-one with?' });
  if (!d.date) out.push({ step: 0, field: 'date', message: 'Pick the date' });
  if (!d.startTime) out.push({ step: 0, field: 'startTime', message: 'Add a start time' });
  if (!d.endTime) out.push({ step: 0, field: 'endTime', message: 'Add an end time' });
  if (d.startTime && d.endTime && d.endTime <= d.startTime) out.push({ step: 0, field: 'endTime', message: 'End time should be after the start' });
  if (!one && d.meetingType) {
    if (!d.place.trim()) out.push({ step: 1, field: 'place', message: 'Where did it happen?' });
    if (d.attendance.length === 0) out.push({ step: 1, field: 'attendance', message: 'Add at least one person who was present' });
  }
  return out;
};

/** True when there is anything worth keeping as a draft. */
export const hasContent = (d: EditorData): boolean =>
  !!(d.meetingType || d.startTime || d.endTime || d.center || d.place || d.personName || d.presentSantName ||
    d.attendance.length || d.agenda.some((a) => a.text.trim()) ||
    d.notes.some((n) => n.title.trim() || n.points.some((p) => p.text.trim())));

/** Builds the payload for the backend. */
export const toPayload = (d: EditorData) => {
  const one = isOneOnOne(d.meetingType);
  const notes = d.notes
    .map((n) => ({
      id: n.id,
      title: n.title.trim() || undefined,
      important: n.important,
      followUp: n.followUp,
      points: n.points
        .filter((p) => p.text.trim())
        .map((p) => {
          const action = isActionCategory(p.category);
          return {
            id: p.id,
            text: p.text.trim(),
            category: p.category,
            assignee: action ? p.assignee : '',
            deadline: action ? p.deadline : '',
            taskId: action ? p.taskId : undefined,
          };
        }),
    }))
    .filter((n) => n.title || n.points.length > 0);

  return {
    center: d.center || undefined,
    personName: one ? d.personName.trim() : undefined,
    date: d.date,
    day: one ? undefined : d.day || weekdayOf(d.date),
    startTime: d.startTime,
    endTime: d.endTime,
    place: one ? undefined : d.place.trim(),
    attendance: one ? undefined : d.attendance.join(', '),
    presentSantName: one ? undefined : d.presentSantName.trim(),
    meetingType: d.meetingType,
    scheduledMeetingId: d.scheduledMeetingId || undefined,
    // Agenda blocks are saved verbatim (line breaks and bullet markers intact).
    agenda: d.agenda.map((a) => a.text.replace(/\s+$/, '')).filter((t) => t.trim()),
    notes,
  };
};
