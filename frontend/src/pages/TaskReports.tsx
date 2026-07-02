import { useState, useEffect } from 'react';
import { getAllCardsForReportsApi } from '../services/api';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { getLocalDateString, parseLocalDate } from '../utils/date';

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

const TaskReports = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Card[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search state
  const [searchTerm] = useState('');

  // Column filters for data grid
  const [filters, setFilters] = useState<Record<string, string>>({
    status: '',
    priority: '',
    list: ''
  });

  // Column menu and sorting
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null);
  const toggleColumnMenu = (name: string) => {
    setColumnMenuOpen(prev => prev === name ? null : name);
  };
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all cards for task reports
      const cardsData = await getAllCardsForReportsApi().catch(() => []);
      setTasks(cardsData);
    } catch (err) {
      console.error('Failed to load tasks data', err);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    let csvContent = 'TASKS REPORT\n\n';
    csvContent += 'Title,List,Due Date,Priority,Status,Labels\n';
    tasks.forEach(t => {
      csvContent += `"${t.title}","${t.list?.title || ''}","${t.dueDate ? parseLocalDate(t.dueDate).toLocaleDateString() : ''}","${t.priority || ''}","${t.archived ? 'Completed' : 'Active'}","${t.labels?.join(', ') || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_report_${getLocalDateString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center transition-colors bg-slate-50 dark:bg-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-800 border-t-slate-800 dark:border-t-slate-400"></div>
          <div className="absolute inset-0 rounded-full bg-slate-500/10 blur-xl animate-pulse"></div>
        </div>
        <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium animate-pulse text-lg">Loading Task Reports...</p>
      </div>
    );
  }

  // Apply column filters and search
  const filteredData = tasks.filter((item: any) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.list?.title?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.status) {
      const isCompleted = item.archived;
      const statusMatch = filters.status === 'completed' ? isCompleted : !isCompleted;
      if (!statusMatch) return false;
    }
    if (filters.priority && item.priority !== filters.priority) {
      return false;
    }
    if (filters.list && !item.list?.title?.toLowerCase().includes(filters.list.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Apply sorting
  const sortedData = sortConfig
    ? [...filteredData].sort((a: any, b: any) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];

      if (sortConfig.column === 'list') {
        aValue = a.list?.title || '';
        bValue = b.list?.title || '';
      }

      if (!aValue) return 1;
      if (!bValue) return -1;

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? aValue > bValue ? 1 : -1
        : bValue > aValue ? 1 : -1;
    })
    : filteredData;

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Recharts data calculation
  const completedTasks = tasks.filter(t => t.archived).length;
  const activeTasks = tasks.length - completedTasks;
  const statusData = [
    { name: 'Completed', value: completedTasks, color: '#0f172a' },
    { name: 'Active', value: activeTasks, color: '#64748b' }
  ].filter(d => d.value > 0);

  const priorityCounts: Record<string, number> = {};
  tasks.forEach(t => {
    const p = t.priority || 'Normal';
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;
  });
  const priorityColors: Record<string, string> = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#3b82f6', 'Normal': '#94a3b8' };
  const priorityData = Object.keys(priorityCounts).map(key => ({
    name: key,
    value: priorityCounts[key],
    color: priorityColors[key] || '#94a3b8'
  })).sort((a, b) => b.value - a.value);

  const overdueTasks = tasks.filter(t => !t.archived && t.dueDate && t.dueDate < getLocalDateString()).length;
  const onTrackTasks = activeTasks - overdueTasks;
  const deadlineData = [
    { name: 'Overdue', value: overdueTasks, color: '#ef4444' },
    { name: 'On Track', value: onTrackTasks, color: '#10b981' }
  ].filter(d => d.value > 0);

  return (
    <div className={isEmbedded ? "animate-fadeUp relative z-20" : "min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 -m-6 p-6"}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 border-b-4 border-slate-700 dark:border-slate-600 animate-slideDown relative z-20">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Task Analytics</h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 font-medium">Track completion and priority of your tasks</p>
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
          {/* Status Breakdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white w-full text-left mb-2">Completion Status</h2>
            <div className="flex-1 w-full relative min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{tasks.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total</span>
              </div>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white w-full text-left mb-2">Task Priority</h2>
            <div className="flex-1 w-full relative min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{tasks.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Total</span>
              </div>
            </div>
          </div>

          {/* Deadlines Breakdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 flex flex-col items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white w-full text-left mb-2">Active Tasks Outlook</h2>
            <div className="flex-1 w-full relative min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deadlineData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {deadlineData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{activeTasks}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Tasks Report</h2>
            </div>
          </div>

          <div className="rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="bg-white dark:bg-slate-800 min-h-[600px] rounded-2xl relative pb-32">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500 transition-colors">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Data Found</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">No tasks found for the selected period</p>
                </div>
              ) : (
                <table className="w-full border-collapse !overflow-visible bg-white dark:bg-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-14 md:top-16 z-30 !overflow-visible">
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 !overflow-visible">
                      <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                        <div className="flex items-center justify-between group relative">
                          <button
                            onClick={() => setSortConfig({ column: 'title', direction: sortConfig?.column === 'title' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                            className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                          >
                            Task Name
                            <svg className={`w-4 h-4 transition-all ${sortConfig?.column === 'title' ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === 'title' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          </button>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                        <div className="flex items-center justify-between group relative">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">List</span>
                          <div className="relative">
                            <button onClick={() => toggleColumnMenu('list')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                            </button>
                            {columnMenuOpen === 'list' && (
                              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[100] min-w-[260px] transition-colors">
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Filter List</span>
                                  <button onClick={() => setColumnMenuOpen(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                                <input type="text" autoFocus placeholder="Filter list..." value={filters.list} onChange={(e) => setFilters({ ...filters, list: e.target.value })} className="mx-2 my-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 w-[calc(100%-16px)] text-slate-900 dark:text-white transition-colors" />
                                <button onClick={() => { setFilters({ ...filters, list: '' }); setColumnMenuOpen(null); }} className="w-full px-4 py-2 text-left text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Clear Filter</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left bg-transparent !overflow-visible relative">
                        <div className="flex items-center justify-between group relative">
                          <button onClick={() => setSortConfig({ column: 'dueDate', direction: sortConfig?.column === 'dueDate' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            Due Date
                            <svg className={`w-4 h-4 transition-all ${sortConfig?.column === 'dueDate' ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600'} ${sortConfig?.column === 'dueDate' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {paginatedData.map((task: any, idx) => (
                      <tr key={task.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{task.title}</span>
                            {task.labels && task.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {task.labels.map((l: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold">{l}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-bold">{task.list?.title || 'Unknown List'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold ${task.archived ? 'text-slate-400' : task.dueDate && task.dueDate < getLocalDateString() ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                            {task.dueDate ? parseLocalDate(task.dueDate).toLocaleDateString() : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Showing <span className="font-bold text-slate-900 dark:text-white">{startIndex + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(endIndex, sortedData.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{sortedData.length}</span> entries
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-transparent transition-colors">Previous</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-transparent transition-colors">Next</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReports;
