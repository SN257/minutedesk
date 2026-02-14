import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, changeUserPassword } from '../services/api';

interface NotificationSettings {
  emailNotifications: boolean;
  meetingReminders: boolean;
  taskDeadlines: boolean;
  weeklyDigest: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showAnimations: boolean;
}

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance' | 'data'>('profile');

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

  // Notification settings (stored in localStorage for now)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    meetingReminders: true,
    taskDeadlines: true,
    weeklyDigest: false,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'light',
    compactMode: false,
    showAnimations: true,
  });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    // Load settings from localStorage
    const savedNotifications = localStorage.getItem('notificationSettings');
    const savedAppearance = localStorage.getItem('appearanceSettings');
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedAppearance) setAppearance(JSON.parse(savedAppearance));
  }, []);

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
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem('notificationSettings', JSON.stringify(updated));
  };

  const handleAppearanceChange = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    const updated = { ...appearance, [key]: value };
    setAppearance(updated);
    localStorage.setItem('appearanceSettings', JSON.stringify(updated));
  };

  const tabs = [
    {
      id: 'profile' as const, label: 'Profile', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'security' as const, label: 'Security', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    {
      id: 'notifications' as const, label: 'Notifications', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'appearance' as const, label: 'Appearance', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    {
      id: 'data' as const, label: 'Data & Privacy', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Decorative Elite Background */}
      <div className="fixed top-0 left-0 right-0 h-[400px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-500/10 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-700/10 rounded-full blur-[120px] -ml-64 -mb-64" />
      </div>

      {/* Glassmorphic Top Nav */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-slate-900 rounded-xl shadow-xl shadow-slate-900/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Account Settings</h1>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
                <span>Personal</span>
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                <span>Preferences</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Pro Account</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-200 shadow-md flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || user?.email?.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="sticky top-32 space-y-2">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">General Settings</p>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/30'
                    : 'text-slate-600 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`transition-colors duration-300 ${activeTab === tab.id ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-900'}`}>
                      {tab.icon}
                    </span>
                    <span className="font-semibold text-sm tracking-tight">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}

              <div className="mt-12 pt-12 border-t border-slate-200">
                <div className="bg-slate-900 rounded-[24px] p-6 text-white overflow-hidden relative shadow-2xl shadow-slate-900/30">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">MinuteDesk Premium</p>
                  <h4 className="text-lg font-bold leading-tight mb-4">You're on the Pro plan!</h4>
                  <button className="w-full py-2.5 bg-white text-slate-900 rounded-xl text-sm font-bold shadow-lg shadow-black/10 hover:bg-slate-100 transition-colors">
                    Manage Plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 max-w-4xl">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Profile Section */}
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="h-32 bg-slate-900 relative">
                      <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    </div>
                    <div className="px-10 pb-10">
                      <div className="relative -mt-16 flex items-end justify-between mb-8">
                        <div className="relative">
                          <div className="w-32 h-32 rounded-[32px] bg-white p-1.5 shadow-2xl">
                            <div className="w-full h-full rounded-[26px] bg-slate-900 flex items-center justify-center text-white text-4xl font-black shadow-inner">
                              {name ? name.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <button className="absolute bottom-1 right-1 p-2.5 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="mb-10">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Public Profile</h2>
                        <p className="text-slate-500 text-sm mt-1">This information will be visible to your team members.</p>
                      </div>

                      <form onSubmit={handleProfileUpdate} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/5 transition-all text-slate-900 font-semibold"
                              placeholder="Jane Doe"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/5 transition-all text-slate-900 font-semibold"
                              placeholder="jane@example.com"
                            />
                          </div>
                        </div>

                        {profileError && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-slate-900">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-sm font-bold tracking-tight">{profileError}</span>
                          </div>
                        )}
                        {profileSuccess && (
                          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-3">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-sm font-bold tracking-tight">{profileSuccess}</span>
                          </div>
                        )}

                        <div className="flex justify-end pt-4">
                          <button
                            type="submit"
                            disabled={profileLoading}
                            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-slate-900/40 transition-all disabled:opacity-50"
                          >
                            {profileLoading ? <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : null}
                            <span>{profileLoading ? 'Updating Profile...' : 'Save Settings'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {/* Security Section */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
                    <div className="flex items-center gap-5 mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center shadow-inner">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Security Credentials</h2>
                        <p className="text-slate-500 font-medium text-sm">Last changed 3 months ago</p>
                      </div>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/5 transition-all text-slate-900 font-semibold"
                            placeholder="••••••••••••"
                          />
                          <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showCurrentPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-slate-400 transition-all text-slate-900 font-semibold"
                              placeholder="••••••••••••"
                            />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {showNewPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-slate-400 transition-all text-slate-900 font-semibold"
                              placeholder="••••••••••••"
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {showConfirmPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                            </button>
                          </div>
                        </div>
                      </div>

                      {newPassword && (
                        <div className="p-6 bg-slate-50 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strength Protection</span>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                              {newPassword.length >= 12 ? 'Fortified' : newPassword.length >= 8 ? 'Moderate' : 'Vulnerable'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 bg-slate-900 ${newPassword.length >= 12 ? 'w-full' : newPassword.length >= 8 ? 'w-[60%]' : 'w-[30%]'}`} />
                          </div>
                        </div>
                      )}

                      {passwordError && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-slate-900">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-sm font-bold tracking-tight">{passwordError}</span>
                        </div>
                      )}
                      {passwordSuccess && (
                        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-3">
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-sm font-bold tracking-tight">{passwordSuccess}</span>
                        </div>
                      )}

                      <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-medium italic">Requirement: Min 8 chars, 1 symbol</p>
                        <button type="submit" disabled={passwordLoading} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:shadow-2xl hover:shadow-slate-900/40 transition-all disabled:opacity-50">
                          {passwordLoading ? <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : null}
                          <span>Update Password</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {/* Notifications Section */}
              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Notification Center</h2>
                    <p className="text-slate-500 font-medium text-sm mb-10">Choose when and how you want to be notified.</p>

                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { id: 'emailNotifications', label: 'Email Alerts', desc: 'Secure system logs and account heartbeat notifications.', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                        { id: 'meetingReminders', label: 'Collaboration Pings', desc: 'Real-time countdowns for scheduled collaborations.', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                        { id: 'taskDeadlines', label: 'Deadline Monitor', desc: 'System-wide monitoring of upcoming deliverable targets.', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { id: 'weeklyDigest', label: 'Performance Summary', desc: 'Consolidated performance metrics delivered to your inbox.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                      ].map((n) => (
                        <div key={n.id} className="group flex items-center justify-between p-6 rounded-[28px] border-2 border-slate-50 hover:bg-slate-50/50 hover:border-slate-100 transition-all cursor-pointer" onClick={() => handleNotificationChange(n.id as any)}>
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-700 transition-transform group-hover:scale-110">
                              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={n.icon} /></svg>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 leading-none">{n.label}</h4>
                              <p className="text-slate-400 text-[11px] font-bold mt-1.5 tracking-tight">{n.desc}</p>
                            </div>
                          </div>
                          <div className={`relative w-14 h-8 rounded-full transition-all duration-300 ${notifications[n.id as keyof NotificationSettings] ? 'bg-slate-900 shadow-xl' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${notifications[n.id as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {/* Appearance Section */}
              {activeTab === 'appearance' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Interface Core</h2>
                    <p className="text-slate-500 font-medium text-sm mb-12">Fine-tune the visual density and theme engine.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                      {[
                        { id: 'light', label: 'Daylight', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                        { id: 'dark', label: 'Midnight', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
                        { id: 'system', label: 'Adaptive', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                      ].map((t) => (
                        <button key={t.id} onClick={() => handleAppearanceChange('theme', t.id as any)} className={`p-8 rounded-[36px] border-2 transition-all group ${appearance.theme === t.id ? 'border-slate-900 bg-slate-900 text-white shadow-2xl shadow-slate-900/40' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                          <div className={`mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${appearance.theme === t.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} /></svg>
                          </div>
                          <p className="text-center font-black text-[10px] uppercase tracking-widest">{t.label}</p>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {[
                        { id: 'compactMode', label: 'High-Density Environment', desc: 'Reduce ocular traversal by compressing grid paddings.', icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' },
                        { id: 'showAnimations', label: 'Kinetic Motion', desc: 'Enable physics-based motion transitions across the interface.', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                      ].map((opt) => (
                        <div key={opt.id} className="flex items-center justify-between p-6 rounded-[28px] bg-slate-50/50 border-2 border-slate-100/50">
                          <div className="flex items-center gap-6">
                            <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-700">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={opt.icon} /></svg>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 leading-none">{opt.label}</h4>
                              <p className="text-slate-400 text-[11px] font-bold mt-1.5 tracking-tight">{opt.desc}</p>
                            </div>
                          </div>
                          <div onClick={() => handleAppearanceChange(opt.id as any, !appearance[opt.id as keyof AppearanceSettings])} className={`relative w-14 h-8 rounded-full transition-all duration-300 cursor-pointer ${appearance[opt.id as keyof AppearanceSettings] ? 'bg-slate-900 shadow-xl' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${appearance[opt.id as keyof AppearanceSettings] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Data & Privacy Tab */}
              {/* Data & Privacy Section */}
              {activeTab === 'data' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Data Sovereignty</h2>
                    <p className="text-slate-500 font-medium text-sm mb-12">Manage your cryptographic identity and data footprint.</p>

                    <div className="space-y-4">
                      <div className="group flex items-center justify-between p-6 rounded-[28px] border-2 border-slate-50 hover:bg-slate-50/50 hover:border-slate-100 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center transition-transform group-hover:scale-110">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-none">Complete Data Export</h4>
                            <p className="text-slate-400 text-[11px] font-bold mt-1.5 tracking-tight">Generate a JSON/CSV snapshot of all your system interactions.</p>
                          </div>
                        </div>
                        <button className="bg-white text-slate-900 border-2 border-slate-100 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">Request</button>
                      </div>

                      <div className="group flex items-center justify-between p-6 rounded-[28px] border-2 border-slate-50 hover:bg-slate-50/50 hover:border-slate-100 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center transition-transform group-hover:scale-110">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-none">Flush Cache Memory</h4>
                            <p className="text-slate-400 text-[11px] font-bold mt-1.5 tracking-tight">Purge all local session states and UI preferences.</p>
                          </div>
                        </div>
                        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-white text-slate-900 border-2 border-slate-100 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all">Purge</button>
                      </div>
                    </div>

                    <div className="mt-12 pt-10 border-t-2 border-slate-50">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-2 h-2 rounded-full bg-slate-900 animate-pulse"></div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Danger Operations</h3>
                      </div>

                      <div className="bg-slate-50 rounded-[32px] p-8 border-2 border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-sm">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-none">Permanent Account Deletion</h4>
                            <p className="text-slate-500 text-[11px] font-bold mt-1.5 tracking-tight">This action will incinerate all data associated with this identity.</p>
                          </div>
                        </div>
                        <button className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-black hover:shadow-2xl hover:shadow-slate-900/40 transition-all">Terminate</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
