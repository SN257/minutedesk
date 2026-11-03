import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmContextType = {
  confirm: (opts?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<null | ({ opts: ConfirmOptions; resolve: (v: boolean) => void })>(null);

  const confirm = (opts: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  };

  const handleClose = (val: boolean) => {
    if (state) state.resolve(val);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => handleClose(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">{state.opts.title || 'Confirm'}</h3>
            <p className="text-sm text-gray-600 mb-4">{state.opts.message || 'Are you sure?'}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => handleClose(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">{state.opts.cancelText || 'Cancel'}</button>
              <button onClick={() => handleClose(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg">{state.opts.confirmText || 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
