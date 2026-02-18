import { useState, useEffect, useRef } from 'react';
import { getWorkLogApi, saveWorkLogApi } from '../services/api';

const WorkLogs = () => {
    const localISODate = (d: Date) => {
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [date, setDate] = useState(localISODate(new Date()));
    const [todayWork, setTodayWork] = useState('');
    const [tomorrowWork, setTomorrowWork] = useState('');
    const [todayOnLeave, setTodayOnLeave] = useState(false);
    const [todayHoliday, setTodayHoliday] = useState(false);
    const [tomorrowOnLeave, setTomorrowOnLeave] = useState(false);
    const [tomorrowHoliday, setTomorrowHoliday] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [wordCount, setWordCount] = useState({ today: 0, tomorrow: 0 });
    const [todayItems, setTodayItems] = useState<string[]>([]);
    const [tomorrowItems, setTomorrowItems] = useState<string[]>([]);

    useEffect(() => {
        loadLog(date);
    }, [date]);

    useEffect(() => {
        setWordCount({
            today: todayWork.trim().split(/\s+/).filter(Boolean).length,
            tomorrow: tomorrowWork.trim().split(/\s+/).filter(Boolean).length
        });
    }, [todayWork, tomorrowWork]);

    const loadLog = async (dateStr: string) => {
        setLoading(true);
        setMessage(null);
        try {
            const log = await getWorkLogApi(dateStr);
            if (log) {
                const t = log.todayWork || '';
                const tm = log.tomorrowWork || '';
                setTodayWork(t);
                setTomorrowWork(tm);
                setTodayOnLeave(log.todayOnLeave || false);
                setTodayHoliday(log.todayHoliday || false);
                setTomorrowOnLeave(log.tomorrowOnLeave || false);
                setTomorrowHoliday(log.tomorrowHoliday || false);
                setTodayItems(t ? t.split('\n').filter(Boolean) : ['']);
                setTomorrowItems(tm ? tm.split('\n').filter(Boolean) : ['']);
            } else {
                setTodayWork('');
                setTomorrowWork('');
                setTodayOnLeave(false);
                setTodayHoliday(false);
                setTomorrowOnLeave(false);
                setTomorrowHoliday(false);
                setTodayItems(['']);
                setTomorrowItems(['']);
            }
        } catch (error) {
            console.error(error);
            setTodayWork('');
            setTomorrowWork('');
            setTodayOnLeave(false);
            setTodayHoliday(false);
            setTomorrowOnLeave(false);
            setTomorrowHoliday(false);
            setTodayItems(['']);
            setTomorrowItems(['']);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                date,
                todayWork: todayItems.filter(Boolean).join('\n'),
                tomorrowWork: tomorrowItems.filter(Boolean).join('\n'),
                todayOnLeave,
                todayHoliday,
                tomorrowOnLeave,
                tomorrowHoliday,
            };
            await saveWorkLogApi(payload);
            setMessage({ type: 'success', text: 'Work log saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to save work log.' });
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    // keep the plain text versions in sync for legacy uses and word count
    useEffect(() => {
        setTodayWork(todayItems.join('\n'));
    }, [todayItems]);

    useEffect(() => {
        setTomorrowWork(tomorrowItems.join('\n'));
    }, [tomorrowItems]);




    // Custom calendar popover (shows past dates up to today)
    const DatePickerButton = ({ date, setDate }: { date: string; setDate: (d: string) => void }) => {
        const [open, setOpen] = useState(false);
        const [visibleMonth, setVisibleMonth] = useState(() => {
            const d = new Date(date);
            d.setDate(1);
            return d;
        });
        const ref = useRef<HTMLDivElement | null>(null);
        const todayIso = localISODate(new Date());

        useEffect(() => {
            const onDocClick = (e: MouseEvent) => {
                if (open && ref.current && !ref.current.contains(e.target as Node)) {
                    setOpen(false);
                }
            };
            document.addEventListener('mousedown', onDocClick);
            return () => document.removeEventListener('mousedown', onDocClick);
        }, [open]);

        useEffect(() => {
            // keep visibleMonth in sync when external date changes
            const d = new Date(date);
            d.setDate(1);
            setVisibleMonth(d);
        }, [date]);

        const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
        const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

        const buildMatrix = (d: Date) => {
            const start = startOfMonth(d);
            const startWeekday = start.getDay();
            const total = daysInMonth(d);
            const rows: Array<Array<number | null>> = [];
            let day = 1 - startWeekday;
            for (let r = 0; r < 6; r++) {
                const row: Array<number | null> = [];
                for (let c = 0; c < 7; c++, day++) {
                    if (day < 1 || day > total) row.push(null);
                    else row.push(day);
                }
                rows.push(row);
            }
            // Trim trailing rows that contain only nulls so only the needed weeks are shown
            while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell === null)) {
                rows.pop();
            }
            return rows;
        };

        const selectDate = (dayNum: number) => {
            const sel = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNum);
            const iso = localISODate(sel);
            if (iso > todayIso) return; // prevent selecting future
            setDate(iso);
            setOpen(false);
        };

        return (
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setOpen((s) => !s)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                    title="Select date"
                >
                    <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} stroke="currentColor" fill="none" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2v4M16 2v4M3 10h18" />
                    </svg>
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700 p-4 z-50">
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                aria-label="Previous month"
                            >
                                <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{visibleMonth.toLocaleString('default', { month: 'long' })} {visibleMonth.getFullYear()}</div>
                            <button
                                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                aria-label="Next month"
                            >
                                <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d} className="text-center font-medium">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {buildMatrix(visibleMonth).map((row, ri) => (
                                <div key={ri} className="contents">
                                    {row.map((day, ci) => {
                                        const iso = day ? localISODate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)) : null;
                                        const isFuture = iso ? iso > todayIso : false;
                                        const isSelected = iso === date;
                                        const isToday = iso === todayIso;
                                        return (
                                            <button
                                                key={ci}
                                                onClick={() => day && !isFuture && selectDate(day)}
                                                disabled={!day || isFuture}
                                                aria-disabled={!day || isFuture}
                                                className={`h-9 w-9 flex items-center justify-center rounded-full transition-all ${isSelected ? (isToday ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border dark:border-slate-700' : 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md') : isFuture ? 'text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                                            >
                                                <span className="text-sm font-medium">{day || ''}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <button onClick={() => { setDate(localISODate(new Date())); setOpen(false); }} className="px-3 py-1 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:opacity-90">Today</button>
                            <div className="text-right text-xs text-slate-500 dark:text-slate-400">Select a date to load work log</div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 -m-6 p-6 transition-colors">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header - Match Task Manager Style */}
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 border-b-4 border-slate-700 dark:border-slate-600 animate-slideDown relative z-20 transition-colors">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Daily Work Log</h2>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 font-medium">Track your progress and plan ahead</p>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                        <DatePickerButton date={date} setDate={setDate} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700 border-t-slate-700 dark:border-t-slate-300"></div>
                            <div className="absolute inset-0 rounded-full bg-slate-500/20 blur-xl animate-pulse"></div>
                        </div>
                        <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading your work log...</p>
                    </div>
                ) : (
                    <>
                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Today's Work Card */}
                            <div className="group bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-all duration-300">
                                <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">What I Did Today</h2>
                                                <p className="text-slate-300 text-sm">Accomplishments & tasks completed</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-white">{wordCount.today}</div>
                                            <div className="text-xs text-slate-300">words</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex gap-3 mb-4">
                                        <button
                                            type="button"
                                            aria-pressed={todayOnLeave}
                                            onClick={() => {
                                                if (todayOnLeave) setTodayOnLeave(false);
                                                else { setTodayOnLeave(true); setTodayHoliday(false); }
                                            }}
                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition ${todayOnLeave ? 'bg-amber-100 dark:bg-amber-400 text-amber-800 dark:text-amber-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:shadow'}`}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5v14" /></svg>
                                            <span>On Leave</span>
                                        </button>

                                        <button
                                            type="button"
                                            aria-pressed={todayHoliday}
                                            onClick={() => {
                                                if (todayHoliday) setTodayHoliday(false);
                                                else { setTodayHoliday(true); setTodayOnLeave(false); }
                                            }}
                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition ${todayHoliday ? 'bg-cyan-100 dark:bg-cyan-400 text-cyan-800 dark:text-cyan-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:shadow'}`}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                                            <span>Holiday</span>
                                        </button>
                                    </div>
                                    {!todayOnLeave && !todayHoliday ? (
                                        <div className="space-y-2">
                                            {todayItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="h-10 flex items-center text-lg text-emerald-500 flex-shrink-0">✔</div>
                                                    <input
                                                        value={item}
                                                        onChange={(e) => {
                                                            const copy = [...todayItems];
                                                            copy[idx] = e.target.value;
                                                            setTodayItems(copy);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const copy = [...todayItems];
                                                                copy.splice(idx + 1, 0, '');
                                                                setTodayItems(copy);
                                                            } else if (e.key === 'Backspace' && item === '') {
                                                                e.preventDefault();
                                                                const copy = [...todayItems];
                                                                if (copy.length > 1) {
                                                                    copy.splice(idx, 1);
                                                                    setTodayItems(copy);
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Add an item (press Enter to add new)"
                                                        className="flex-1 h-10 py-0 border-b border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                                                    />
                                                </div>
                                            ))}
                                            <button onClick={() => setTodayItems(s => [...s, ''])} className="text-sm text-slate-500 dark:text-slate-400 mt-2">+ Add line</button>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500 dark:text-slate-400 italic">{todayOnLeave ? 'Marked: On Leave' : todayHoliday ? 'Marked: Holiday' : 'No entries'}</div>
                                    )}
                                </div>
                            </div>

                            {/* Tomorrow's Plan Card */}
                            <div className="group bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-all duration-300">
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Plan for Tomorrow</h2>
                                                <p className="text-slate-300 text-sm">Goals & priorities for next day</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-white">{wordCount.tomorrow}</div>
                                            <div className="text-xs text-slate-300">words</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex gap-3 mb-4">
                                        <button
                                            type="button"
                                            aria-pressed={tomorrowOnLeave}
                                            onClick={() => {
                                                if (tomorrowOnLeave) setTomorrowOnLeave(false);
                                                else { setTomorrowOnLeave(true); setTomorrowHoliday(false); }
                                            }}
                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition ${tomorrowOnLeave ? 'bg-amber-100 dark:bg-amber-400 text-amber-800 dark:text-amber-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:shadow'}`}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5v14" /></svg>
                                            <span>On Leave</span>
                                        </button>

                                        <button
                                            type="button"
                                            aria-pressed={tomorrowHoliday}
                                            onClick={() => {
                                                if (tomorrowHoliday) setTomorrowHoliday(false);
                                                else { setTomorrowHoliday(true); setTomorrowOnLeave(false); }
                                            }}
                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition ${tomorrowHoliday ? 'bg-cyan-100 dark:bg-cyan-400 text-cyan-800 dark:text-cyan-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:shadow'}`}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                                            <span>Holiday</span>
                                        </button>
                                    </div>
                                    {!tomorrowOnLeave && !tomorrowHoliday ? (
                                        <div className="space-y-2">
                                            {tomorrowItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="h-10 flex items-center text-lg text-emerald-500 flex-shrink-0">✔</div>
                                                    <input
                                                        value={item}
                                                        onChange={(e) => {
                                                            const copy = [...tomorrowItems];
                                                            copy[idx] = e.target.value;
                                                            setTomorrowItems(copy);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const copy = [...tomorrowItems];
                                                                copy.splice(idx + 1, 0, '');
                                                                setTomorrowItems(copy);
                                                            } else if (e.key === 'Backspace' && item === '') {
                                                                e.preventDefault();
                                                                const copy = [...tomorrowItems];
                                                                if (copy.length > 1) {
                                                                    copy.splice(idx, 1);
                                                                    setTomorrowItems(copy);
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Add an item (press Enter to add new)"
                                                        className="flex-1 h-10 py-0 border-b border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                                                    />
                                                </div>
                                            ))}
                                            <button onClick={() => setTomorrowItems(s => [...s, ''])} className="text-sm text-slate-500 dark:text-slate-400 mt-2">+ Add line</button>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500 dark:text-slate-400 italic">{tomorrowOnLeave ? 'Marked: On Leave' : tomorrowHoliday ? 'Marked: Holiday' : 'No entries'}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{wordCount.today + wordCount.tomorrow}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">Total Words</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{todayWork.split('\n').filter(line => line.trim()).length}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">Tasks Completed</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{tomorrowWork.split('\n').filter(line => line.trim()).length}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">Planned Tasks</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Floating Action Button */}
                <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50">
                    {message && (
                        <div
                            className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce-in backdrop-blur-xl ${message.type === 'success'
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-900 text-white'
                                }`}
                        >
                            {message.type === 'success' ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <span className="font-semibold">{message.text}</span>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="group relative px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold rounded-2xl shadow-2xl hover:shadow-slate-500/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center gap-3">
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                    <span>Save Work Log</span>
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkLogs;
