import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, changeUserPassword } from '../services/api';
import { useSettings } from '../contexts/SettingsContext';

const Settings = () => {
    const nav = useNavigate();
    const { user, refreshUser, logout } = useAuth();
    const { notifications, appearance, privacy, updateNotifications, updateAppearance, updatePrivacy } = useSettings();

    const [activeSection, setActiveSection] = useState('account');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const [ddOpen, setDdOpen] = useState(false);
    const [appsOpen, setAppsOpen] = useState(false);
    const ddRef = useRef<HTMLDivElement>(null);
    const appsRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (user) { setName(user.name || ''); setEmail(user.email || ''); } }, [user]);
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
            if (appsRef.current && !appsRef.current.contains(e.target as Node)) setAppsOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const showAlert = (type: 'success' | 'error', msg: string) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000); };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault(); setIsLoading(true);
        try { await updateUserProfile({ name, email }); await refreshUser(); showAlert('success', 'Profile updated successfully.'); }
        catch (err: unknown) { showAlert('error', (err as Error).message || 'Failed to update profile.'); }
        finally { setIsLoading(false); }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return showAlert('error', 'New passwords do not match.');
        if (newPassword.length < 6) return showAlert('error', 'Password must be at least 6 characters.');
        setIsLoading(true);
        try { await changeUserPassword({ currentPassword, newPassword }); showAlert('success', 'Password updated!'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
        catch (err: unknown) { showAlert('error', (err as Error).message || 'Failed to update password.'); }
        finally { setIsLoading(false); }
    };

    const uInit = (user?.name || user?.email || 'U')[0].toUpperCase();
    const uName = user?.name || user?.email?.split('@')[0] || 'User';
    const IC = (d: string, s = 22) => <svg width={s} height={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={d} /></svg>;

    const navItems = [
        { id: 'account', label: 'Profile', ic: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'security', label: 'Security', ic: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
        { id: 'notifications', label: 'Notifications', ic: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1' },
        { id: 'appearance', label: 'Display', ic: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
        { id: 'danger', label: 'Data & Privacy', ic: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
    ];

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
                                        {[{ t: 'Meetings', p: '/meetings', ic: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' }, { t: 'Boards', p: '/tasks', ic: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }, { t: 'Work Logs', p: '/work-logs', ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }, { t: 'Analytics', p: '/reports', ic: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }].map(a => (
                                            <button key={a.t} className="DB-app-grid-it" onClick={() => { nav(a.p); setAppsOpen(false); }}>
                                                <div className="DB-app-grid-ic">{IC(a.ic)}</div>
                                                <span className="DB-app-grid-lbl">{a.t}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="DB-hdr-btn" title="Dashboard" onClick={() => nav('/dashboard')}>
                            {IC('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')}
                        </button>
                        <button className="DB-hdr-btn" style={{ position: 'relative' }}>
                            {IC('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1')}
                        </button>
                        <div className="DB-prof" ref={ddRef}>
                            <button className="DB-av-btn" onClick={() => setDdOpen(!ddOpen)}><div className="DB-av">{uInit}</div></button>
                            {ddOpen && (
                                <div className="DB-dd">
                                    <div className="DB-dd-head"><div className="DB-av DB-av--lg">{uInit}</div><div><b>{user?.name || 'User'}</b><small>{user?.email}</small></div></div>
                                    <hr />
                                    <button onClick={() => nav('/')}>{IC('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')}Home</button>
                                    <hr />
                                    <button className="DB-dd-out" onClick={async () => { await logout(); setDdOpen(false); }}>{IC('M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1')}Sign out</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* HERO */}
                <section className="DB-hero">
                    <div className="DB-hero-bg" />
                    <div className="DB-hero-inner">
                        <div className="DB-hero-content si" style={{ '--i': '0' } as React.CSSProperties}>
                            <p className="DB-hero-date">Account Configuration</p>
                            <h1 className="DB-hero-title">Settings</h1>
                            <p className="DB-hero-sub">Manage your profile, security, notifications and display preferences</p>
                        </div>
                    </div>
                </section>

                {/* SIDE-BY-SIDE LAYOUT, overlapping hero */}
                <div className="ST-layout si" style={{ '--i': '1' } as React.CSSProperties}>

                    {/* LEFT NAV */}
                    <aside className="ST-aside">
                        {/* User card */}
                        <div className="ST-user-card">
                            <div className="ST-user-av">{uInit}</div>
                            <div className="ST-user-info">
                                <h3>{uName}</h3>
                                <span>{user?.email}</span>
                            </div>
                        </div>

                        {/* Nav links */}
                        <nav className="ST-nav">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    className={`ST-nav-item ${activeSection === item.id ? 'is-active' : ''}`}
                                    onClick={() => setActiveSection(item.id)}
                                >
                                    <div className="ST-nav-ic">{IC(item.ic, 20)}</div>
                                    <span>{item.label}</span>
                                    <svg className="ST-nav-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            ))}
                        </nav>

                        {/* Back to Dashboard quick action */}
                        <button className="ST-back-btn" onClick={() => nav('/dashboard')}>
                            {IC('M11 17l-5-5m0 0l5-5m-5 5h12', 18)}
                            <span>Back to Dashboard</span>
                        </button>
                    </aside>

                    {/* RIGHT PANEL */}
                    <main className="ST-panel">
                        {alert && (
                            <div className={`ST-alert ${alert.type === 'error' ? 'ST-alert--err' : 'ST-alert--ok'}`}>
                                {alert.type === 'error' ? IC('M6 18L18 6M6 6l12 12', 18) : IC('M5 13l4 4L19 7', 18)}
                                <span>{alert.msg}</span>
                            </div>
                        )}

                        {/* ACCOUNT */}
                        {activeSection === 'account' && (
                            <div className="ST-fade" key="account">
                                <div className="ST-panel-hd">
                                    <h2>Profile & Identity</h2>
                                    <p>Update your personal details visible across all MinuteDesk workspaces.</p>
                                </div>

                                <div className="ST-profile-banner">
                                    <div className="ST-profile-av">{uInit}</div>
                                    <div className="ST-profile-meta">
                                        <h3>{uName}</h3>
                                        <span>{user?.email}</span>
                                    </div>
                                </div>

                                <form onSubmit={handleProfileUpdate}>
                                    <div className="ST-section-title">{IC('M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', 18)}<span>Personal Information</span></div>
                                    <div className="ST-form-grid">
                                        <div className="ST-field"><label>Full Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} required /></div>
                                        <div className="ST-field"><label>Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                                    </div>
                                    <div className="ST-form-foot">
                                        <button type="button" className="ST-btn ST-btn--ghost" onClick={() => { if (user) { setName(user.name || ''); setEmail(user.email || ''); } }}>Cancel</button>
                                        <button type="submit" className="ST-btn" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* SECURITY */}
                        {activeSection === 'security' && (
                            <div className="ST-fade" key="security">
                                <div className="ST-panel-hd">
                                    <h2>Security & Password</h2>
                                    <p>Keep your account secure by updating your credentials regularly.</p>
                                </div>

                                <form onSubmit={handlePasswordUpdate}>
                                    <div className="ST-section-title">{IC('M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', 18)}<span>Change Password</span></div>
                                    <div className="ST-form-grid ST-form-grid--single">
                                        <div className="ST-field"><label>Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></div>
                                    </div>
                                    <div className="ST-sep" />
                                    <div className="ST-form-grid">
                                        <div className="ST-field"><label>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
                                        <div className="ST-field"><label>Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
                                    </div>
                                    <div className="ST-form-foot">
                                        <button type="button" className="ST-btn ST-btn--ghost" onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>Reset</button>
                                        <button type="submit" className="ST-btn" disabled={isLoading}>{isLoading ? 'Updating...' : 'Update Password'}</button>
                                    </div>
                                </form>

                                <div className="ST-section-title" style={{ marginTop: 32 }}>{IC('M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', 18)}<span>Session Management</span></div>
                                <div className="ST-info-row">
                                    <div className="ST-info-col">
                                        <span className="ST-info-label">Last Login</span>
                                        <span className="ST-info-val">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="ST-info-col">
                                        <span className="ST-info-label">Active Sessions</span>
                                        <span className="ST-info-val">1 device</span>
                                    </div>
                                    <button type="button" className="ST-btn ST-btn--outline" style={{ marginLeft: 'auto' }} onClick={async () => { await logout(); nav('/login'); }}>Revoke All Sessions</button>
                                </div>
                            </div>
                        )}

                        {/* NOTIFICATIONS */}
                        {activeSection === 'notifications' && (
                            <div className="ST-fade" key="notifications">
                                <div className="ST-panel-hd">
                                    <h2>Notification Preferences</h2>
                                    <p>Choose which alerts and updates you want to receive.</p>
                                </div>

                                <div className="ST-section-title">{IC('M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', 18)}<span>Email Notifications</span></div>
                                <div className="ST-toggles">
                                    {[
                                        { id: 'emailNotifications', name: 'Daily Digest', desc: 'Receive a consolidated summary of all workspace activities each morning.' },
                                        { id: 'weeklyDigest', name: 'Weekly Report', desc: 'Get a comprehensive weekly summary of completed tasks and meetings.' },
                                    ].map(opt => (
                                        <div key={opt.id} className="ST-toggle-row">
                                            <div className="ST-toggle-txt"><h4>{opt.name}</h4><p>{opt.desc}</p></div>
                                            <button type="button" onClick={() => updateNotifications({ [opt.id]: !notifications[opt.id as keyof typeof notifications] })} className={`ST-sw ${notifications[opt.id as keyof typeof notifications] ? 'is-on' : ''}`}><div className="ST-sw-knob" /></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="ST-section-title" style={{ marginTop: 32 }}>{IC('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1', 18)}<span>Push Notifications</span></div>
                                <div className="ST-toggles">
                                    {[
                                        { id: 'meetingReminders', name: 'Meeting Reminders', desc: 'Get notified 15 minutes before scheduled meetings.' },
                                        { id: 'taskDeadlines', name: 'Task Deadlines', desc: 'Alerts when your Kanban items are approaching their due dates.' },
                                        { id: 'pushNotifications', name: 'Browser Push', desc: 'Enable browser push notifications for real-time updates.' },
                                        { id: 'soundEnabled', name: 'Notification Sounds', desc: 'Play a sound effect when new notifications arrive.' },
                                    ].map(opt => (
                                        <div key={opt.id} className="ST-toggle-row">
                                            <div className="ST-toggle-txt"><h4>{opt.name}</h4><p>{opt.desc}</p></div>
                                            <button type="button" onClick={() => updateNotifications({ [opt.id]: !notifications[opt.id as keyof typeof notifications] })} className={`ST-sw ${notifications[opt.id as keyof typeof notifications] ? 'is-on' : ''}`}><div className="ST-sw-knob" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE */}
                        {activeSection === 'appearance' && (
                            <div className="ST-fade" key="appearance">
                                <div className="ST-panel-hd">
                                    <h2>Display & Theme</h2>
                                    <p>Customize how MinuteDesk looks and feels for you.</p>
                                </div>

                                <div className="ST-section-title">{IC('M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', 18)}<span>Color Theme</span></div>
                                <div className="ST-theme-picks">
                                    <button type="button" className={`ST-theme-card ${appearance.theme === 'light' ? 'is-active' : ''}`} onClick={() => updateAppearance({ theme: 'light' })}>
                                        <div className="ST-theme-preview ST-tp--light"><div /><div /><div /></div>
                                        <div className="ST-theme-label">{IC('M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z', 18)}<span>Light</span></div>
                                    </button>
                                    <button type="button" className={`ST-theme-card ${appearance.theme === 'dark' ? 'is-active' : ''}`} onClick={() => updateAppearance({ theme: 'dark' })}>
                                        <div className="ST-theme-preview ST-tp--dark"><div /><div /><div /></div>
                                        <div className="ST-theme-label">{IC('M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', 18)}<span>Dark</span></div>
                                    </button>
                                </div>

                                <div className="ST-section-title" style={{ marginTop: 32 }}>{IC('M4 6h16M4 12h16M4 18h16', 18)}<span>Layout Density</span></div>
                                <div className="ST-theme-picks">
                                    <button type="button" className={`ST-theme-card ${!appearance.compactMode ? 'is-active' : ''}`} onClick={() => updateAppearance({ compactMode: false })}>
                                        <div className="ST-theme-preview ST-tp--comfy"><div /><div /></div>
                                        <div className="ST-theme-label">{IC('M4 6h16M4 12h16M4 18h16', 18)}<span>Comfortable</span></div>
                                    </button>
                                    <button type="button" className={`ST-theme-card ${appearance.compactMode ? 'is-active' : ''}`} onClick={() => updateAppearance({ compactMode: true })}>
                                        <div className="ST-theme-preview ST-tp--compact"><div /><div /><div /><div /></div>
                                        <div className="ST-theme-label">{IC('M4 8h16M4 16h16', 18)}<span>Compact</span></div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* DANGER */}
                        {activeSection === 'danger' && (
                            <div className="ST-fade" key="danger">
                                <div className="ST-panel-hd">
                                    <h2>Data & Privacy</h2>
                                    <p>Export your MinuteDesk workspace data.</p>
                                </div>

                                <div className="ST-section-title">{IC('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', 18)}<span>Export Data</span></div>
                                <div className="ST-danger-card">
                                    <div className="ST-danger-txt">
                                        <h4>Download Workspace Archive</h4>
                                        <p>Get a complete ZIP archive of all your meetings, boards, tasks and work logs connected to your identity.</p>
                                    </div>
                                    <button type="button" className="ST-btn ST-btn--outline" onClick={() => { const data = { exportedAt: new Date().toISOString(), user: user?.email }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'minutedesk-export.json'; a.click(); URL.revokeObjectURL(url); showAlert('success', 'Data export started. Check your downloads.'); }}>Generate Export</button>
                                </div>

                                <div className="ST-section-title" style={{ marginTop: 32 }}>{IC('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', 18)}<span>Privacy Controls</span></div>
                                <div className="ST-toggles">
                                    <div className="ST-toggle-row">
                                        <div className="ST-toggle-txt"><h4>Analytics & Diagnostics</h4><p>Allow MinuteDesk to collect anonymous usage data to help us identify bugs and improve the platform.</p></div>
                                        <button type="button" onClick={() => updatePrivacy({ analyticsEnabled: !privacy.analyticsEnabled })} className={`ST-sw ${privacy.analyticsEnabled ? 'is-on' : ''}`}><div className="ST-sw-knob" /></button>
                                    </div>
                                    <div className="ST-toggle-row">
                                        <div className="ST-toggle-txt"><h4>Show Activity Status</h4><p>Let teammates see when you are online and active in the workspace.</p></div>
                                        <button type="button" onClick={() => updatePrivacy({ showActivity: !privacy.showActivity })} className={`ST-sw ${privacy.showActivity ? 'is-on' : ''}`}><div className="ST-sw-knob" /></button>
                                    </div>
                                    <div className="ST-toggle-row">
                                        <div className="ST-toggle-txt"><h4>Show Email to Team</h4><p>Make your email address visible to other workspace members.</p></div>
                                        <button type="button" onClick={() => updatePrivacy({ showEmail: !privacy.showEmail })} className={`ST-sw ${privacy.showEmail ? 'is-on' : ''}`}><div className="ST-sw-knob" /></button>
                                    </div>
                                </div>

                                <div className="ST-section-title" style={{ marginTop: 32 }}>{IC('M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z', 18)}<span>Third-Party Data Sharing</span></div>
                                <div className="ST-danger-card" style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
                                    <div className="ST-danger-txt">
                                        <h4 style={{ color: '#0f172a' }}>Manage Connected Integrations</h4>
                                        <p>Review or revoke data access for third-party applications (e.g., Slack, Google Calendar) connected to your account.</p>
                                    </div>
                                    <button type="button" className="ST-btn ST-btn--outline" onClick={() => showAlert('success', 'No third-party integrations are currently connected.')}>Review Access</button>
                                </div>

                                <div className="ST-section-title" style={{ marginTop: 32 }}>{IC('M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 18)}<span>Legal & Compliance</span></div>
                                <div className="ST-danger-card" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                                    <div className="ST-danger-txt">
                                        <h4 style={{ color: '#0f172a' }}>Right to be Forgotten</h4>
                                        <p>Contact our support team to request a complete erasure of your identity from our active servers under GDPR or CCPA standards.</p>
                                    </div>
                                    <button type="button" className="ST-btn ST-btn--outline" onClick={() => { window.open('mailto:support@minutedesk.com?subject=Data%20Erasure%20Request', '_blank'); showAlert('success', 'Opening email client to contact support.'); }}>Contact Support</button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                .DB{min-height:100vh;background:#f4f6f9;font-family:'Inter',system-ui,sans-serif;color:#1e293b}
                *{box-sizing:border-box}
                .si{animation:fadeUp .55s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0)*.07s)}
                @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
                @keyframes paneFade{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}
                .ST-fade{animation:paneFade .3s cubic-bezier(.22,1,.36,1) both}

                /* HEADER */
                .DB-hdr{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid #eaeff5;padding:0 36px;height:68px;display:flex;align-items:center;justify-content:space-between}
                .DB-hdr-l{display:flex;align-items:center}
                .DB-logo{display:flex;align-items:center;gap:9px;border:none;background:none;cursor:pointer;font-family:inherit;color:#0f172a}
                .DB-logo span{font-size:1rem;font-weight:800;letter-spacing:-.03em}
                .DB-hdr-r{display:flex;align-items:center;gap:6px}
                .DB-hdr-btn{width:36px;height:36px;border-radius:10px;border:none;background:none;display:flex;align-items:center;justify-content:center;color:#475569;cursor:pointer;transition:all .15s;position:relative}
                .DB-hdr-btn:hover{background:#f1f5f9;color:#0f172a}
                .DB-hdr-btn.is-active{background:rgba(15,23,42,.05);color:#0f172a}
                .DB-apps-launcher{position:relative}
                .DB-apps-dropdown{position:absolute;right:0;top:calc(100% + 14px);width:260px;background:#fff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 20px 40px rgba(0,0,0,.1);overflow:hidden;animation:appsG .3s cubic-bezier(.16,1,.3,1);z-index:200;transform-origin:top right}
                @keyframes appsG{from{opacity:0;transform:scale(.95) translateY(-10px)}to{opacity:1;transform:none}}
                .DB-apps-grid{display:grid;grid-template-columns:1fr 1fr;background:#f1f5f9;gap:1px}
                .DB-app-grid-it{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 12px;background:#fff;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
                .DB-app-grid-it:hover{background:#f8fafc}
                .DB-app-grid-ic{width:40px;height:40px;border-radius:10px;background:#f8fafc;display:flex;align-items:center;justify-content:center;color:#475569;transition:all .2s;border:1px solid #f1f5f9}
                .DB-app-grid-it:hover .DB-app-grid-ic{background:#0f172a;color:white;border-color:#0f172a;transform:scale(1.05)}
                .DB-app-grid-lbl{font-size:.72rem;font-weight:700;color:#64748b}
                .DB-app-grid-it:hover .DB-app-grid-lbl{color:#0f172a}
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
                .DB-hero{position:relative;padding:48px 40px 80px;padding-top:116px;overflow:hidden}
                .DB-hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#334155 100%)}
                .DB-hero-bg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 70% 40%,rgba(71,85,105,.4),transparent);pointer-events:none}
                .DB-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:32px}
                .DB-hero-content{flex:1}
                .DB-hero-date{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.4);margin:0 0 8px}
                .DB-hero-title{font-size:2.6rem;font-weight:900;color:white;letter-spacing:-.04em;margin:0;line-height:1.1}
                .DB-hero-sub{font-size:.9rem;font-weight:500;color:rgba(255,255,255,.35);margin:10px 0 0}

                /* SIDE-BY-SIDE LAYOUT */
                .ST-layout{display:grid;grid-template-columns:280px 1fr;gap:24px;padding:0 40px;margin-top:-48px;position:relative;z-index:2;min-height:calc(100vh - 280px);align-items:start}

                /* LEFT SIDEBAR */
                .ST-aside{display:flex;flex-direction:column;gap:8px;position:sticky;top:92px}
                .ST-user-card{background:white;border-radius:18px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,.06),0 1px 4px rgba(0,0,0,.03);display:flex;align-items:center;gap:14px;margin-bottom:4px}
                .ST-user-av{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#0f172a,#334155);display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:800;color:white;flex-shrink:0}
                .ST-user-info h3{font-size:.92rem;font-weight:800;color:#0f172a;margin:0}
                .ST-user-info span{font-size:.72rem;color:#94a3b8;font-weight:500}

                .ST-nav{background:white;border-radius:18px;padding:10px;box-shadow:0 4px 24px rgba(0,0,0,.06),0 1px 4px rgba(0,0,0,.03);display:flex;flex-direction:column;gap:2px}
                .ST-nav-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:none;background:none;cursor:pointer;transition:all .2s;font-family:inherit;text-align:left;position:relative}
                .ST-nav-item:hover{background:#f8fafc}
                .ST-nav-ic{width:36px;height:36px;border-radius:10px;background:#f4f6f9;display:flex;align-items:center;justify-content:center;color:#64748b;flex-shrink:0;transition:all .25s}
                .ST-nav-item span{font-size:.88rem;font-weight:700;color:#475569;flex:1;transition:color .2s}
                .ST-nav-arrow{color:#cbd5e1;flex-shrink:0;transition:all .2s;opacity:0;transform:translateX(-4px)}
                .ST-nav-item:hover .ST-nav-arrow{opacity:.5;transform:none}
                .ST-nav-item.is-active{background:#f1f5f9}
                .ST-nav-item.is-active .ST-nav-ic{background:linear-gradient(135deg,#0f172a,#334155);color:white;transform:scale(1.05)}
                .ST-nav-item.is-active span{color:#0f172a}
                .ST-nav-item.is-active .ST-nav-arrow{opacity:1;transform:none;color:#0f172a}

                .ST-back-btn{display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:14px;border:none;background:white;cursor:pointer;transition:all .2s;font-family:inherit;box-shadow:0 2px 12px rgba(0,0,0,.04);margin-top:4px}
                .ST-back-btn:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}
                .ST-back-btn span{font-size:.82rem;font-weight:700;color:#64748b}
                .ST-back-btn:hover span{color:#0f172a}

                /* RIGHT PANEL */
                .ST-panel{background:white;border-radius:18px;padding:36px 40px;box-shadow:0 4px 24px rgba(0,0,0,.06),0 1px 4px rgba(0,0,0,.03);min-height:580px}
                .ST-panel-hd{margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #f1f5f9}
                .ST-panel-hd h2{font-size:1.4rem;font-weight:800;color:#0f172a;margin:0 0 6px;letter-spacing:-.02em}
                .ST-panel-hd p{font-size:.88rem;color:#94a3b8;font-weight:500;margin:0;line-height:1.5}

                /* Section Titles */
                .ST-section-title{display:flex;align-items:center;gap:10px;margin-bottom:18px;color:#475569;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
                .ST-section-title--red{color:#dc2626}

                /* Profile Banner */
                .ST-profile-banner{display:flex;align-items:center;gap:20px;padding:24px 28px;background:#f8fafc;border-radius:16px;border:1px solid #f1f5f9;margin-bottom:32px}
                .ST-profile-av{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#0f172a,#334155);color:white;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:900;flex-shrink:0;box-shadow:0 6px 14px rgba(15,23,42,.12)}
                .ST-profile-meta{flex:1}
                .ST-profile-meta h3{font-size:1.1rem;font-weight:800;color:#0f172a;margin:0 0 2px}
                .ST-profile-meta span{font-size:.82rem;color:#64748b;font-weight:500}

                /* Forms */
                .ST-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px}
                .ST-form-grid--single{grid-template-columns:1fr}
                .ST-field{display:flex;flex-direction:column;gap:8px}
                .ST-field label{font-size:.72rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em}
                .ST-field input{width:100%;padding:13px 16px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;font-size:.9rem;font-weight:500;color:#0f172a;font-family:inherit;transition:all .2s;outline:none}
                .ST-field input:focus{background:#fff;border-color:#475569;box-shadow:0 0 0 3px rgba(15,23,42,.06)}
                .ST-sep{height:1px;background:#f1f5f9;margin:8px 0 20px}
                .ST-form-foot{display:flex;justify-content:flex-end;gap:10px;padding-top:12px;border-top:1px solid #f1f5f9;margin-top:8px}

                .ST-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:12px;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s;border:none;font-family:inherit;background:linear-gradient(135deg,#0f172a,#334155);color:white;box-shadow:0 4px 12px rgba(15,23,42,.1)}
                .ST-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(15,23,42,.16)}
                .ST-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
                .ST-btn--outline{background:white;color:#475569;border:1.5px solid #e2e8f0;box-shadow:none}
                .ST-btn--outline:hover{border-color:#94a3b8;color:#0f172a;background:#f8fafc}
                .ST-btn--ghost{background:none;color:#64748b;box-shadow:none}
                .ST-btn--ghost:hover{color:#0f172a;background:#f8fafc}
                .ST-btn--danger{background:linear-gradient(135deg,#dc2626,#991b1b);box-shadow:0 4px 12px rgba(220,38,38,.1)}
                .ST-btn--danger:hover{box-shadow:0 6px 18px rgba(220,38,38,.18)}

                /* Alerts */
                .ST-alert{display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:12px;font-size:.85rem;font-weight:600;margin-bottom:24px}
                .ST-alert--err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
                .ST-alert--ok{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}

                /* Info Row (Security) */
                .ST-info-row{display:flex;align-items:center;gap:24px;padding:20px 24px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:14px}
                .ST-info-col{display:flex;flex-direction:column;gap:4px}
                .ST-info-label{font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
                .ST-info-val{font-size:.9rem;font-weight:700;color:#0f172a}

                /* Toggles */
                .ST-toggles{display:flex;flex-direction:column;gap:10px}
                .ST-toggle-row{display:flex;align-items:center;gap:16px;padding:18px 22px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:14px;transition:all .2s}
                .ST-toggle-row:hover{background:white;box-shadow:0 4px 16px rgba(0,0,0,.04);border-color:#e2e8f0}
                .ST-toggle-txt{flex:1;min-width:0}
                .ST-toggle-txt h4{font-size:.9rem;font-weight:800;color:#0f172a;margin:0 0 3px}
                .ST-toggle-txt p{font-size:.78rem;color:#94a3b8;font-weight:500;margin:0;line-height:1.4}
                .ST-sw{width:46px;height:26px;border-radius:13px;background:#cbd5e1;border:none;cursor:pointer;position:relative;transition:background .3s;flex-shrink:0}
                .ST-sw.is-on{background:#0f172a}
                .ST-sw-knob{position:absolute;top:3px;left:3px;width:20px;height:20px;background:white;border-radius:10px;transition:transform .3s cubic-bezier(.18,.89,.32,1.28);box-shadow:0 2px 4px rgba(0,0,0,.1)}
                .ST-sw.is-on .ST-sw-knob{transform:translateX(20px)}

                /* Theme Picker */
                .ST-theme-picks{display:grid;grid-template-columns:1fr 1fr;gap:14px}
                .ST-theme-card{padding:0;border:2px solid #e2e8f0;border-radius:16px;background:white;cursor:pointer;transition:all .25s;font-family:inherit;overflow:hidden}
                .ST-theme-card:hover{border-color:#94a3b8;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.06)}
                .ST-theme-card.is-active{border-color:#0f172a;box-shadow:0 4px 16px rgba(15,23,42,.1)}
                .ST-theme-preview{height:72px;padding:14px;display:flex;flex-direction:column;gap:5px;border-radius:12px 12px 0 0}
                .ST-theme-preview div{border-radius:4px}
                .ST-tp--light{background:#f8fafc}
                .ST-tp--light div:nth-child(1){width:60%;height:10px;background:#e2e8f0}
                .ST-tp--light div:nth-child(2){width:85%;height:7px;background:#f1f5f9}
                .ST-tp--light div:nth-child(3){width:45%;height:7px;background:#f1f5f9}
                .ST-tp--dark{background:#1e293b}
                .ST-tp--dark div:nth-child(1){width:60%;height:10px;background:#334155}
                .ST-tp--dark div:nth-child(2){width:85%;height:7px;background:#475569}
                .ST-tp--dark div:nth-child(3){width:45%;height:7px;background:#475569}
                .ST-tp--comfy{background:#f8fafc}
                .ST-tp--comfy div{width:100%;height:14px;background:#e2e8f0;border-radius:4px}
                .ST-tp--compact{background:#f8fafc}
                .ST-tp--compact div{width:100%;height:7px;background:#e2e8f0;border-radius:3px}
                .ST-theme-label{display:flex;align-items:center;gap:8px;padding:12px 14px;font-size:.85rem;font-weight:700;color:#475569}
                .ST-theme-card.is-active .ST-theme-label{color:#0f172a}

                /* Danger Cards */
                .ST-danger-card{display:flex;align-items:center;justify-content:space-between;padding:22px 26px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:16px;transition:all .2s;gap:20px}
                .ST-danger-card:hover{background:white;box-shadow:0 4px 16px rgba(0,0,0,.04)}
                .ST-danger-card--red{border-color:#fee2e2;background:#fef2f2}
                .ST-danger-card--red:hover{background:#fef2f2;box-shadow:0 4px 16px rgba(220,38,38,.04)}
                .ST-danger-txt h4{font-size:.92rem;font-weight:800;color:#0f172a;margin:0 0 4px}
                .ST-danger-card--red .ST-danger-txt h4{color:#dc2626}
                .ST-danger-txt p{font-size:.78rem;color:#94a3b8;font-weight:500;margin:0;line-height:1.4}

                /* RESPONSIVE */
                @media(max-width:900px){
                    .ST-layout{grid-template-columns:1fr;padding:0 20px}
                    .ST-aside{position:static;flex-direction:row;flex-wrap:wrap;gap:8px}
                    .ST-user-card{display:none}
                    .ST-nav{flex-direction:row;overflow-x:auto;border-radius:14px;padding:6px}
                    .ST-nav-item{padding:10px 14px;white-space:nowrap}
                    .ST-nav-arrow{display:none}
                    .ST-back-btn{display:none}
                    .ST-panel{padding:24px}
                    .ST-form-grid{grid-template-columns:1fr}
                    .ST-profile-banner{flex-direction:column;text-align:center}
                    .ST-theme-picks{grid-template-columns:1fr}
                    .ST-danger-card{flex-direction:column;align-items:flex-start}
                    .ST-info-row{flex-direction:column;align-items:flex-start;gap:16px}
                }
                @media(max-width:768px){
                    .DB-hero{padding:32px 20px 64px}
                    .DB-hero-title{font-size:1.8rem}
                    .DB-hdr{padding:0 16px}
                }
                /* Dark Mode */
                .DB--dark{background:#0f172a;color:#e2e8f0}
                .DB--dark .DB-hdr{background:rgba(15,23,42,.95);border-color:#1e293b}
                .DB--dark .DB-logo{color:#e2e8f0}
                .DB--dark .DB-hdr-btn{color:#94a3b8}
                .DB--dark .DB-hdr-btn:hover{background:#1e293b;color:#e2e8f0}
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
                .DB--dark .ST-user-card,.DB--dark .ST-nav,.DB--dark .ST-panel,.DB--dark .ST-back-btn{background:#1e293b;box-shadow:0 4px 24px rgba(0,0,0,.2)}
                .DB--dark .ST-user-info h3,.DB--dark .ST-panel-hd h2,.DB--dark .ST-section-title{color:#e2e8f0}
                .DB--dark .ST-nav-item:hover{background:#334155}
                .DB--dark .ST-nav-item.is-active{background:#334155}
                .DB--dark .ST-nav-item span{color:#94a3b8}
                .DB--dark .ST-nav-item.is-active span{color:#e2e8f0}
                .DB--dark .ST-nav-ic{background:#334155;color:#94a3b8}
                .DB--dark .ST-back-btn span{color:#94a3b8}
                .DB--dark .ST-profile-banner,.DB--dark .ST-toggle-row,.DB--dark .ST-danger-card,.DB--dark .ST-info-row{background:#334155;border-color:#475569}
                .DB--dark .ST-profile-meta h3,.DB--dark .ST-toggle-txt h4,.DB--dark .ST-danger-txt h4,.DB--dark .ST-info-val{color:#e2e8f0}
                .DB--dark .ST-field input{background:#334155;border-color:#475569;color:#e2e8f0}
                .DB--dark .ST-field input:focus{background:#1e293b;border-color:#94a3b8}
                .DB--dark .ST-field label{color:#94a3b8}
                .DB--dark .ST-theme-card{background:#1e293b;border-color:#334155}
                .DB--dark .ST-theme-card:hover{border-color:#475569}
                .DB--dark .ST-theme-card.is-active{border-color:#e2e8f0}
                .DB--dark .ST-theme-label{color:#94a3b8}
                .DB--dark .ST-theme-card.is-active .ST-theme-label{color:#e2e8f0}
                .DB--dark .ST-sep,.DB--dark .ST-panel-hd,.DB--dark .ST-form-foot{border-color:#334155}
                .DB--dark .ST-btn--outline{background:#1e293b;color:#94a3b8;border-color:#475569}
                .DB--dark .ST-btn--ghost{color:#94a3b8}
                /* Compact Mode */
                .DB--compact .ST-panel{padding:24px 28px}
                .DB--compact .ST-panel-hd{margin-bottom:20px;padding-bottom:16px}
                .DB--compact .ST-toggle-row{padding:14px 18px}
                .DB--compact .ST-danger-card{padding:16px 20px}
                .DB--compact .ST-profile-banner{padding:16px 20px}
                .DB--compact .ST-form-grid{gap:12px;margin-bottom:14px}
                .DB--compact .ST-field input{padding:10px 14px}
            `}</style>
        </>
    );
};

export default Settings;
