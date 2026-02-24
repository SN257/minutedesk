import { useState } from 'react';
import MeetingReports from './MeetingReports';
import TaskReports from './TaskReports';
import WorkLogReports from './WorkLogReports';

export default function Insights() {
  const [activeTab, setActiveTab] = useState<'meetings' | 'tasks' | 'worklogs'>('meetings');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 -m-6 p-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full mb-6">
        <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-xl z-30 relative border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('meetings')}
            className={`relative flex-1 px-4 md:px-8 py-3 md:py-4 rounded-xl text-sm md:text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'meetings'
              ? 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white shadow-lg shadow-slate-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Meeting Analytics
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`relative flex-1 px-4 md:px-8 py-3 md:py-4 rounded-xl text-sm md:text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'tasks'
              ? 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white shadow-lg shadow-slate-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Task Analytics
          </button>
          <button
            onClick={() => setActiveTab('worklogs')}
            className={`relative flex-1 px-4 md:px-8 py-3 md:py-4 rounded-xl text-sm md:text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'worklogs'
              ? 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 text-white shadow-lg shadow-slate-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            WorkLog Analytics
          </button>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto relative z-20">
        {activeTab === 'meetings' && <MeetingReports isEmbedded={true} />}
        {activeTab === 'tasks' && <TaskReports isEmbedded={true} />}
        {activeTab === 'worklogs' && <div className="max-w-7xl mx-auto"><WorkLogReports isEmbedded={true} /></div>}
      </div>
    </div>
  );
}
