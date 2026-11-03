import React, { createContext, useContext, useState, useEffect } from 'react';

export interface NotificationSettings {
    emailNotifications: boolean;
    meetingReminders: boolean;
    taskDeadlines: boolean;
    weeklyDigest: boolean;
    pushNotifications: boolean;
    soundEnabled: boolean;
}

export interface AppearanceSettings {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    showAnimations: boolean;
    language: string;
    timezone: string;
    dateFormat: string;
}

export interface PrivacySettings {
    profileVisibility: 'public' | 'team' | 'private';
    showActivity: boolean;
    showEmail: boolean;
    analyticsEnabled: boolean;
}

interface SettingsContextType {
    notifications: NotificationSettings;
    appearance: AppearanceSettings;
    privacy: PrivacySettings;
    updateNotifications: (updates: Partial<NotificationSettings>) => void;
    updateAppearance: (updates: Partial<AppearanceSettings>) => void;
    updatePrivacy: (updates: Partial<PrivacySettings>) => void;
}

const defaultNotifications: NotificationSettings = {
    emailNotifications: true,
    meetingReminders: true,
    taskDeadlines: true,
    weeklyDigest: false,
    pushNotifications: true,
    soundEnabled: true,
};

const defaultAppearance: AppearanceSettings = {
    theme: 'system',
    compactMode: false,
    showAnimations: true,
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
};

const defaultPrivacy: PrivacySettings = {
    profileVisibility: 'team',
    showActivity: true,
    showEmail: false,
    analyticsEnabled: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<NotificationSettings>(() => {
        const saved = localStorage.getItem('notificationSettings');
        return saved ? JSON.parse(saved) : defaultNotifications;
    });

    const [appearance, setAppearance] = useState<AppearanceSettings>(() => {
        const saved = localStorage.getItem('appearanceSettings');
        return saved ? JSON.parse(saved) : defaultAppearance;
    });

    const [privacy, setPrivacy] = useState<PrivacySettings>(() => {
        const saved = localStorage.getItem('privacySettings');
        return saved ? JSON.parse(saved) : defaultPrivacy;
    });

    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
        const root = document.documentElement;

        let isDark = false;
        if (theme === 'dark') {
            isDark = true;
        } else if (theme === 'system') {
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    useEffect(() => {
        applyTheme(appearance.theme);

        // Listen for system theme changes if set to system
        if (appearance.theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
                const root = document.documentElement;
                if (e.matches) {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }
            };

            // Support both modern and older browsers (like some Safari versions)
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handleChange as any);
                return () => mediaQuery.removeEventListener('change', handleChange as any);
            } else {
                // Compatibility for older browsers
                (mediaQuery as any).addListener(handleChange);
                return () => (mediaQuery as any).removeListener(handleChange);
            }
        }
    }, [appearance.theme]);

    const updateNotifications = (updates: Partial<NotificationSettings>) => {
        setNotifications(prev => {
            const updated = { ...prev, ...updates };
            localStorage.setItem('notificationSettings', JSON.stringify(updated));
            return updated;
        });
    };

    const updateAppearance = (updates: Partial<AppearanceSettings>) => {
        setAppearance(prev => {
            const updated = { ...prev, ...updates };
            localStorage.setItem('appearanceSettings', JSON.stringify(updated));
            return updated;
        });
    };

    const updatePrivacy = (updates: Partial<PrivacySettings>) => {
        setPrivacy(prev => {
            const updated = { ...prev, ...updates };
            localStorage.setItem('privacySettings', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <SettingsContext.Provider value={{
            notifications,
            appearance,
            privacy,
            updateNotifications,
            updateAppearance,
            updatePrivacy
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
