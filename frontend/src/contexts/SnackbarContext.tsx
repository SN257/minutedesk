import React, { createContext, useContext, useState, useCallback } from 'react';

interface SnackbarContextType {
  showSnackbar: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
};

interface SnackbarMessage {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snackbars, setSnackbars] = useState<SnackbarMessage[]>([]);

  const showSnackbar = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setSnackbars((prev) => [...prev, { message, type, id }]);
    
    setTimeout(() => {
      setSnackbars((prev) => prev.filter((snackbar) => snackbar.id !== id));
    }, 3000);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-slate-700 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      case 'info':
        return 'bg-slate-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      
      {/* Snackbar Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {snackbars.map((snackbar) => (
          <div
            key={snackbar.id}
            className={`${getStyles(snackbar.type)} px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in min-w-[320px]`}
          >
            {getIcon(snackbar.type)}
            <span className="font-medium">{snackbar.message}</span>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
};
