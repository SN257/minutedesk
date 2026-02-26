import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, changeUserPassword } from '../services/api';
import { useSettings } from '../contexts/SettingsContext';
import type { AppearanceSettings, NotificationSettings, PrivacySettings } from '../contexts/SettingsContext';

// Local interfaces removed as they are now in SettingsContext

const Settings = () => {
  const nav = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const {
    notifications,
    appearance,
    privacy,
    updateNotifications,
    updateAppearance,
    updatePrivacy
  } = useSettings();

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

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await updateUserProfile({ name, email });
      await refreshUser();
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setPasswordLoading(false);
      return;
    }

    try {
      await changeUserPassword({ currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    updateNotifications({ [key]: !notifications[key] });
    showSettingsSaved();
  };

  const handleAppearanceChange = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    updateAppearance({ [key]: value });
    showSettingsSaved();
  };

  const handlePrivacyChange = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    updatePrivacy({ [key]: value });
    showSettingsSaved();
  };

  const showSettingsSaved = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleExportData = () => {
    try {
      const data = {
        user: {
          name: user?.name,
          email: user?.email,
        },
        settings: {
          notifications,
          appearance,
          privacy,
        },
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `minutedesk-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Your data has been exported successfully!');
    } catch (error) {
      alert('Failed to export data. Please try again.');
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cached data? This will log you out and reset all settings.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
    );

    if (confirmed) {
      const doubleCheck = window.confirm(
        'This is your final warning. Type DELETE in the next prompt to confirm account deletion.'
      );

      if (doubleCheck) {
        const userInput = prompt('Type DELETE to confirm:');
        if (userInput === 'DELETE') {
          try {
            // TODO: Implement actual delete account API call
            // await deleteAccount();
            alert('Account deletion functionality will be implemented soon. Your account has NOT been deleted.');
          } catch (error) {
            alert('Failed to delete account. Please contact support.');
          }
        } else {
          alert('Account deletion cancelled. Please type DELETE exactly to confirm.');
        }
      }
    }
  };

  const sections = [
    { id: 'account' as const, label: 'Account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'security' as const, label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'notifications' as const, label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'preferences' as const, label: 'Preferences', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'privacy' as const, label: 'Privacy', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  ];

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

        {/* Content Area */}
        <div className="DB-content pt-[100px]">
          <div className="max-w-7xl mx-auto space-y-6 w-full">
            {/* Page Header - Match Reports style */}
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 animate-slideDown relative z-20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your account preferences and configuration</p>
                </div>
              </div>
            </div>

            {/* Main Layout - Split View */}
            <div className="grid lg:grid-cols-[280px,1fr] gap-8">

              {/* Sidebar Navigation */}
              <aside className="lg:sticky lg:top-24 h-fit">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-2 space-y-1 transition-colors duration-300">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${activeSection === section.id
                        ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-800/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <svg className={`w-5 h-5 transition-colors ${activeSection === section.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                      </svg>
                      <span className="font-medium">{section.label}</span>
                      {activeSection === section.id && (
                        <svg className="w-4 h-4 ml-auto text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                {/* User Info Card */}
                <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-lg font-bold border border-white/20">
                      {user?.name?.charAt(0) || user?.email?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-slate-300 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Account Type</span>
                      <span className="font-semibold">Professional</span>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Content Area */}
              <div className="space-y-6">

                {/* Account Section */}
                {activeSection === 'account' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

                    {/* Profile Header Card */}
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden transition-colors">
                      <div className="h-24 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 relative">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                      </div>
                      <div className="px-8 pb-8">
                        <div className="relative -mt-12 mb-6">
                          <div className="inline-block relative">
                            <div className="w-24 h-24 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl border-4 border-white dark:border-slate-700">
                              {name ? name.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase()}
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Personal Information</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Update your account details and profile information</p>
                      </div>
                    </div>

                    {/* Profile Form */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                              placeholder="Enter your full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                              placeholder="Enter your email"
                            />
                          </div>
                        </div>

                        {profileError && (
                          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{profileError}</span>
                          </div>
                        )}
                        {profileSuccess && (
                          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-400">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{profileSuccess}</span>
                          </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                          <button
                            type="submit"
                            disabled={profileLoading}
                            className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold rounded-xl hover:from-slate-900 hover:to-slate-900 transition-all shadow-lg shadow-slate-800/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {profileLoading && (
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            <span>{profileLoading ? 'Saving Changes...' : 'Save Changes'}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Account Stats */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-5 transition-colors duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Member Since</span>
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">Jan 2025</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-5 transition-colors duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Meetings</span>
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">24</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-5 transition-colors duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Tasks</span>
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">8</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Section */}
                {activeSection === 'security' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

                    {/* Password Change Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Update your password to keep your account secure</p>
                        </div>
                      </div>

                      <form onSubmit={handlePasswordChange} className="space-y-5">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white pr-11"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            >
                              {showCurrentPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white pr-11"
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                              >
                                {showNewPassword ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm Password</label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white pr-11"
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                              >
                                {showConfirmPassword ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {newPassword && (
                          <div className="p-5 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password Strength</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Medium' : 'Weak'}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 rounded-full ${newPassword.length >= 12 ? 'bg-emerald-500 w-full' :
                                  newPassword.length >= 8 ? 'bg-amber-500 w-2/3' :
                                    'bg-red-500 w-1/3'
                                  }`}
                              />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Use at least 8 characters including numbers and symbols</p>
                          </div>
                        )}

                        {passwordError && (
                          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{passwordError}</span>
                          </div>
                        )}
                        {passwordSuccess && (
                          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-400">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{passwordSuccess}</span>
                          </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold rounded-xl hover:from-slate-900 hover:to-slate-900 transition-all shadow-lg shadow-slate-800/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {passwordLoading && (
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Two-Factor & Sessions */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                            <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Two-Factor Auth</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Extra security layer</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Add an authenticator app for enhanced security</p>
                        <button className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                          Enable 2FA
                        </button>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6 transition-colors duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                            <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Sessions</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">1 device logged in</p>
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-emerald-900 dark:text-emerald-400">Current Device</span>
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-full">Active</span>
                          </div>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-1">macOS • Safari</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Section */}
                {activeSection === 'notifications' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

                    {/* Email Notifications */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Email Notifications</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Configure email alert preferences</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[
                          { id: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates and alerts via email' },
                          { id: 'meetingReminders', label: 'Meeting Reminders', desc: 'Get notified before scheduled meetings' },
                          { id: 'taskDeadlines', label: 'Task Deadlines', desc: 'Alerts for upcoming task deadlines' },
                          { id: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your weekly activity' },
                        ].map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700 last:border-0 group hover:bg-slate-50/50 dark:hover:bg-slate-700/50 px-4 -mx-4 rounded-lg transition-colors">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => handleNotificationChange(item.id as keyof NotificationSettings)}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${notifications[item.id as keyof NotificationSettings] ? 'bg-gradient-to-r from-slate-700 to-slate-900 shadow-lg' : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${notifications[item.id as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Push Notifications */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Push Notifications</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Browser and device notifications</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[
                          { id: 'pushNotifications', label: 'Push Notifications', desc: 'Enable browser push notifications' },
                          { id: 'soundEnabled', label: 'Sound Alerts', desc: 'Play sound for notifications' },
                        ].map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700 last:border-0 group hover:bg-slate-50/50 dark:hover:bg-slate-700/50 px-4 -mx-4 rounded-lg transition-colors">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => handleNotificationChange(item.id as keyof NotificationSettings)}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${notifications[item.id as keyof NotificationSettings] ? 'bg-gradient-to-r from-slate-700 to-slate-900 shadow-lg' : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${notifications[item.id as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Section */}
                {activeSection === 'preferences' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

                    {/* Theme Selection */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Appearance</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Customize the look and feel</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-8">
                        {[
                          { id: 'light', label: 'Light', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                          { id: 'dark', label: 'Dark', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
                          { id: 'system', label: 'System', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                        ].map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => handleAppearanceChange('theme', theme.id as any)}
                            className={`p-6 rounded-xl border-2 transition-all group ${appearance.theme === theme.id
                              ? 'border-slate-900 bg-slate-900 shadow-xl shadow-slate-900/20 dark:border-slate-600 dark:bg-slate-700'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md'
                              }`}
                          >
                            <svg className={`w-7 h 7 mx-auto mb-3 ${appearance.theme === theme.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={theme.icon} />
                            </svg>
                            <p className={`text-sm font-semibold ${appearance.theme === theme.id ? 'text-white' : 'text-slate-700'}`}>
                              {theme.label}
                            </p>
                          </button>
                        ))}
                      </div>

                      {/* Display Options */}
                      <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-700">
                        {[
                          { id: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing for a denser interface' },
                          { id: 'showAnimations', label: 'Animations', desc: 'Enable smooth transitions and effects' },
                        ].map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => handleAppearanceChange(item.id as any, !appearance[item.id as keyof AppearanceSettings])}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${appearance[item.id as keyof AppearanceSettings] ? 'bg-gradient-to-r from-slate-700 to-slate-900 shadow-lg' : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${appearance[item.id as keyof AppearanceSettings] ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Language & Region */}
                      <div className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Language</label>
                          <select
                            value={appearance.language}
                            onChange={(e) => handleAppearanceChange('language', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white"
                          >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                          </select>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Timezone</label>
                            <select
                              value={appearance.timezone}
                              onChange={(e) => handleAppearanceChange('timezone', e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white"
                            >
                              <option value="UTC">UTC</option>
                              <option value="America/New_York">Eastern Time</option>
                              <option value="America/Chicago">Central Time</option>
                              <option value="America/Los_Angeles">Pacific Time</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Date Format</label>
                            <select
                              value={appearance.dateFormat}
                              onChange={(e) => handleAppearanceChange('dateFormat', e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 focus:border-transparent transition-all text-slate-900 dark:text-white"
                            >
                              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Section */}
                {activeSection === 'privacy' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

                    {/* Profile Visibility */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                          <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Visibility</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Control who can see your profile</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { id: 'public', label: 'Public', desc: 'Anyone can see your profile' },
                          { id: 'team', label: 'Team Only', desc: 'Only team members can see your profile' },
                          { id: 'private', label: 'Private', desc: 'Only you can see your profile' },
                        ].map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-center p-5 rounded-xl border-2 cursor-pointer transition-all ${privacy.profileVisibility === option.id
                              ? 'border-slate-900 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 shadow-md'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-700/50'
                              }`}
                          >
                            <input
                              type="radio"
                              name="visibility"
                              checked={privacy.profileVisibility === option.id}
                              onChange={() => handlePrivacyChange('profileVisibility', option.id as any)}
                              className="w-5 h-5 text-slate-900 border-slate-300 focus:ring-slate-900 focus:ring-2"
                            />
                            <div className="ml-4 flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{option.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{option.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Privacy Options */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Privacy Preferences</h3>
                      <div className="space-y-4">
                        {[
                          { id: 'showActivity', label: 'Show Activity Status', desc: 'Let others see when you\'re online' },
                          { id: 'showEmail', label: 'Show Email Address', desc: 'Display your email on your profile' },
                          { id: 'analyticsEnabled', label: 'Usage Analytics', desc: 'Help improve the app with usage data' },
                        ].map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700 last:border-0 group hover:bg-slate-50/50 dark:hover:bg-slate-700/50 px-4 -mx-4 rounded-lg transition-colors">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => handlePrivacyChange(item.id as any, !privacy[item.id as keyof PrivacySettings])}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${privacy[item.id as keyof PrivacySettings] ? 'bg-gradient-to-r from-slate-700 to-slate-900 shadow-lg' : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${privacy[item.id as keyof PrivacySettings] ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Data Management */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-8 transition-colors duration-300">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Data Management</h3>
                      <div className="space-y-3">
                        <button
                          onClick={handleExportData}
                          className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all group border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white dark:bg-slate-600 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-500 group-hover:border-slate-300 dark:group-hover:border-slate-400 transition-colors">
                              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Export Your Data</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Download all your data in JSON format</p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleClearCache}
                          className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all group border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white dark:bg-slate-600 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-500 group-hover:border-slate-300 dark:group-hover:border-slate-400 transition-colors">
                              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Clear Cache</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Remove all locally stored data</p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border-2 border-red-200 dark:border-red-800 p-8 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-red-900 dark:text-red-400">Danger Zone</h3>
                          <p className="text-sm text-red-700 dark:text-red-400/80">Irreversible and destructive actions</p>
                        </div>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-2 border-red-300 dark:border-red-900/50 group"
                      >
                        <div className="text-left">
                          <p className="text-sm font-bold text-red-900 dark:text-red-400">Delete Account</p>
                          <p className="text-xs text-red-700 dark:text-red-400/80 mt-0.5">Permanently delete your account and all data</p>
                        </div>
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          .DB{min-height:100vh;background:#f4f6f9;font-family:'Inter',system-ui,sans-serif;color:#1e293b}
          *{box-sizing:border-box}

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

          .DB-content{padding:28px 40px 56px;display:flex;flex-direction:column;gap:28px}
          
          /* Dark mode overrides (minimal matching) */
          .dark .DB { background: #0f172a; }
          .dark .DB-hdr { background: rgba(15,23,42,0.92); border-color: #1e293b; border-bottom-color: #1e293b; }
          .dark .DB-logo { color: #f8fafc }
          .dark .DB-hdr-btn { color: #cbd5e1 }
          .dark .DB-hdr-btn:hover { background: #1e293b; color: white }
      `}</style>
    </>
  );
};

export default Settings;
