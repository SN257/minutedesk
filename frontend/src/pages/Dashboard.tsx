import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getMeetings, getTasks, getBoardsApi, getScheduledMeetings, getAllCardsApi, getDailyWorkWarnings, isYesterdayWorkLogMissing } from "../services/api";

interface Meeting {
  id: string;
  personName?: string;
  center: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingType: string;
  createdAt: string;
  notes?: any[];
}

interface TaskItem {
  kind: 'task';
  id: any;
  title: any;
  description?: any;
  status?: string;
  dueDate?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface CardItem {
  kind: 'card';
  id: any;
  title: any;
  description?: any;
  listId?: any;
  dueDate?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}
interface ChecklistItem {
  kind: 'checklist';
  id: any;
  cardId: any;
  title: any;
  description?: any;
  done?: boolean;
  duration?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

type TodayItem = TaskItem | CardItem | ChecklistItem;

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [scheduledMeetings, setScheduledMeetings] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [dailyWarnings, setDailyWarnings] = useState<any[]>([]);
  const [missingWorkLog, setMissingWorkLog] = useState<{ missing: boolean; date?: string } | null>(null);
  const [, setAppearanceSettings] = useState<any>(null);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(null), 3000);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [meetingsData, tasksData, boardsData, scheduledData, cardsData] = await Promise.all([
          getMeetings().catch(() => []),
          getTasks().catch(() => []),
          getBoardsApi().catch(() => []),
          getScheduledMeetings().catch(() => []),
          getAllCardsApi().catch(() => []),
        ]);

        setMeetings(meetingsData);
        setTasks(tasksData);
        setBoards(boardsData);
        setScheduledMeetings(scheduledData);
        setCards(cardsData || []);

        try {
          const warnings = await getDailyWorkWarnings();
          setDailyWarnings(warnings || []);
        } catch (e) {
          // ignore
        }

