import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMeetings, getTasks, getBoardsApi, getScheduledMeetings, getAllCardsApi, getDailyWorkWarnings, isYesterdayWorkLogMissing } from '../services/api';
import { useSettings } from '../contexts/SettingsContext';

const UserDashboard = () => {
    const nav = useNavigate();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const [ddOpen, setDdOpen] = useState(false);
    const [appsOpen, setAppsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const ddRef = useRef<HTMLDivElement>(null);
    const appsRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const { appearance, updateAppearance } = useSettings();

    const [meetings, setMeetings] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [boards, setBoards] = useState<any[]>([]);
    const [cards, setCards] = useState<any[]>([]);
    const [warns, setWarns] = useState<any[]>([]);
    const [logMissing, setLogMissing] = useState(false);

    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
            if (appsRef.current && !appsRef.current.contains(e.target as Node)) setAppsOpen(false);
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
        };
        document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn);
    }, []);
    useEffect(() => { (async () => { try { setLoading(true); const [m, t, b, _, c] = await Promise.all([getMeetings().catch(() => []), getTasks().catch(() => []), getBoardsApi().catch(() => []), getScheduledMeetings().catch(() => []), getAllCardsApi().catch(() => [])]); setMeetings(m); setTasks(t); setBoards(b); setCards(c || []); try { setWarns(await getDailyWorkWarnings() || []); } catch { } try { const r = await isYesterdayWorkLogMissing(); setLogMissing(r?.missing || false); } catch { } } catch { } finally { setLoading(false) } })(); }, []);

    const hi = (() => { const h = now.getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const clockH = now.getHours() % 12 || 12;
    const clockM = String(now.getMinutes()).padStart(2, '0');
    const clockAP = now.getHours() >= 12 ? 'PM' : 'AM';
    const today = new Date().toISOString().split('T')[0];
    const todayM = meetings.filter(m => m.date === today);
    const active = [...tasks.filter(t => !t.completed), ...cards.filter(c => !c.archived)];
    const done = [...tasks.filter(t => t.completed), ...cards.filter(c => c.archived)];
    const totalCount = tasks.length + cards.length;
    const overdue = tasks.filter(t => { if (t.completed || !t.dueDate) return false; try { const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0); const n = new Date(); n.setHours(0, 0, 0, 0); return d < n } catch { return false } });

    const alerts = warns.length + overdue.length;
    const score = totalCount > 0 ? Math.round(done.length / totalCount * 100) : 0;

    const uName = user?.name || user?.email?.split('@')[0] || 'User';
    const uInit = (user?.name || user?.email || 'U')[0].toUpperCase();

    const chartData = (() => { const o: { l: string; m: number; t: number }[] = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); const lbl = d.toLocaleDateString('en-US', { month: 'short' }); const y = d.getFullYear(); const mo = d.getMonth(); o.push({ l: lbl, m: meetings.filter(x => { try { const dd = new Date(x.date || x.createdAt); return dd.getMonth() === mo && dd.getFullYear() === y } catch { return false } }).length, t: tasks.filter(x => { try { const dd = new Date(x.createdAt || x.dueDate); return dd.getMonth() === mo && dd.getFullYear() === y } catch { return false } }).length }) } return o })();
    const cMax = Math.max(...chartData.map(d => Math.max(d.m, d.t)), 1);

        // Debug: expose chart data when running locally to help diagnose incorrect graphs
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug('UserDashboard chartData:', { chartData, meetingsCount: meetings.length, tasksCount: tasks.length, cMax });
        }

    const IC = (d: string) => <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={d} /></svg>;

    if (loading) return (<div className="DB"><div className="DB-ld"><div className="DB-ld-bar"><div /></div><p>Preparing your workspace...</p></div></div>);

    return (
        <>
            <div className={`DB ${appearance.theme === 'dark' ? 'DB--dark' : ''} ${appearance.compactMode ? 'DB--compact' : ''}`}>
                {/* HEADER */}
                <header className="DB-hdr">
                    <div className="DB-hdr-l">
                        <button className="DB-logo" onClick={() => nav('/')}>
                            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>MinuteDesk</span>
                        </button>
                    </div>
                    <div className="DB-hdr-r">
                        <div className="DB-apps-launcher" ref={appsRef}>
                            <button className={`DB-hdr-btn ${appsOpen ? 'is-active' : ''}`} title="Apps" onClick={() => setAppsOpen(!appsOpen)}>
                                {IC('M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z')}
                            </button>
                            {appsOpen && (
                                <div className="DB-apps-dropdown">
                                    <div className="DB-apps-grid">
                                        {[
                                            { t: 'Meetings', p: '/meetings', ic: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                                            { t: 'Boards', p: '/tasks', ic: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                                            { t: 'Work Logs', p: '/work-logs', ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                                            { t: 'Analytics', p: '/reports', ic: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
                                        ].map(a => (
                                            <button key={a.t} className="DB-app-grid-it" onClick={() => { nav(a.p); setAppsOpen(false); }}>
                                                <div className="DB-app-grid-ic">{IC(a.ic)}</div>
                                                <span className="DB-app-grid-lbl">{a.t}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="DB-settings-launcher" ref={settingsRef} style={{ position: 'relative' }}>
                            <button className={`DB-hdr-btn ${settingsOpen ? 'is-active' : ''}`} title="Settings" onClick={() => setSettingsOpen(!settingsOpen)}>
                                {IC('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z')}
                            </button>
                            {settingsOpen && (
                                <div className="DB-dd" style={{ width: '220px' }}>
                                    <div className="DB-dd-head"><b>Settings</b></div>
                                    <hr />
                                    <button onClick={() => { updateAppearance({ theme: appearance.theme === 'dark' ? 'light' : 'dark' }); }}>
                                        {appearance.theme === 'dark' ? IC('M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z') : IC('M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z')}
                                        {appearance.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                    </button>
                                    <button onClick={() => { updateAppearance({ compactMode: !appearance.compactMode }); }}>
                                        {IC('M4 8h16M4 16h16')}
                                        {appearance.compactMode ? 'Default Layout' : 'Compact Layout'}
                                    </button>
                                    <hr />
                                    <button onClick={() => { nav('/settings'); setSettingsOpen(false); }}>
                                        {IC('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z')}
                                        More Settings
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="DB-hdr-btn" style={{ position: 'relative' }}>
                            {IC('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1')}
                            {alerts > 0 && <i className="DB-hdr-badge">{alerts}</i>}
                        </button>
                        <div className="DB-prof" ref={ddRef}>
                            <button className="DB-av-btn" onClick={() => setDdOpen(!ddOpen)}><div className="DB-av">{uInit}</div></button>
                            {ddOpen && (
                                <div className="DB-dd">
                                    <div className="DB-dd-head"><div className="DB-av DB-av--lg">{uInit}</div><div><b>{user?.name || 'User'}</b><small>{user?.email}</small></div></div>
                                    <hr />
                                    <button onClick={() => { nav('/settings'); setDdOpen(false) }}>{IC('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z')}Settings</button>
                                    <button onClick={() => nav('/')}>{IC('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')}Home</button>
                                    <hr />
                                    <button className="DB-dd-out" onClick={async () => { await logout(); setDdOpen(false) }}>{IC('M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1')}Sign out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* HERO BANNER */}
                <section className="DB-hero">
                    <div className="DB-hero-bg" />
                    <div className="DB-hero-inner">
                        <div className="DB-hero-content si" style={{ '--i': '0' } as any}>
                            <p className="DB-hero-date">{dateStr}</p>
                            <h1 className="DB-hero-title">{hi}, <span>{uName}</span></h1>
                            <p className="DB-hero-sub">{todayM.length > 0 ? `${todayM.length} meeting${todayM.length > 1 ? 's' : ''} today` : 'No meetings today'} · {active.length} tasks in progress · {overdue.length} overdue</p>
                        </div>
                        <div className="DB-clock si" style={{ '--i': '1' } as any}>
                            <div className="DB-clock-row">
                                <div className="DB-dgt">{String(clockH).padStart(2, '0')[0]}</div>
                                <div className="DB-dgt">{String(clockH).padStart(2, '0')[1]}</div>
                                <span className="DB-clk-sep">:</span>
                                <div className="DB-dgt">{clockM[0]}</div>
                                <div className="DB-dgt">{clockM[1]}</div>
                            </div>
                            <span className="DB-clk-ap">{clockAP}</span>
                        </div>
                    </div>
                </section>

                {/* STAT CARDS — overlapping hero */}
                <div className="DB-stats si" style={{ '--i': '1' } as any}>
                    {[
                        { n: meetings.length, l: 'Total Meetings', desc: `${todayM.length} scheduled today · ${meetings.length} all time`, ic: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', bar: todayM.length > 0 ? 70 : 15 },
                        { n: done.length, l: 'Tasks Completed', desc: `${done.length} of ${totalCount} items finished`, ic: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bar: totalCount > 0 ? Math.round(done.length / totalCount * 100) : 0 },
                        { n: active.length, l: 'In Progress', desc: `${active.length} active work items`, ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bar: totalCount > 0 ? Math.round(active.length / totalCount * 100) : 0 },
                        { n: boards.length, l: 'Active Boards', desc: `${boards.length} project boards available`, ic: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', bar: Math.min(boards.length * 20, 100) },
                    ].map((m, i) => (
                        <div key={m.l} className="DB-stat" style={{ animationDelay: `${.12 + i * .06}s` }}>
                            <div className="DB-stat-top">
                                <div className="DB-stat-ic">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={m.ic} /></svg>
                                </div>
                                <span className="DB-stat-n">{m.n}</span>
                            </div>
                            <span className="DB-stat-l">{m.l}</span>
                            <span className="DB-stat-desc">{m.desc}</span>
                            <div className="DB-stat-bar"><div style={{ width: `${m.bar}%` }} /></div>
                        </div>
                    ))}
                </div>

                {/* CONTENT */}
                <div className="DB-content">
                    {/* Chart + Score Row */}
                    <div className="DB-row si" style={{ '--i': '3' } as any}>
                        <div className="DB-card DB-card--chart">
                            <div className="DB-card-hd"><h2>Activity Overview</h2>
                                <div className="DB-legend"><span><b style={{ background: appearance.theme === 'dark' ? '#cbd5e1' : '#1e293b' }} />Meetings</span><span><b style={{ background: appearance.theme === 'dark' ? '#475569' : '#cbd5e1' }} />Tasks</span></div>
                            </div>
                            <div className="DB-chart">
                                <svg viewBox="0 0 560 200" preserveAspectRatio="none">
                                    {[0, 1, 2, 3, 4].map(i => <line key={i} x1="0" x2="560" y1={30 + i * 35} y2={30 + i * 35} stroke={appearance.theme === 'dark' ? '#334155' : '#f1f5f9'} strokeWidth={1} />)}
                                    {chartData.map((d, i) => {
                                        const x = 35 + i * 90; const bw = 32; const mH = Math.max((d.m / cMax) * 140, 3); const tH = Math.max((d.t / cMax) * 140, 3); return <g key={i}>
                                            <rect x={x} y={175 - mH} width={bw} height={mH} rx={6} fill={appearance.theme === 'dark' ? '#cbd5e1' : '#1e293b'} className="bA" style={{ '--i': String(i) } as any} />
                                            <rect x={x + bw + 5} y={175 - tH} width={bw} height={tH} rx={6} fill={appearance.theme === 'dark' ? '#475569' : '#cbd5e1'} className="bA" style={{ '--i': String(i + .4) } as any} />
                                            <text x={x + bw + 2} y={194} textAnchor="middle" fill={appearance.theme === 'dark' ? '#94a3b8' : '#94a3b8'} fontSize="11" fontWeight="600">{d.l}</text>
                                        </g>
                                    })}
                                </svg>
                            </div>
                            <div className="DB-chart-ft"><strong>{meetings.length + tasks.length}</strong> total activities</div>
                        </div>

                        <div className="DB-card DB-card--score">
                            <h2>Work Score</h2>
                            <div className="DB-ring-wrap">
                                <svg viewBox="0 0 140 140" className="DB-ring">
                                    <circle cx="70" cy="70" r="58" fill="none" stroke={appearance.theme === 'dark' ? '#334155' : '#f1f5f9'} strokeWidth="12" />
                                    <circle cx="70" cy="70" r="58" fill="none" stroke="url(#rg)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${score * 3.64} 364`} transform="rotate(-90 70 70)" className="DB-ring-fill" />
                                    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={appearance.theme === 'dark' ? '#cbd5e1' : '#0f172a'} /><stop offset="100%" stopColor={appearance.theme === 'dark' ? '#64748b' : '#475569'} /></linearGradient></defs>
                                </svg>
                                <div className="DB-ring-txt"><span className="DB-ring-num">{score}</span><span className="DB-ring-pct">%</span></div>
                            </div>
                            <p className="DB-score-msg">{score >= 70 ? 'Great performance!' : 'Room for improvement'}</p>
                            <div className="DB-breakdown">
                                {[{ l: 'Completed', c: done.length }, { l: 'In Progress', c: active.filter(t => !overdue.includes(t)).length }, { l: 'Overdue', c: overdue.length }].map((x, i) => (
                                    <div key={x.l} className="DB-brow"><span className="DB-bdot" style={{ opacity: 1 - i * .3 }} /><span className="DB-blbl">{x.l}</span><span className="DB-bnum">{x.c}</span></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Applications */}
                    <div className="si" style={{ '--i': '5' } as any}>
                        <h2 className="DB-sec-title">Applications</h2>
                        <div className="DB-apps">
                            {[
                                { id: 'mt', t: 'Meeting Studio', d: 'AI-powered recording, transcription and smart minutes generation', n: meetings.length, s: todayM.length > 0 ? `${todayM.length} today` : 'No meetings', p: '/meetings', ic: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', tags: ['Recording', 'AI Notes'] },
                                { id: 'ph', t: 'Project Hub', d: 'Dynamic Kanban boards with drag-and-drop cards and smart checklists', n: boards.length, s: `${active.length} active tasks`, p: '/tasks', ic: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', tags: ['Kanban', 'Tasks'] },
                                { id: 'wl', t: 'Work Logs', d: 'Automated daily effort tracking with reporting and team visibility', n: done.length, s: logMissing ? 'Log missing' : 'Up to date', p: '/work-logs', ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', tags: ['Tracking', 'Reports'] },
                                { id: 'rp', t: 'Reports', d: 'Comprehensive analytics with advanced filtering and CSV export', n: cards.length, s: 'Live data', p: '/reports', ic: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', tags: ['Charts', 'Export'] },
                            ].map((app, i) => (
                                <div key={app.id} className="DB-app" style={{ animationDelay: `${.35 + i * .06}s` }} onClick={() => nav(app.p)}>
                                    <div className="DB-app-ic"><svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={app.ic} /></svg></div>
                                    <div className="DB-app-body">
                                        <h3>{app.t}</h3>
                                        <p>{app.d}</p>
                                        <div className="DB-app-tags">{app.tags.map(tg => <span key={tg}>{tg}</span>)}</div>
                                    </div>
                                    <div className="DB-app-end">
                                        <span className="DB-app-n">{app.n}</span>
                                        <span className="DB-app-s">{app.s}</span>
                                    </div>
                                    <svg className="DB-app-go" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="si" style={{ '--i': '6' } as any}>
                        <h2 className="DB-sec-title">Quick Actions</h2>
                        <div className="DB-quick">
                            {[
                                { l: 'Schedule Meeting', p: '/meetings/schedule', ic: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                                { l: 'New Minutes', p: '/add-meeting/new', ic: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                                { l: 'View Boards', p: '/boards', ic: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                                { l: "Today's Log", p: '/work-logs/daily', ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                                { l: 'Insights', p: '/reports/insights', ic: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                                { l: 'Settings', p: '/settings', ic: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                            ].map((q, i) => (
                                <button key={q.l} className="DB-qb" style={{ animationDelay: `${.4 + i * .04}s` }} onClick={() => nav(q.p)}>
                                    <div className="DB-qb-ic">{IC(q.ic)}</div>
                                    <span>{q.l}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                .DB{min-height:100vh;background:#f4f6f9;font-family:'Inter',system-ui,sans-serif;color:#1e293b}
                *{box-sizing:border-box}

                /* Animations */
                .si{animation:fadeUp .55s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0)*.07s)}
                @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
                .bA{animation:barUp .7s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0)*.1s)}
                @keyframes barUp{from{transform:scaleY(0);transform-origin:bottom}to{transform:scaleY(1);transform-origin:bottom}}

                /* Loading */
                .DB-ld{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:18px}
                .DB-ld-bar{width:180px;height:3px;background:#e2e8f0;border-radius:4px;overflow:hidden}
                .DB-ld-bar div{width:35%;height:100%;background:linear-gradient(90deg,#1e293b,#475569);border-radius:4px;animation:ldB 1s ease-in-out infinite}
                @keyframes ldB{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
                .DB-ld p{font-size:.82rem;color:#94a3b8;font-weight:500}

                /* HEADER */
                .DB-hdr{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid #eaeff5;padding:0 36px;height:68px;display:flex;align-items:center;justify-content:space-between}
                .DB-hdr-l{display:flex;align-items:center}
                .DB-logo{display:flex;align-items:center;gap:9px;border:none;background:none;cursor:pointer;font-family:inherit;color:#0f172a}
                .DB-logo span{font-size:1rem;font-weight:800;letter-spacing:-.03em}
                .DB-hdr-r{display:flex;align-items:center;gap:6px}
                .DB-hdr-time{font-size:.72rem;font-weight:600;color:#94a3b8;margin-right:8px;padding:5px 12px;background:#f8fafc;border-radius:8px}
                .DB-hdr-btn{width:36px;height:36px;border-radius:10px;border:none;background:none;display:flex;align-items:center;justify-content:center;color:#475569;cursor:pointer;transition:all .15s;position:relative}
                .DB-hdr-btn:hover{background:#f1f5f9;color:#0f172a}
                .DB-hdr-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#1e293b;color:white;font-size:.55rem;font-weight:800;display:flex;align-items:center;justify-content:center;font-style:normal;padding:0 4px}

                /* Apps Launcher Divided Grid */
                .DB-apps-launcher{position:relative}
                .DB-hdr-btn.is-active{background:rgba(15,23,42,.05);color:#0f172a}
                .DB-apps-dropdown{position:absolute;right:0;top:calc(100% + 14px);width:260px;background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 20px 40px rgba(0,0,0,.1);overflow:hidden;animation:appsG .3s cubic-bezier(.16,1,.3,1);z-index:200;transform-origin:top right}
                @keyframes appsG{from{opacity:0;transform:scale(.95) translateY(-10px)}to{opacity:1;transform:none}}
                .DB-apps-grid{display:grid;grid-template-columns:1fr 1fr;background:#f1f5f9;gap:1px}
                .DB-app-grid-it{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 12px;background:#ffffff;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
                .DB-app-grid-it:hover{background:#f8fafc}
                .DB-app-grid-ic{width:40px;height:40px;border-radius:10px;background:#f8fafc;display:flex;align-items:center;justify-content:center;color:#475569;transition:all .2s;border:1px solid #f1f5f9}
                .DB-app-grid-it:hover .DB-app-grid-ic{background:#0f172a;color:white;border-color:#0f172a;transform:scale(1.05)}
                .DB-app-grid-lbl{font-size:.72rem;font-weight:700;color:#64748b;letter-spacing:-.01em}
                .DB-app-grid-it:hover .DB-app-grid-lbl{color:#0f172a}

                /* Profile */
                .DB-prof{position:relative;margin-left:4px}
                .DB-av-btn{background:none;border:none;cursor:pointer;padding:0}
                .DB-av{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#0f172a,#334155);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;color:white;transition:opacity .15s}
                .DB-av--lg{width:38px;height:38px;font-size:.9rem}
                .DB-av-btn:hover .DB-av{opacity:.85}
                .DB-dd{position:absolute;right:0;top:calc(100% + 6px);width:224px;background:white;border-radius:12px;border:1px solid #eaeff5;box-shadow:0 16px 48px rgba(0,0,0,.1),0 2px 6px rgba(0,0,0,.04);overflow:hidden;animation:ddA .15s ease-out;z-index:200}
                @keyframes ddA{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
                .DB-dd-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#f8fafc;border-bottom:1px solid #f1f5f9}
                .DB-dd-head b{display:block;font-size:.8rem;color:#0f172a}
                .DB-dd-head small{display:block;font-size:.68rem;color:#94a3b8;margin-top:1px}
                .DB-dd hr{border:none;height:1px;background:#f1f5f9;margin:0}
                .DB-dd button{width:100%;display:flex;align-items:center;gap:8px;padding:9px 14px;border:none;background:none;font-size:.78rem;font-weight:600;color:#475569;cursor:pointer;transition:all .12s;font-family:inherit;text-align:left}
                .DB-dd button:hover{background:#f8fafc;color:#0f172a}
                .DB-dd button svg{width:16px;height:16px;flex-shrink:0}
                .DB-dd-out{color:#94a3b8!important}
                .DB-dd-out:hover{color:#dc2626!important;background:#fef2f2!important}

                /* HERO */
                .DB-hero{position:relative;padding:48px 40px 72px;padding-top:116px;overflow:hidden}
                .DB-hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#334155 100%)}
                .DB-hero-bg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 70% 40%,rgba(71,85,105,.4),transparent);pointer-events:none}
                .DB-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:32px}
                .DB-hero-content{flex:1}
                .DB-hero-date{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.4);margin:0 0 8px}
                .DB-hero-title{font-size:2.6rem;font-weight:900;color:white;letter-spacing:-.04em;margin:0;line-height:1.1}
                .DB-hero-title span{color:rgba(255,255,255,.5)}
                .DB-hero-sub{font-size:.9rem;font-weight:500;color:rgba(255,255,255,.35);margin:10px 0 0}

                /* LIVE CLOCK */
                .DB-clock{display:flex;flex-direction:column;align-items:center;gap:10px;flex-shrink:0}
                .DB-clock-row{display:flex;align-items:center;gap:6px}
                .DB-dgt{width:52px;height:68px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:900;color:white;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
                .DB-clk-sep{font-size:2rem;font-weight:800;color:rgba(255,255,255,.3);animation:blk 1s step-end infinite;margin:0 2px}
                @keyframes blk{50%{opacity:.1}}
                .DB-clk-ap{font-size:.7rem;font-weight:700;color:rgba(255,255,255,.45);letter-spacing:.08em;text-transform:uppercase}

                /* STAT CARDS — overlap hero */
                .DB-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:0 40px;margin-top:-44px;position:relative;z-index:2}
                .DB-stat{background:white;border-radius:18px;padding:24px 26px;display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 24px rgba(0,0,0,.06),0 1px 4px rgba(0,0,0,.03);transition:all .3s cubic-bezier(.22,1,.36,1);cursor:default;animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
                .DB-stat:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.1)}
                .DB-stat-top{display:flex;align-items:center;justify-content:space-between}
                .DB-stat-ic{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#0f172a,#334155);display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0;transition:transform .3s cubic-bezier(.22,1,.36,1)}
                .DB-stat:hover .DB-stat-ic{transform:scale(1.08) rotate(-3deg)}
                .DB-stat-n{font-size:2.4rem;font-weight:900;color:#0f172a;line-height:1}
                .DB-stat-l{font-size:.82rem;font-weight:700;color:#0f172a;margin-top:-2px}
                .DB-stat-desc{font-size:.72rem;font-weight:500;color:#94a3b8;line-height:1.4}
                .DB-stat-bar{height:5px;background:#f1f5f9;border-radius:5px;overflow:hidden;margin-top:2px}
                .DB-stat-bar div{height:100%;background:linear-gradient(90deg,#0f172a,#475569);border-radius:5px;transition:width .8s cubic-bezier(.22,1,.36,1)}

                /* CONTENT */
                .DB-content{padding:28px 40px 56px;display:flex;flex-direction:column;gap:28px}

                /* Cards */
                .DB-card{background:white;border-radius:18px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.04)}
                .DB-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
                .DB-card-hd h2{font-size:1rem;font-weight:800;color:#0f172a;margin:0}
                .DB-legend{display:flex;gap:14px}
                .DB-legend span{display:flex;align-items:center;gap:5px;font-size:.7rem;font-weight:600;color:#94a3b8}
                .DB-legend b{display:block;width:10px;height:10px;border-radius:4px}

                /* Chart */
                .DB-row{display:grid;grid-template-columns:1fr 360px;gap:20px}
                .DB-chart{height:210px;width:100%}.DB-chart svg{width:100%;height:100%}
                .DB-chart-ft{margin-top:10px;font-size:.85rem;color:#94a3b8;font-weight:500}
                .DB-chart-ft strong{font-size:2rem;font-weight:900;color:#0f172a;margin-right:6px}

                /* Score Ring */
                .DB-card--score{display:flex;flex-direction:column;align-items:center}
                .DB-card--score h2{font-size:1rem;font-weight:800;color:#0f172a;margin:0 0 12px;width:100%;text-align:left}
                .DB-ring-wrap{position:relative;width:150px;height:150px;margin:0 auto 10px}
                .DB-ring{width:100%;height:100%}
                .DB-ring-fill{animation:ringD 1.4s cubic-bezier(.22,1,.36,1) both;animation-delay:.35s}
                @keyframes ringD{from{stroke-dasharray:0 364}}
                .DB-ring-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:1px}
                .DB-ring-num{font-size:2.8rem;font-weight:900;color:#0f172a;line-height:1}
                .DB-ring-pct{font-size:1.1rem;font-weight:700;color:#94a3b8;margin-top:8px}
                .DB-score-msg{font-size:.8rem;color:#94a3b8;font-weight:500;margin:0 0 14px;text-align:center}
                .DB-breakdown{width:100%}
                .DB-brow{display:flex;align-items:center;gap:8px;padding:6px 0}
                .DB-bdot{width:8px;height:8px;border-radius:50%;background:#1e293b;flex-shrink:0}
                .DB-blbl{flex:1;font-size:.8rem;font-weight:600;color:#64748b}
                .DB-bnum{font-size:.88rem;font-weight:800;color:#0f172a}

                /* Section Title */
                .DB-sec-title{font-size:1.1rem;font-weight:800;color:#0f172a;margin:0 0 14px;letter-spacing:-.02em}

                /* App Cards — full width rows */
                .DB-apps{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
                .DB-app{display:flex;align-items:center;gap:18px;background:white;border-radius:16px;padding:22px 24px;box-shadow:0 2px 12px rgba(0,0,0,.04);cursor:pointer;transition:all .3s cubic-bezier(.22,1,.36,1);animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
                .DB-app:hover{box-shadow:0 12px 40px rgba(0,0,0,.08);transform:translateY(-3px)}
                .DB-app-ic{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#0f172a,#334155);display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0;transition:transform .3s}
                .DB-app:hover .DB-app-ic{transform:scale(1.08) rotate(-3deg)}
                .DB-app-body{flex:1;min-width:0}
                .DB-app-body h3{font-size:.95rem;font-weight:800;color:#0f172a;margin:0}
                .DB-app-body p{font-size:.75rem;color:#94a3b8;margin:3px 0 0;font-weight:500;line-height:1.4}
                .DB-app-tags{display:flex;gap:5px;margin-top:8px}
                .DB-app-tags span{font-size:.6rem;font-weight:700;padding:3px 9px;border-radius:6px;background:#f1f5f9;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
                .DB-app-end{text-align:right;flex-shrink:0}
                .DB-app-n{display:block;font-size:1.8rem;font-weight:900;color:#0f172a;line-height:1}
                .DB-app-s{display:block;font-size:.7rem;font-weight:500;color:#94a3b8;margin-top:3px}
                .DB-app-go{color:#cbd5e1;flex-shrink:0;transition:all .25s}
                .DB-app:hover .DB-app-go{color:#0f172a;transform:translateX(4px)}

                /* Quick Actions */
                .DB-quick{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
                .DB-qb{display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 12px;border-radius:14px;border:none;background:white;box-shadow:0 2px 10px rgba(0,0,0,.03);cursor:pointer;transition:all .3s cubic-bezier(.22,1,.36,1);font-family:inherit;animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
                .DB-qb:hover{box-shadow:0 10px 32px rgba(0,0,0,.08);transform:translateY(-4px)}
                .DB-qb-ic{width:48px;height:48px;border-radius:14px;background:#f4f6f9;display:flex;align-items:center;justify-content:center;color:#475569;transition:all .25s}
                .DB-qb:hover .DB-qb-ic{background:linear-gradient(135deg,#0f172a,#334155);color:white}
                .DB-qb span{font-size:.75rem;font-weight:700;color:#64748b;text-align:center}
                .DB-qb:hover span{color:#0f172a}

                /* Responsive */
                @media(max-width:1200px){.DB-stats{grid-template-columns:repeat(2,1fr)}.DB-apps{grid-template-columns:1fr}.DB-dgt{width:42px;height:56px;font-size:1.8rem}}
                @media(max-width:900px){.DB-row{grid-template-columns:1fr}.DB-quick{grid-template-columns:repeat(3,1fr)}.DB-clock{display:none}}
                @media(max-width:768px){
                    .DB-hero{padding:32px 20px 56px}
                    /* Add top spacing on small screens to avoid touching status bar */
                    @media (max-width: 640px) {
                        .DB-hero{margin-top:20px}
                    }
                    .DB-hero-title{font-size:1.8rem}
                    .DB-stats{padding:0 20px;grid-template-columns:repeat(2,1fr);gap:12px}
                    .DB-content{padding:24px 20px 40px}
                    .DB-hdr{padding:0 16px}
                }
                @media(max-width:480px){
                    .DB-stats{grid-template-columns:1fr;gap:12px}
                    .DB-quick{grid-template-columns:repeat(2,1fr)}
                    .DB-app{flex-wrap:wrap;gap:12px}
                    .DB-app-end{order:4;width:100%;display:flex;gap:10px;align-items:baseline;text-align:left}
                    .DB-app-go{display:none}
                }
                /* Dark Mode */
                .DB--dark{background:#0f172a;color:#e2e8f0}
                .DB--dark .DB-hdr{background:rgba(15,23,42,.95);border-color:#1e293b}
                .DB--dark .DB-logo{color:#e2e8f0}
                .DB--dark .DB-hdr-btn{color:#94a3b8}
                .DB--dark .DB-hdr-btn:hover{background:#1e293b;color:#e2e8f0}
                .DB--dark .DB-stat{background:#1e293b;box-shadow:0 4px 24px rgba(0,0,0,.2)}
                .DB--dark .DB-stat-n,.DB--dark .DB-stat-l{color:#e2e8f0}
                .DB--dark .DB-stat-desc{color:#64748b}
                .DB--dark .DB-stat-bar{background:#334155}
                .DB--dark .DB-card{background:#1e293b;box-shadow:0 2px 12px rgba(0,0,0,.2)}
                .DB--dark .DB-card-hd h2{color:#e2e8f0}
                .DB--dark .DB-app{background:#1e293b;box-shadow:0 2px 12px rgba(0,0,0,.2)}
                .DB--dark .DB-app:hover{box-shadow:0 12px 40px rgba(0,0,0,.3)}
                .DB--dark .DB-app-body h3{color:#e2e8f0}
                .DB--dark .DB-app-tags span{background:#334155;color:#94a3b8}
                .DB--dark .DB-app-n{color:#e2e8f0}
                .DB--dark .DB-sec-title{color:#e2e8f0}
                .DB--dark .DB-qb{background:#1e293b;box-shadow:0 2px 10px rgba(0,0,0,.15)}
                .DB--dark .DB-qb:hover{box-shadow:0 10px 32px rgba(0,0,0,.3)}
                .DB--dark .DB-qb-ic{background:#334155;color:#94a3b8}
                .DB--dark .DB-qb span{color:#94a3b8}
                .DB--dark .DB-qb:hover span{color:#e2e8f0}
                .DB--dark .DB-dd{background:#1e293b;border-color:#334155}
                .DB--dark .DB-dd-head{background:#0f172a;border-color:#334155}
                .DB--dark .DB-dd-head b{color:#e2e8f0}
                .DB--dark .DB-dd hr{background:#334155}
                .DB--dark .DB-dd button{color:#94a3b8}
                .DB--dark .DB-dd button:hover{background:#334155;color:#e2e8f0}
                .DB--dark .DB-apps-dropdown{background:#1e293b;border-color:#334155}
                .DB--dark .DB-apps-grid{background:#334155}
                .DB--dark .DB-app-grid-it{background:#1e293b}
                .DB--dark .DB-app-grid-it:hover{background:#334155}
                .DB--dark .DB-app-grid-ic{background:#334155;border-color:#475569;color:#94a3b8}
                .DB--dark .DB-app-grid-lbl{color:#94a3b8}
                .DB--dark .DB-chart-ft{color:#64748b}
                .DB--dark .DB-chart-ft strong{color:#e2e8f0}
                .DB--dark .DB-ring-num{color:#e2e8f0}
                .DB--dark .DB-score-msg{color:#64748b}
                .DB--dark .DB-blbl{color:#94a3b8}
                .DB--dark .DB-bnum{color:#e2e8f0}
                .DB--dark .DB-legend span{color:#64748b}
                /* Compact Mode */
                .DB--compact .DB-stat{padding:16px 18px;gap:6px}
                .DB--compact .DB-stat-ic{width:38px;height:38px}
                .DB--compact .DB-stat-n{font-size:1.8rem}
                .DB--compact .DB-stats{gap:12px}
                .DB--compact .DB-content{padding:20px 40px 40px;gap:20px}
                .DB--compact .DB-app{padding:16px 18px;gap:12px}
                .DB--compact .DB-app-ic{width:42px;height:42px}
                .DB--compact .DB-qb{padding:16px 10px;gap:8px}
                .DB--compact .DB-qb-ic{width:38px;height:38px}
                .DB--compact .DB-card{padding:20px}
            `}</style>
        </>
    );
};

export default UserDashboard;
