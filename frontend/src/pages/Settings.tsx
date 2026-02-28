import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, changeUserPassword } from '../services/api';
import { useSettings } from '../contexts/SettingsContext';
import type { AppearanceSettings, NotificationSettings, PrivacySettings } from '../contexts/SettingsContext';

const Settings = () => {
  const nav = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { notifications, appearance, privacy, updateNotifications, updateAppearance, updatePrivacy } = useSettings();

  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'notifications' | 'preferences' | 'privacy'>('account');
  const [, setSettingsSaved] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setAppsOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn);
  }, []);

  const uInit = (user?.name || user?.email || 'U')[0].toUpperCase();
  const IC = (d: string) => <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={d} /></svg>;

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { if (user) { setName(user.name || ''); setEmail(user.email || ''); } }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setProfileLoading(true); setProfileError(''); setProfileSuccess('');
    try { await updateUserProfile({ name, email }); await refreshUser(); setProfileSuccess('Profile updated successfully!'); setTimeout(() => setProfileSuccess(''), 3000); }
    catch (err: any) { setProfileError(err.message || 'Failed to update profile'); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPasswordLoading(true); setPasswordError(''); setPasswordSuccess('');
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match'); setPasswordLoading(false); return; }
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); setPasswordLoading(false); return; }
    try { await changeUserPassword({ currentPassword, newPassword }); setPasswordSuccess('Password changed successfully!'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setTimeout(() => setPasswordSuccess(''), 3000); }
    catch (err: any) { setPasswordError(err.message || 'Failed to change password'); }
    finally { setPasswordLoading(false); }
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => { updateNotifications({ [key]: !notifications[key] }); showSettingsSaved(); };
  const handleAppearanceChange = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => { updateAppearance({ [key]: value }); showSettingsSaved(); };
  const handlePrivacyChange = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => { updatePrivacy({ [key]: value }); showSettingsSaved(); };
  const showSettingsSaved = () => { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); };

  const handleExportData = () => {
    try {
      const data = { user: { name: user?.name, email: user?.email }, settings: { notifications, appearance, privacy }, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `minutedesk-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      alert('Your data has been exported successfully!');
    } catch (error) { alert('Failed to export data. Please try again.'); }
  };

  const handleClearCache = () => { if (window.confirm('Are you sure you want to clear all cached data? This will log you out and reset all settings.')) { localStorage.clear(); window.location.reload(); } };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.');
    if (confirmed) { const doubleCheck = window.confirm('This is your final warning.'); if (doubleCheck) { const userInput = prompt('Type DELETE to confirm:'); if (userInput === 'DELETE') { try { alert('Account deletion functionality will be implemented soon.'); } catch (error) { alert('Failed to delete account.'); } } else { alert('Account deletion cancelled.'); } } }
  };

  const sections = [
    { id: 'account' as const, label: 'Account', desc: 'Profile & personal info', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'security' as const, label: 'Security', desc: 'Password & sessions', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'notifications' as const, label: 'Notifications', desc: 'Email & push alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'preferences' as const, label: 'Preferences', desc: 'Theme & display', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'privacy' as const, label: 'Privacy', desc: 'Visibility & data', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ];

  /* Reusable toggle */
  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`stg-toggle ${on ? 'stg-toggle--on' : ''}`}>
      <span className="stg-toggle-dot" />
    </button>
  );

  /* Reusable password input */
  const PassInput = ({ label, value, onChange, show, onToggle, placeholder }: any) => (
    <div className="stg-field">
      <label className="stg-label">{label}</label>
      <div className="stg-input-wrap">
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange} className="stg-input" placeholder={placeholder} />
        <button type="button" onClick={onToggle} className="stg-input-eye">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={show ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} /></svg>
        </button>
      </div>
    </div>
  );

  /* Alert component */
  const Alert = ({ type, message }: { type: 'error' | 'success'; message: string }) => (
    <div className={`stg-alert stg-alert--${type}`}>
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
        {type === 'error' ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /> : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />}
      </svg>
      <span>{message}</span>
    </div>
  );


  return (
    <>
      <div className="DB">
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
                {IC('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z')}{IC('M15 12a3 3 0 11-6 0 3 3 0 016 0z')}
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
                    {IC('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z')}{IC('M15 12a3 3 0 11-6 0 3 3 0 016 0z')}
                    More Settings
                  </button>
                </div>
              )}
            </div>
            <div className="DB-prof" ref={ddRef}>
              <button className="DB-av-btn" onClick={() => setDdOpen(!ddOpen)}><div className="DB-av">{uInit}</div></button>
              {ddOpen && (
                <div className="DB-dd">
                  <div className="DB-dd-head"><div className="DB-av DB-av--lg">{uInit}</div><div><b>{user?.name || 'User'}</b><small>{user?.email}</small></div></div>
                  <hr />
                  <button onClick={() => { nav('/settings'); setDdOpen(false) }}>{IC('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z')}Settings</button>
                  <button onClick={() => nav('/')}>{IC('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6')}Home</button>
                  <hr />
                  <button className="DB-dd-out" onClick={async () => { await logout(); setDdOpen(false) }}>{IC('M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1')}Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <div className="DB-content" style={{ paddingTop: 100 }}>
          <div className="stg-container">

            {/* Modern Page Header */}
            <div className="stg-page-header">
              <div className="stg-page-header-left">
                <div className="stg-page-icon">
                  <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="stg-page-title">Settings</h1>
                  <p className="stg-page-subtitle">Manage your account preferences and configuration</p>
                </div>
              </div>
              <button onClick={() => nav('/dashboard')} className="stg-back-btn">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Dashboard
              </button>
            </div>

            {/* Layout: Sidebar + Content */}
            <div className="stg-layout">

              {/* Sidebar */}
              <aside className="stg-sidebar">
                <nav className="stg-nav">
                  {sections.map((s, i) => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                      className={`stg-nav-item ${activeSection === s.id ? 'stg-nav-item--active' : ''}`}
                      style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="stg-nav-icon">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                      </div>
                      <div className="stg-nav-text">
                        <span className="stg-nav-label">{s.label}</span>
                        <span className="stg-nav-desc">{s.desc}</span>
                      </div>
                      {activeSection === s.id && <div className="stg-nav-indicator" />}
                    </button>
                  ))}
                </nav>

                {/* User Card */}
                <div className="stg-user-card">
                  <div className="stg-user-card-avatar">{user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</div>
                  <div className="stg-user-card-info">
                    <p className="stg-user-card-name">{user?.name || 'User'}</p>
                    <p className="stg-user-card-email">{user?.email}</p>
                  </div>
                  <div className="stg-user-card-badge">Pro</div>
                </div>
              </aside>

              {/* Content Panels */}
              <main className="stg-main" key={activeSection}>

                {/* ── ACCOUNT ── */}
                {activeSection === 'account' && (
                  <div className="stg-panel">
                    {/* Profile Header */}
                    <div className="stg-card stg-card--profile">
                      <div className="stg-profile-banner" />
                      <div className="stg-profile-body">
                        <div className="stg-profile-avatar">
                          {name ? name.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="stg-card-title">Personal Information</h2>
                        <p className="stg-card-desc">Update your account details and profile information</p>
                      </div>
                    </div>

                    {/* Profile Form */}
                    <div className="stg-card">
                      <form onSubmit={handleProfileUpdate}>
                        <div className="stg-form-grid">
                          <div className="stg-field">
                            <label className="stg-label">Full Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="stg-input" placeholder="Enter your full name" />
                          </div>
                          <div className="stg-field">
                            <label className="stg-label">Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="stg-input" placeholder="Enter your email" />
                          </div>
                        </div>
                        {profileError && <Alert type="error" message={profileError} />}
                        {profileSuccess && <Alert type="success" message={profileSuccess} />}
                        <div className="stg-form-actions">
                          <button type="submit" disabled={profileLoading} className="stg-btn stg-btn--primary">
                            {profileLoading && <svg className="stg-spinner" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                            {profileLoading ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Stats */}
                    <div className="stg-stats-grid">
                      {[
                        { label: 'Member Since', value: 'Jan 2025', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                        { label: 'Total Meetings', value: '24', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Active Tasks', value: '8', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                      ].map((s, i) => (
                        <div key={i} className="stg-stat-card">
                          <div className="stg-stat-icon"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg></div>
                          <span className="stg-stat-label">{s.label}</span>
                          <span className="stg-stat-value">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── SECURITY ── */}
                {activeSection === 'security' && (
                  <div className="stg-panel">
                    <div className="stg-card">
                      <div className="stg-card-header">
                        <div className="stg-card-header-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg></div>
                        <div><h2 className="stg-card-title">Change Password</h2><p className="stg-card-desc">Update your password to keep your account secure</p></div>
                      </div>
                      <form onSubmit={handlePasswordChange}>
                        <PassInput label="Current Password" value={currentPassword} onChange={(e: any) => setCurrentPassword(e.target.value)} show={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} placeholder="Enter current password" />
                        <div className="stg-form-grid" style={{ marginTop: 16 }}>
                          <PassInput label="New Password" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} placeholder="Enter new password" />
                          <PassInput label="Confirm Password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} placeholder="Confirm new password" />
                        </div>
                        {newPassword && (
                          <div className="stg-strength">
                            <div className="stg-strength-header"><span>Password Strength</span><span className="stg-strength-label">{newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Medium' : 'Weak'}</span></div>
                            <div className="stg-strength-bar"><div className={`stg-strength-fill ${newPassword.length >= 12 ? 'stg-strength--strong' : newPassword.length >= 8 ? 'stg-strength--medium' : 'stg-strength--weak'}`} /></div>
                          </div>
                        )}
                        {passwordError && <Alert type="error" message={passwordError} />}
                        {passwordSuccess && <Alert type="success" message={passwordSuccess} />}
                        <div className="stg-form-actions">
                          <button type="submit" disabled={passwordLoading} className="stg-btn stg-btn--primary">
                            {passwordLoading && <svg className="stg-spinner" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                          </button>
                        </div>
                      </form>
                    </div>
                    <div className="stg-row">
                      <div className="stg-card stg-card--half">
                        <div className="stg-card-header"><div className="stg-card-header-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div><div><h3 className="stg-card-title" style={{fontSize: '1rem'}}>Two-Factor Auth</h3><p className="stg-card-desc">Extra security layer</p></div></div>
                        <p className="stg-card-body-text">Add an authenticator app for enhanced security</p>
                        <button className="stg-btn stg-btn--secondary">Enable 2FA</button>
                      </div>
                      <div className="stg-card stg-card--half">
                        <div className="stg-card-header"><div className="stg-card-header-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div><div><h3 className="stg-card-title" style={{fontSize: '1rem'}}>Active Sessions</h3><p className="stg-card-desc">1 device logged in</p></div></div>
                        <div className="stg-session-badge"><span>Current Device</span><span className="stg-session-active">Active</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── NOTIFICATIONS ── */}
                {activeSection === 'notifications' && (
                  <div className="stg-panel">
                    {[
                      { title: 'Email Notifications', desc: 'Configure email alert preferences', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', items: [
                        { id: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates and alerts via email' },
                        { id: 'meetingReminders', label: 'Meeting Reminders', desc: 'Get notified before scheduled meetings' },
                        { id: 'taskDeadlines', label: 'Task Deadlines', desc: 'Alerts for upcoming task deadlines' },
                        { id: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your weekly activity' },
                      ]},
                      { title: 'Push Notifications', desc: 'Browser and device notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', items: [
                        { id: 'pushNotifications', label: 'Push Notifications', desc: 'Enable browser push notifications' },
                        { id: 'soundEnabled', label: 'Sound Alerts', desc: 'Play sound for notifications' },
                      ]},
                    ].map((group) => (
                      <div key={group.title} className="stg-card">
                        <div className="stg-card-header">
                          <div className="stg-card-header-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={group.icon} /></svg></div>
                          <div><h2 className="stg-card-title">{group.title}</h2><p className="stg-card-desc">{group.desc}</p></div>
                        </div>
                        <div className="stg-toggle-list">
                          {group.items.map((item) => (
                            <div key={item.id} className="stg-toggle-row">
                              <div><p className="stg-toggle-label">{item.label}</p><p className="stg-toggle-desc">{item.desc}</p></div>
                              <Toggle on={!!notifications[item.id as keyof NotificationSettings]} onToggle={() => handleNotificationChange(item.id as keyof NotificationSettings)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── PREFERENCES ── */}
                {activeSection === 'preferences' && (
                  <div className="stg-panel">
                    <div className="stg-card">
                      <div className="stg-card-header">
                        <div className="stg-card-header-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg></div>
                        <div><h2 className="stg-card-title">Appearance</h2><p className="stg-card-desc">Customize the look and feel</p></div>
                      </div>
                      <div className="stg-theme-grid">
                        {[
                          { id: 'light', label: 'Light', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                          { id: 'dark', label: 'Dark', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
                          { id: 'system', label: 'System', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                        ].map((t) => (
                          <button key={t.id} onClick={() => handleAppearanceChange('theme', t.id as any)} className={`stg-theme-btn ${appearance.theme === t.id ? 'stg-theme-btn--active' : ''}`}>
                            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={t.icon} /></svg>
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="stg-divider" />
                      <div className="stg-toggle-list">
                        {[{ id: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing for a denser interface' }, { id: 'showAnimations', label: 'Animations', desc: 'Enable smooth transitions and effects' }].map((item) => (
                          <div key={item.id} className="stg-toggle-row">
                            <div><p className="stg-toggle-label">{item.label}</p><p className="stg-toggle-desc">{item.desc}</p></div>
                            <Toggle on={!!appearance[item.id as keyof AppearanceSettings]} onToggle={() => handleAppearanceChange(item.id as any, !appearance[item.id as keyof AppearanceSettings])} />
                          </div>
                        ))}
                      </div>
                      <div className="stg-divider" />
                      <div className="stg-field"><label className="stg-label">Language</label>
                        <select value={appearance.language} onChange={(e) => handleAppearanceChange('language', e.target.value)} className="stg-input"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option></select>
                      </div>
                      <div className="stg-form-grid" style={{marginTop: 16}}>
                        <div className="stg-field"><label className="stg-label">Timezone</label><select value={appearance.timezone} onChange={(e) => handleAppearanceChange('timezone', e.target.value)} className="stg-input"><option value="UTC">UTC</option><option value="America/New_York">Eastern Time</option><option value="America/Chicago">Central Time</option><option value="America/Los_Angeles">Pacific Time</option></select></div>
                        <div className="stg-field"><label className="stg-label">Date Format</label><select value={appearance.dateFormat} onChange={(e) => handleAppearanceChange('dateFormat', e.target.value)} className="stg-input"><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PRIVACY ── */}
                {activeSection === 'privacy' && (
                  <div className="stg-panel">
                    <div className="stg-card">
                      <div className="stg-card-header"><div className="stg-card-header-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></div><div><h2 className="stg-card-title">Profile Visibility</h2><p className="stg-card-desc">Control who can see your profile</p></div></div>
                      <div className="stg-radio-group">
                        {[{ id: 'public', label: 'Public', desc: 'Anyone can see your profile' }, { id: 'team', label: 'Team Only', desc: 'Only team members can see your profile' }, { id: 'private', label: 'Private', desc: 'Only you can see your profile' }].map((opt) => (
                          <label key={opt.id} className={`stg-radio-option ${privacy.profileVisibility === opt.id ? 'stg-radio-option--active' : ''}`}>
                            <input type="radio" name="vis" checked={privacy.profileVisibility === opt.id} onChange={() => handlePrivacyChange('profileVisibility', opt.id as any)} className="stg-radio-input" />
                            <div><p className="stg-toggle-label">{opt.label}</p><p className="stg-toggle-desc">{opt.desc}</p></div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="stg-card">
                      <h3 className="stg-card-title" style={{marginBottom: 20}}>Privacy Preferences</h3>
                      <div className="stg-toggle-list">
                        {[{ id: 'showActivity', label: 'Show Activity Status', desc: "Let others see when you're online" }, { id: 'showEmail', label: 'Show Email Address', desc: 'Display your email on your profile' }, { id: 'analyticsEnabled', label: 'Usage Analytics', desc: 'Help improve the app with usage data' }].map((item) => (
                          <div key={item.id} className="stg-toggle-row"><div><p className="stg-toggle-label">{item.label}</p><p className="stg-toggle-desc">{item.desc}</p></div><Toggle on={!!privacy[item.id as keyof PrivacySettings]} onToggle={() => handlePrivacyChange(item.id as any, !privacy[item.id as keyof PrivacySettings])} /></div>
                        ))}
                      </div>
                    </div>
                    <div className="stg-card">
                      <h3 className="stg-card-title" style={{marginBottom: 20}}>Data Management</h3>
                      <div className="stg-action-list">
                        <button onClick={handleExportData} className="stg-action-btn"><div className="stg-action-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></div><div><p className="stg-toggle-label">Export Your Data</p><p className="stg-toggle-desc">Download all your data in JSON format</p></div><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stg-action-arrow"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                        <button onClick={handleClearCache} className="stg-action-btn"><div className="stg-action-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div><div><p className="stg-toggle-label">Clear Cache</p><p className="stg-toggle-desc">Remove all locally stored data</p></div><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stg-action-arrow"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                      </div>
                    </div>
                    <div className="stg-card stg-card--danger">
                      <div className="stg-card-header"><div className="stg-danger-icon"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><div><h3 className="stg-card-title" style={{color: '#991b1b'}}>Danger Zone</h3><p className="stg-card-desc" style={{color: '#b91c1c'}}>Irreversible and destructive actions</p></div></div>
                      <button onClick={handleDeleteAccount} className="stg-danger-btn"><div><p style={{fontWeight: 700, fontSize: '.875rem', color: '#991b1b'}}>Delete Account</p><p style={{fontSize: '.75rem', color: '#b91c1c', marginTop: 2}}>Permanently delete your account and all data</p></div><svg width="20" height="20" fill="none" stroke="#dc2626" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                )}

              </main>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .DB{min-height:100vh;background:linear-gradient(160deg,#f8fafc 0%,#f1f5f9 40%,#e2e8f0 100%);font-family:'Inter',system-ui,sans-serif;color:#1e293b}
        *{box-sizing:border-box}

        @keyframes stgFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes stgSlideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}

        /* HEADER (unchanged from dashboard) */
        .DB-hdr{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.88);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid rgba(226,232,240,.5);padding:0 36px;height:68px;display:flex;align-items:center;justify-content:space-between}
        .DB-hdr-l{display:flex;align-items:center}
        .DB-logo{display:flex;align-items:center;gap:9px;border:none;background:none;cursor:pointer;font-family:inherit;color:#0f172a;transition:transform .2s}
        .DB-logo:hover{transform:scale(1.02)}
        .DB-logo span{font-size:1rem;font-weight:800;letter-spacing:-.03em}
        .DB-hdr-r{display:flex;align-items:center;gap:6px}
        .DB-hdr-btn{width:36px;height:36px;border-radius:10px;border:none;background:none;display:flex;align-items:center;justify-content:center;color:#475569;cursor:pointer;transition:all .2s;position:relative}
        .DB-hdr-btn:hover{background:#f1f5f9;color:#0f172a;transform:scale(1.05)}
        .DB-hdr-btn.is-active{background:rgba(15,23,42,.06);color:#0f172a}
        .DB-apps-launcher{position:relative}
        .DB-apps-dropdown{position:absolute;right:0;top:calc(100% + 14px);width:260px;background:#fff;border-radius:20px;border:1px solid rgba(226,232,240,.8);box-shadow:0 10px 40px -10px rgba(15,23,42,.15),0 4px 12px rgba(15,23,42,.05);overflow:hidden;animation:appsG .3s cubic-bezier(.16,1,.3,1);z-index:200;transform-origin:top right}
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
        .DB-av{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#0f172a,#334155);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;color:white;transition:all .2s}
        .DB-av--lg{width:38px;height:38px;font-size:.9rem}
        .DB-av-btn:hover .DB-av{opacity:.85;transform:scale(1.05)}
        .DB-dd{position:absolute;right:0;top:calc(100% + 6px);width:224px;background:white;border-radius:16px;border:1px solid rgba(226,232,240,.8);box-shadow:0 20px 60px rgba(15,23,42,.12),0 4px 12px rgba(15,23,42,.04);overflow:hidden;animation:ddA .2s cubic-bezier(.16,1,.3,1);z-index:200}
        @keyframes ddA{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}
        .DB-dd-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-bottom:1px solid #f1f5f9}
        .DB-dd-head b{display:block;font-size:.8rem;color:#0f172a}
        .DB-dd-head small{display:block;font-size:.68rem;color:#94a3b8;margin-top:1px}
        .DB-dd hr{border:none;height:1px;background:#f1f5f9;margin:0}
        .DB-dd button{width:100%;display:flex;align-items:center;gap:8px;padding:10px 16px;border:none;background:none;font-size:.78rem;font-weight:600;color:#475569;cursor:pointer;transition:all .15s;font-family:inherit;text-align:left}
        .DB-dd button:hover{background:#f8fafc;color:#0f172a}
        .DB-dd button svg{width:16px;height:16px;flex-shrink:0}
        .DB-dd-out{color:#94a3b8!important}
        .DB-dd-out:hover{color:#dc2626!important;background:#fef2f2!important}
        .DB-content{padding:28px 40px 56px;display:flex;flex-direction:column;gap:28px}
        .DB-hdr-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#1e293b;color:white;font-size:.55rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px}
        .DB-hdr-time{font-size:.72rem;font-weight:600;color:#94a3b8;margin-right:8px;padding:5px 12px;background:#f8fafc;border-radius:8px}

        /* ── SETTINGS PAGE STYLES ── */
        .stg-container{max-width:1200px;margin:0 auto;width:100%;animation:stgFadeUp .5s ease-out}
        .stg-page-header{display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:20px;padding:24px 32px;box-shadow:0 1px 3px rgba(15,23,42,.04),0 4px 12px rgba(15,23,42,.03);border:1px solid rgba(226,232,240,.5);margin-bottom:28px}
        .stg-page-header-left{display:flex;align-items:center;gap:16px}
        .stg-page-icon{width:52px;height:52px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 12px rgba(15,23,42,.2);flex-shrink:0}
        .stg-page-title{font-size:1.5rem;font-weight:800;color:#0f172a;letter-spacing:-.03em;margin:0}
        .stg-page-subtitle{font-size:.875rem;color:#64748b;font-weight:500;margin:4px 0 0}
        .stg-back-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#475569;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .stg-back-btn:hover{background:#f8fafc;color:#0f172a;border-color:#cbd5e1}

        /* Layout */
        .stg-layout{display:grid;grid-template-columns:260px 1fr;gap:28px}
        @media(max-width:1024px){.stg-layout{grid-template-columns:1fr}.stg-sidebar{position:static}}

        /* Sidebar */
        .stg-sidebar{position:sticky;top:96px;height:fit-content}
        .stg-nav{background:#fff;border-radius:16px;padding:8px;box-shadow:0 1px 3px rgba(15,23,42,.04),0 4px 12px rgba(15,23,42,.03);border:1px solid rgba(226,232,240,.5)}
        .stg-nav-item{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border:none;border-radius:12px;background:none;cursor:pointer;transition:all .2s;font-family:inherit;text-align:left;position:relative;animation:stgFadeUp .4s ease-out both}
        .stg-nav-item:hover{background:#f8fafc}
        .stg-nav-item--active{background:linear-gradient(135deg,#0f172a,#1e293b)!important;box-shadow:0 4px 16px rgba(15,23,42,.2)}
        .stg-nav-icon{width:36px;height:36px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b;transition:all .2s;flex-shrink:0}
        .stg-nav-item--active .stg-nav-icon{background:rgba(255,255,255,.15);color:#fff}
        .stg-nav-item:hover .stg-nav-icon{background:#e2e8f0;color:#334155}
        .stg-nav-item--active:hover .stg-nav-icon{background:rgba(255,255,255,.2);color:#fff}
        .stg-nav-text{display:flex;flex-direction:column;min-width:0}
        .stg-nav-label{font-size:.8rem;font-weight:700;color:#334155;transition:color .2s}
        .stg-nav-item--active .stg-nav-label{color:#fff}
        .stg-nav-desc{font-size:.68rem;color:#94a3b8;margin-top:1px;transition:color .2s}
        .stg-nav-item--active .stg-nav-desc{color:rgba(255,255,255,.6)}
        .stg-nav-indicator{position:absolute;right:12px;width:6px;height:6px;border-radius:50%;background:#fff;opacity:.8}

        /* User Card */
        .stg-user-card{margin-top:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;padding:20px;color:#fff;box-shadow:0 4px 20px rgba(15,23,42,.25);display:flex;align-items:center;gap:12px;position:relative;overflow:hidden}
        .stg-user-card::before{content:'';position:absolute;top:-30px;right:-30px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.04)}
        .stg-user-card-avatar{width:42px;height:42px;background:rgba(255,255,255,.12);backdrop-filter:blur(12px);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;border:1px solid rgba(255,255,255,.15);flex-shrink:0}
        .stg-user-card-info{flex:1;min-width:0}
        .stg-user-card-name{font-size:.85rem;font-weight:700;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .stg-user-card-email{font-size:.7rem;color:rgba(255,255,255,.55);margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .stg-user-card-badge{padding:3px 10px;background:rgba(255,255,255,.12);border-radius:20px;font-size:.65rem;font-weight:700;letter-spacing:.05em;border:1px solid rgba(255,255,255,.1)}

        /* Main Content */
        .stg-main{min-width:0}
        .stg-panel{display:flex;flex-direction:column;gap:20px;animation:stgSlideIn .4s ease-out}

        /* Cards */
        .stg-card{background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(15,23,42,.04),0 4px 12px rgba(15,23,42,.03);border:1px solid rgba(226,232,240,.5);transition:box-shadow .3s}
        .stg-card:hover{box-shadow:0 2px 8px rgba(15,23,42,.06),0 8px 24px rgba(15,23,42,.05)}
        .stg-card--profile{padding:0;overflow:hidden}
        .stg-card--half{flex:1;min-width:0}
        .stg-card--danger{background:#fef2f2;border-color:#fecaca}
        .stg-row{display:flex;gap:20px}
        @media(max-width:768px){.stg-row{flex-direction:column}}

        .stg-card-header{display:flex;align-items:flex-start;gap:14px;margin-bottom:24px}
        .stg-card-header-icon{width:42px;height:42px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#475569;flex-shrink:0}
        .stg-card-title{font-size:1.15rem;font-weight:800;color:#0f172a;margin:0;letter-spacing:-.02em}
        .stg-card-desc{font-size:.8rem;color:#64748b;margin:3px 0 0;font-weight:500}
        .stg-card-body-text{font-size:.85rem;color:#64748b;margin-bottom:16px}

        /* Profile Card */
        .stg-profile-banner{height:80px;background:linear-gradient(135deg,#0f172a 0%,#334155 50%,#475569 100%);position:relative}
        .stg-profile-banner::after{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='white' fill-opacity='0.08'/%3E%3C/svg%3E")}
        .stg-profile-body{padding:0 28px 28px}
        .stg-profile-avatar{width:72px;height:72px;background:linear-gradient(135deg,#334155,#0f172a);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:1.75rem;font-weight:800;color:white;margin-top:-36px;border:4px solid #fff;box-shadow:0 4px 16px rgba(15,23,42,.2);position:relative}

        /* Form */
        .stg-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        @media(max-width:640px){.stg-form-grid{grid-template-columns:1fr}}
        .stg-field{display:flex;flex-direction:column;gap:6px;margin-bottom:4px}
        .stg-label{font-size:.8rem;font-weight:700;color:#334155}
        .stg-input{width:100%;padding:11px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;font-size:.875rem;color:#0f172a;font-family:inherit;transition:all .2s;outline:none}
        .stg-input:focus{border-color:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,.15);background:#fff}
        .stg-input::placeholder{color:#94a3b8}
        .stg-input-wrap{position:relative}
        .stg-input-wrap .stg-input{padding-right:44px}
        .stg-input-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:none;background:none;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;cursor:pointer;transition:all .2s}
        .stg-input-eye:hover{background:#f1f5f9;color:#475569}
        .stg-form-actions{display:flex;justify-content:flex-end;padding-top:20px;margin-top:20px;border-top:1px solid #f1f5f9}

        /* Buttons */
        .stg-btn{padding:10px 22px;border-radius:12px;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;display:flex;align-items:center;gap:8px;border:none}
        .stg-btn--primary{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;box-shadow:0 2px 8px rgba(15,23,42,.2)}
        .stg-btn--primary:hover{box-shadow:0 4px 16px rgba(15,23,42,.3);transform:translateY(-1px)}
        .stg-btn--primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .stg-btn--secondary{background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;width:100%;justify-content:center}
        .stg-btn--secondary:hover{background:#e2e8f0;color:#0f172a}
        .stg-spinner{width:16px;height:16px;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* Alerts */
        .stg-alert{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;font-size:.8rem;font-weight:600;margin-top:12px}
        .stg-alert--error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
        .stg-alert--success{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}

        /* Toggle */
        .stg-toggle{position:relative;width:44px;height:24px;border-radius:12px;border:none;background:#cbd5e1;cursor:pointer;transition:all .25s;flex-shrink:0;padding:0}
        .stg-toggle--on{background:linear-gradient(135deg,#334155,#0f172a);box-shadow:0 2px 8px rgba(15,23,42,.2)}
        .stg-toggle-dot{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.15);transition:transform .25s cubic-bezier(.4,.0,.2,1)}
        .stg-toggle--on .stg-toggle-dot{transform:translateX(20px)}
        .stg-toggle-list{display:flex;flex-direction:column;gap:2px}
        .stg-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:12px;transition:background .2s}
        .stg-toggle-row:hover{background:#f8fafc}
        .stg-toggle-label{font-size:.85rem;font-weight:700;color:#1e293b;margin:0}
        .stg-toggle-desc{font-size:.75rem;color:#94a3b8;margin:3px 0 0;font-weight:500}

        /* Stats */
        .stg-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        @media(max-width:640px){.stg-stats-grid{grid-template-columns:1fr}}
        .stg-stat-card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(15,23,42,.04);border:1px solid rgba(226,232,240,.5);text-align:center;transition:all .2s}
        .stg-stat-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(15,23,42,.08)}
        .stg-stat-icon{width:40px;height:40px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#64748b;margin:0 auto 12px}
        .stg-stat-label{display:block;font-size:.72rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
        .stg-stat-value{display:block;font-size:1.25rem;font-weight:800;color:#0f172a;margin-top:4px}

        /* Theme grid */
        .stg-theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        .stg-theme-btn{padding:24px 16px;border-radius:14px;border:2px solid #e2e8f0;background:#fff;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:10px;font-family:inherit;color:#64748b}
        .stg-theme-btn:hover{border-color:#cbd5e1;background:#f8fafc}
        .stg-theme-btn--active{border-color:#0f172a;background:#0f172a;color:#fff!important;box-shadow:0 4px 16px rgba(15,23,42,.25)}
        .stg-theme-btn span{font-size:.8rem;font-weight:700}

        /* Radio */
        .stg-radio-group{display:flex;flex-direction:column;gap:8px}
        .stg-radio-option{display:flex;align-items:center;gap:14px;padding:16px 18px;border:2px solid #e2e8f0;border-radius:14px;cursor:pointer;transition:all .2s}
        .stg-radio-option:hover{border-color:#cbd5e1;background:#f8fafc}
        .stg-radio-option--active{border-color:#0f172a;background:#f8fafc;box-shadow:0 2px 8px rgba(15,23,42,.08)}
        .stg-radio-input{width:18px;height:18px;accent-color:#0f172a;flex-shrink:0}

        /* Actions */
        .stg-action-list{display:flex;flex-direction:column;gap:8px}
        .stg-action-btn{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;cursor:pointer;transition:all .2s;font-family:inherit;text-align:left;width:100%}
        .stg-action-btn:hover{background:#f1f5f9;border-color:#cbd5e1}
        .stg-action-icon{width:40px;height:40px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#64748b;border:1px solid #e2e8f0;flex-shrink:0}
        .stg-action-arrow{margin-left:auto;color:#cbd5e1;transition:all .2s}
        .stg-action-btn:hover .stg-action-arrow{color:#64748b;transform:translateX(2px)}

        /* Session */
        .stg-session-badge{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:.85rem;font-weight:600;color:#166534}
        .stg-session-active{padding:2px 10px;background:#dcfce7;border-radius:20px;font-size:.7rem;font-weight:700;color:#15803d}

        /* Danger */
        .stg-danger-icon{width:42px;height:42px;background:#fee2e2;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#dc2626;flex-shrink:0}
        .stg-danger-btn{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#fff;border:2px solid #fca5a5;border-radius:14px;cursor:pointer;transition:all .2s;font-family:inherit;text-align:left;width:100%}
        .stg-danger-btn:hover{background:#fef2f2;border-color:#f87171}

        /* Password strength */
        .stg-strength{padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-top:16px}
        .stg-strength-header{display:flex;justify-content:space-between;margin-bottom:8px;font-size:.8rem;font-weight:600;color:#64748b}
        .stg-strength-label{font-weight:800;color:#0f172a}
        .stg-strength-bar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}
        .stg-strength-fill{height:100%;border-radius:3px;transition:all .4s}
        .stg-strength--weak{width:33%;background:#ef4444}
        .stg-strength--medium{width:66%;background:#f59e0b}
        .stg-strength--strong{width:100%;background:#22c55e}

        .stg-divider{height:1px;background:#f1f5f9;margin:20px 0}

        /* Dark mode */
        .dark .DB{background:linear-gradient(160deg,#0f172a,#1e293b)}
        .dark .DB-hdr{background:rgba(15,23,42,.88);border-color:rgba(30,41,59,.6)}
        .dark .DB-logo{color:#f8fafc}
        .dark .DB-hdr-btn{color:#cbd5e1}
        .dark .DB-hdr-btn:hover{background:#1e293b;color:#fff}
        .dark .stg-page-header,.dark .stg-card,.dark .stg-nav,.dark .stg-stat-card{background:#1e293b;border-color:rgba(51,65,85,.5);color:#e2e8f0}
        .dark .stg-page-title,.dark .stg-card-title,.dark .stg-toggle-label,.dark .stg-stat-value,.dark .stg-nav-label{color:#f1f5f9}
        .dark .stg-input{background:#0f172a;border-color:#334155;color:#f1f5f9}
        .dark .stg-input:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.2)}
        .dark .stg-toggle-row:hover,.dark .stg-nav-item:hover{background:rgba(51,65,85,.4)}
        .dark .stg-theme-btn{background:#0f172a;border-color:#334155;color:#94a3b8}
        .dark .stg-action-btn{background:#0f172a;border-color:#334155}

        @media(max-width:768px){
          .DB-hdr{padding:0 16px;height:56px}
          .DB-content{padding:16px 16px 40px}
          .stg-page-header{padding:16px 20px;flex-direction:column;gap:12px;align-items:flex-start}
          .stg-stats-grid{grid-template-columns:1fr}
          .stg-theme-grid{grid-template-columns:1fr}
          .stg-form-grid{grid-template-columns:1fr}
        }
      `}</style>
    </>
  );
};

export default Settings;
