import { useCallback, useEffect, useState } from 'react';

export type View = 'today' | 'meetings' | 'tasks' | 'worklog' | 'reports' | 'admin' | 'settings';
export const VIEWS: View[] = ['today', 'meetings', 'tasks', 'worklog', 'reports', 'admin', 'settings'];

export interface Route {
  view: View;
  param: string | null;
}

const parse = (): Route => {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const view = (VIEWS.includes(parts[0] as View) ? parts[0] : 'today') as View;
  return { view, param: parts[1] ? decodeURIComponent(parts[1]) : null };
};

/** One flat hash route: #/<view>[/<param>]. No nested routes anywhere in the app. */
export const useRoute = () => {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((view: View, param?: string | null) => {
    window.location.hash = `/${view}${param ? `/${encodeURIComponent(param)}` : ''}`;
  }, []);
  return { ...route, go };
};

/** The only real URLs: "/" (landing) and "/app" (workspace). Everything else is the #hash above. */
export const navigatePath = (path: string) => {
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/** Every view module receives the same props. `param` is the optional #/<view>/<param> segment. */
export interface ViewProps {
  param: string | null;
  go: (view: View, param?: string | null) => void;
}
