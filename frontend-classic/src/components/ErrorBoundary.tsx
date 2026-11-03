import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../services/api';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches render-time crashes anywhere in the tree, reports them to the
// backend error log (visible as a "ticket" in the Admin Center), and shows a
// friendly fallback instead of a blank white screen.
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      message: error.message || 'Unhandled render error',
      stack: `${error.stack || ''}\n${info.componentStack || ''}`,
      path: window.location.pathname,
      source: 'frontend',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              This has been reported automatically. Try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-sm hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
