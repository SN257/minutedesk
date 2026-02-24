import { useState, useEffect, useRef } from 'react';
import { getMeetings, getAllCardsForReportsApi } from '../services/api';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
// Using custom table UI instead of MUI DataGrid

interface MeetingNote {
  id: string;
  title?: string;
  points: {
    id: string;
    text: string;
    category?: string;
    assignee?: string;
    deadline?: string;
    taskId?: string;
  }[];
  important: boolean;
  followUp: boolean;
}

interface Meeting {
  id: string;
  center?: string;
  personName?: string;
  date: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  place?: string;
  attendance?: string;
  presentSantName?: string;
  meetingType: string;
  scheduledMeetingId?: string;
  agenda?: string[];
  notes?: MeetingNote[];
  createdAt: string;
}

interface Card {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  archived?: boolean;
  completed?: boolean;
  priority?: string;
  labels?: string[];
  list?: { title: string };
  checklist?: { id: string; text: string; done: boolean }[];
}

const Reports = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Card[]>([]);
  const [activeTab] = useState<'meetings' | 'tasks'>('meetings');
  const [activeReport, setActiveReport] = useState<'lessons' | 'decisions' | 'information'>('lessons');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchTerm] = useState('');

  // Column filters for data grid
  const [filters, setFilters] = useState<Record<string, string>>({
    status: '',
    meeting: '',
    assignee: '',
    category: '',
    priority: '',
    list: ''
  });

  // Column menu and sorting
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null);
  const toggleColumnMenu = (name: string) => {
    // debug helper to verify clicks
    console.log('toggleColumnMenu', name, 'current:', columnMenuOpen);
    setColumnMenuOpen(prev => prev === name ? null : name);
  };
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);


  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Reset to page 1 when switching tabs or reports
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeReport]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);


  // Helper function to abbreviate location names
  const getLocationAbbreviation = (location: string): string => {
    const abbreviations: { [key: string]: string } = {
      'jersey city': 'JC',
      'atlanta': 'Atl',
      'new york': 'NY',
      'los angeles': 'LA',
      'san francisco': 'SF',
      'chicago': 'Chi',
      'boston': 'Bos',
      'seattle': 'Sea',
      'miami': 'Mia',
      'dallas': 'Dal',
      'houston': 'Hou',
      'philadelphia': 'Phi',
      'phoenix': 'Phx',
      'san diego': 'SD',
      'denver': 'Den',
      'washington': 'DC',
    };

    const lowerLocation = location.toLowerCase().trim();
    return abbreviations[lowerLocation] || location.split(' ').map(w => w[0]).join('').toUpperCase();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // First, get meetings to extract taskIds
      const meetingsData = await getMeetings().catch(() => []);

      // Extract all taskIds from meeting notes
      const taskIds: string[] = [];
      meetingsData.forEach((meeting: any) => {
        (meeting.notes || []).forEach((note: any) => {
          note.points.forEach((point: any) => {
            if (point.taskId) {
              taskIds.push(point.taskId);
            }
          });
        });
      });

      console.log('Task IDs from meeting notes:', taskIds);

      // Fetch cards including the specific taskIds from meetings
      const cardsData = await getAllCardsForReportsApi(taskIds).catch(() => []);

      setMeetings(meetingsData);
      setTasks(cardsData);

      // Debug: Log tasks to check completion status
      console.log('=== REPORTS DEBUG ===');
      console.log('API endpoint used: /boards/cards/all-for-reports');
      console.log('All tasks loaded:', cardsData);
      console.log('Task IDs loaded:', cardsData.map((t: any) => ({ id: t.id, title: t.title, assignee: t.assignee })));
      console.log('Looking for task ID: 3bb2135e-e3a2-4c0c-99f7-bb9d0f856a5d');
      const tasksWithCompleted = cardsData.filter((t: any) => t.completed);
      console.log('Tasks marked as completed:', tasksWithCompleted);
      console.log('Tasks with checklist:', cardsData.filter((t: any) => t.checklist && t.checklist.length > 0).map((t: any) => ({
        id: t.id,
        title: t.title,
        checklist: t.checklist
      })));
      console.log('===================');
    } catch (err) {
      console.error('Failed to load data', err);
    }
    setLoading(false);
  };


  // Extract categorized data
  const allLessons = meetings.flatMap(meeting => {
    const lessons = (meeting.notes || []).flatMap(note =>
      note.points
        .filter(p => p.category?.toLowerCase().includes('lesson') || p.category?.toLowerCase().includes('learning'))
        .map(p => {
          const task = p.taskId ? tasks.find(t => t.id === p.taskId) : null;

          // A task is completed if:
          // 1. It's archived, OR
          // 2. All checklist items are marked as done
          let isCompleted = false;
          if (task) {
            if (task.archived) {
              isCompleted = true;
            } else if (task.checklist && task.checklist.length > 0) {
              isCompleted = task.checklist.every((item: any) => item.done === true);
            }
          }

          // Debug logging for lessons
          if (p.taskId) {
            console.log('Lesson with task:', {
              lessonText: p.text?.substring(0, 50),
              taskId: p.taskId,
              taskFound: !!task,
              taskArchived: task?.archived,
              checklistItems: task?.checklist?.length || 0,
              checklistAllDone: task?.checklist ? task.checklist.every((item: any) => item.done === true) : false,
              finalIsCompleted: isCompleted
            });
          }

          return {
            ...p,
            meetingTitle: meeting.center || meeting.personName || `${meeting.meetingType} Meeting`,
            meetingDate: meeting.date,
            meetingType: meeting.meetingType,
            isCompleted
          };
        })
    );
    return lessons;
  });

  const allDecisions = meetings.flatMap(meeting => {
    const decisions = (meeting.notes || []).flatMap(note =>
      note.points
        .filter(p => p.category?.toLowerCase().includes('decision') || p.category?.toLowerCase().includes('decide'))
        .map(p => {
          const task = p.taskId ? tasks.find(t => t.id === p.taskId) : null;

          // A task is completed if:
          // 1. It's archived, OR
          // 2. All checklist items are marked as done
          let isCompleted = false;
          if (task) {
            if (task.archived) {
              isCompleted = true;
            } else if (task.checklist && task.checklist.length > 0) {
              isCompleted = task.checklist.every((item: any) => item.done === true);
            }
          }

          return {
            ...p,
            meetingTitle: meeting.center || meeting.personName || `${meeting.meetingType} Meeting`,
            meetingDate: meeting.date,
            meetingType: meeting.meetingType,
            isCompleted
          };
        })
    );
    return decisions;
  });

  const allInformation = meetings.flatMap(meeting => {
    const information = (meeting.notes || []).flatMap(note =>
      note.points
        .filter(p => {
          const cat = p.category?.toLowerCase() || '';
          return !cat.includes('decision') && !cat.includes('decide') &&
            !cat.includes('lesson') && !cat.includes('learning') &&
            !cat.includes('task') && !cat.includes('action') && !cat.includes('todo');
        })
        .map(p => ({
          ...p,
          meetingTitle: meeting.center || meeting.personName || `${meeting.meetingType} Meeting`,
          meetingDate: meeting.date,
          meetingType: meeting.meetingType,
        }))
    );
    return information;
  });

  const exportToCSV = () => {
    let csvContent = '';

    if (activeTab === 'meetings') {
      csvContent = 'MEETING MINUTES REPORT\n\n';
      if (activeReport === 'lessons') {
        // Do not include a separate title line for lessons in the exported CSV
        csvContent += 'Lesson,Meeting,Date,Type,Assignee,Deadline,Status\n';
        allLessons.forEach(l => {
          csvContent += `"${l.text}","${l.meetingTitle}","${new Date(l.meetingDate).toLocaleDateString()}","${l.meetingType || ''}","${l.assignee || ''}","${l.deadline ? new Date(l.deadline).toLocaleDateString() : ''}","${l.isCompleted ? 'Done' : 'Pending'}"\n`;
        });
      } else if (activeReport === 'decisions') {
        csvContent += 'DECISIONS\n';
        csvContent += 'Decision,Meeting,Date,Type,Assignee,Deadline,Status\n';
        allDecisions.forEach(d => {
          csvContent += `"${d.text}","${d.meetingTitle}","${new Date(d.meetingDate).toLocaleDateString()}","${d.meetingType || ''}","${d.assignee || ''}","${d.deadline ? new Date(d.deadline).toLocaleDateString() : ''}","${d.isCompleted ? 'Done' : 'Pending'}"\n`;
        });
      } else {
        csvContent += 'INFORMATION\n';
        csvContent += 'Information,Category,Meeting,Date,Type,Assignee\n';
        allInformation.forEach(i => {
          csvContent += `"${i.text}","${i.category || ''}","${i.meetingTitle}","${new Date(i.meetingDate).toLocaleDateString()}","${i.meetingType || ''}","${i.assignee || ''}"\n`;
        });
      }
    } else {
      csvContent = 'TASKS REPORT\n\n';
      csvContent += 'Title,List,Due Date,Priority,Status,Labels\n';
      tasks.forEach(t => {
        csvContent += `"${t.title}","${t.list?.title || ''}","${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}","${t.priority || ''}","${t.archived ? 'Completed' : 'Active'}","${t.labels?.join(', ') || ''}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center transition-colors bg-slate-50 dark:bg-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-800 border-t-slate-800 dark:border-t-slate-400"></div>
          <div className="absolute inset-0 rounded-full bg-slate-500/10 blur-xl animate-pulse"></div>
        </div>
        <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium animate-pulse text-lg">Loading Reports...</p>
      </div>
    );
  }

  const currentData = activeTab === 'meetings'
    ? (activeReport === 'lessons' ? allLessons : activeReport === 'decisions' ? allDecisions : allInformation)
    : tasks;

  // Apply column filters and search
  const filteredData = currentData.filter((item: any) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        item.text?.toLowerCase().includes(searchLower) ||
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.meetingTitle?.toLowerCase().includes(searchLower) ||
        item.assignee?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.list?.title?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.status) {
      const isCompleted = item.isCompleted || item.archived;
      const statusMatch = filters.status === 'completed' ? isCompleted : !isCompleted;
      if (!statusMatch) return false;
    }
    if (filters.meeting && !item.meetingTitle?.toLowerCase().includes(filters.meeting.toLowerCase())) {
      return false;
    }
    if (filters.assignee && !item.assignee?.toLowerCase().includes(filters.assignee.toLowerCase())) {
      return false;
    }
    if (filters.category && !item.category?.toLowerCase().includes(filters.category.toLowerCase())) {
      return false;
    }
    if (filters.priority && item.priority !== filters.priority) {
      return false;
    }
    if (filters.list && !item.list?.title?.toLowerCase().includes(filters.list.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Using custom table rendering below for both Meetings and Tasks

  // Apply sorting
  const sortedData = sortConfig
    ? [...filteredData].sort((a: any, b: any) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];

      // Handle nested properties
      if (sortConfig.column === 'meeting') {
        aValue = a.meetingTitle;
        bValue = b.meetingTitle;
      } else if (sortConfig.column === 'list') {
        aValue = a.list?.title || '';
        bValue = b.list?.title || '';
      }

      // Handle null/undefined
      if (!aValue) return 1;
      if (!bValue) return -1;

      // String comparison
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Number/Date comparison
      return sortConfig.direction === 'asc'
        ? aValue > bValue ? 1 : -1
        : bValue > aValue ? 1 : -1;
    })
    : filteredData;

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Recharts data calculation
  const lessonsCompleted = allLessons.filter(l => l.isCompleted).length;
  const lessonsPending = allLessons.length - lessonsCompleted;
  const lessonsData = [
    { name: 'Completed', value: lessonsCompleted, color: '#0f172a' },
    { name: 'Pending', value: lessonsPending, color: '#64748b' }
  ].filter(d => d.value > 0);

  const decisionsCompleted = allDecisions.filter(d => d.isCompleted).length;
  const decisionsPending = allDecisions.length - decisionsCompleted;
  const decisionsData = [
    { name: 'Completed', value: decisionsCompleted, color: '#0f172a' },
    { name: 'Pending', value: decisionsPending, color: '#64748b' }
  ].filter(d => d.value > 0);

  const infoCounts: Record<string, number> = {};
  allInformation.forEach(i => {
    const cat = i.category || 'General';
    infoCounts[cat] = (infoCounts[cat] || 0) + 1;
  });
  const definedColors = ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'];
  const infoData = Object.keys(infoCounts).map((key, index) => ({
    name: key,
    value: infoCounts[key],
    color: definedColors[index % definedColors.length]
  })).sort((a, b) => b.value - a.value);



  return (
    <div className={isEmbedded ? "animate-fadeUp" : "min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 -m-6 p-6"}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Match WorkLog Style */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 border-b-4 border-slate-700 dark:border-slate-600 animate-slideDown relative z-20">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Meeting Analytics</h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 font-medium">Track completion of your assigned action items</p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={exportToCSV}
              className="px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">Export CSV</span>
              </div>
            </button>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slideDown z-20" style={{ animationDelay: '100ms' }}>
          {/* Lessons Progress */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white w-full text-left mb-2">Lessons Tracked</h2>
            <div className="flex-1 w-full relative min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lessonsData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {lessonsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{allLessons.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total</span>
              </div>
            </div>
          </div>

          {/* Decisions Progress */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white w-full text-left mb-2">Decisions Reached</h2>
            <div className="flex-1 w-full relative min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={decisionsData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {decisionsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{allDecisions.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total</span>
              </div>
            </div>
          </div>

          {/* Info Breakdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white w-full text-left mb-2">Information Categories</h2>
            <div className="flex-1 w-full relative min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={infoData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {infoData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{allInformation.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table - Always Visible */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          {/* Table Header with Dropdown */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              {/* Left: Report Title */}
              <h2 className="text-lg font-black text-white">
                {activeReport === 'lessons' ? 'Lessons Ledger' : activeReport === 'decisions' ? 'Decisions Ledger' : 'Information Ledger'}
              </h2>

              {/* Right: Dropdown for Meeting Reports */}
              {activeTab === 'meetings' ? (
                <div className="relative z-[60]" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl transition-all shadow-lg text-slate-900 dark:text-white"
                  >
                    <div className="flex items-center gap-2">
                      {activeReport === 'lessons' && (
                        <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      {activeReport === 'decisions' && (
                        <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {activeReport === 'information' && (
                        <svg className="w-5 h-5 text-slate-900 dark:text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">
                        {activeReport === 'lessons' ? 'Lessons Learned' : activeReport === 'decisions' ? 'Decisions Made' : 'Information Items'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 dark:bg-slate-950 text-white rounded-full text-xs font-black">
                        {activeReport === 'lessons' ? allLessons.length : activeReport === 'decisions' ? allDecisions.length : allInformation.length}
                      </span>
                    </div>
                    <svg className={`w-4 h-4 text-slate-900 dark:text-slate-100 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[110] transition-colors">
                      <button
                        onClick={() => { setActiveReport('lessons'); setDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${activeReport === 'lessons' ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'lessons' ? 'bg-slate-900 dark:bg-slate-950' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <svg className={`w-4 h-4 ${activeReport === 'lessons' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Lessons Learned</span>
                        </div>
                        <span className="px-2 py-1 bg-slate-900 dark:bg-slate-950 text-white rounded-full text-xs font-bold">{allLessons.length}</span>
                      </button>

                      <button
                        onClick={() => { setActiveReport('decisions'); setDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${activeReport === 'decisions' ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'decisions' ? 'bg-slate-900 dark:bg-slate-950' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <svg className={`w-4 h-4 ${activeReport === 'decisions' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Decisions Made</span>
                        </div>
                        <span className="px-2 py-1 bg-slate-900 dark:bg-slate-950 text-white rounded-full text-xs font-bold">{allDecisions.length}</span>
                      </button>

                      <button
                        onClick={() => { setActiveReport('information'); setDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${activeReport === 'information' ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'information' ? 'bg-slate-900 dark:bg-slate-950' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <svg className={`w-4 h-4 ${activeReport === 'information' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Information Items</span>
                        </div>
                        <span className="px-2 py-1 bg-slate-900 dark:bg-slate-950 text-white rounded-full text-xs font-bold">{allInformation.length}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white opacity-70">View all tasks</div>
              )}
            </div>
          </div>

          {/* Modern Professional Table */}
          <div className="rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {/* Table Container - Removed overflow-x-auto to prevent vertical clipping of dropdowns */}
            <div className="bg-white dark:bg-slate-800 min-h-[600px] rounded-2xl relative pb-32">
              {currentData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 transition-colors">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Data Found</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">No {activeTab === 'meetings' ? activeReport : 'tasks'} found for the selected period</p>
                </div>
              ) : (
                <table className="w-full border-collapse !overflow-visible bg-white dark:bg-slate-800">
                  {/* Table Header with Sticky Positioning and High Stack Context */}
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-14 md:top-16 z-30 !overflow-visible">
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 !overflow-visible">
                      {activeTab === 'meetings' && (activeReport === 'lessons' || activeReport === 'decisions') && (
                        <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                          <div className="flex items-center justify-between group relative">
                            <button
                              onClick={() => setSortConfig({
                                column: 'isCompleted',
                                direction: sortConfig?.column === 'isCompleted' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                              Status
                              <svg className={`w-4 h-4 transition-all ${sortConfig?.column === 'isCompleted' ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === 'isCompleted' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => toggleColumnMenu('status')}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>
                              {columnMenuOpen === 'status' && (
                                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px] -ml-1">
                                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Filter Status</span>
                                    <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                  <button onClick={() => { setFilters({ ...filters, status: '' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${filters.status === '' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>All</button>
                                  <button onClick={() => { setFilters({ ...filters, status: 'completed' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${filters.status === 'completed' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Completed</button>
                                  <button onClick={() => { setFilters({ ...filters, status: 'pending' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${filters.status === 'pending' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Pending</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                      )}

                      <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                        <div className="flex items-center justify-between group relative">
                          <button
                            onClick={() => setSortConfig({
                              column: activeTab === 'meetings' ? 'text' : 'title',
                              direction: sortConfig?.column === (activeTab === 'meetings' ? 'text' : 'title') && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                            })}
                            className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          >
                            {activeTab === 'meetings'
                              ? (activeReport === 'lessons' ? 'Lesson' : activeReport === 'decisions' ? 'Decision' : 'Information')
                              : 'Task'
                            }
                            <svg className={`w-4 h-4 transition-all ${sortConfig?.column === (activeTab === 'meetings' ? 'text' : 'title') ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === (activeTab === 'meetings' ? 'text' : 'title') && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => toggleColumnMenu('content')}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>
                            {columnMenuOpen === 'content' && (
                              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px]">
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Options</span>
                                  <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                                <button onClick={() => { setSortConfig({ column: activeTab === 'meetings' ? 'text' : 'title', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-600 dark:text-slate-400">Sort by ASC</button>
                                <button onClick={() => { setSortConfig({ column: activeTab === 'meetings' ? 'text' : 'title', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-600 dark:text-slate-400">Sort by DESC</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>

                      {activeTab === 'meetings' && activeReport === 'information' && (
                        <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                          <div className="flex items-center justify-between group relative">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Category</span>
                            <div className="relative">
                              <button
                                onClick={() => toggleColumnMenu('category')}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>
                              {columnMenuOpen === 'category' && (
                                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px]">
                                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Filter Category</span>
                                    <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search category..."
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                    className="mx-2 my-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 w-[calc(100%-16px)] text-slate-900 dark:text-white"
                                  />
                                  <button onClick={() => { setFilters({ ...filters, category: '' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">Clear Filter</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                      )}

                      {activeTab === 'tasks' && (
                        <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                          <div className="flex items-center justify-between group relative">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">List</span>
                            <div className="relative">
                              <button
                                onClick={() => toggleColumnMenu('list')}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>
                              {columnMenuOpen === 'list' && (
                                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px] transition-colors">
                                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Filter List</span>
                                    <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Filter list..."
                                    value={filters.list}
                                    onChange={(e) => setFilters({ ...filters, list: e.target.value })}
                                    className="mx-2 my-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 w-[calc(100%-16px)] text-slate-900 dark:text-white transition-colors"
                                  />
                                  <button onClick={() => { setFilters({ ...filters, list: '' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Clear Filter</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                      )}

                      <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                        <div className="flex items-center justify-between group relative">
                          <button
                            onClick={() => setSortConfig({
                              column: activeTab === 'meetings' ? 'meetingDate' : 'dueDate',
                              direction: sortConfig?.column === (activeTab === 'meetings' ? 'meetingDate' : 'dueDate') && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                            })}
                            className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
                          >
                            {activeTab === 'meetings' ? 'Meeting' : 'Due Date'}
                            <svg className={`w-4 h-4 transition-all ${sortConfig?.column === (activeTab === 'meetings' ? 'meetingDate' : 'dueDate') ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === (activeTab === 'meetings' ? 'meetingDate' : 'dueDate') && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => toggleColumnMenu(activeTab === 'meetings' ? 'meeting' : 'dueDate')}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>
                            {(columnMenuOpen === 'meeting' || columnMenuOpen === 'dueDate') && (
                              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px]">
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Options</span>
                                  <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                                <button onClick={() => { setSortConfig({ column: activeTab === 'meetings' ? 'meetingDate' : 'dueDate', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-600 dark:text-slate-400">Sort by ASC</button>
                                <button onClick={() => { setSortConfig({ column: activeTab === 'meetings' ? 'meetingDate' : 'dueDate', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-600 dark:text-slate-400">Sort by DESC</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>

                      {activeTab === 'meetings' && (activeReport === 'lessons' || activeReport === 'decisions') && (
                        <>
                          <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                            <div className="flex items-center justify-between group relative">
                              <button
                                onClick={() => setSortConfig({
                                  column: 'assignee',
                                  direction: sortConfig?.column === 'assignee' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                })}
                                className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
                              >
                                Assignee
                                <svg className={`w-4 h-4 transition-all ${sortConfig?.column === 'assignee' ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === 'assignee' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() => toggleColumnMenu('assignee')}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                </button>
                                {columnMenuOpen === 'assignee' && (
                                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px]">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Filter Assignee</span>
                                      <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      autoFocus
                                      placeholder="Search assignee..."
                                      value={filters.assignee}
                                      onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                                      className="mx-2 my-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 w-[calc(100%-16px)] text-slate-900 dark:text-white"
                                    />
                                    <button onClick={() => { setFilters({ ...filters, assignee: '' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">Clear Filter</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>

                          <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                            <div className="flex items-center justify-between group relative">
                              <button
                                onClick={() => setSortConfig({
                                  column: 'deadline',
                                  direction: sortConfig?.column === 'deadline' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                })}
                                className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
                              >
                                Deadline
                                <svg className={`w-4 h-4 transition-all ${sortConfig?.column === 'deadline' ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === 'deadline' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() => toggleColumnMenu('deadline')}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                </button>
                                {columnMenuOpen === 'deadline' && (
                                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px]">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Options</span>
                                      <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                    <button onClick={() => { setSortConfig({ column: 'deadline', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-600 dark:text-slate-400">Sort by ASC</button>
                                    <button onClick={() => { setSortConfig({ column: 'deadline', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-600 dark:text-slate-400">Sort by DESC</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                        </>
                      )}

                      {activeTab === 'tasks' && (
                        <>
                          <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                            <div className="flex items-center justify-between group relative">
                              <button
                                onClick={() => setSortConfig({
                                  column: 'priority',
                                  direction: sortConfig?.column === 'priority' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                })}
                                className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
                              >
                                Priority
                                <svg className={`w-4 h-4 transition-all ${sortConfig?.column === 'priority' ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === 'priority' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() => toggleColumnMenu('priority')}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                </button>
                                {columnMenuOpen === 'priority' && (
                                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px]">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Filter Priority</span>
                                      <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                    <button onClick={() => { setFilters({ ...filters, priority: '' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filters.priority === '' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>All</button>
                                    <button onClick={() => { setFilters({ ...filters, priority: 'High' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filters.priority === 'High' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>High</button>
                                    <button onClick={() => { setFilters({ ...filters, priority: 'Medium' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filters.priority === 'Medium' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Medium</button>
                                    <button onClick={() => { setFilters({ ...filters, priority: 'Low' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filters.priority === 'Low' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Low</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                            <div className="flex items-center justify-between group relative">
                              <button
                                onClick={() => setSortConfig({
                                  column: 'status',
                                  direction: sortConfig?.column === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                })}
                                className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
                              >
                                Status
                                <svg className={`w-4 h-4 transition-all ${sortConfig?.column === 'status' ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === 'status' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() => toggleColumnMenu('taskStatus')}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                </button>
                                {columnMenuOpen === 'taskStatus' && (
                                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px]">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Filter Status</span>
                                      <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                    <button onClick={() => { setFilters({ ...filters, status: '' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filters.status === '' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>All</button>
                                    <button onClick={() => { setFilters({ ...filters, status: 'completed' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filters.status === 'completed' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Completed</button>
                                    <button onClick={() => { setFilters({ ...filters, status: 'pending' }); setColumnMenuOpen(null); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${filters.status === 'pending' ? 'text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>Active</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                        </>
                      )}


                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 !overflow-visible">
                    {activeTab === 'meetings' ? (
                      paginatedData.map((item: any, idx: number) => (
                        <tr
                          key={`${item.id}-${idx}`}
                          className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-white dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-200 group border-b border-slate-100 dark:border-slate-700"
                        >
                          {(activeReport === 'lessons' || activeReport === 'decisions') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.isCompleted ? (
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-lg text-xs font-semibold">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium">
                                  <div className="w-3 h-3 rounded-full border-2 border-slate-400 dark:border-slate-500"></div>
                                  Pending
                                </span>
                              )}
                            </td>
                          )}

                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">{item.text}</p>
                            </div>
                          </td>

                          {activeReport === 'information' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.category && (
                                <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-semibold">
                                  {item.category}
                                </span>
                              )}
                            </td>
                          )}

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {item.meetingTitle && item.meetingType
                                  ? `${getLocationAbbreviation(item.meetingTitle)} ${item.meetingType}`
                                  : item.meetingTitle || 'Meeting'}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(item.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </td>

                          {(activeReport === 'lessons' || activeReport === 'decisions') && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {item.assignee ? (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-700 dark:to-slate-950 flex items-center justify-center shadow-sm">
                                      <span className="text-white text-xs font-bold">
                                        {item.assignee.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.assignee}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                {item.deadline ? (
                                  <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
                                )}
                              </td>
                            </>
                          )}


                        </tr>
                      ))
                    ) : (
                      paginatedData.map((task: any) => {
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.archived;
                        const isCompleted = task.archived || task.completed || task.status === 'done';

                        return (
                          <tr
                            key={task.id}
                            className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-white dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-200 group border-b border-slate-100 dark:border-slate-700"
                          >
                            <td className="px-6 py-4">
                              <div className="max-w-md">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              {task.list?.title ? (
                                <span className="text-sm text-slate-700 dark:text-slate-300">{task.list.title}</span>
                              ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              {task.dueDate ? (
                                <span className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              {task.priority ? (
                                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${task.priority.toLowerCase() === 'high' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' :
                                  task.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' :
                                    'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}>
                                  {task.priority}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${isCompleted
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                {isCompleted ? 'Completed' : 'Active'}
                              </span>
                            </td>


                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Legacy Table (Hidden) */}
          <div className="hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  {activeTab === 'meetings' && (activeReport === 'lessons' || activeReport === 'decisions') && (
                    <th className="text-left px-6 py-3">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Status</span>
                        <button
                          onClick={() => toggleColumnMenu('status')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        {columnMenuOpen === 'status' && (
                          <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                            <button
                              onClick={() => { setSortConfig({ column: 'isCompleted', direction: 'asc' }); setColumnMenuOpen(null); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              Sort by ASC
                            </button>
                            <button
                              onClick={() => { setSortConfig({ column: 'isCompleted', direction: 'desc' }); setColumnMenuOpen(null); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Sort by DESC
                            </button>
                            <div className="border-t border-slate-200 my-1"></div>
                            <button
                              onClick={() => setColumnMenuOpen(null)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                              Filter
                            </button>
                            <button
                              onClick={() => { setHiddenColumns([...hiddenColumns, 'status']); setColumnMenuOpen(null); }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                              Hide column
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                  <th className="text-left px-6 py-3">
                    <div className="flex items-center justify-between group relative">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        {activeTab === 'meetings'
                          ? (activeReport === 'lessons' ? 'Lesson' : activeReport === 'decisions' ? 'Decision' : 'Information')
                          : 'Task'}
                      </span>
                      <button
                        onClick={() => toggleColumnMenu('content')}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      {columnMenuOpen === 'content' && (
                        <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                          <button
                            onClick={() => { setSortConfig({ column: 'title', direction: 'asc' }); setColumnMenuOpen(null); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Sort by ASC
                          </button>
                          <button
                            onClick={() => { setSortConfig({ column: 'title', direction: 'desc' }); setColumnMenuOpen(null); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Sort by DESC
                          </button>
                          <div className="border-t border-slate-200 my-1"></div>
                          <button
                            onClick={() => setColumnMenuOpen(null)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Filter
                          </button>
                          <button
                            onClick={() => { setHiddenColumns([...hiddenColumns, 'content']); setColumnMenuOpen(null); }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                            Hide column
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                  {activeTab === 'meetings' && activeReport === 'information' && (
                    <th className="text-left px-6 py-3">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Category</span>
                        <button
                          onClick={() => toggleColumnMenu('category')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        {columnMenuOpen === 'category' && (
                          <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                            <button onClick={() => { setSortConfig({ column: 'category', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Sort by ASC</button>
                            <button onClick={() => { setSortConfig({ column: 'category', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Sort by DESC</button>
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                  {activeTab === 'tasks' && (
                    <th className="text-left px-6 py-3">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">List</span>
                        <button
                          onClick={() => toggleColumnMenu('list')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        {columnMenuOpen === 'list' && (
                          <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                            <button onClick={() => { setSortConfig({ column: 'list', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Sort by ASC</button>
                            <button onClick={() => { setSortConfig({ column: 'list', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Sort by DESC</button>
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                  <th className="text-left px-6 py-3">
                    <div className="flex items-center justify-between group relative">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        {activeTab === 'meetings' ? 'Meeting' : 'Due Date'}
                      </span>
                      <button
                        onClick={() => toggleColumnMenu('meeting')}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      {columnMenuOpen === 'meeting' && (
                        <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                          <button onClick={() => { setSortConfig({ column: 'meeting', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Sort by ASC</button>
                          <button onClick={() => { setSortConfig({ column: 'meeting', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Sort by DESC</button>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="text-left px-6 py-3">
                    <div className="flex items-center justify-between group relative">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        {activeTab === 'meetings' ? 'Date' : 'Priority'}
                      </span>
                      <button
                        onClick={() => toggleColumnMenu('date')}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      {columnMenuOpen === 'date' && (
                        <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                          <button onClick={() => { setSortConfig({ column: 'meetingDate', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Sort by ASC</button>
                          <button onClick={() => { setSortConfig({ column: 'meetingDate', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Sort by DESC</button>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="text-left px-6 py-3">
                    <div className="flex items-center justify-between group relative">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        {activeTab === 'meetings' ? 'Assignee' : 'Status'}
                      </span>
                      <button
                        onClick={() => toggleColumnMenu('assignee')}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      {columnMenuOpen === 'assignee' && (
                        <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                          <button onClick={() => { setSortConfig({ column: 'assignee', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Sort by ASC</button>
                          <button onClick={() => { setSortConfig({ column: 'assignee', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Sort by DESC</button>
                        </div>
                      )}
                    </div>
                  </th>
                  {activeTab === 'meetings' && (activeReport === 'lessons' || activeReport === 'decisions') && (
                    <th className="text-left px-6 py-3">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Deadline</span>
                        <button
                          onClick={() => toggleColumnMenu('deadline')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                        >
                          <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        {columnMenuOpen === 'deadline' && (
                          <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px] transition-colors">
                            <button onClick={() => { setSortConfig({ column: 'dueDate', direction: 'asc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Sort by ASC</button>
                            <button onClick={() => { setSortConfig({ column: 'dueDate', direction: 'desc' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Sort by DESC</button>
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'meetings' ? (activeReport === 'information' ? 5 : 6) : 5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No Data Found</h3>
                        <p className="text-sm text-slate-600">No {activeTab === 'meetings' ? activeReport : 'tasks'} found for the selected period</p>
                      </div>
                    </td>
                  </tr>
                ) : activeTab === 'meetings' ? (
                  paginatedData.map((item: any, idx: number) => (
                    <tr key={`${item.id}-${idx}`} className="group transition-colors duration-200 border-b hover:bg-slate-50">
                      {(activeReport === 'lessons' || activeReport === 'decisions') && (
                        <td className="px-6 py-4 align-top w-44">
                          {item.isCompleted ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-xs font-semibold">Completed</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full">
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400"></div>
                              <span className="text-xs font-medium">Pending</span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 align-top">
                        <h3 className="text-sm text-slate-900 font-semibold leading-tight mb-1">{item.text}</h3>
                        {item._raw?.notes && (
                          <p className="text-xs text-slate-500 line-clamp-1">{item._raw.notes}</p>
                        )}
                      </td>
                      {activeReport === 'information' && (
                        <td className="px-6 py-4 align-top">
                          {item.category && (
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold">
                              {item.category}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.meetingTitle && item.meetingType
                            ? `${getLocationAbbreviation(item.meetingTitle)} ${item.meetingType}`
                            : item.meetingTitle || 'Meeting'}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className="text-sm text-slate-600 font-medium">
                          {new Date(item.meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {item.assignee ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-sm">
                              <span className="text-white text-sm font-semibold">{item.assignee.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-sm text-slate-900 font-medium">{item.assignee}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      {(activeReport === 'lessons' || activeReport === 'decisions') && (
                        <td className="px-6 py-4 align-top">
                          {item.deadline ? (
                            <span className="text-sm text-slate-600 font-medium">
                              {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  paginatedData.map((task: any) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.archived;
                    return (
                      <tr key={task.id} className="group transition-colors duration-200 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-sm">{(task.title || '').charAt(0).toUpperCase()}</div>
                            <div>
                              <h3 className="text-sm text-slate-900 font-semibold leading-tight">{task.title}</h3>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className="text-sm text-slate-700 font-medium">{task.list?.title || '—'}</span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          {task.dueDate ? (
                            <span className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          {task.priority ? (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${task.priority.toLowerCase() === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                              {task.priority}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${task.archived || task.completed ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {task.archived || task.completed || task.status === 'done' ? 'Completed' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {currentData.length > 0 && totalPages > 1 && (
            <div className="mt-6 bg-white dark:bg-slate-800 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-900 dark:text-slate-100">{startIndex + 1}</span> to{' '}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(endIndex, currentData.length)}</span> of{' '}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{currentData.length}</span> results
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${currentPage === 1
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === page
                            ? 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white shadow-lg transform scale-110'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${currentPage === totalPages
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;

