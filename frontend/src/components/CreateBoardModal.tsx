import React, { useState } from 'react';

type Props = {
  open: boolean;
  initialTitle?: string;
  onClose: () => void;
  onCreate: (title: string) => Promise<void> | void;
  submitText?: string;
};

const CreateBoardModal: React.FC<Props> = ({ open, initialTitle = '', onClose, onCreate, submitText = 'Create' }) => {
  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleIn transition-colors" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">{submitText} Board</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl mb-5 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
          placeholder="Enter board title..."
          autoFocus
        />
        <div className="flex justify-end gap-3 text-sm">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-semibold transition-all">Cancel</button>
          <button
            onClick={async () => {
              if (!title.trim()) return;
              setLoading(true);
              try {
                await onCreate(title.trim());
                onClose();
              } finally {
                setLoading(false);
              }
            }}
            className="px-5 py-2.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating...' : submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBoardModal;
