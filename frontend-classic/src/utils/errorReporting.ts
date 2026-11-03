import { reportClientError } from '../services/api';

// Catches crashes React's own ErrorBoundary can't see: errors thrown outside
// render (event handlers, timers, async code) and unhandled promise
// rejections. Throttled so a tight error loop can't flood the error log.
const MAX_REPORTS_PER_MINUTE = 10;
let reportsThisWindow = 0;
let windowStart = Date.now();

const canReport = (): boolean => {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    reportsThisWindow = 0;
  }
  reportsThisWindow += 1;
  return reportsThisWindow <= MAX_REPORTS_PER_MINUTE;
};

export const installGlobalErrorReporting = () => {
  window.addEventListener('error', (event) => {
    if (!canReport()) return;
    reportClientError({
      message: event.message || 'Unhandled error',
      stack: event.error?.stack,
      path: window.location.pathname,
      source: 'frontend',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!canReport()) return;
    const reason = event.reason;
    reportClientError({
      message: reason?.message || String(reason) || 'Unhandled promise rejection',
      stack: reason?.stack,
      path: window.location.pathname,
      source: 'frontend',
    });
  });
};