        try {
          const miss = await isYesterdayWorkLogMissing();
          setMissingWorkLog(miss);
        } catch (e) {
          // ignore
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    // load appearance
    try {
      const a = localStorage.getItem('appearanceSettings');
      if (a) setAppearanceSettings(JSON.parse(a));
    } catch {}

    fetchData();
  }, []);

  // Calculate real stats
  const today = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === today);
  // helper to determine if a meeting (date + optional startTime) is in the future
  const isFutureMeeting = (meetingDate?: string, startTime?: string) => {
    if (!meetingDate) return false;
    if (meetingDate > today) return true;
    if (meetingDate === today) {
      if (!startTime) return false;
      const now = new Date();
      const parts = (startTime || '').split(':');
      const hh = parseInt(parts[0], 10);
      const mm = parts[1] ? parseInt(parts[1], 10) : 0;
      if (isNaN(hh)) return false;
      if (hh > now.getHours()) return true;
      if (hh === now.getHours() && mm > now.getMinutes()) return true;
      return false;
    }
    return false;
  };

  // include scheduledMeetings alongside meetings for the Upcoming Meetings panel
  const scheduledMapped = (scheduledMeetings || []).map((sm: any) => ({
    id: sm.id,
    center: sm.center || sm.title || 'Scheduled',
    personName: sm.personName,
    date: sm.date || sm.scheduledDate,
    startTime: sm.startTime,
    endTime: sm.endTime,
    meetingType: sm.meetingType || 'scheduled',
    createdAt: sm.createdAt || (sm.date || sm.scheduledDate) || ''
  }));

  const combinedMeetings = [...(meetings || []), ...scheduledMapped];
  const upcomingMeetings = combinedMeetings
    .filter(m => isFutureMeeting(m.date, m.startTime))
    .sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      if (da !== db) return da.localeCompare(db);
      const toMinutes = (t?: string) => {
        if (!t) return 0;
        const parts = t.split(':');
        const hh = parseInt(parts[0], 10) || 0;
        const mm = parts[1] ? parseInt(parts[1], 10) : 0;
        return hh * 60 + mm;
      };
      return toMinutes(a.startTime) - toMinutes(b.startTime);
    })
    .slice(0, 3);

  // dedupe combined meetings for total count (prefer scheduledMeeting linking if present)
  const getMeetingKey = (m: any) => {
    if (!m) return '';
    if (m.scheduledMeetingId) return `sch:${m.scheduledMeetingId}`;
    if (m.scheduled_id) return `sch:${m.scheduled_id}`;
    if (m.scheduledMeeting && m.scheduledMeeting.id) return `sch:${m.scheduledMeeting.id}`;
    // fallback: center+date+startTime
    return `key:${(m.center || '')}|${(m.date || '')}|${(m.startTime || '')}`;
  };

  const totalMeetingsCount = Array.from(new Set(combinedMeetings.map(getMeetingKey))).filter(k => k).length;

  // identify scheduled meetings that do not have meeting minutes recorded
  const meetingsKeySet = new Set((meetings || []).map(getMeetingKey));
  const pendingScheduled = (scheduledMapped || []).filter((sm: any) => {
    const key = getMeetingKey(sm);
    if (!key) return false;
    if (meetingsKeySet.has(key)) return false; // already have minutes
    const meetingDate = sm.date || '';
    if (!meetingDate) return false;
    if (meetingDate < today) return true; // past date -> pending
    if (meetingDate === today) {
      // include if startTime is at-or-before now (meeting likely happened)
      const now = new Date();
      if (!sm.startTime) return true;
      const parts = (sm.startTime || '').split(':');
      const hh = parseInt(parts[0], 10);
      const mm = parts[1] ? parseInt(parts[1], 10) : 0;
      if (isNaN(hh)) return true;
      if (hh < now.getHours()) return true;
      if (hh === now.getHours() && mm <= now.getMinutes()) return true;
      return false;
    }
    return false;
  });
  const pendingMinutesCount = pendingScheduled.length;

  const recentMeetings = [...meetings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Filter scheduled meetings to include future dates or today but later than now
  const upcomingScheduledMeetings = scheduledMeetings.filter(sm => {
    const meetingDate = sm.date || sm.scheduledDate;
    if (!meetingDate) return false;
    if (meetingDate > today) return true;
    // if meeting is today, include only if startTime is later than now
    if (meetingDate === today) {
      const now = new Date();
      const t = sm.startTime || '';
      const parts = t.split(':');
      const hh = parseInt(parts[0], 10);
      const mm = parts[1] ? parseInt(parts[1], 10) : 0;
      if (isNaN(hh)) return false;
      if (hh > now.getHours()) return true;
      if (hh === now.getHours() && mm > now.getMinutes()) return true;
      return false;
    }
    return false;
  });

  const incompleteTasks = tasks.filter(t => !t.completed);
  const overdueTasks = tasks.filter(t => {
    // Skip completed tasks
    if (t.completed === true || t.completed === 'true' || t.status === 'completed' || t.status === 'done') return false;
    if (!t.dueDate) return false;

    try {
      // Parse the due date - handle both ISO and various formats
      const taskDueDate = new Date(t.dueDate);
      if (isNaN(taskDueDate.getTime())) return false;

      const today = new Date();
      taskDueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      // Show as overdue only if due date is BEFORE today (exclude today)
      return taskDueDate < today;
    } catch {
      return false;
    }
  });

  const todayTasks = tasks.filter(t => {
    if (!t.dueDate || t.completed) return false;
    const taskDate = new Date(t.dueDate);
    const now = new Date();

    const isToday = taskDate.getDate() === now.getDate() &&
      taskDate.getMonth() === now.getMonth() &&
      taskDate.getFullYear() === now.getFullYear();

    return isToday;
  });

  // Cards due today
  const todayCards = cards.filter(c => {
    if (!c.dueDate || c.archived) return false;
    const cardDate = new Date(c.dueDate);
    const now = new Date();
    return cardDate.getDate() === now.getDate() &&
      cardDate.getMonth() === now.getMonth() &&
      cardDate.getFullYear() === now.getFullYear();
  });

  // Create a set of card IDs already in dailyWarnings to avoid duplicates
  const dailyWarningCardIds = new Set(dailyWarnings.map((w: any) => w.id).filter(Boolean));

  const overdueCards = cards.filter(c => {
    // Skip archived or completed cards
    if (c.archived === true || c.completed === true || c.status === 'completed') return false;
    if (!c.dueDate) return false;
    // Skip cards that are already in dailyWarnings (from Daily Work board)
    if (dailyWarningCardIds.has(c.id)) return false;

    try {
      // Parse the due date - handle both ISO and various formats
      const cardDueDate = new Date(c.dueDate);
      if (isNaN(cardDueDate.getTime())) return false;

      const today = new Date();
      cardDueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      // Show as overdue only if due date is BEFORE today (exclude today)
      return cardDueDate < today;
    } catch {
      return false;
    }
  });

  // Combined warnings list (daily warnings, overdue tasks, overdue cards)

  // Merge tasks, cards and checklist items for today's list
  const todayChecklistItems: ChecklistItem[] = [];
  const todayCardIds = new Set(todayCards.map(c => c.id));
  cards.forEach((c) => {
    if (!c.checklist) return;
    // If the card itself is due today, prefer showing the card only — skip checklist items
    if (todayCardIds.has(c.id)) return;
    let list: any[] = [];
    try {
      list = typeof c.checklist === 'string' ? JSON.parse(c.checklist) : c.checklist;
    } catch (e) {
      return; // ignore malformed checklist
    }
    list.forEach((ci) => {
      const dur = ci.duration || ci.dueDate || ci.date;
      if (!dur) return;
      // Skip if checklist item is marked as done
      if (ci.done || ci.checked || ci.completed) return;
      const d = new Date(dur);
      if (isNaN(d.getTime())) return;
      const now = new Date();
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        todayChecklistItems.push({ kind: 'checklist', id: ci.id, cardId: c.id, title: ci.text || ci.title || '(checklist)', done: !!ci.done, duration: dur });
      }
    });
  });

  const todayItems: TodayItem[] = [
    ...todayTasks.map(t => ({ kind: 'task' as const, id: t.id, title: t.title, description: t.description, status: t.status, dueDate: t.dueDate })),
    ...todayCards.map(c => ({ kind: 'card' as const, id: c.id, title: c.title, description: c.description, listId: c.listId, dueDate: c.dueDate, priority: c.priority })),
    ...todayChecklistItems
  ];

  // Priority helpers: higher value = higher priority
  const priorityOrder: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
    '': 0,
  };
  const priorityValue = (it: TodayItem) => {
    // @ts-ignore
    return priorityOrder[(it as any).priority || ''] || 0;
  };
  const getPriorityClass = (p?: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  // Sort today's items by priority (urgent -> high -> medium -> low -> none)
  const todayItemsSorted = [...todayItems].sort((a, b) => priorityValue(b) - priorityValue(a));

  const uniqueCenters = new Set(meetings.map(m => m.center)).size;
  const thisMonthMeetings = meetings.filter(m => {
    const meetingDate = new Date(m.date);
    const now = new Date();
    return meetingDate.getMonth() === now.getMonth() &&
      meetingDate.getFullYear() === now.getFullYear();
  }).length;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr || 'N/A';
  };

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const tomorrowOnly = tomorrow.toISOString().split('T')[0];

    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === tomorrowOnly) return 'Tomorrow';

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-slate-50 border-l-4 border-slate-500 p-4 rounded-md animate-slideDown">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-slate-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-slate-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Pending Meeting Minutes Notice */}
      {pendingMinutesCount > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">You have {pendingMinutesCount} meeting{pendingMinutesCount > 1 ? 's' : ''} without written minutes</p>
              <p className="text-xs text-yellow-700 mt-1">Add meeting minutes to keep records up to date.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingScheduled.slice(0, 3).map((sm: any) => (
                  <div key={sm.id} className="text-xs text-yellow-800 bg-yellow-100 px-2 py-1 rounded">
                    {sm.center} • {formatDate(sm.date)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <button onClick={() => navigate('/add-meeting/new')} className="px-3 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium">
                Write minutes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Work Warning (tasks, cards, work-log items) */}
      {(dailyWarnings.length > 0 || overdueTasks.length > 0 || overdueCards.length > 0) && (
        (() => {
          const total = dailyWarnings.length + overdueTasks.length + overdueCards.length;
          return (
            <div key="overdue-banner" className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-lg shadow-sm p-4 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-base font-semibold text-red-800">{total} Overdue item{total > 1 ? 's' : ''}</h3>
                  </div>
                  <p className="text-sm text-red-700 mb-2">You have overdue work across Tasks and Boards. Please review and complete them.</p>
                  <div className="mt-1 flex flex-wrap gap-2 max-w-full overflow-x-auto">
                    {dailyWarnings.slice(0, 2).map((w: any) => (
                      <div key={`dw-${w.id}`} className="inline-flex items-center text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full mr-2 mb-2">
                        <span className="font-medium">{w.title}</span>
                        {w.dueDate && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span className="text-red-600">due {formatDate(w.dueDate)}</span>
                          </>
                        )}
                      </div>
                    ))}
                    {overdueTasks.slice(0, 2).map((t: any) => (
                      <div key={`tsk-${t.id}`} className="inline-flex items-center text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full mr-2 mb-2">
                        <span className="font-medium">{t.title}</span>
                        {t.dueDate && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span className="text-red-600">due {formatDate(t.dueDate)}</span>
                          </>
                        )}
                      </div>
                    ))}
                    {overdueCards.slice(0, 2).map((c: any) => (
                      <div key={`card-${c.id}`} className="inline-flex items-center text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full mr-2 mb-2">
                        <span className="font-medium">{c.title}</span>
                        {c.dueDate && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span className="text-red-600">due {formatDate(c.dueDate)}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-shrink-0">
                  <button
                    onClick={() => navigate('/tasks')}
                    aria-label="View overdue tasks"
                    title="View overdue tasks"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-shadow shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8v4m0 4h.01" />
                    </svg>
                    View Overdue
                  </button>

                  <button
                    onClick={() => {
                      const daily = boards.find((b: any) => b.title === 'Daily Work');
                      if (daily && daily.id) navigate(`/boards/${daily.id}`);
                      else navigate('/boards');
                    }}
                    aria-label="Open Daily Work board"
                    title="Open Daily Work board"
                    className="w-8 h-8 inline-flex items-center justify-center bg-transparent border border-red-200 hover:bg-red-50 text-red-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-red-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Missing Yesterday Work Log Reminder */}
      {missingWorkLog?.missing && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-400 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.42 0zM12 9v4m0 4h.01" />
                </svg>
                <h3 className="text-base font-semibold text-amber-800">Missed Yesterday's Work Log</h3>
              </div>
              <p className="text-sm text-amber-700">
                You didn't add your daily work yesterday. Please add it to keep your logs up to date.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={() => navigate('/work-logs')}
                aria-label="Add yesterday work log"
                title="Add or edit your Work Log"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-shadow shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Work Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 sm:p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
              Welcome back, {user?.name || user?.email?.split("@")[0] || "User"}!
            </h1>
            <p className="text-slate-200 mt-2 text-sm sm:text-base md:text-lg">
              {todayMeetings.length > 0
                ? `You have ${todayMeetings.length} meeting${todayMeetings.length > 1 ? 's' : ''} today`
                : upcomingScheduledMeetings.length > 0
                  ? `You have ${upcomingScheduledMeetings.length} upcoming scheduled meeting${upcomingScheduledMeetings.length > 1 ? 's' : ''}`
                  : "Ready to organize your day"
              }
            </p>
          </div>
          <div className="hidden md:block">
            <svg className="w-24 h-24 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Meetings */}
        <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:shadow-lg transition-all hover:border-slate-300 cursor-pointer"
          onClick={() => navigate('/meetings')}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-full">
              {thisMonthMeetings} this month
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Meetings</h3>
          <p className="text-3xl font-bold text-gray-800">{totalMeetingsCount}</p>
          <p className="text-xs text-gray-400 mt-2">{upcomingScheduledMeetings.length} scheduled upcoming</p>
        </div>

        {/* Active Boards */}
        <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:shadow-lg transition-all hover:border-slate-300 cursor-pointer"
          onClick={() => navigate('/boards')}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-full">
              Boards
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Active Boards</h3>
          <p className="text-3xl font-bold text-gray-800">{boards.length}</p>
          <p className="text-xs text-gray-400 mt-2">Task organization</p>
        </div>

        

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:shadow-lg transition-all hover:border-slate-300 cursor-pointer"
          onClick={() => navigate('/tasks')}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            {overdueTasks.length > 0 && (
              <span className="text-xs font-semibold text-slate-800 bg-slate-200 px-2 py-1 rounded-full">
                {overdueTasks.length} overdue
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Pending Tasks</h3>
          <p className="text-3xl font-bold text-gray-800">{incompleteTasks.length}</p>
          <p className="text-xs text-gray-400 mt-2">{tasks.filter(t => t.completed).length} completed</p>
        </div>

        {/* Centers Covered */}
        <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:shadow-lg transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-full">
              Locations
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Centers Covered</h3>
          <p className="text-3xl font-bold text-gray-800">{uniqueCenters}</p>
          <p className="text-xs text-gray-400 mt-2">{todayMeetings.length} meetings today</p>
        </div>
      </div>

      

      {/* Two Column Layout for Tasks and Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Today's Tasks
              </h3>
              <span className="text-sm font-semibold text-slate-800 bg-white px-3 py-1 rounded-full">
                {todayItems.length} tasks
              </span>
            </div>
          </div>
          <div className="p-6">
            {todayItems.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-500">No tasks due today</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayItemsSorted.map((item) => (
                  <div key={item.kind + '-' + item.id} className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(item.kind === 'task' ? '/tasks' : '/boards')}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
                        {'priority' in item && (item as any).priority && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPriorityClass((item as any).priority)}`}>
                            {((item as any).priority || '').toString()}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 whitespace-pre-line">{item.description}</p>
                      )}
                    </div>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${item.kind === 'task' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-800'}`}>
                      {item.kind === 'task' ? (item.status || 'todo') : 'card'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {overdueTasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  ⚠️ {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {overdueTasks.slice(0, 2).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <span className="text-gray-700 flex-1 truncate">{task.title}</span>
                      <span className="text-xs text-slate-600 ml-2">{formatDate(task.dueDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upcoming Meetings
              </h3>
              <span className="text-sm font-semibold text-slate-800 bg-white px-3 py-1 rounded-full">
                {upcomingMeetings.length} upcoming
              </span>
            </div>
          </div>
          <div className="p-6">
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-500">No upcoming meetings</p>
                <button
                  onClick={() => navigate('/meetings')}
                  className="text-xs text-slate-600 hover:text-slate-700 mt-2 font-medium"
                >
                  Schedule a meeting →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/meeting/${meeting.id}`)}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-800">{meeting.center}</h4>
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-full">
                        {getRelativeDate(meeting.date)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 space-x-3">
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTime(meeting.startTime)}
                      </span>
                      {meeting.personName && (
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {meeting.personName}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                        {meeting.meetingType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/add-meeting')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border-2 border-transparent hover:border-slate-300"
          >
            <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-gray-700">New Meeting</span>
          </button>
          <button
            onClick={() => navigate('/meetings')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border-2 border-transparent hover:border-slate-300"
          >
            <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Schedule</span>
          </button>
          <button
            onClick={() => navigate('/boards')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border-2 border-transparent hover:border-slate-300"
          >
            <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span className="text-sm font-medium text-gray-700">View Boards</span>
          </button>
          <button
            onClick={() => navigate('/meetings')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border-2 border-transparent hover:border-slate-300"
          >
            <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">All Meetings</span>
          </button>
        </div>
      </div>

      {/* Recent Meetings Table */}
      <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <p className="text-sm text-slate-200 mt-1">Your latest meeting activities</p>
            </div>
            <button
              onClick={() => navigate('/meetings')}
              className="text-sm font-medium text-white hover:text-slate-200 transition-colors flex items-center"
            >
              View all
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Center
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentMeetings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-500">No meetings yet</p>
                      <p className="text-xs text-gray-400 mt-1">Create your first meeting to get started</p>
                      <button
                        onClick={() => navigate('/add-meeting')}
                        className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                      >
                        Create Meeting
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                recentMeetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/add-meeting/${meeting.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{meeting.center}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{meeting.personName || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{formatDate(meeting.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {meeting.meetingType}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
