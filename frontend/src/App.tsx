import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { BrandingProvider } from './lib/branding';
import { SiteConfigProvider } from './lib/siteConfig';
import { PrefsProvider } from './lib/prefs';
import { navigatePath, type View } from './lib/nav';
import { Landing } from './landing/Landing';
import { SignInPage } from './landing/SignInPage';
import { Shell } from './shell/Shell';
import { Spinner } from './ui';

const Today = lazy(() => import('./views/today/Today'));
const Meetings = lazy(() => import('./views/meetings/Meetings'));
const Tasks = lazy(() => import('./views/tasks/Tasks'));
const WorkLog = lazy(() => import('./views/worklog/WorkLog'));
const Insights = lazy(() => import('./views/reports/Insights'));
const Admin = lazy(() => import('./views/admin/Admin'));
const Settings = lazy(() => import('./views/settings/Settings'));

const VIEW_MAP = { today: Today, meetings: Meetings, tasks: Tasks, worklog: WorkLog, reports: Insights, admin: Admin, settings: Settings } as const;

const usePath = () => {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return path;
};

const Gate = () => {
  const { user, loading, hasAdmin } = useAuth();
  const path = usePath();

  if (loading) return <div className="h-full grid place-items-center text-muted"><Spinner size={28} /></div>;
  if (path !== '/app') return <Landing />;
  if (!user) {
    return <SignInPage onSuccess={() => navigatePath('/app')} onClose={() => navigatePath('/')} />;
  }
  return (
    <Shell
      render={(view: View, param, go) => {
        const V = VIEW_MAP[view === 'admin' && !hasAdmin ? 'today' : view];
        return (
          <Suspense fallback={<div className="py-24 grid place-items-center text-muted"><Spinner size={26} /></div>}>
            <V param={param} go={go} />
          </Suspense>
        );
      }}
    />
  );
};

export const App = () => (
  <BrandingProvider>
    <SiteConfigProvider>
      <AuthProvider>
        <PrefsProvider>
          <ToastProvider>
            <Gate />
          </ToastProvider>
        </PrefsProvider>
      </AuthProvider>
    </SiteConfigProvider>
  </BrandingProvider>
);
