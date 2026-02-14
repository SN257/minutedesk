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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2 text-gray-800">{submitText} Board</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md mb-4 focus:ring-2 focus:ring-slate-500 outline-none" placeholder="Board title" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">Cancel</button>
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
            className="px-4 py-2 bg-slate-700 text-white rounded-md"
            disabled={loading}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBoardModal;
