import React, { useState, useEffect } from 'react';
import { getCardApi, updateCardApi } from '../services/api';
import { useConfirm } from './ConfirmProvider';

interface ChecklistProps {
    cardId: string;
    onChange?: (items: { id: string; text: string; done: boolean; assignee?: string; duration?: string }[]) => void;
    onCardUpdate?: (card: any) => void;
}

const Checklist: React.FC<ChecklistProps> = ({ cardId, onChange, onCardUpdate }) => {
    const [items, setItems] = useState<{ id: string; text: string; done: boolean; assignee?: string; duration?: string }[]>([]);
    const [mounted, setMounted] = useState(false);
    const [hideChecked, setHideChecked] = useState(false);
    const [showComposer, setShowComposer] = useState(false);
    const [composerText, setComposerText] = useState('');
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<'assignee' | 'duration' | null>(null);
    const [tempAssignee, setTempAssignee] = useState('');
    const [tempDuration, setTempDuration] = useState('');
    const confirm = useConfirm();
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const popoverRef = React.useRef<HTMLDivElement | null>(null);
    const composerRef = React.useRef<HTMLDivElement | null>(null);
    const initialSyncDone = React.useRef(false);

    // close popover when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!editingItem) return;
            const target = e.target as Node;
            if (popoverRef.current && popoverRef.current.contains(target)) return;
            const el = document.getElementById(`checklist-item-${editingItem}`);
            if (el && el.contains(target)) return;
            setEditingItem(null);
            setEditingField(null);
            setTempAssignee('');
            setTempDuration('');
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [editingItem]);

    // Close composer when clicking outside and composer is empty
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!showComposer) return;
            const target = e.target as Node;
            if (composerRef.current && composerRef.current.contains(target)) return;
            // if composer is empty, close it when clicking outside
            if (!composerText.trim()) {
                setComposerText('');
                setShowComposer(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showComposer, composerText]);

    useEffect(() => {
        if (showComposer) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [showComposer]);

    // Load from backend (fallback to LocalStorage)
    useEffect(() => {
        if (!cardId) return;
        let cancelled = false;
        (async () => {
            try {
                const card = await getCardApi(cardId);
                if (cancelled) return;
                if (card?.checklist) {
                    setItems(card.checklist);
                } else {
                    const key = `checklist-${cardId}`;
                    const saved = localStorage.getItem(key);
                    if (saved) setItems(JSON.parse(saved));
                    else setItems([]);
                }
            } catch (err) {
                const key = `checklist-${cardId}`;
                const saved = localStorage.getItem(key);
                if (saved) setItems(JSON.parse(saved));
                else setItems([]);
            } finally {
                if (!cancelled) setMounted(true);
            }
        })();
        return () => { cancelled = true; };
    }, [cardId]);

    // Save on Change: persist to backend and localStorage as fallback
    useEffect(() => {
        if (!mounted || !cardId) return;
        const key = `checklist-${cardId}`;
        localStorage.setItem(key, JSON.stringify(items));
        // Avoid notifying parent / persisting on initial mount to prevent unintended hides, 
        // UNLESS we have items that need to be synced (e.g. from localStorage recovery)
        if (!initialSyncDone.current) {
            initialSyncDone.current = true;
            if (items.length > 0 && typeof onChange === 'function') {
                try { onChange(items); } catch (e) { /* ignore */ }
            }
            return;
        }

        if (typeof onChange === 'function') {
            try { onChange(items); } catch (e) { /* ignore */ }
        }

        (async () => {
            try {
                const updatedCard = await updateCardApi(cardId, { checklist: items } as any);
                if (onCardUpdate) {
                    onCardUpdate(updatedCard);
                }
            } catch (err) {
                // ignore save errors (localStorage has the latest state)
                console.error('Failed to persist checklist to server', err);
            }
        })();
    }, [items, cardId, mounted]);

    const progress = items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 font-semibold text-lg transition-colors">
                    <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    Checklist
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setHideChecked((s) => !s)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded transition-colors"
                    >
                        {hideChecked ? 'Show checked items' : 'Hide checked items'}
                    </button>
                    <button
                        onClick={async () => {
                            if (!cardId) return;
                            const ok = await confirm({ title: 'Delete checklist', message: 'Delete entire checklist?' });
                            if (!ok) return;
                            setItems([]);
                            try {
                                const key = `checklist-${cardId}`;
                                localStorage.removeItem(key);
                                const updatedCard = await updateCardApi(cardId, { checklist: [] } as any);
                                if (onCardUpdate) onCardUpdate(updatedCard);
                                if (typeof onChange === 'function') {
                                    try { onChange([]); } catch (e) { /* ignore */ }
                                }
                            } catch (err) {
                                console.error('Failed to delete checklist on server', err);
                            }
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-8 text-right font-bold text-slate-600 dark:text-slate-300 transition-colors">{progress}%</span>
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden transition-colors">
                    <div className="h-full bg-slate-700 dark:bg-slate-400 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
                {items.filter(i => !(hideChecked && i.done)).map((item) => (
                    <div
                        key={item.id}
                        id={`checklist-item-${item.id}`}
                        className="group relative flex items-start gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-all cursor-pointer"
                        onClick={() => {
                            setItems((curr) => curr.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
                        }}
                    >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${item.done ? 'bg-slate-700 dark:bg-slate-400 border-slate-700 dark:border-slate-400' : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-600 dark:group-hover:border-slate-400'}`}>
                            {item.done && <svg className="w-3.5 h-3.5 text-white dark:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <span className={`text-sm font-medium transition-colors ${item.done ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{item.text}</span>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 transition-colors">
                                {item.assignee && (
                                    <div className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        <span>{item.assignee}</span>
                                    </div>
                                )}
                                {item.duration && (
                                    <div className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>{item.duration}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={`transition-opacity duration-200 flex gap-2 ${editingItem === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item.id);
                                    setEditingField('duration');
                                    setTempDuration(item.duration || '');
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${editingItem === item.id && editingField === 'duration' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="Set duration"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item.id);
                                    setEditingField('assignee');
                                    setTempAssignee(item.assignee || '');
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${editingItem === item.id && editingField === 'assignee' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="Assign member"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setItems(curr => curr.filter(i => i.id !== item.id));
                                }}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Remove item"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Inline popover anchored below the item */}
                        {editingItem === item.id && editingField && (
                            <div
                                ref={popoverRef}
                                className="absolute right-0 top-full mt-2 z-30 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 animate-scaleIn origin-top-right ring-1 ring-slate-900/5 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {editingField === 'assignee' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 transition-colors">Assignee</label>
                                        <input
                                            type="text"
                                            value={tempAssignee}
                                            onChange={(e) => setTempAssignee(e.target.value)}
                                            placeholder="Enter assignee name"
                                            autoFocus
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 shrink-0"
                                        />
                                    </div>
                                )}
                                {editingField === 'duration' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 transition-colors">Deadline</label>
                                        <input
                                            type="datetime-local"
                                            value={tempDuration}
                                            onChange={(e) => setTempDuration(e.target.value)}
                                            autoFocus
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none text-sm font-medium text-slate-800 dark:text-white transition-all bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-end gap-2 mt-5">
                                    <button
                                        onClick={() => {
                                            setEditingItem(null);
                                            setEditingField(null);
                                            setTempAssignee('');
                                            setTempDuration('');
                                        }}
                                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-white rounded-lg text-sm font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setItems(curr => curr.map(i => {
                                                if (i.id !== editingItem) return i;
                                                if (editingField === 'assignee') return { ...i, assignee: tempAssignee.trim() || undefined };
                                                if (editingField === 'duration') return { ...i, duration: tempDuration || undefined };
                                                return i;
                                            }));
                                            setEditingItem(null);
                                            setEditingField(null);
                                            setTempAssignee('');
                                            setTempDuration('');
                                        }}
                                        className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {showComposer && (
                    <div ref={composerRef} className="group flex items-start gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-fadeIn transition-colors">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors border-slate-300 dark:border-slate-600`}>
                        </div>
                        <input
                            ref={inputRef}
                            value={composerText}
                            onChange={(e) => setComposerText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const t = composerText.trim();
                                    if (!t) return;
                                    setItems(c => [...c, { id: Date.now().toString(), text: t, done: false }]);
                                    setComposerText('');
                                    // keep composer open and focus input for quick successive adds
                                    setTimeout(() => inputRef.current?.focus(), 0);
                                }
                                if (e.key === 'Escape') {
                                    setComposerText('');
                                    setShowComposer(false);
                                }
                            }}
                            placeholder="New checklist item"
                            className="text-sm flex-1 px-2 py-1 border-b border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => { setComposerText(''); setShowComposer(false); }} title="Cancel" className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Item */}
            <div className="pl-0">
                <button
                    id="checklist-input"
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-lg transition-all hover:shadow-sm"
                    onClick={() => setShowComposer(true)}
                >
                    + Add an item
                </button>
            </div>
        </div>
    );
};

export default Checklist;
