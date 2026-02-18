import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createScheduledMeeting, getScheduledMeetings, updateScheduledMeeting, deleteScheduledMeeting } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';

type AgendaPoint = { id: string; text: string };
type TimeSlot = { id: string; time: string; available: boolean; score?: number };
type ScheduledMeetingDetail = {
  id?: string;
  start: string;
  end: string;
  meetingType?: string;
  center?: string;
  participants?: number;
  duration?: number;
  agenda?: string[];
};

const defaultCenters = [
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

const formatCenterName = (s: string) => {
  return s
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
};

const ScheduleMeeting: React.FC = () => {
  const meetingTypes = ["SMC", "One o one", "HC Meeting", "Spk Meeting", "MVK Meeting", "Others"];

  const [meetingType, setMeetingType] = useState<string>('');
  const [center, setCenter] = useState<string>('');
  const [centerSearch, setCenterSearch] = useState<string>('');
  const [showCenterDropdown, setShowCenterDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [centerHighlightedIndex, setCenterHighlightedIndex] = useState<number>(-1);
  const [typeHighlightedIndex, setTypeHighlightedIndex] = useState<number>(-1);

  const centerListRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const typeListRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const centerListContainerRef = useRef<HTMLDivElement | null>(null);
  const typeListContainerRef = useRef<HTMLDivElement | null>(null);
  const centerDropdownRef = useRef<HTMLDivElement | null>(null);
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const durationListRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const durationListContainerRef = useRef<HTMLDivElement | null>(null);

  const filteredCenters = defaultCenters.filter((c) =>
    c.toLowerCase().includes(centerSearch.toLowerCase())
  );

  const handleCenterInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setShowCenterDropdown(true); setCenterHighlightedIndex((i) => Math.min(i + 1, filteredCenters.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCenterHighlightedIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const idx = centerHighlightedIndex >= 0 ? centerHighlightedIndex : 0; if (filteredCenters.length > 0) { const c = filteredCenters[idx] || filteredCenters[0]; setCenter(formatCenterName(c)); setShowCenterDropdown(false); setCenterSearch(''); setCenterHighlightedIndex(-1); } return; }
    if (e.key === 'Escape') { setShowCenterDropdown(false); setCenterHighlightedIndex(-1); }
  };

  const handleTypeButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setShowTypeDropdown(true); setTypeHighlightedIndex((i) => Math.min(i + 1, meetingTypes.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setShowTypeDropdown(true); setTypeHighlightedIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const idx = typeHighlightedIndex >= 0 ? typeHighlightedIndex : 0; const t = meetingTypes[idx]; if (t) { setMeetingType(t); setShowTypeDropdown(false); setTypeHighlightedIndex(-1); } else { setShowTypeDropdown((s) => !s); } return; }
    if (e.key === 'Escape') { setShowTypeDropdown(false); setTypeHighlightedIndex(-1); }
  };
  const [points, setPoints] = useState<AgendaPoint[]>([{ id: 'p1', text: '' }]);
  const [duration, setDuration] = useState(30);
  const [participants, setParticipants] = useState(3);

  // calendar state
  const durations = [15, 30, 45, 60, 75, 90, 120, 150, 180];
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [durationHighlightedIndex, setDurationHighlightedIndex] = useState<number>(-1);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [slotGap, setSlotGap] = useState<number>(30); // minutes between selectable slots
  const [bookedMeetings, setBookedMeetings] = useState<Record<string, ScheduledMeetingDetail[]>>({});

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (selectedDate) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [selectedDate]);

  // helpers
  const handleDurationButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setShowDurationDropdown(true); setDurationHighlightedIndex((i) => Math.min(i + 1, durations.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setShowDurationDropdown(true); setDurationHighlightedIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const idx = durationHighlightedIndex >= 0 ? durationHighlightedIndex : 0; const d = durations[idx]; if (d) { setDuration(d); setShowDurationDropdown(false); setDurationHighlightedIndex(-1); } else { setShowDurationDropdown((s) => !s); } return; }
    if (e.key === 'Escape') { setShowDurationDropdown(false); setDurationHighlightedIndex(-1); }
  };
  const formatDurationLabel = (mins: number) => {
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return rem === 0 ? `${hrs} hr${hrs > 1 ? 's' : ''}` : `${hrs} hr ${rem} min`;
    }
    return `${mins} min`;
  };

  // Handlers for edit and delete
  const handleDeleteMeeting = async (meetingId?: string, date?: Date) => {
    if (!meetingId) return;
    try {
      await deleteScheduledMeeting(meetingId);
      // remove from local state
      const key = date ? date.toDateString() : selectedDate ? selectedDate.toDateString() : null;
      if (key) {
        const updated = { ...bookedMeetings };
        updated[key] = (updated[key] || []).filter(m => m.id !== meetingId);
        setBookedMeetings(updated);
      }
      showSnackbar('Meeting deleted', 'success');
    } catch (err: any) {
      showSnackbar(err?.message || 'Failed to delete meeting', 'error');
    }
  };

  const handleEditMeeting = (meeting: ScheduledMeetingDetail, date: Date) => {
    // Prefill modal fields from meeting and open modal for editing
    if (!meeting) return;
    setSelectedDate(date);
    setSelectedTimeSlot({ id: `${date.toDateString()}-${meeting.start}`, time: meeting.start, available: true });
    setDuration(meeting.duration || 30);
    setMeetingType(meeting.meetingType || '');
    setCenter(meeting.center || '');
    setParticipants(meeting.participants || 1);
    // Prefill agenda points
    if (meeting.agenda && meeting.agenda.length > 0) {
      setPoints(meeting.agenda.map((a, i) => ({ id: `p${i}_${Date.now()}`, text: a })));
    } else {
      setPoints([{ id: 'p1', text: '' }]);
    }
    setModalStep(2);
    // store editing id in selectedTimeSlot id? Instead add an editId ref
    (window as any).__editingScheduledId = meeting.id;
  };
  // Abbreviate center names: single-word -> first 3 letters (uppercase), multi-word -> first letters of first two words
  const abbreviateCenter = (centerName?: string) => {
    if (!centerName) return '';
    const parts = centerName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 3).toUpperCase();
    }
    // multi-word: take first letter of first two words
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };
  const addPoint = () => setPoints(p => [...p, { id: String(Date.now()), text: '' }]);
  const updatePoint = (id: string, text: string) => setPoints(p => p.map(x => x.id === id ? { ...x, text } : x));
  const removePoint = (id: string) => setPoints(p => p.filter(x => x.id !== id));

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  const getDaysInMonth = (date: Date) => {
    const first = startOfMonth(date);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    // start from previous Sunday
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    // Decide end date: include trailing next-month dates only if last day is Mon-Fri
    const lastDay = last.getDay(); // 0..6
    const end = new Date(last);
    if (lastDay >= 1 && lastDay <= 5) {
      // extend to the Saturday of that week
      end.setDate(last.getDate() + (6 - lastDay));
    } else {
      // if lastDay is Saturday (6) or Sunday (0) do not show next-month dates
      // end remains as the month's last day
    }

    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  // booking helpers
  const parseTimeToMinutes = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + (mm || 0);
  };

  const intervalsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => {
    return aStart < bEnd && bStart < aEnd;
  };

  // load scheduled meetings from server on mount and when month changes
  useEffect(() => {
    const loadScheduledMeetings = async () => {
      try {
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const startDate = formatDateLocal(firstDay);
        const endDate = formatDateLocal(lastDay);

        const meetings = await getScheduledMeetings(startDate, endDate);
        const bookingsMap: Record<string, ScheduledMeetingDetail[]> = {};

        meetings.forEach((m: any) => {
          const dateObj = new Date(m.date);
          const dateKey = dateObj.toDateString();
          if (!bookingsMap[dateKey]) bookingsMap[dateKey] = [];
          bookingsMap[dateKey].push({
            id: m.id,
            start: m.startTime,
            end: m.endTime,
            meetingType: m.meetingType,
            center: m.center,
            participants: m.participants,
            duration: m.duration,
            agenda: m.agenda || []
          });
        });

        setBookedMeetings(bookingsMap);
        try { localStorage.setItem('scheduledMeetings', JSON.stringify(bookingsMap)); } catch (err) { }
      } catch (err) {
        // fallback to localStorage if server fails
        try {
          const raw = localStorage.getItem('scheduledMeetings');
          if (raw) setBookedMeetings(JSON.parse(raw));
        } catch (e) { }
      }
    };
    loadScheduledMeetings();
  }, [currentMonth]);

  const calendarDays = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isSameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.toDateString() === b.toDateString();
  const isPastDate = (date: Date | null) => {
    if (!date) return false;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    return d < t;
  };

  // Format date in local timezone as YYYY-MM-DD (avoids timezone conversion issues)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Availability calculation removed (unused)

  const goToToday = () => setCurrentMonth(startOfMonth(new Date()));
  const changeMonth = (delta: number) => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  // deterministic time slots (stable between renders for same date)
  const generateTimeSlots = (date: Date | null): TimeSlot[] => {
    if (!date) return [];
    const slots: TimeSlot[] = [];
    // generate full 24-hour range 0..23
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0..23
    const dateKey = date.toDateString();
    const bookingsForDate = bookedMeetings[dateKey] || [];
    hours.forEach(hour => {
      for (let offset = 0; offset < 60; offset += slotGap) {
        const minLabel = String(offset).padStart(2, '0');
        const time = `${String(hour).padStart(2, '0')}:${minLabel}`;
        const id = `${date.toDateString()}-${hour}-${minLabel}`;
        // determine if this slot interval (slotStart -> slotStart + slotGap) overlaps a booking
        const slotStart = parseTimeToMinutes(time);
        const slotEnd = slotStart + slotGap;
        const overlaps = bookingsForDate.some(b => {
          const bStart = parseTimeToMinutes(b.start);
          const bEnd = parseTimeToMinutes(b.end);
          return intervalsOverlap(slotStart, slotEnd, bStart, bEnd);
        });
        slots.push({ id, time, available: !overlaps });
      }
    });
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(selectedDate), [selectedDate, slotGap, bookedMeetings]);
  const { showSnackbar } = useSnackbar();

  const calculateEndTime = (startTime: string, durationMin: number) => {
    const [hhStr, mmStr] = startTime.split(":");
    const hh = Number(hhStr || "0");
    const mm = Number(mmStr || "0");
    const total = hh * 60 + mm + durationMin;
    const endTotal = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handleDateClick = (date: Date | null) => {
    if (!date || isPastDate(date)) return;
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    setModalStep(1);
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      showSnackbar('Select a date and time slot before confirming', 'error');
      return;
    }

    try {
      // Save scheduled meeting to database (new scheduled_meetings table)
      const scheduledMeetingData = {
        date: formatDateLocal(selectedDate), // YYYY-MM-DD in local timezone
        startTime: selectedTimeSlot.time,
        endTime: calculateEndTime(selectedTimeSlot.time, duration),
        duration,
        meetingType: meetingType || null,
        center: center || null,
        participants,
        agenda: points.filter(p => p.text.trim()).map(p => p.text),
      };

      // If editing an existing scheduled meeting, update; else create
      const editingId = (window as any).__editingScheduledId;
      if (editingId) {
        await updateScheduledMeeting(editingId, scheduledMeetingData);
      } else {
        await createScheduledMeeting(scheduledMeetingData);
      }

      // persist booking locally so slots reflect booked times
      const dateKey = selectedDate.toDateString();
      const start = selectedTimeSlot.time;
      const end = calculateEndTime(start, duration);
      const updated = { ...bookedMeetings };
      if (editingId) {
        updated[dateKey] = (updated[dateKey] || []).map(m => m.id === editingId ? { ...m, start, end, meetingType, center, participants, duration } : m);
      } else {
        updated[dateKey] = [...(updated[dateKey] || []), { id: undefined, start, end, meetingType, center, participants, duration }];
      }
      setBookedMeetings(updated);
      try { localStorage.setItem('scheduledMeetings', JSON.stringify(updated)); } catch (err) { }
      // refresh bookings for the date from server
      try {
        const isoDate = formatDateLocal(selectedDate);
        const serverList = await getScheduledMeetings(isoDate, isoDate, true);
        const serverIntervals = serverList.map((s: any) => ({ id: s.id, start: s.startTime, end: s.endTime, meetingType: s.meetingType, center: s.center, participants: s.participants, duration: s.duration, agenda: s.agenda || [] }));
        const merged = { ...updated, [dateKey]: serverIntervals };
        setBookedMeetings(merged);
        try { localStorage.setItem('scheduledMeetings', JSON.stringify(merged)); } catch (err) { }
      } catch (err) {
        // ignore server refresh errors
      }

      // Show success message and close modal
      showSnackbar(editingId ? 'Meeting updated successfully!' : 'Meeting scheduled successfully!', 'success');

      // Reset form and close modal
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setModalStep(1);
      setMeetingType('');
      setCenter('');
      setPoints([{ id: 'p1', text: '' }]);
      setDuration(30);
      setParticipants(3);
      if ((window as any).__editingScheduledId) delete (window as any).__editingScheduledId;
    } catch (error: any) {
      showSnackbar(`Failed to schedule meeting: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 -m-6 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section - Match Reports/Settings Style */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 border-b-4 border-slate-700 dark:border-slate-600 animate-slideDown relative z-20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Schedule Meeting</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 font-medium">Pick a date on the calendar and finalize booking in the popup.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Calendar - Professional Design */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
            {/* Calendar Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{monthYear}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  Today
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="p-6 bg-white dark:bg-slate-800 transition-colors">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map(w => (
                  <div key={w} className="text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider py-3">
                    {w}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, idx) => {
                  const past = isPastDate(date);
                  const today = isSameDay(date, new Date());
                  const selected = isSameDay(date, selectedDate);
                  const isOtherMonth = date.getMonth() !== currentMonth.getMonth();
                  const dateKey = date.toDateString();
                  const meetingsForDate = bookedMeetings[dateKey] || [];
                  const meetingCount = meetingsForDate.length;
                  const hasScheduledMeetings = meetingCount > 0;
                  const col = idx % 7; // 0..6
                  const tooltipBase = 'mb-2 z-50 opacity-0 invisible transition-all duration-200';
                  const tooltipPosClass = col === 6
                    ? `absolute right-0 bottom-full ${tooltipBase} group-hover/tooltip:opacity-100 group-hover/tooltip:visible hover:opacity-100 hover:visible focus-within:opacity-100 focus-within:visible pointer-events-auto`
                    : col === 0
                      ? `absolute left-0 bottom-full ${tooltipBase} group-hover/tooltip:opacity-100 group-hover/tooltip:visible hover:opacity-100 hover:visible focus-within:opacity-100 focus-within:visible pointer-events-auto`
                      : `absolute left-1/2 -translate-x-1/2 bottom-full ${tooltipBase} group-hover/tooltip:opacity-100 group-hover/tooltip:visible hover:opacity-100 hover:visible focus-within:opacity-100 focus-within:visible pointer-events-auto`;
                  const arrowPosClass = col === 6 ? 'right-4 top-full' : col === 0 ? 'left-4 top-full' : 'left-1/2 -translate-x-1/2 top-full';

                  return (
                    <div key={idx} className="relative group/tooltip">
                      <button
                        onClick={() => handleDateClick(date)}
                        disabled={past}
                        className={`
                          relative aspect-square rounded-xl p-2 flex flex-col items-center justify-center w-full
                          transition-all duration-200 group
                          ${isOtherMonth
                            ? 'bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-600 border-transparent opacity-70 cursor-default'
                            : past
                              ? 'bg-gray-50 dark:bg-slate-900/50 text-gray-300 dark:text-slate-700 cursor-not-allowed'
                              : selected
                                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xl scale-105 ring-2 ring-slate-400 dark:ring-slate-500 ring-offset-2'
                                : today
                                  ? 'bg-slate-100/50 dark:bg-slate-700/40 text-slate-900 dark:text-white border-2 border-slate-800 dark:border-slate-100 ring-2 ring-slate-800/20 dark:ring-white/20 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-xl hover:scale-105'
                                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-lg hover:scale-105 text-gray-700 dark:text-slate-300'
                          }
                        `}
                      >
                        {/* Date Number */}
                        <span className={`text-lg font-bold transition-all ${selected ? (today ? 'z-10' : '') : today ? 'text-slate-900 dark:text-white scale-110' : isOtherMonth ? 'text-gray-400' : ''}`}>
                          {date.getDate()}
                        </span>

                        {/* Today Label */}
                        {today && !selected && !hasScheduledMeetings && (
                          <span className="absolute bottom-1.5 text-[8px] font-black uppercase tracking-tighter text-slate-900 dark:text-white opacity-80">
                            Today
                          </span>
                        )}

                        {/* Today Badge */}
                        {today && !selected && hasScheduledMeetings && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-800 dark:bg-white animate-pulse"></span>
                          </div>
                        )}

                        {/* Meeting count */}
                        {hasScheduledMeetings && !isOtherMonth && (
                          <span className={`text-[10px] font-medium mt-0.5 ${selected ? 'text-inherit opacity-90' : 'text-slate-500 dark:text-slate-400'}`}>
                            {meetingCount} {meetingCount === 1 ? 'meeting' : 'meetings'}
                          </span>
                        )}
                      </button>

                      {/* Hover Tooltip with meeting details */}
                      {hasScheduledMeetings && !isOtherMonth && (
                        <div className={tooltipPosClass}>
                          <div className="bg-slate-800 text-white text-xs rounded-lg shadow-2xl p-3 min-w-[260px] max-w-[420px]">
                            <div className="font-semibold mb-2 text-center border-b border-slate-600 pb-2">
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="space-y-2">
                              {meetingsForDate.map((meeting, mIdx) => (
                                <div key={mIdx} className="bg-slate-700/50 rounded p-2 flex items-center justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-teal-300">{`${abbreviateCenter(meeting.center)}${meeting.meetingType ? ' ' + meeting.meetingType : ''}`}</span>
                                      <span className="text-slate-300">{meeting.start} - {meeting.end}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3">
                                    <button onClick={() => handleEditMeeting(meeting, date)} title="Edit" className="p-1 rounded-md bg-white/5 text-slate-200 hover:bg-white/10">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.414 2.586a2 2 0 010 2.828l-9.9 9.9a1 1 0 01-.464.263l-4 1a1 1 0 01-1.213-1.213l1-4a1 1 0 01.263-.464l9.9-9.9a2 2 0 012.828 0zM15.121 4.95l-9.9 9.9L4 15l.15-1.222 9.9-9.9 1.071 1.071z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleDeleteMeeting(meeting.id, date)} title="Delete" className="p-1 rounded-md bg-white/5 text-rose-300 hover:bg-white/10">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11h4" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Arrow */}
                            <div className={`absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800 ${arrowPosClass}`}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend removed by user request */}
            </div>
          </div>
        </div>

        {/* Modal for date details and booking */}
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fadeIn">
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-md" onClick={() => { setSelectedDate(null); setSelectedTimeSlot(null); }} />
            <div className="relative z-20 w-full max-w-6xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
              <div className="p-0 flex flex-col" style={{ maxHeight: '92vh' }}>
                {/* Modal Header with Gradient */}
                <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map(step => (
                            <div key={step} className={`h-1.5 rounded-full transition-all ${step === modalStep ? 'w-8 bg-white' : 'w-1.5 bg-white/30'}`}></div>
                          ))}
                        </div>
                        <span className="text-xs text-white/80 font-medium">{modalStep === 1 ? 'Select Time Slot' : modalStep === 2 ? 'Meeting Details' : 'Summary & Confirm'}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedDate(null); setSelectedTimeSlot(null); }} className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 lg:p-10 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 flex-1 transition-colors">
                  <div className="flex flex-col h-full">
                    <div className={`flex-1 overflow-y-auto pr-2`} style={modalStep === 2 ? { maxHeight: 'calc(92vh - 220px)' } : modalStep === 1 ? { maxHeight: 'calc(92vh - 220px)' } : undefined}>
                      {modalStep === 1 && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Available Time Slots</h4>
                              <p className="text-sm text-gray-500 dark:text-slate-400">Select your preferred meeting time</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
                                {timeSlots.filter(s => s.available).length} slots available
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Gap:</span>
                                {[15, 30, 45, 60].map(g => (
                                  <button key={g} onClick={() => setSlotGap(g)} className={`px-2 py-1 text-xs rounded-md ${slotGap === g ? 'bg-slate-700 text-white' : 'bg-white border border-gray-200 text-slate-700'}`}>
                                    {g}m
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {timeSlots.map(slot => (
                              <button
                                key={slot.id}
                                onClick={() => slot.available && setSelectedTimeSlot(slot)}
                                disabled={!slot.available}
                                className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${!slot.available
                                  ? 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 opacity-50 cursor-not-allowed'
                                  : selectedTimeSlot?.id === slot.id
                                    ? 'bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 border-slate-800 shadow-lg scale-105'
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md hover:scale-102'
                                  }`}
                              >
                                <div className={`text-center ${selectedTimeSlot?.id === slot.id ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                  <div className="flex items-center justify-center mb-1">
                                    <svg className={`w-4 h-4 mr-1 ${selectedTimeSlot?.id === slot.id ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-lg font-bold">{slot.time}</span>
                                  </div>
                                  <div className={`text-xs ${selectedTimeSlot?.id === slot.id ? 'text-white/80' : 'text-gray-500 dark:text-slate-500'}`}>
                                    {slot.available ? 'Available' : 'Unavailable'}
                                  </div>
                                </div>
                                {selectedTimeSlot?.id === slot.id && (
                                  <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))}

                            {timeSlots.length === 0 && (
                              <div className="col-span-full text-center py-12 text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p>No slots available for this date</p>
                              </div>
                            )}
                          </div>

                          {selectedTimeSlot && (
                            <div className="bg-gradient-to-r from-slate-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="bg-slate-700 p-2 rounded-lg">
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Selected: {selectedTimeSlot.time}</div>
                                  <div className="text-xs text-gray-600 dark:text-slate-400">{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                </div>
                              </div>
                              <button onClick={() => setModalStep(2)} className="px-5 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2">
                                Continue
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {modalStep === 2 && (
                        <div className="space-y-6">
                          <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-l-4 border-slate-700 rounded-xl p-5 flex items-center gap-4 transition-colors">
                            <div className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow-sm">
                              <svg className="w-6 h-6 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-600 dark:text-slate-400">Your selected time slot</div>
                              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedTimeSlot?.time}</div>
                              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">Ends at {selectedTimeSlot ? calculateEndTime(selectedTimeSlot.time, duration) : '-'} ({formatDurationLabel(duration)})</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4 lg:col-span-1">
                              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm transition-colors">
                                <div className="flex items-center gap-2 mb-4">
                                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Meeting Type</h4>
                                </div>
                                <div>
                                  <div className="relative" ref={typeDropdownRef}>
                                    <button
                                      type="button"
                                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                      onKeyDown={handleTypeButtonKeyDown}
                                      aria-expanded={showTypeDropdown}
                                      aria-controls="type-listbox"
                                      className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 pr-10 text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                                    >
                                      <span className={meetingType ? "text-gray-900 dark:text-slate-100" : "text-gray-400 dark:text-slate-600"}>{meetingType || "Select meeting type..."}</span>
                                    </button>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
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
                                            className={`w-full text-left px-4 py-3 cursor-pointer ${idx === typeHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-300'}`}
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
                              </div>

                              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm transition-colors">
                                <div className="flex items-center gap-2 mb-4">
                                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                  </svg>
                                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Center</h4>
                                </div>
                                <div>
                                  <div className="relative" ref={centerDropdownRef}>
                                    <input
                                      type="text"
                                      value={showCenterDropdown ? centerSearch : center}
                                      onChange={(e) => { setCenterSearch(e.target.value); if (!showCenterDropdown) setShowCenterDropdown(true); }}
                                      onFocus={() => { setCenterSearch(''); setShowCenterDropdown(true); }}
                                      onKeyDown={handleCenterInputKeyDown}
                                      placeholder="Select center..."
                                      aria-expanded={showCenterDropdown}
                                      aria-controls="center-listbox"
                                      className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 pr-10 text-gray-900 dark:text-slate-100 font-medium placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-text"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-slate-400">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>

                                    {showCenterDropdown && (
                                      <div id="center-listbox" role="listbox" ref={centerListContainerRef} className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                                        {filteredCenters.length > 0 ? (
                                          filteredCenters.map((c, idx) => (
                                            <div
                                              key={c}
                                              role="option"
                                              aria-selected={center === c}
                                              ref={(el) => { centerListRefs.current[idx] = el; }}
                                              className={`w-full text-left px-4 py-3 cursor-pointer ${idx === centerHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-300'}`}
                                              onMouseEnter={() => setCenterHighlightedIndex(idx)}
                                              onMouseDown={() => { setCenter(formatCenterName(c)); setShowCenterDropdown(false); setCenterSearch(''); setCenterHighlightedIndex(-1); }}
                                            >
                                              {formatCenterName(c)}
                                            </div>
                                          ))
                                        ) : (
                                          <div className="px-4 py-3 text-gray-500 dark:text-slate-500 text-sm">No centers found</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>


                            </div>

                            <div className="space-y-4 lg:col-span-1">
                              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm transition-colors">
                                <div className="flex items-center gap-2 mb-4">
                                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Duration</h4>
                                </div>
                                <div className="relative" ref={durationListContainerRef}>
                                  <button
                                    type="button"
                                    onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                                    onKeyDown={handleDurationButtonKeyDown}
                                    aria-expanded={showDurationDropdown}
                                    aria-controls="duration-listbox"
                                    className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-4 py-3 pr-10 text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 text-left"
                                  >
                                    <span className="text-gray-900 dark:text-slate-100">{formatDurationLabel(duration)}</span>
                                  </button>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>

                                  {showDurationDropdown && (
                                    <div id="duration-listbox" role="listbox" className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                                      {durations.map((d, idx) => (
                                        <div
                                          key={d}
                                          role="option"
                                          aria-selected={duration === d}
                                          ref={(el) => { durationListRefs.current[idx] = el; }}
                                          className={`w-full text-left px-4 py-3 cursor-pointer ${idx === durationHighlightedIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-300'}`}
                                          onMouseEnter={() => setDurationHighlightedIndex(idx)}
                                          onMouseDown={() => { setDuration(d); setShowDurationDropdown(false); setDurationHighlightedIndex(-1); }}
                                        >
                                          {formatDurationLabel(d)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm transition-colors">
                                <div className="flex items-center gap-2 mb-4">
                                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Participants</h4>
                                </div>
                                <input
                                  type="number"
                                  value={participants}
                                  onChange={(e) => setParticipants(Number(e.target.value))}
                                  min={1}
                                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:border-slate-500 focus:outline-none transition-colors"
                                />
                              </div>


                            </div>
                          </div>

                          {/* Make Meeting Agenda full-width */}
                          <div className="mt-4 w-full">
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm w-full transition-colors">
                              <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-slate-700 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Meeting Agenda</h4>
                              </div>
                              <div className="space-y-3 max-h-56 overflow-y-auto">
                                {points.map((p, i) => (
                                  <div key={p.id} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2">
                                    <div className="flex-shrink-0 w-6 h-6 bg-slate-700 dark:bg-slate-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                                    <input
                                      value={p.text}
                                      onChange={(e) => updatePoint(p.id, e.target.value)}
                                      placeholder={`Agenda point ${i + 1}`}
                                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 bg-transparent text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:border-slate-500 focus:outline-none transition-colors"
                                    />
                                    {points.length > 1 && (
                                      <button onClick={() => removePoint(p.id)} className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 p-2 rounded-lg transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <button onClick={addPoint} className="mt-3 w-full py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add agenda point
                              </button>
                            </div>
                          </div>


                        </div>
                      )}
                    </div>
                    {modalStep === 2 && (
                      <div className="flex items-center gap-3 pt-4 border-t dark:border-slate-700">
                        <div className="ml-auto flex items-center gap-3">
                          <button onClick={() => setModalStep(1)} className="px-5 py-3 border-2 border-gray-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                          </button>
                          <button onClick={() => setModalStep(3)} disabled={!selectedTimeSlot} className="px-5 py-3 bg-slate-700 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md font-medium flex items-center justify-center gap-2">
                            Continue
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {modalStep === 3 && (
                      <div className="space-y-6">
                        {/* Summary moved to step 3 */}
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 w-full">
                          <h4 className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-3">Meeting Summary</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-slate-400">Date:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{selectedDate?.toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-slate-400">Time:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{selectedTimeSlot?.time} - {selectedTimeSlot ? calculateEndTime(selectedTimeSlot.time, duration) : '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-slate-400">Duration:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{formatDurationLabel(duration)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-slate-400">Meeting Type:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{meetingType || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-slate-400">Center:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{center || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-slate-400">Attendees:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{participants}</span>
                              </div>
                            </div>
                            <div className="lg:pl-6 lg:border-l lg:border-gray-200 dark:border-slate-700">
                              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Agenda</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-slate-300 space-y-1">
                                {points.map((p) => (
                                  <li key={p.id} className="truncate">{p.text || '(no text)'}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t dark:border-slate-700">
                          <div className="ml-auto flex items-center gap-3">
                            <button onClick={() => setModalStep(2)} className="px-5 py-3 border-2 border-gray-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all font-medium flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Back
                            </button>
                            <button onClick={handleConfirm} disabled={!selectedTimeSlot} className="px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-lg hover:from-slate-900 hover:to-slate-900 dark:hover:from-slate-600 dark:hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Confirm & Schedule Meeting
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleMeeting;
