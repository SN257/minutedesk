import React, { useEffect, useRef, useState } from 'react';

type SizeOption = 'small' | 'full';

export type CoverSelectPayload =
  | { type: 'color'; value: string }
  | { type: 'image'; value: string }
  | { type: 'size'; value: SizeOption }
  | { type: 'clear' };

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (p: CoverSelectPayload) => void;
  current?: { cover?: string; size?: SizeOption };
  onUpload?: (file: File) => void;
  onSearch?: () => void;
};

const COLORS = [
  '#0EA5A4', // teal
  '#D97706', // mustard
  '#F97316', // orange
  '#EF4444', // red
  '#7C3AED', // purple
  '#2563EB', // blue
  '#10B981', // green
  '#64748B', // slate/gray
  '#9CA3AF', // light gray
  '#F472B6', // pink
];

const UNSPLASH = [
  'https://images.unsplash.com/photo-1506765515384-028b60a970df?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1',
  'https://images.unsplash.com/photo-1506086679524-7f2f1a0f8fcd?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=2',
  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=3',
  'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=4',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=5',
  'https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=6',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=7',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=8',
  'https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=9',
];

const CoverMenu: React.FC<Props> = ({ open, onClose, onSelect, current, onUpload, onSearch }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [size, setSize] = useState<SizeOption>(current?.size || 'small');
  const [selectedColor, setSelectedColor] = useState<string | undefined>(current?.cover);
  const [, setColorblind] = useState(false);

  useEffect(() => {
    setSize(current?.size || 'small');
    setSelectedColor(current?.cover);
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-6" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        ref={panelRef}
        className="relative z-60 w-[380px] max-h-[90vh] overflow-y-auto rounded-[16px] shadow-xl p-4 bg-[#1F2933] text-white"
        style={{ boxShadow: '0 10px 30px rgba(8,11,14,0.6)' }}
        aria-label="Cover panel"
      >
        <div className="flex items-center justify-center relative mb-3">
          <div className="text-lg font-semibold">Cover</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-0 top-0 mt-0 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Size Section */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-slate-200">Size</h4>
          <div className="flex gap-3">
            <button
              onClick={() => { setSize('small'); onSelect({ type: 'size', value: 'small' }); }}
              className={`flex-1 rounded-lg p-2 bg-white/6 hover:bg-white/10 transition-colors ${size === 'small' ? 'ring-2 ring-white/30' : ''}`}
              aria-pressed={size === 'small'}
            >
              <div className="w-full h-10 bg-gradient-to-r from-[#111827] to-[#0f172a] rounded-md" />
              <div className="mt-2 text-xs text-slate-300">Small header</div>
            </button>

            <button
              onClick={() => { setSize('full'); onSelect({ type: 'size', value: 'full' }); }}
              className={`flex-1 rounded-lg p-2 bg-white/6 hover:bg-white/10 transition-colors ${size === 'full' ? 'ring-2 ring-white/30' : ''}`}
              aria-pressed={size === 'full'}
            >
              <div className="w-full h-20 bg-gradient-to-r from-[#0f172a] to-[#111827] rounded-md" />
              <div className="mt-2 text-xs text-slate-300">Full cover</div>
            </button>
          </div>
        </div>

        {/* Colors Section */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-slate-200">Colors</h4>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((c) => {
              const selected = selectedColor === c;
              return (
                <button
                  key={c}
                  onClick={() => { setSelectedColor(c); onSelect({ type: 'color', value: c }); }}
                  className={`h-8 rounded-md transition-all hover:scale-105 focus:outline-none ${selected ? 'ring-2 ring-white/40' : 'ring-0'}`}
                  style={{ backgroundColor: c }}
                  aria-pressed={selected}
                />
              );
            })}
          </div>

          <div className="mt-3">
            <button
              onClick={() => setColorblind((s) => !s)}
              className="w-full text-sm text-slate-900 bg-white/10 border border-white/10 py-2 rounded-md hover:bg-white/20 transition-colors"
            >
              Enable colorblind friendly mode
            </button>
          </div>
        </div>

        {/* Attachments */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-slate-200">Attachments</h4>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onUpload) onUpload(f);
              if (f) {
                const url = URL.createObjectURL(f);
                onSelect({ type: 'image', value: url });
              }
            }} />

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full text-sm bg-white/10 border border-white/10 py-2 rounded-md hover:bg-white/20 transition-colors"
            >
              Upload a cover image
            </button>
            <div className="text-xs text-slate-400">Tip: Drag an image on to the card to upload it.</div>
          </div>
        </div>

        {/* Unsplash */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-slate-200">Photos from Unsplash</h4>
          <div className="grid grid-cols-3 gap-2">
            {UNSPLASH.map((u, i) => (
              <button
                key={u + i}
                onClick={() => onSelect({ type: 'image', value: u })}
                className="w-full h-20 overflow-hidden rounded-md bg-slate-700 relative group"
              >
                <img src={u} loading="lazy" alt="unsplash" className="w-full h-full object-cover transform transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-25 transition-opacity" />
              </button>
            ))}
          </div>

          <div className="mt-3">
            <button
              onClick={onSearch}
              className="w-full text-sm bg-white/10 border border-white/10 py-2 rounded-md hover:bg-white/20 transition-colors"
            >
              Search for photos
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400 mt-2">
          Photos are provided by Unsplash and are subject to their Terms of Service.
        </div>
      </div>
    </div>
  );
};

export default CoverMenu;
