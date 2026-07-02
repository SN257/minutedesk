import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createMeeting, getMeeting, updateMeeting, getScheduledMeetings, getScheduledMeeting, getAllUsers, getBoardsForUser, createBoardForUser, getListsApiSystem, createListApiSystem, createCardApiSystem, updateCardApiSystem, deleteCardApiSystem } from "../services/api";
import { useSnackbar } from "../contexts/SnackbarContext";
import { useMeetings } from "../contexts/MeetingsContext";
import { useAuth } from "../contexts/AuthContext";
import { parseLocalDate } from "../utils/date";

type Point = {
  id: string;
  text: string;
  category?: 'Decision' | 'Lesson' | 'Information';
  assignee?: string;
  deadline?: string;
  taskId?: string; // Track the card ID if task was created
};

type Note = {
  id: string;
  title?: string;
  points: Point[];
  important: boolean;
  followUp: boolean;
};

const defaultCenters = [
  "NA Head Center",
  "ATLANTA",
  "BOSTON",
  "CHICAGO",
  "CHERRY HILL",
  "EDISON",
  "Jercy City",
  "SAN FRANCISCO",
  "Oak Forest",
  "Fayetteville",
  "Dallas",
  "Cleveland",
  "Toronto",
  "Brampton",
  "Windsor",
  "Ottawa",
  "KWCG",
  "Hamilton",
  "Edmonton",
  "Regina",
  "Calgary",
  "London",
  "Etobicoke",
  "Scarborough"
];

const formatCenterName = (s: string | null | undefined) => {
  if (!s) return '';
  return s
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
};

type ParsedAgendaItem = { title: string; points: string[] };

const NUMBERED_RE = /^\d+[.)]\s+/;
const ANY_MARKER_RE = /^(?:\d+[.)]|[a-zA-Z][.)]|[ivxlcdm]{2,}[.)]|[•●♦*\-◦○▪‣·])\s+/i;

// Parses pasted outline text (e.g. copied from Word) into agenda items.
//
// Two modes, chosen by whether the text has numbered lines ("1.", "2.", ...):
// - Numbered outline: only numbered lines start a new agenda item. Everything
//   else directly under one — bullets ("*", "-", "•"), lettered/roman
//   sub-points, or plain continuation text, regardless of indentation — is
//   folded into that same agenda's discussion points. This is the common case
//   (a numbered heading followed by a flat "*" bullet list of details) and
//   matters most: bullet characters alone are too ambiguous to tell "new
//   agenda" from "sub-point of the one above" without the numbering anchor.
// - No numbering at all: falls back to indentation — lines at the minimum
//   indentation are each their own agenda item, deeper-indented lines nest
//   under the closest preceding one.
const parseBulkAgendaText = (raw: string): ParsedAgendaItem[] => {
  const lines = raw
    .split(/\r\n|\r|\n/)
    .map((line) => {
      if (!line.trim()) return null;
      const leading = line.match(/^[\t ]*/)?.[0] ?? '';
      const indent = leading.replace(/\t/g, '    ').length;
      const trimmed = line.trim();
      const isNumbered = NUMBERED_RE.test(trimmed);
      const text = trimmed.replace(ANY_MARKER_RE, '').trim();
      return text ? { text, indent, isNumbered } : null;
    })
    .filter((l): l is { text: string; indent: number; isNumbered: boolean } => l !== null);

  if (lines.length === 0) return [];

  const hasNumbering = lines.some((l) => l.isNumbered);
  const baseIndent = Math.min(...lines.map((l) => l.indent));
  const items: ParsedAgendaItem[] = [];

  for (const line of lines) {
    const isSub = items.length > 0 && (hasNumbering ? !line.isNumbered : line.indent > baseIndent);
    if (isSub) {
      items[items.length - 1].points.push(line.text);
    } else {
      items.push({ title: line.text, points: [] });
    }
  }

  return items;
};

const AddMeeting = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showSnackbar } = useSnackbar();
  const { invalidateCache } = useMeetings();
  const { user } = useAuth();
  const [scheduledMeetings, setScheduledMeetings] = useState<any[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [selectedScheduledId, setSelectedScheduledId] = useState<string | null>(null);
  const [isPrefilledFromScheduled, setIsPrefilledFromScheduled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<string>("");
  const [centerSearch, setCenterSearch] = useState<string>("");
  const [personName, setPersonName] = useState("");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [place, setPlace] = useState("");
  const [attendance, setAttendance] = useState<string[]>([]);
  const [attendanceInput, setAttendanceInput] = useState("");
  const [attendanceSuggestions, setAttendanceSuggestions] = useState<string[]>([]);
  const [showAttendanceSuggestions, setShowAttendanceSuggestions] = useState(false);
  const [attendanceHighlightedIndex, setAttendanceHighlightedIndex] = useState(-1);
  const [presentSantName, setPresentSantName] = useState("");
  const [meetingType, setMeetingType] = useState<string>("");
  const [users, setUsers] = useState<Array<{ id: string; name?: string; email?: string }>>([]);
  const [notes, setNotes] = useState<Note[]>([
    { id: String(Date.now()), points: [{ id: String(Date.now()), text: "", category: 'Information', assignee: '', deadline: '' }], important: false, followUp: false },
  ]);
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showPointDropdown, setShowPointDropdown] = useState<string | null>(null);
  const [showScheduledDropdown, setShowScheduledDropdown] = useState(false);
  const [centerHighlightedIndex, setCenterHighlightedIndex] = useState<number>(-1);
  const [typeHighlightedIndex, setTypeHighlightedIndex] = useState<number>(-1);
  const [scheduledHighlightedIndex, setScheduledHighlightedIndex] = useState<number>(-1);
  const [dayHighlightedIndex, setDayHighlightedIndex] = useState<number>(-1);
  const [isComposing, setIsComposing] = useState(false);
  const [lastAddedPointId, setLastAddedPointId] = useState<string | null>(null);
  const [showBulkAgendaModal, setShowBulkAgendaModal] = useState(false);
  const [bulkAgendaText, setBulkAgendaText] = useState("");
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement | null>(null);
  const initialTaskIdsRef = useRef<string[]>([]);
  const initialPointsRef = useRef<Record<string, { assignee?: string; taskId?: string }>>({});
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!assigneeDropdownRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!assigneeDropdownRef.current.contains(e.target)) {
        setShowAssigneeDropdown(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Simple inline DatePicker component (YYYY-MM-DD value)
  const DatePicker = ({ value, onChange, className }: { value?: string; onChange: (v: string) => void; className?: string }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const [viewDate, setViewDate] = useState(() => value ? parseLocalDate(value) : new Date());

    useEffect(() => {
      if (value) setViewDate(parseLocalDate(value));
    }, [value]);

    useEffect(() => {
      const onDoc = (e: MouseEvent) => {
        if (!ref.current) return;
        if (!(e.target instanceof Node)) return;
        if (!ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    // placeholders to align first day of month to correct weekday (but do not render previous/next month days)
    const startIdx = startOfMonth.getDay();
    const placeholders = Array.from({ length: startIdx }).map(() => null);
    const monthDays: Date[] = [];
    for (let d = 1; d <= endOfMonth.getDate(); d++) monthDays.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
    const cells: (Date | null)[] = [...placeholders, ...monthDays];

    const formatDisplay = (v?: string) => {
      if (!v) return '';
      try { return parseLocalDate(v).toLocaleDateString(); } catch { return v; }
    };

    const toIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return (
      <div className={`relative ${className || ''}`} ref={ref as any}>
        <button type="button" onClick={() => setOpen(v => !v)} className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-left flex items-center justify-between transition-colors">
          <span className="truncate text-gray-700 dark:text-slate-200">{value ? formatDisplay(value) : 'Select date'}</span>
          <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full z-40 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg p-3 w-64 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition-colors">◀</button>
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{viewDate.toLocaleString(undefined, { month: 'long' })} {viewDate.getFullYear()}</div>
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition-colors">▶</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500 dark:text-slate-400 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm">
              {cells.map((dt, i) => {
                if (!dt) return <div key={`ph-${i}`} className="py-1" />;
                const iso = toIso(dt);
                const isSelected = value === iso;
                const todayIso = toIso(new Date());
                const isToday = iso === todayIso;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(iso); setOpen(false); }}
                    className={`py-1 rounded ${isSelected ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-300'} flex items-center justify-center transition-colors`}
                    aria-current={isToday}
                  >
                    <span className={`${isToday ? 'inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-700 dark:border-slate-400' : ''}`}>{dt.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  const titleEditMode = useRef<{ [noteId: string]: boolean }>({});
  const [, forceRerender] = useState(0);
  const centerListRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const typeListRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const dayListRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const centerListContainerRef = useRef<HTMLDivElement | null>(null);
  const typeListContainerRef = useRef<HTMLDivElement | null>(null);
  const dayListContainerRef = useRef<HTMLDivElement | null>(null);
  const pointDropdownRef = useRef<HTMLDivElement | null>(null);
  const scheduledListContainerRef = useRef<HTMLDivElement | null>(null);
  const centerDropdownRef = useRef<HTMLDivElement | null>(null);
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const dayDropdownRef = useRef<HTMLDivElement | null>(null);
  const scheduledListRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const scheduledDropdownRef = useRef<HTMLDivElement | null>(null);

  const meetingTypes = ["SMC", "One o one", "HC Meeting", "Spk Meeting", "MVK Meeting", "Others"];
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const filteredCenters = defaultCenters.filter((c) =>
    c.toLowerCase().includes(centerSearch.toLowerCase())
  );

  const weekdayFromDate = (d: string) => {
    if (!d) return '';
    try {
      const dt = parseLocalDate(d);
      if (isNaN(dt.getTime())) return '';
      return daysOfWeek[dt.getDay()];
    } catch (err) {
      return '';
    }
  };

  // Load existing meeting data when editing
  useEffect(() => {
    if (id && id !== 'new') {
      const loadMeeting = async () => {
        try {
          setLoading(true);
          const data = await getMeeting(id);
          setCenter(data.center || '');
          setPersonName(data.personName || '');
          setDate(data.date || '');
          setDay(data.day || '');
          setStartTime(data.startTime || '');
          setEndTime(data.endTime || '');
          setPlace(data.place || '');
          setAttendance(data.attendance ? data.attendance.split(', ').filter(Boolean) : []);
          setPresentSantName(data.presentSantName || '');
          setMeetingType(data.meetingType || '');
          // Merge notes with any updated agenda from linked scheduled meeting
          let initialNotes = data.notes || [{ id: String(Date.now()), points: [{ id: String(Date.now()), text: "" }], important: false, followUp: false }];
          // If meeting was created from a scheduled meeting, fetch that scheduled meeting and merge agenda titles
          if (data.scheduledMeetingId) {
            try {
              const sched = await getScheduledMeeting(String(data.scheduledMeetingId));
              const agenda = sched?.agenda || [];
              if (Array.isArray(agenda) && agenda.length > 0) {
                // find titles already present in notes
                const existingTitles = new Set(initialNotes.map((n: any) => (n.title || '').trim()));
                const newNotes = agenda
                  .map((a: any) => (typeof a === 'string' ? a.trim() : (a.title || a.text || '').trim()))
                  .filter((t: string) => t && !existingTitles.has(t))
                  .map((t: string) => ({ id: String(Date.now() + Math.random()), title: t, points: [{ id: String(Date.now() + Math.random()), text: '', category: 'Information' }], important: false, followUp: false }));

                if (newNotes.length > 0) {
                  initialNotes = [...initialNotes, ...newNotes];
                }
              }
            } catch (err) {
              // ignore scheduled meeting fetch errors
            }
          }

          setNotes(initialNotes);
          // capture existing taskIds so we can delete removed tasks later
          try {
            initialTaskIdsRef.current = (initialNotes || []).flatMap((n: any) => (n.points || []).map((p: any) => p.taskId).filter(Boolean));
          } catch (e) {
            initialTaskIdsRef.current = [];
          }
          // capture initial assignee/taskId mapping per point to detect assignee changes
          try {
            const map: Record<string, { assignee?: string; taskId?: string }> = {};
            (initialNotes || []).forEach((n: any) => (n.points || []).forEach((p: any) => { map[p.id] = { assignee: p.assignee, taskId: p.taskId }; }));
            initialPointsRef.current = map;
          } catch (e) {
            initialPointsRef.current = {};
          }
          // If we're editing an existing meeting, enable title edit mode for each note
          if (id && id !== 'new') {
            initialNotes.forEach((n: any) => { titleEditMode.current[n.id] = true; });
            // trigger rerender so inputs show
            forceRerender((v) => v + 1);
          }
        } catch (err: any) {
          showSnackbar(err.message || 'Failed to load meeting', 'error');
          // Don't auto-navigate away - let user decide
          // Set to create mode if meeting not found
          setMeetingType('');
        } finally {
          setLoading(false);
        }
      };
      loadMeeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch scheduled meetings for the "Select Scheduled Meeting" dropdown
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setScheduledLoading(true);
        const data = await getScheduledMeetings();
        if (!active) return;
        setScheduledMeetings(data || []);
      } catch (err) {
        // ignore
      } finally {
        if (active) setScheduledLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  // Fetch all users for assignee dropdown
  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      try {
        const data = await getAllUsers();
        if (!active) return;
        setUsers(data || []);
      } catch (err) {
        // ignore
      }
    };
    loadUsers();
    return () => { active = false; };
  }, []);

  // Only show scheduled meetings that match the currently selected meeting type
  const filteredScheduledMeetings = meetingType
    ? scheduledMeetings.filter((m) => {
      const a = String(m.meetingType || '').trim().toLowerCase();
      const b = String(meetingType || '').trim().toLowerCase();
      return a === b || a.includes(b) || b.includes(a);
    })
    : [];

  const clearSelectedScheduled = () => {
    setSelectedScheduledId(null);
    setIsPrefilledFromScheduled(false);
    // Clear all fields that may have been prefilled from a scheduled meeting
    // Preserve `meetingType` as requested
    setCenter('');
    setPersonName('');
    setDate('');
    setDay('');
    setStartTime('');
    setEndTime('');
    setPlace('');
    setAttendance([]);
    setAttendanceInput('');
    setPresentSantName('');
    setNotes([
      { id: String(Date.now()), points: [{ id: String(Date.now()), text: '', category: 'Information' }], important: false, followUp: false },
    ]);
    setShowScheduledDropdown(false);
  };

  const handleSelectScheduled = (id: string | null) => {
    if (!id) {
      clearSelectedScheduled();
      return;
    }

    const meeting = scheduledMeetings.find((m) => String(m.id) === String(id));
    if (!meeting) return;

    // Map scheduled meeting fields into the form and lock non-time fields
    setSelectedScheduledId(String(meeting.id));
    setIsPrefilledFromScheduled(true);

    // Meeting type first (so Meeting Details area shows)
    if (meeting.meetingType) setMeetingType(meeting.meetingType);

    setCenter(meeting.center || '');
    setPersonName(meeting.personName || '');
    setDate(meeting.date || '');
    setDay(meeting.day || '');
    setStartTime(meeting.startTime || '');
    setEndTime(meeting.endTime || '');
    setPlace(meeting.place || '');
    setAttendance(meeting.attendance ? (String(meeting.attendance).split(',').map((s) => s.trim()).filter(Boolean)) : []);
    setPresentSantName(meeting.presentSantName || '');

    // Convert agenda (array of strings) to notes structure - each agenda item becomes a titled section
    const agenda = meeting.agenda || meeting.notes || [];
    if (Array.isArray(agenda) && agenda.length > 0) {
      const mapped: Note[] = agenda.map((agendaItem: any, idx: number) => ({
        id: String(Date.now() + idx),
        title: typeof agendaItem === 'string' ? agendaItem : (agendaItem.text || agendaItem.title || `Agenda ${idx + 1}`),
        points: [{ id: String(Date.now() + Math.random()), text: '', category: 'Information' }],
        important: false,
        followUp: false,
      }));
      setNotes(mapped);
    }
  };

  // Auto-set day when date changes (only for structured meeting types)
  useEffect(() => {
    if (!date) return;
    if (meetingType === 'One o one') return; // do not auto-set for One o one
    const computed = weekdayFromDate(date);
    if (computed && computed !== day) {
      setDay(computed);
    }
  }, [date, meetingType]);

  useEffect(() => {
    if (showCenterDropdown) {
      setCenterHighlightedIndex(filteredCenters.length > 0 ? 0 : -1);
    } else {
      setCenterHighlightedIndex(-1);
    }
  }, [showCenterDropdown, filteredCenters.length]);

  // auto-scroll highlighted center option into view
  useEffect(() => {
    const idx = centerHighlightedIndex;
    if (idx >= 0 && centerListRefs.current[idx]) {
      try {
        centerListRefs.current[idx]!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (err) {
        /* ignore */
      }
    }
  }, [centerHighlightedIndex]);

  useEffect(() => {
    if (showTypeDropdown) {
      setTypeHighlightedIndex(meetingTypes.length > 0 ? 0 : -1);
    } else {
      setTypeHighlightedIndex(-1);
    }
  }, [showTypeDropdown]);

  // auto-scroll highlighted type option into view
  useEffect(() => {
    const idx = typeHighlightedIndex;
    if (idx >= 0 && typeListRefs.current[idx]) {
      try {
        typeListRefs.current[idx]!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (err) {
        /* ignore */
      }
    }
  }, [typeHighlightedIndex]);

  useEffect(() => {
    if (showDayDropdown) {
      setDayHighlightedIndex(daysOfWeek.length > 0 ? 0 : -1);
    } else {
      setDayHighlightedIndex(-1);
    }
  }, [showDayDropdown]);

  // auto-scroll highlighted day option into view
  useEffect(() => {
    const idx = dayHighlightedIndex;
    if (idx >= 0 && dayListRefs.current[idx]) {
      try {
        dayListRefs.current[idx]!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (err) {
        /* ignore */
      }
    }
  }, [dayHighlightedIndex]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCenterDropdown && centerDropdownRef.current && !centerDropdownRef.current.contains(event.target as Node)) {
        setShowCenterDropdown(false);
        setCenterSearch("");
      }
      if (showTypeDropdown && typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (showDayDropdown && dayDropdownRef.current && !dayDropdownRef.current.contains(event.target as Node)) {
        setShowDayDropdown(false);
      }
      if (showPointDropdown && pointDropdownRef.current && !pointDropdownRef.current.contains(event.target as Node)) {
        setShowPointDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCenterDropdown, showTypeDropdown, showDayDropdown]);

  const handleCenterInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowCenterDropdown(true);
      setCenterHighlightedIndex((i) => Math.min(i + 1, filteredCenters.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCenterHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = centerHighlightedIndex >= 0 ? centerHighlightedIndex : 0;
      if (filteredCenters.length > 0) {
        const c = filteredCenters[idx] || filteredCenters[0];
        setCenter(formatCenterName(c));
        setShowCenterDropdown(false);
        setCenterSearch('');
        setCenterHighlightedIndex(-1);
      }
      return;
    }

    if (e.key === 'Escape') {
      setShowCenterDropdown(false);
      setCenterHighlightedIndex(-1);
    }
  };

  const handleTypeButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowTypeDropdown(true);
      setTypeHighlightedIndex((i) => Math.min(i + 1, meetingTypes.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowTypeDropdown(true);
      setTypeHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = typeHighlightedIndex >= 0 ? typeHighlightedIndex : 0;
      const t = meetingTypes[idx];
      if (t) {
        setMeetingType(t);
        setShowTypeDropdown(false);
        setTypeHighlightedIndex(-1);
      } else {
        setShowTypeDropdown((s) => !s);
      }
      return;
    }

    if (e.key === 'Escape') {
      setShowTypeDropdown(false);
      setTypeHighlightedIndex(-1);
    }
  };

  const handleDayButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDayDropdown(true);
      setDayHighlightedIndex((i) => Math.min(i + 1, daysOfWeek.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowDayDropdown(true);
      setDayHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = dayHighlightedIndex >= 0 ? dayHighlightedIndex : 0;
      const d = daysOfWeek[idx];
      if (d) {
        setDay(d);
        setShowDayDropdown(false);
        setDayHighlightedIndex(-1);
      } else {
        setShowDayDropdown((s) => !s);
      }
      return;
    }

    if (e.key === 'Escape') {
      setShowDayDropdown(false);
      setDayHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (lastAddedPointId && inputRefs.current[lastAddedPointId]) {
      inputRefs.current[lastAddedPointId]?.focus();
      setLastAddedPointId(null);
    }
  }, [lastAddedPointId]);

  const addAttendee = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !attendance.includes(trimmedName)) {
      setAttendance([...attendance, trimmedName]);
      setAttendanceInput("");
    }
  };

  // fetch suggestions
  useEffect(() => {
    let active = true;
    const q = attendanceInput.trim();
    if (!q) {
      setAttendanceSuggestions([]);
      setShowAttendanceSuggestions(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '/api');
        const res = await fetch(`${apiUrl}/users?query=${encodeURIComponent(q)}`);
        if (!active) return;
        if (!res.ok) {
          setAttendanceSuggestions([]);
          setShowAttendanceSuggestions(false);
          return;
        }
        const data = await res.json();
        const names = data.map((u: any) => u.name).filter(Boolean);
        setAttendanceSuggestions(names);
        setShowAttendanceSuggestions(names.length > 0);
        setAttendanceHighlightedIndex(0);
      } catch (err) {
        /* ignore */
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [attendanceInput]);

  const removeAttendee = (index: number) => {
    setAttendance(attendance.filter((_, i) => i !== index));
  };

  const handleAttendanceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAttendanceSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      e.preventDefault();
      if (e.key === 'ArrowDown') {
        setAttendanceHighlightedIndex((i) => Math.min(i + 1, attendanceSuggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        setAttendanceHighlightedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        const sel = attendanceSuggestions[attendanceHighlightedIndex];
        if (sel) {
          addAttendee(sel);
          setShowAttendanceSuggestions(false);
          return;
        }
      }
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAttendee(attendanceInput);
    } else if (e.key === 'Backspace' && attendanceInput === '' && attendance.length > 0) {
      removeAttendee(attendance.length - 1);
    }
  };

  const addNote = () => {
    setNotes((s) => [...s, {
      id: String(Date.now() + Math.random()),
      points: [{ id: String(Date.now()), text: "", category: 'Information' }],
      important: false,
      followUp: false
    }]);
  };

  const bulkAgendaPreview = showBulkAgendaModal ? parseBulkAgendaText(bulkAgendaText) : [];

  // Rebuilds the agenda title so it reads the same way it was pasted: the main
  // line, a blank line, then each sub-point on its own line with a bullet.
  const formatAgendaTitle = (item: ParsedAgendaItem) =>
    item.points.length > 0
      ? `${item.title}\n\n${item.points.map((p) => `* ${p}`).join('\n')}`
      : item.title;

  const applyBulkAgenda = () => {
    const parsed = parseBulkAgendaText(bulkAgendaText);
    if (parsed.length === 0) return;

    // The whole pasted block (main heading + its sub-points) is one agenda
    // item — its full text becomes the agenda title. The point/minutes area
    // is left blank; that's where the actual meeting discussion gets written.
    const newNotes: Note[] = parsed.map((item) => ({
      id: String(Date.now() + Math.random()),
      title: formatAgendaTitle(item),
      points: [{
        id: String(Date.now() + Math.random()),
        text: '',
        category: 'Information' as const,
      }],
      important: false,
      followUp: false,
    }));

    setNotes((prev) => {
      // Drop the untouched blank placeholder agenda (if any) so bulk-adding
      // right after opening the form doesn't leave an empty item behind.
      const meaningfulExisting = prev.filter(
        (n) => (n.title && n.title.trim()) || n.points.some((p) => p.text && p.text.trim()),
      );
      return [...meaningfulExisting, ...newNotes];
    });

    setBulkAgendaText("");
    setShowBulkAgendaModal(false);
    showSnackbar(`Added ${newNotes.length} agenda item${newNotes.length === 1 ? '' : 's'}`, 'success');
  };

  const removeNote = (id: string) => {
    setNotes((s) => s.filter((n) => n.id !== id));
  };

  const updateNote = (id: string, patch: Partial<Note>) => {
    setNotes((s) => s.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const addPoint = (noteId: string) => {
    const newPointId = String(Date.now() + Math.random());
    setNotes((s) => s.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          points: [...n.points, { id: newPointId, text: "", category: 'Information', assignee: '', deadline: '' }]
        };
      }
      return n;
    }));
    setLastAddedPointId(newPointId);
  };

  const updatePoint = (noteId: string, pointId: string, text: string, category?: 'Decision' | 'Lesson' | 'Information') => {
    setNotes((s) => s.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          points: n.points.map((p) => {
            if (p.id !== pointId) return p;
            // update text and optionally category
            const updated: any = { ...p, text };
            if (category !== undefined) {
              updated.category = category;
              // If changed to Information, clear any associated taskId, assignee and deadline
              // so fields appear empty when switching back to Decision/Lesson later
              if (category === 'Information') {
                updated.taskId = undefined;
                updated.assignee = '';
                updated.deadline = '';
              }
            }
            return updated;
          })
        };
      }
      return n;
    }));
  };

  const updatePointField = (noteId: string, pointId: string, field: string, value: any) => {
    setNotes((s) => s.map((n) => {
      if (n.id !== noteId) return n;
      return {
        ...n,
        points: n.points.map((p) => p.id === pointId ? { ...p, [field]: value } : p)
      };
    }));
  };

  const removePoint = (noteId: string, pointId: string) => {
    setNotes((s) => s.map((n) => {
      if (n.id === noteId) {
        const newPoints = n.points.filter((p) => p.id !== pointId);
        return {
          ...n,
          points: newPoints.length > 0 ? newPoints : [{ id: String(Date.now()), text: "", category: 'Information', assignee: '', deadline: '' }]
        };
      }
      return n;
    }));
  };

  const handlePointKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    noteId: string,
    pointId: string,
    pointText: string
  ) => {
    if (isComposing) return;

    if (e.key === 'Enter') {
      if (!isComposing) {
        e.preventDefault();
        // create new point and autofocus it
        addPoint(noteId);
      }
      return;
    }

    if (e.key === 'Backspace') {
      // when current point is empty, delete it and focus previous point's end
      if (pointText === '') {
        e.preventDefault();

        const notesSnapshot = notes;
        const note = notesSnapshot.find((n) => n.id === noteId);
        if (!note) return;

        // if only one point in note, do nothing
        if (note.points.length <= 1) return;

        const idx = note.points.findIndex((p) => p.id === pointId);
        if (idx === -1) return;

        // determine focus target: previous point if exists, else last point
        let focusPointId: string | null = null;
        if (idx > 0) {
          focusPointId = note.points[idx - 1].id;
        } else if (note.points.length > 1) {
          focusPointId = note.points[note.points.length - 1].id;
        }

        // remove the point
        setNotes((s) => s.map((n) => {
          if (n.id !== noteId) return n;
          const newPoints = n.points.filter((p) => p.id !== pointId);
          return { ...n, points: newPoints };
        }));

        // focus previous after DOM updates
        if (focusPointId) {
          setTimeout(() => {
            const el = inputRefs.current[focusPointId as string];
            if (el) {
              el.focus();
              const len = el.value ? el.value.length : 0;
              try {
                el.setSelectionRange(len, len);
              } catch (err) {
                /* ignore */
              }
            }
          }, 0);
        }
      }
    }
  };

  const handlePointPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    noteId: string,
    pointId: string
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    // split into rows (handles Windows/Mac/Linux)
    const rows = text.split(/\r\n|\n/).map((r) => r.trim()).filter((r) => r.length > 0);
    if (rows.length <= 1) return; // nothing to expand

    e.preventDefault();

    // For rows that come from sheets, prefer first tab-separated cell
    const items = rows.map((r) => {
      const parts = r.split('\t').map((c) => c.trim()).filter(Boolean);
      return parts.length > 0 ? parts[0] : r;
    }).filter(Boolean);

    if (items.length === 0) return;

    // Insert: replace current point text with first item, and add remaining items as new points in the same agenda
    setNotes((prev) => {
      const newNotes = prev.map((n) => ({ ...n, points: n.points.map((p) => ({ ...p })) }));

      const curNoteIndex = newNotes.findIndex((n) => n.id === noteId);
      if (curNoteIndex === -1) return prev;

      const curNote = newNotes[curNoteIndex];
      const curPointIndex = curNote.points.findIndex((p) => p.id === pointId);

      if (curPointIndex === -1) return prev;

      // Replace the current point text with first item
      curNote.points[curPointIndex].text = items[0];

      // Create new points for remaining items and insert them after the current point
      const newPoints = items.slice(1).map((val) => ({
        id: String(Date.now() + Math.random()),
        text: val,
        category: 'Information' as const,
        assignee: '',
        deadline: ''
      }));

      if (newPoints.length > 0) {
        curNote.points.splice(curPointIndex + 1, 0, ...newPoints);

        // track last added point id to focus
        const lastAdded = newPoints[newPoints.length - 1].id;
        if (lastAdded) setLastAddedPointId(lastAdded);
      }

      return newNotes;
    });
  };

  const createMeetingTasks = async () => {
    // Collect all points with assignee and deadline from Decision/Lesson categories
    const assignedPoints: Array<{ point: Point; noteTitle: string }> = [];

    notes.forEach((note) => {
      note.points.forEach((point) => {
        if (
          (point.category === 'Decision' || point.category === 'Lesson') &&
          point.assignee &&
          point.deadline &&
          point.text.trim()
        ) {
          assignedPoints.push({ point, noteTitle: note.title || 'Untitled Agenda' });
        }
      });
    });

    if (assignedPoints.length === 0) return;

    // Group points by assignee to process each user once
    const pointsByUser = new Map<string, Array<{ point: Point; noteTitle: string }>>();
    for (const item of assignedPoints) {
      const assignee = item.point.assignee!;
      if (!pointsByUser.has(assignee)) {
        pointsByUser.set(assignee, []);
      }
      pointsByUser.get(assignee)!.push(item);
    }

    // Create or update tasks for each user
    for (const [assigneeName, userPoints] of pointsByUser.entries()) {
      // Find the user ID from the users array
      console.log('Looking for user with name:', assigneeName);
      console.log('Available users:', users.map(u => ({ id: u.id, name: u.name })));
      const assignedUser = users.find((u) => u.name === assigneeName);
      if (!assignedUser) {
        console.warn(`User not found for assignee: ${assigneeName}`);
        continue;
      }
      console.log('Found user:', { id: assignedUser.id, name: assignedUser.name });
      console.log('Current user (meeting organizer):', { id: user?.id, name: user?.name });

      try {
        // Get or create "Meeting Task" board for this user
        let userBoards = await getBoardsForUser(assignedUser.id);
        let meetingTaskBoard = userBoards.find((b: any) => b.title === 'Meeting Task');

        if (!meetingTaskBoard) {
          meetingTaskBoard = await createBoardForUser(assignedUser.id, { title: 'Meeting Task' });
        }

        // Get lists in the board (use system API to bypass ownership check)
        let lists = await getListsApiSystem(meetingTaskBoard.id);

        // Find or create a list with the assignee's name
        let userList = lists.find((l: any) => l.title === assigneeName);

        if (!userList) {
          userList = await createListApiSystem(meetingTaskBoard.id, { title: assigneeName });
          lists.push(userList);
        }

        // Create or update cards for each point
        for (const { point, noteTitle } of userPoints) {
          const cardTitle = `[${point.category}] ${point.text}`;
          const prettyDate = date ? parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : date;
          const assignerName = user?.name || 'the meeting organizer';
          const cardDescription = `This task was created following the ${meetingType || 'meeting'} held in ${center} on ${prettyDate}. The agenda item discussed was ${noteTitle}. The responsibility for completing this task has been assigned to you by ${assignerName}.`;

          // If the point already had a task, check if assignee changed compared to initial
          const initial = initialPointsRef.current[point.id];
          if (point.taskId && initial && initial.assignee && initial.assignee !== point.assignee) {
            // Assignee changed: create a new card for the new assignee, then delete the old card
            try {
              // Create new card in current user's meeting task list (we already ensured list exists above)
              const newCard = await createCardApiSystem(userList.id, {
                title: cardTitle,
                description: cardDescription,
                dueDate: point.deadline,
                assignee: assignedUser.id,
                notifySelf: assignedUser.id === user?.id,
              });
              // update point to reference new card id
              point.taskId = newCard.id;
              // delete old card (best-effort)
              try {
                if (initial.taskId) await deleteCardApiSystem(initial.taskId);
              } catch (e) {
                console.warn('Failed to delete old card after assignee change', initial.taskId, e);
              }
              continue;
            } catch (e) {
              console.warn('Failed to move task to new assignee, will attempt to update existing card instead', e);
              // fallthrough to update existing card below
            }
          }

          // Check if task already exists (has taskId) and assignee did not change
          if (point.taskId) {
            try {
              // Update existing card (use system API)
              await updateCardApiSystem(point.taskId, {
                title: cardTitle,
                description: cardDescription,
                dueDate: point.deadline,
                assignee: assignedUser.id,
              });
              continue; // Skip creating a new card
            } catch (err) {
              // If update fails (e.g., card was deleted), create a new one
              console.warn('Failed to update card, creating new one:', err);
            }
          }

          // Create new card (use system API)
          const newCard = await createCardApiSystem(userList.id, {
            title: cardTitle,
            description: cardDescription,
            dueDate: point.deadline,
            assignee: assignedUser.id,
            notifySelf: assignedUser.id === user?.id,
          });

          // Store the card ID in the point so we can update it later
          point.taskId = newCard.id;
        }
      } catch (err) {
        console.error(`Failed to create board/cards for user ${assigneeName}:`, err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!meetingType) {
      showSnackbar("Please select meeting type", "error");
      return;
    }

    if (!center.trim()) {
      showSnackbar("Please select a center", "error");
      return;
    }

    const isOneOnOne = meetingType === "One o one";

    // Validation for One o one meetings
    if (isOneOnOne && !personName.trim()) {
      showSnackbar("Please enter person name", "error");
      return;
    }

    if (!date || !startTime || !endTime) {
      showSnackbar("Please provide date and time range", "error");
      return;
    }

    // Validation for structured meeting types
    if (!isOneOnOne) {
      if (!day.trim()) {
        showSnackbar("Please enter day", "error");
        return;
      }
      if (!place.trim()) {
        showSnackbar("Please enter place", "error");
        return;
      }
      if (attendance.length === 0) {
        showSnackbar("Please add at least one attendee", "error");
        return;
      }
    }

    const payload: any = {
      center: center || undefined,
      personName: isOneOnOne ? personName : undefined,
      date,
      day: !isOneOnOne ? day : undefined,
      startTime,
      endTime,
      place: !isOneOnOne ? place : undefined,
      attendance: !isOneOnOne ? attendance.join(", ") : undefined,
      presentSantName: !isOneOnOne ? presentSantName : undefined,
      meetingType,
      scheduledMeetingId: selectedScheduledId || undefined,
      agenda: selectedScheduledId ? notes.filter(n => n.title).map(n => n.title!) : undefined,
      notes,
    };

    try {
      // Delete tasks that were removed from the meeting (cleanup)
      try {
        const currentTaskIds = notes.flatMap(n => (n.points || []).map((p: any) => p.taskId).filter(Boolean));
        const toDelete = initialTaskIdsRef.current.filter(id => id && !currentTaskIds.includes(id));
        for (const delId of toDelete) {
          try {
            await deleteCardApiSystem(delId);
          } catch (e) {
            // ignore deletion errors
            console.warn('Failed to delete card during cleanup', delId, e);
          }
        }
      } catch (e) {
        console.warn('Error while cleaning up removed tasks', e);
      }

      // Create/update tasks FIRST before saving the meeting so we can store taskIds
      try {
        await createMeetingTasks();
      } catch (err) {
        console.error('Failed to create meeting tasks:', err);
        // Don't fail the whole operation if task creation fails
      }

      // Before saving, sanitize notes: if a point is changed to 'Information', clear assignee/deadline/taskId
      const sanitizedNotes = (notes || []).map((n) => ({
        ...n,
        points: (n.points || []).map((p: any) => {
          if (p.category === 'Information') {
            return { ...p, assignee: '', deadline: '', taskId: undefined };
          }
          return p;
        })
      }));

      const payloadToSave = { ...payload, notes: sanitizedNotes, agenda: selectedScheduledId ? sanitizedNotes.filter((n: any) => n.title).map((n: any) => n.title!) : undefined };

      if (id && id !== 'new') {
        // Update existing meeting
        await updateMeeting(id, payloadToSave);
        showSnackbar("Meeting updated successfully!", "success");
      } else {
        // Create new meeting
        await createMeeting(payloadToSave);
        showSnackbar("Meeting minutes saved successfully!", "success");
      }

      // Invalidate meetings cache so the list refreshes
      invalidateCache();

      // Refresh scheduled meetings cache for this date so the Schedule view reflects the new entry
      try {
        if (date) {
          const isoDate = date; // date is already in YYYY-MM-DD
          const serverList = await getScheduledMeetings(isoDate, isoDate, true);
          const serverIntervals = serverList.map((s: any) => ({
            id: s.id,
            start: s.startTime,
            end: s.endTime,
            meetingType: s.meetingType,
            center: s.center,
            participants: s.participants,
            duration: s.duration,
            agenda: s.agenda || []
          }));

          const dateKey = parseLocalDate(isoDate).toDateString();
          let existing: any = {};
          try { existing = JSON.parse(localStorage.getItem('scheduledMeetings') || '{}'); } catch (e) { existing = {}; }
          existing[dateKey] = serverIntervals;
          try { localStorage.setItem('scheduledMeetings', JSON.stringify(existing)); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        // ignore scheduled-meetings refresh errors
      }

      // Redirect back to the list
      navigate("/add-meeting");
    } catch (error: any) {
      console.error("Error saving meeting:", error);
      showSnackbar(error.message || "Failed to save meeting", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center h-full flex-1 py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-800 border-t-slate-700 dark:border-t-slate-400"></div>
            <p className="mt-6 text-gray-600 dark:text-slate-400 font-medium">Loading meeting...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header Section - Responsive */}
          <div className="bg-white dark:bg-slate-800 border-b-4 border-slate-600 rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 transition-colors">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{id && id !== 'new' ? 'Edit' : 'Add'} Meeting Minutes</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mt-1">Record minutes and key points from the meeting below</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
            {/* Meeting Type Selection - Always First */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
              <div className="bg-gray-50 dark:bg-slate-900/50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Meeting Type & Template</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1">Select a type to prefill fields and the minutes structure</p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Meeting Type */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Meeting Type</label>
                      <div className="relative" ref={typeDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                          onKeyDown={handleTypeButtonKeyDown}
                          aria-expanded={showTypeDropdown}
                          aria-controls="type-listbox"
                          className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-4 pr-10 text-gray-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                        >
                          <span className={meetingType ? "text-gray-900 dark:text-slate-100" : "text-gray-400 dark:text-slate-500"}>{meetingType || "Select meeting type..."}</span>
                        </button>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 h-full">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {showTypeDropdown && (
                          <div id="type-listbox" role="listbox" ref={typeListContainerRef} className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {meetingTypes.map((type, idx) => (
                              <div
                                key={type}
                                role="option"
                                aria-selected={meetingType === type}
                                ref={(el) => { typeListRefs.current[idx] = el; }}
                                className={`w-full text-left px-4 py-3 cursor-pointer ${idx === typeHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-900 dark:text-slate-300'}`}
                                onMouseEnter={() => setTypeHighlightedIndex(idx)}
                                onMouseDown={() => { setMeetingType(type); setShowTypeDropdown(false); setTypeHighlightedIndex(-1); }}
                              >
                                {type}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Scheduled Meeting (optional)</label>
                        <div className="relative" ref={scheduledDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setShowScheduledDropdown((s) => !s)}
                            aria-expanded={showScheduledDropdown}
                            aria-controls="scheduled-listbox"
                            className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-4 pr-10 text-gray-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 text-left"
                          >
                            <span className={selectedScheduledId ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>
                              {selectedScheduledId ? (() => {
                                const m = scheduledMeetings.find((x) => String(x.id) === String(selectedScheduledId));
                                return m ? `${m.date} • ${m.startTime} - ${m.endTime} • ${m.center}` : 'Select scheduled meeting...';
                              })() : (meetingType ? 'Select scheduled meeting...' : 'Select meeting type first')}
                            </span>
                          </button>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 h-full">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {showScheduledDropdown && (
                            <div id="scheduled-listbox" role="listbox" ref={scheduledListContainerRef} className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                              {scheduledLoading ? (
                                <div className="px-4 py-3 text-gray-500 dark:text-slate-400">Loading...</div>
                              ) : !meetingType ? (
                                <div className="px-4 py-3 text-gray-500 dark:text-slate-400">Please select a meeting type first</div>
                              ) : filteredScheduledMeetings.length === 0 ? (
                                <div className="px-4 py-3 text-gray-500 dark:text-slate-400">No scheduled meetings for this type</div>
                              ) : (
                                filteredScheduledMeetings.map((m, idx) => (
                                  <div
                                    key={m.id}
                                    role="option"
                                    ref={(el) => { scheduledListRefs.current[idx] = el; }}
                                    className={`w-full text-left px-4 py-3 cursor-pointer ${idx === scheduledHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-900 dark:text-slate-300'}`}
                                    onMouseEnter={() => setScheduledHighlightedIndex(idx)}
                                    onMouseDown={() => { handleSelectScheduled(String(m.id)); setShowScheduledDropdown(false); setScheduledHighlightedIndex(-1); }}
                                  >
                                    {`${m.date} • ${m.startTime} - ${m.endTime} • ${m.center} • ${m.meetingType || ''}`}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedScheduledId && (
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={clearSelectedScheduled}
                            className="h-12 sm:h-14 w-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Clear scheduled meeting selection"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>


                </div>
              </div>
            </div>

            {/* Meeting Details Card - Shows only after type is selected */}
            {meetingType && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
                <div className="bg-gray-50 dark:bg-slate-900/50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Meeting Details</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1">Basic information about the meeting</p>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Person Name - Only for One o one */}
                    {meetingType === "One o one" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <span>Person Name</span>
                          {isPrefilledFromScheduled && (
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" />
                            </svg>
                          )}
                        </label>
                        <input
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                          placeholder="Enter full name"
                          readOnly={isPrefilledFromScheduled}
                          className={`w-full ${isPrefilledFromScheduled ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-500 border-gray-200 dark:border-slate-700' : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'} border-2 rounded-lg px-4 py-3 font-medium placeholder-gray-400 focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors`}
                        />
                      </div>
                    )}

                    {/* Center Select */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <span>Center</span>
                        {isPrefilledFromScheduled && (
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" />
                          </svg>
                        )}
                      </label>
                      <div className="relative" ref={centerDropdownRef}>
                        <input
                          type="text"
                          value={showCenterDropdown ? centerSearch : center}
                          onChange={(e) => {
                            if (isPrefilledFromScheduled) return;
                            setCenterSearch(e.target.value);
                            if (!showCenterDropdown) setShowCenterDropdown(true);
                          }}
                          onFocus={() => {
                            if (isPrefilledFromScheduled) return;
                            setCenterSearch("");
                            setShowCenterDropdown(true);
                          }}
                          onKeyDown={handleCenterInputKeyDown}
                          placeholder="Select center..."
                          aria-expanded={showCenterDropdown}
                          aria-controls="center-listbox"
                          readOnly={isPrefilledFromScheduled}
                          className={`w-full ${isPrefilledFromScheduled ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-500 border-gray-200 dark:border-slate-700' : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'} border-2 rounded-lg px-4 py-3 pr-10 font-medium placeholder-gray-400 focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-text`}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {showCenterDropdown && !isPrefilledFromScheduled && (
                          <div id="center-listbox" role="listbox" ref={centerListContainerRef} className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {filteredCenters.length > 0 ? (
                              filteredCenters.map((c, idx) => (
                                <div
                                  key={c}
                                  role="option"
                                  aria-selected={center === c}
                                  ref={(el) => { centerListRefs.current[idx] = el; }}
                                  className={`w-full text-left px-4 py-3 cursor-pointer ${idx === centerHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-900 dark:text-slate-300'}`}
                                  onMouseEnter={() => setCenterHighlightedIndex(idx)}
                                  onMouseDown={() => { setCenter(formatCenterName(c)); setShowCenterDropdown(false); setCenterSearch(""); setCenterHighlightedIndex(-1); }}
                                >
                                  {formatCenterName(c)}
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-gray-500 dark:text-slate-400 text-sm">No centers found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">Date {isPrefilledFromScheduled && (<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" /></svg>)}</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => { if (!isPrefilledFromScheduled) setDate(e.target.value); }}
                        readOnly={isPrefilledFromScheduled}
                        className={`w-full ${isPrefilledFromScheduled ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-500 border-gray-200 dark:border-slate-700' : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'} border-2 rounded-lg px-4 py-3 focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors`}
                      />
                    </div>

                    {/* Day - Only for structured meetings */}
                    {meetingType !== "One o one" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">Day {isPrefilledFromScheduled && (<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" /></svg>)}</label>
                        <div className="relative" ref={dayDropdownRef}>
                          <button
                            type="button"
                            onClick={() => { if (!isPrefilledFromScheduled) setShowDayDropdown(!showDayDropdown); }}
                            onKeyDown={handleDayButtonKeyDown}
                            aria-expanded={showDayDropdown}
                            aria-controls="day-listbox"
                            className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 pr-10 text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                          >
                            <span className={day ? "text-gray-900 dark:text-slate-100" : "text-gray-400 dark:text-slate-500"}>{day || "Select day..."}</span>
                          </button>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {showDayDropdown && (
                            <div id="day-listbox" role="listbox" ref={dayListContainerRef} className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                              {daysOfWeek.map((dayOption, idx) => (
                                <div
                                  key={dayOption}
                                  role="option"
                                  aria-selected={day === dayOption}
                                  ref={(el) => { dayListRefs.current[idx] = el; }}
                                  className={`w-full text-left px-4 py-3 cursor-pointer ${idx === dayHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-900 dark:text-slate-300'}`}
                                  onMouseEnter={() => setDayHighlightedIndex(idx)}
                                  onMouseDown={() => { setDay(dayOption); setShowDayDropdown(false); setDayHighlightedIndex(-1); }}
                                >
                                  {dayOption}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Time Range - Start */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors"
                      />
                    </div>

                    {/* Time Range - End */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors"
                      />
                    </div>

                    {/* Place - Only for structured meetings */}
                    {meetingType !== "One o one" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Place</label>
                        <input
                          value={place}
                          onChange={(e) => setPlace(e.target.value)}
                          placeholder="Enter meeting location"
                          className={`w-full bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 font-medium placeholder-gray-400 focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors`}
                        />
                      </div>
                    )}

                    {/* Attendance - Only for structured meetings */}
                    {meetingType !== "One o one" && (
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Attendance (Who is present in meeting)</label>
                        <div className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-slate-600 dark:focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-600 focus-within:ring-opacity-20 transition-colors min-h-[48px]">
                          <div className="flex flex-wrap gap-2 items-center">
                            {attendance.map((name, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-sm font-medium transition-colors"
                              >
                                {name}
                                <button
                                  type="button"
                                  onClick={() => removeAttendee(index)}
                                  className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))}
                            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                              <input
                                type="text"
                                value={attendanceInput}
                                onChange={(e) => setAttendanceInput(e.target.value)}
                                onKeyDown={handleAttendanceKeyDown}
                                onBlur={() => {
                                  setTimeout(() => {
                                    if (attendanceInput.trim()) {
                                      addAttendee(attendanceInput);
                                    }
                                    setShowAttendanceSuggestions(false);
                                  }, 150);
                                }}
                                onFocus={() => { if (attendanceSuggestions.length > 0) setShowAttendanceSuggestions(true); }}
                                placeholder={attendance.length === 0 ? "Type name and press Enter or comma to add..." : "Add more..."}
                                className="w-full bg-transparent border-none px-1 py-1 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 font-medium"
                              />

                              {showAttendanceSuggestions && attendanceSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-30 max-h-44 overflow-auto">
                                  {attendanceSuggestions.map((sugg, idx) => (
                                    <div
                                      key={sugg + idx}
                                      className={`px-3 py-2 cursor-pointer ${idx === attendanceHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-900 dark:text-slate-300'}`}
                                      onMouseDown={() => { addAttendee(sugg); setShowAttendanceSuggestions(false); }}
                                      onMouseEnter={() => setAttendanceHighlightedIndex(idx)}
                                    >
                                      {sugg}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Press Enter or comma to add an attendee</p>
                      </div>
                    )}

                    {/* Present Sant Name - Only for structured meetings */}
                    {meetingType !== "One o one" && (
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Present Sant Name</label>
                        <input
                          type="text"
                          value={presentSantName}
                          onChange={(e) => setPresentSantName(e.target.value)}
                          placeholder="Enter Present Sant Name"
                          className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 text-gray-900 dark:text-slate-100 font-medium placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <div className="flex justify-end gap-3 mb-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkAgendaModal(true)}
                        className="px-6 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-700 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Bulk Agenda
                      </button>
                      <button
                        type="button"
                        onClick={addNote}
                        className="px-6 py-2.5 bg-slate-700 dark:bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 transition-colors shadow-sm"
                      >
                        Add Agenda
                      </button>
                    </div>

                    {notes.map((note, noteIdx) => (
                      <div key={note.id} className="bg-gray-50 dark:bg-slate-900/50 border-2 border-gray-300 dark:border-slate-700 rounded-2xl p-5 transition-colors">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex-1">
                            {/* Agenda title is always editable, regardless of where the meeting
                                was prefilled from (scheduled meeting, bulk paste, or manual entry) */}
                            <div>
                              {titleEditMode.current[note.id] ? (
                                <input
                                  type="text"
                                  ref={(el) => { inputRefs.current[`title-${note.id}`] = el; }}
                                  value={note.title ?? `Agenda ${noteIdx + 1}`}
                                  onChange={(e) => {
                                    const t = e.target.value;
                                    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, title: t } : n));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      titleEditMode.current[note.id] = false;
                                      forceRerender((v) => v + 1);
                                    }
                                  }}
                                  onBlur={() => {
                                    titleEditMode.current[note.id] = false;
                                    forceRerender((v) => v + 1);
                                  }}
                                  placeholder={`Agenda ${noteIdx + 1}`}
                                  className="w-full text-base font-bold text-gray-900 dark:text-slate-100 bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-slate-500"
                                />
                              ) : (
                                <div
                                  className="text-base font-bold text-gray-900 dark:text-slate-100 cursor-text whitespace-pre-wrap"
                                  onClick={() => {
                                    titleEditMode.current[note.id] = true;
                                    forceRerender((v) => v + 1);
                                    setTimeout(() => {
                                      const el = inputRefs.current[`title-${note.id}`];
                                      if (el) el.focus();
                                    }, 0);
                                  }}
                                >
                                  {note.title || `Agenda ${noteIdx + 1}`}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addPoint(note.id)}
                              aria-label="Add minute"
                              className="p-1 bg-slate-600 text-white rounded-md hover:bg-slate-700 focus:outline-none"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => removeNote(note.id)}
                              aria-label="Remove agenda"
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>


                        <div className="space-y-2 mb-4">
                          {note.points.map((point) => (
                            <div key={point.id} className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0 text-slate-700 font-semibold text-2xl leading-none" aria-hidden="true">➟</div>
                                  <input
                                    type="text"
                                    ref={(el) => { inputRefs.current[point.id] = el; }}
                                    value={point.text}
                                    onChange={(e) => updatePoint(note.id, point.id, e.target.value)}
                                    onKeyDown={(e) => handlePointKeyDown(e, note.id, point.id, point.text)}
                                    onPaste={(e) => handlePointPaste(e, note.id, point.id)}
                                    onCompositionStart={() => setIsComposing(true)}
                                    onCompositionEnd={() => setIsComposing(false)}
                                    placeholder="Enter point and press Enter for new line..."
                                    className="flex-1 bg-transparent border-none px-0 py-0 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 font-medium min-w-0"
                                  />
                                  {note.points.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removePoint(note.id, point.id)}
                                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                      aria-label="Remove point"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                  <div className="text-xs font-medium text-gray-600 dark:text-slate-400">Type</div>
                                  <div className="relative" ref={pointDropdownRef}>
                                    <button
                                      type="button"
                                      onClick={() => setShowPointDropdown((s) => s === `${note.id}:${point.id}` ? null : `${note.id}:${point.id}`)}
                                      className="bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 dark:text-slate-200 flex items-center gap-2 focus:outline-none hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                      <span>{point.category || 'Information'}</span>
                                      <svg className="w-4 h-4 text-gray-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>

                                    {showPointDropdown === `${note.id}:${point.id}` && (
                                      <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-30">
                                        {['Information', 'Decision', 'Lesson'].map((opt) => (
                                          <div
                                            key={opt}
                                            className={`px-3 py-2 cursor-pointer ${point.category === opt ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-300'}`}
                                            onMouseDown={() => { updatePoint(note.id, point.id, point.text, opt as any); setShowPointDropdown(null); }}
                                          >
                                            {opt}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {(point.category === 'Decision' || point.category === 'Lesson') && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Assignee</label>
                                    <div className="relative" ref={assigneeDropdownRef}>
                                      <button
                                        type="button"
                                        onClick={() => setShowAssigneeDropdown((s) => s === `${note.id}:${point.id}` ? null : `${note.id}:${point.id}`)}
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-left flex items-center justify-between text-gray-900 dark:text-slate-100"
                                      >
                                        <span className="truncate">{point.assignee || 'Unassigned'}</span>
                                        <svg className="w-4 h-4 text-gray-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>

                                      {showAssigneeDropdown === `${note.id}:${point.id}` && (
                                        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-md shadow-lg z-30 max-h-48 overflow-auto">
                                          <div
                                            className="px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-100 transition-colors"
                                            onMouseDown={() => { updatePointField(note.id, point.id, 'assignee', ''); setShowAssigneeDropdown(null); }}
                                          >
                                            Unassigned
                                          </div>
                                          {users && users.length > 0 ? (
                                            users.map((u) => (
                                              <div
                                                key={u.id}
                                                className="px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-100 transition-colors"
                                                onMouseDown={() => { updatePointField(note.id, point.id, 'assignee', u.name || u.email || u.id); setShowAssigneeDropdown(null); }}
                                              >
                                                {u.name || u.email || u.id}
                                              </div>
                                            ))
                                          ) : (
                                            <div className="px-3 py-2 text-gray-400 dark:text-slate-500">No users</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Deadline</label>
                                    <div className="relative">
                                      <DatePicker
                                        value={point.deadline || ''}
                                        onChange={(v) => updatePointField(note.id, point.id, 'deadline', v)}
                                        className="w-full"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 pt-3 border-t border-gray-300 dark:border-slate-700 transition-colors">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={note.important}
                              onChange={(e) => updateNote(note.id, { important: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-slate-700 dark:bg-slate-900 focus:ring-slate-600 cursor-pointer transition-colors"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-slate-300">Mark as Important</span>
                          </label>

                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={note.followUp}
                              onChange={(e) => updateNote(note.id, { followUp: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-slate-700 dark:bg-slate-900 focus:ring-slate-600 cursor-pointer transition-colors"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-slate-300">Mark as Follow-up</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Section */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-6 sm:mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 transition-colors">
                  <button
                    type="button"
                    onClick={() => navigate("/add-meeting")}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-slate-700 dark:bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-500 transition-all shadow-md flex items-center justify-center"
                  >
                    {id && id !== 'new' ? 'Update Meeting' : 'Save Minutes'}
                  </button>
                </div>
              </div>
            )}
          </form>

          {showBulkAgendaModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bulk Add Agenda</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Paste an agenda list from Word or anywhere else. If your list is numbered ("1.", "2.", ...), each
                      numbered line starts a new agenda item — everything under it (bullets, lettered points, plain
                      text) is folded into that same agenda's title, not split up. With no numbering, indentation
                      decides grouping. The Minutes for each item are left blank for you to fill in during the meeting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowBulkAgendaModal(false); setBulkAgendaText(""); }}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex-shrink-0 ml-4"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                  <textarea
                    value={bulkAgendaText}
                    onChange={(e) => setBulkAgendaText(e.target.value)}
                    placeholder={"1. Budget planning\n   a. Review Q1 spending\n   b. Approve Q2 budget\n2. Team performance review\n3. Marketing strategy"}
                    rows={10}
                    autoFocus
                    className="w-full bg-white dark:bg-slate-950 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 text-gray-900 dark:text-slate-100 text-sm font-mono placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors resize-y"
                  />

                  {bulkAgendaPreview.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Preview — {bulkAgendaPreview.length} agenda item{bulkAgendaPreview.length === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Each block below becomes one agenda item's title. The Minutes section for it starts blank, ready to fill in during the meeting.
                      </p>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700 max-h-56 overflow-y-auto">
                        {bulkAgendaPreview.map((item, idx) => (
                          <div key={idx} className="px-4 py-2.5">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{idx + 1}. {item.title}</p>
                            {item.points.length > 0 && (
                              <ul className="mt-1 ml-4 space-y-0.5 list-disc list-inside">
                                {item.points.map((pt, pIdx) => (
                                  <li key={pIdx} className="text-xs text-slate-600 dark:text-slate-400">{pt}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setShowBulkAgendaModal(false); setBulkAgendaText(""); }}
                    className="px-5 py-2.5 border-2 border-gray-300 dark:border-slate-700 rounded-lg font-semibold text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyBulkAgenda}
                    disabled={bulkAgendaPreview.length === 0}
                    className="px-5 py-2.5 bg-slate-700 dark:bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Add {bulkAgendaPreview.length > 0 ? bulkAgendaPreview.length : ''} Agenda Item{bulkAgendaPreview.length === 1 ? '' : 's'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AddMeeting;
