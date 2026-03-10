import React, { useEffect, useState } from 'react';
import Checklist from '../components/Checklist';
import { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  createBoardApi, getBoardsApi, getListsApi, createListApi, createCardApi, updateCardApi,
  moveCardApi, getCommentsApi, addCommentApi, getCardsApi, archiveCardApi,
  deleteListApi, updateListApi, deleteCardApi, duplicateCardApi, getCardApi
} from '../services/api';
import { useConfirm } from '../components/ConfirmProvider';
import { useSnackbar } from '../contexts/SnackbarContext';
import CreateBoardModal from '../components/CreateBoardModal';

// Types
type BoardType = { id: string; title: string; createdAt?: string };
type ListType = { id: string; title: string; order: number; color?: string };
type CardType = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  order: number;
  labels?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  coverColor?: string;
  coverSize?: 'small' | 'full';
  archived?: boolean;
  completed?: boolean;
  checklist?: { id: string; text: string; done: boolean; assignee?: string; duration?: string }[];
};

// Predefined Labels & Colors (professional palette)
const LABEL_COLORS = [
  { name: 'Bug', color: 'bg-red-200 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-200', bg: 'bg-red-50 dark:bg-red-900/20' },
  { name: 'Feature', color: 'bg-sky-200 dark:bg-sky-900/40', text: 'text-sky-800 dark:text-sky-200', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { name: 'Design', color: 'bg-violet-200 dark:bg-violet-900/40', text: 'text-violet-800 dark:text-violet-200', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  { name: 'Research', color: 'bg-emerald-200 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { name: 'Marketing', color: 'bg-amber-200 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-200', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { name: 'Urgent', color: 'bg-pink-200 dark:bg-pink-900/40', text: 'text-pink-800 dark:text-pink-200', bg: 'bg-pink-50 dark:bg-pink-900/20' },
];

// NOTE: priority color mapping removed (unused) to avoid TS unused-variable errors

// Professional cover colors (muted, brand-friendly)
const COVER_COLORS = ['#0F172A', '#0EA5A4', '#2563EB', '#334155', '#7C3AED', '#D97706'];

// Using white card layout with colored bottom slat; no theme classes needed


const formatBoardDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const CardOptionsDropdown: React.FC<{
  card: CardType;
  lists: ListType[];
  onClose: () => void;
  onUpdate: (fields: Partial<CardType>) => Promise<void>;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onMove: (listId: string) => Promise<void>;
  showSnackbar: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ card, lists, onClose, onUpdate, onDelete, onDuplicate, onMove, showSnackbar }) => {
  const [view, setView] = useState<'main' | 'move'>('main');
  const confirm = useConfirm();

  if (view === 'move') {
    return (
      <div className="absolute top-full right-0 mt-2 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg shadow-xl w-64 z-50 overflow-hidden animate-slideDown" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-3 border-b border-slate-700 bg-slate-800/50">
          <button onClick={() => setView('main')} className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="font-semibold text-sm">Move to...</span>
        </div>
        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
          {lists.map(list => (
            <button
              key={list.id}
              onClick={async () => {
                await onMove(list.id);
                onClose();
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-md transition-colors text-sm font-medium truncate"
            >
              {list.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full right-0 mt-2 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg shadow-xl w-60 z-50 overflow-hidden animate-slideDown" onClick={e => e.stopPropagation()}>
      {/* Group 1 */}
      <div className="py-1">
        <button
          onClick={async () => {
            if (!card.assignee) {
              showSnackbar('You are not assigned to this card', 'info');
              return;
            }
            await onUpdate({ assignee: undefined }); // Unassign logic
            onClose();
            showSnackbar('You left the card', 'success');
          }}
          className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span className="text-sm">Leave</span>
        </button>
      </div>
      <div className="h-px bg-slate-700 mx-2"></div>

      {/* Group 2 */}
      <div className="py-1">
        <button onClick={() => setView('move')} className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          <span className="text-sm">Move</span>
        </button>
        <button
          onClick={async () => {
            await onDuplicate();
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <span className="text-sm">Copy</span>
        </button>
        <button onClick={() => showSnackbar('Mirror feature coming soon (Premium)', 'info')} className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
          <span className="text-sm flex-1">Mirror <span className="text-[10px] bg-purple-400 text-slate-900 px-1.5 py-0.5 rounded ml-1.5 font-bold">NEW</span></span>
        </button>
        <button onClick={() => showSnackbar('Template created (Mock)', 'success')} className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
          <span className="text-sm">Make template</span>
        </button>
      </div>
      <div className="h-px bg-slate-700 mx-2"></div>

      {/* Group 3 */}
      <div className="py-1">
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            showSnackbar('Link copied to clipboard', 'success');
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors flex items-center gap-3"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          <span className="text-sm">Share</span>
        </button>
        <button
          onClick={async () => {
            // Actual archive logic
            await onUpdate({ archived: true });
            onClose();
            showSnackbar('Card archived', 'success');
          }}
          className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-100 transition-colors flex items-center gap-3"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          <span className="text-sm">Archive</span>
        </button>
        <button
          onClick={async () => {
            // Permanent Delete logic (moved from archive)
            const ok = await confirm({ title: 'Delete Card', message: 'Permanently delete this card?' });
            if (!ok) return;
            await onDelete();
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-red-900/30 text-red-200 transition-colors flex items-center gap-3"
        >
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          <span className="text-sm">Delete Permanent</span>
        </button>
      </div>
    </div>
  );
};

const DropdownContent: React.FC<{
  children: React.ReactNode;
  className?: string;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  widthClass?: string;
}> = ({ children, className, wrapperRef, widthClass = 'w-64' }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [styles, setStyles] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });

  React.useLayoutEffect(() => {
    if (!elRef.current || !wrapperRef.current) return;
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const elRect = elRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top: string | number = '100%';
    let bottom: string | number = 'auto';
    let left: string | number = '0px';
    let right: string | number = 'auto';
    let transformOrigin = 'top left';
    let marginTop = '0.5rem';
    let marginBottom = '0rem';

    // Vertical flip
    if (wrapperRect.bottom + elRect.height + 20 > viewportH && wrapperRect.top > elRect.height + 20) {
      top = 'auto';
      bottom = '100%';
      marginTop = '0';
      marginBottom = '0.5rem';
      transformOrigin = transformOrigin.replace('top', 'bottom');
    }

    // Horizontal flip
    if (wrapperRect.left + elRect.width > viewportW - 20) {
      left = 'auto';
      right = '0px';
      transformOrigin = transformOrigin.replace('left', 'right');
    }

    setStyles({
      top, bottom, left, right,
      marginTop, marginBottom,
      transformOrigin,
      opacity: 1,
      pointerEvents: 'auto'
    });
  }, []);

  return (
    <div
      ref={elRef}
      className={`absolute z-50 ${widthClass} ${className} transition-opacity duration-200`}
      style={styles}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

const BoardPage: React.FC = () => {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [boardListCounts, setBoardListCounts] = useState<Record<string, number>>({});

  // Use URL param as the source of truth for the current board
  const currentBoard = boardId || null;

  const setCurrentBoard = (id: string | null) => {
    if (id) navigate(`/boards/${id}`);
    else navigate('/boards');
  };
  const [lists, setLists] = useState<ListType[]>([]);
  const [cards, setCards] = useState<Record<string, CardType[]>>({});
  const [showCard, setShowCard] = useState<CardType | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterLabel, setFilterLabel] = useState<string>('all');
  // Boards view sort & filter state
  const [boardSort, setBoardSort] = useState<'recent' | 'oldest' | 'az' | 'za'>('oldest');
  const [boardFilter, setBoardFilter] = useState<'all' | 'empty' | 'withLists'>('all');
  const [showBoardSort, setShowBoardSort] = useState(false);
  const [showBoardFilter, setShowBoardFilter] = useState(false);
  const [boardSortIndex, setBoardSortIndex] = useState(-1);
  const [boardFilterIndex, setBoardFilterIndex] = useState(-1);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const boardSortRef = useRef<HTMLDivElement | null>(null);
  const boardFilterRef = useRef<HTMLDivElement | null>(null);
  const priorityRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  const [showBoardMenu, setShowBoardMenu] = useState<string | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openAddInputFor, setOpenAddInputFor] = useState<string | null>(null);
  const addInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // Card modal state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Refs for dropdowns
  const priorityBtnRef = useRef<HTMLDivElement>(null);
  const labelsBtnRef = useRef<HTMLDivElement>(null);
  const datesBtnRef = useRef<HTMLDivElement>(null);
  const membersBtnRef = useRef<HTMLDivElement>(null);
  const coverBtnRef = useRef<HTMLDivElement>(null);

  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    if (!openAddInputFor) return;
    const el = addInputRefs.current[openAddInputFor];
    if (el) {
      // focus on next tick to ensure element is mounted
      setTimeout(() => el.focus(), 0);
    }
  }, [openAddInputFor]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const bs: BoardType[] = await getBoardsApi();
        setBoards(bs);

        // Fetch list counts for all boards in parallel (non-blocking)
        // This runs in the background and updates counts as they come in
        Promise.all(bs.map(async (b) => {
          try {
            const ls = await getListsApi(b.id);
            setBoardListCounts(prev => ({ ...prev, [b.id]: ls.length }));
          } catch (err) {
            // Ignore errors for individual boards
            console.error(`Failed to fetch lists for board ${b.id}:`, err);
          }
        }));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentBoard) return;
    (async () => {
      const ls = await getListsApi(currentBoard);

      // Update the list count for this board
      setBoardListCounts(prev => ({ ...prev, [currentBoard]: ls.length }));

      const map: Record<string, CardType[]> = {};
      for (const l of ls) {
        const fetched = await getCardsApi(l.id).catch(() => []);
        // initialize completed from archived if present
        map[l.id] = (fetched || []).map((c: any) => ({ ...c, completed: !!c.archived }));
      }
      // Set lists and cards together to avoid race condition
      setLists(ls);
      setCards(map);
    })();
  }, [currentBoard]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (boardSortRef.current && !boardSortRef.current.contains(target)) setShowBoardSort(false);
      if (boardFilterRef.current && !boardFilterRef.current.contains(target)) setShowBoardFilter(false);
      if (priorityRef.current && !priorityRef.current.contains(target)) setShowPriorityDropdown(false);
      if (labelRef.current && !labelRef.current.contains(target)) setShowLabelDropdown(false);

      // Card modal dropdowns
      if (showPriorityModal && priorityBtnRef.current && !priorityBtnRef.current.contains(target)) setShowPriorityModal(false);
      if (showLabelsModal && labelsBtnRef.current && !labelsBtnRef.current.contains(target)) setShowLabelsModal(false);
      if (showDatePicker && datesBtnRef.current && !datesBtnRef.current.contains(target)) setShowDatePicker(false);
      if (showMembersModal && membersBtnRef.current && !membersBtnRef.current.contains(target)) setShowMembersModal(false);
      if (showCoverModal && coverBtnRef.current && !coverBtnRef.current.contains(target)) setShowCoverModal(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPriorityModal, showLabelsModal, showDatePicker, showMembersModal, showCoverModal]);

  const onDragEnd = async (result: any) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceList = source.droppableId;
    const destList = destination.droppableId;

    const sourceCards = Array.from(cards[sourceList] || []);
    const [moved] = sourceCards.splice(source.index, 1);

    if (sourceList === destList) {
      sourceCards.splice(destination.index, 0, moved);
      setCards(c => ({ ...c, [sourceList]: sourceCards }));
      for (let i = 0; i < sourceCards.length; i++) await moveCardApi(sourceCards[i].id, sourceList, i);
    } else {
      const destCards = Array.from(cards[destList] || []);
      destCards.splice(destination.index, 0, moved);
      setCards(c => ({ ...c, [sourceList]: sourceCards, [destList]: destCards }));
      for (let i = 0; i < destCards.length; i++) await moveCardApi(destCards[i].id, destList, i);
      for (let i = 0; i < sourceCards.length; i++) await moveCardApi(sourceCards[i].id, sourceList, i);
    }
  };

  const openCard = async (card: CardType) => {
    setShowCard(card);
    // Fetch full card data including checklist
    try {
      const fullCard = await getCardApi(card.id);
      if (fullCard) {
        setShowCard(fullCard);
        // Automatically show checklist if it has items
        if (fullCard.checklist && Array.isArray(fullCard.checklist) && fullCard.checklist.length > 0) {
          setShowChecklist(true);
        } else {
          // Check localStorage fallback
          const local = localStorage.getItem(`checklist-${card.id}`);
          let hasLocal = false;
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) hasLocal = true;
            } catch { }
          }
          setShowChecklist(hasLocal);
        }
      }
    } catch (err) {
      // fallback to the card from state if API fails
      setShowChecklist(false);
    }
    const cs = await getCommentsApi(card.id).catch(() => []);
    setComments(c => ({ ...c, [card.id]: cs }));
  };

  // hide checklist when changing/opening a different card, but show if card has checklist items or locally saved items
  useEffect(() => {
    if (!showCard) {
      setShowChecklist(false);
      return;
    }
    if (showCard && showCard.checklist && Array.isArray(showCard.checklist) && showCard.checklist.length > 0) {
      setShowChecklist(true);
    } else {
      // Check localStorage fallback
      const local = localStorage.getItem(`checklist-${showCard.id}`);
      let hasLocal = false;
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) hasLocal = true;
        } catch { }
      }
      setShowChecklist(hasLocal);
    }
  }, [showCard?.id, showCard?.checklist]);

  const createNewBoard = async (title: string) => {
    if (!title.trim()) return null;
    const nb = await createBoardApi({ title });
    setBoards((p) => [nb, ...p]);
    return nb;
  };

  const confirm = useConfirm();
  const { showSnackbar } = useSnackbar();

  // card-level actions (delete/archive/duplicate) were removed because they are unused

  const deleteList = async (listId: string) => {
    const ok = await confirm({ title: 'Delete list', message: 'Delete this list and all its cards?' });
    if (!ok) return;
    await deleteListApi(listId);
    setLists(l => l.filter(list => list.id !== listId));
    setCards(c => { const { [listId]: _, ...rest } = c; return rest; });
  };

  const updateCardField = async (field: string, value: any) => {
    if (!showCard) return;
    try {
      const updated = await updateCardApi(showCard.id, { [field]: value });
      const normalized = { ...updated, completed: !!updated.archived };

      setShowCard(prev => prev ? { ...prev, ...normalized } : prev);

      // Update in cards state
      const listId = lists.find(l => (cards[l.id] || []).some(c => c.id === showCard.id))?.id;
      if (listId) {
        setCards(c => ({
          ...c,
          [listId]: c[listId].map(card => card.id === showCard.id ? normalized : card)
        }));
      }
    } catch (err) {
      console.error('Failed to update card field', err);
      showSnackbar('Failed to update card', 'error');
    }
  };

  const filteredCards = (listCards: CardType[]) => {
    return listCards.filter(card => {
      // Search filter
      if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Priority filter
      if (filterPriority !== 'all' && card.priority !== filterPriority) return false;
      // Label filter
      if (filterLabel !== 'all' && !(card.labels || []).includes(filterLabel)) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="text-center animate-scaleIn">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-800 border-t-slate-600 dark:border-t-slate-400 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-500/20 to-slate-700/20 dark:from-slate-400/10 dark:to-slate-600/10 blur-xl animate-pulse-slow"></div>
          </div>
          <p className="mt-6 text-slate-700 dark:text-slate-300 font-semibold text-lg">Loading workspace…</p>
          <p className="mt-2 text-slate-500 dark:text-slate-500 text-sm">Preparing your boards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-full flex flex-col">
      {/* Modern Header Section with Glassmorphism */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 border-b-4 border-slate-700 dark:border-slate-600 animate-slideDown relative z-20 transition-colors">
        <div>
          {currentBoard ? (
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {boards.find(b => b.id === currentBoard)?.title || 'Board'}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 font-medium">Manage your tasks and lists</p>
              </div>
              <button
                onClick={() => { setEditingBoardId(currentBoard); setEditingBoardTitle(boards.find(b => b.id === currentBoard)?.title || ''); }}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all ml-2 hover:shadow-md"
                title="Edit board"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Task Manager</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 font-medium">Organize your boards, lists, and tasks</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap w-full md:w-auto">
          {!currentBoard ? (
            <>
              <div ref={boardSortRef} className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[120px] md:min-w-[140px] md:flex-initial">
                <div className="relative" >
                  <button
                    type="button"
                    onClick={() => setShowBoardSort(s => !s)}
                    className="w-full h-10 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-3 pr-10 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:ring-opacity-30 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md text-left"
                  >
                    <span className={boardSort ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>{boardSort === 'recent' ? 'Most Recent' : boardSort === 'oldest' ? 'Oldest' : boardSort === 'az' ? 'A-Z' : 'Z-A'}</span>
                  </button>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {showBoardSort && (
                  <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl shadow-slate-xl animate-slideDown overflow-hidden transition-colors">
                    {([['recent', 'Most Recent'], ['oldest', 'Oldest'], ['az', 'A-Z'], ['za', 'Z-A']] as [any, string][]).map((opt, idx) => (
                      <div
                        key={opt[0]}
                        className={`w-full text-left px-3 py-2.5 cursor-pointer transition-all ${idx === boardSortIndex ? 'bg-slate-600 dark:bg-slate-700 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-900 dark:text-slate-100 font-medium transition-colors'}`}
                        onMouseEnter={() => setBoardSortIndex(idx)}
                        onClick={() => { setBoardSort(opt[0]); setShowBoardSort(false); setBoardSortIndex(-1); }}
                      >
                        {opt[1]}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div ref={boardFilterRef} className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[120px] md:min-w-[140px] md:flex-initial">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBoardFilter(s => !s)}
                    className="w-full h-10 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-3 pr-10 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:ring-opacity-30 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md text-left"
                  >
                    <span className={boardFilter ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>{boardFilter === 'all' ? 'All Boards' : boardFilter === 'withLists' ? 'With Lists' : 'Empty'}</span>
                  </button>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {showBoardFilter && (
                  <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl shadow-slate-xl animate-slideDown overflow-hidden">
                    {([['all', 'All Boards'], ['withLists', 'With Lists'], ['empty', 'Empty']] as [any, string][]).map((opt, idx) => (
                      <div
                        key={opt[0]}
                        className={`w-full text-left px-3 py-2.5 cursor-pointer transition-all ${idx === boardFilterIndex ? 'bg-slate-600 dark:bg-slate-700 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium'}`}
                        onMouseEnter={() => setBoardFilterIndex(idx)}
                        onClick={() => { setBoardFilter(opt[0]); setShowBoardFilter(false); setBoardFilterIndex(-1); }}
                      >
                        {opt[1]}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative w-full md:w-48">
                <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  placeholder="Search boards..."
                  value={boardSearchQuery}
                  onChange={(e) => setBoardSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:border-slate-600 dark:focus:border-slate-500 outline-none w-full transition-all hover:shadow-md"
                />
              </div>
            </>
          ) : (
            <>
              <div className="relative w-full md:w-48">
                <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:border-slate-600 dark:focus:border-slate-500 outline-none w-full transition-all hover:shadow-md"
                />
              </div>

              <div ref={priorityRef} className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[120px] md:min-w-[140px] md:flex-initial">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPriorityDropdown(s => !s)}
                    className="w-full h-10 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-3 pr-10 text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 text-left"
                  >
                    <span className={filterPriority ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>{filterPriority === 'all' ? 'All Priorities' : filterPriority}</span>
                  </button>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {showPriorityDropdown && (
                  <div ref={priorityRef} className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
                    {(['all', 'low', 'medium', 'high', 'urgent'] as string[]).map((opt, idx) => (
                      <div
                        key={opt}
                        className={`w-full text-left px-3 py-2 cursor-pointer ${idx === boardFilterIndex ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-100'}`}
                        onMouseEnter={() => setBoardFilterIndex(idx)}
                        onClick={() => { setFilterPriority(opt); setShowPriorityDropdown(false); setBoardFilterIndex(-1); }}
                      >
                        {opt === 'all' ? 'All Priorities' : opt === 'low' ? '🟢 Low' : opt === 'medium' ? '🟡 Medium' : opt === 'high' ? '🟠 High' : '🔴 Urgent'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div ref={labelRef} className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[120px] md:min-w-[140px] md:flex-initial">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLabelDropdown(s => !s)}
                    className="w-full h-10 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg px-3 pr-10 text-gray-900 dark:text-slate-100 font-medium focus:outline-none focus:border-slate-600 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-600 focus:ring-opacity-20 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 text-left"
                  >
                    <span className={filterLabel ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>{filterLabel === 'all' ? 'All Labels' : filterLabel}</span>
                  </button>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {showLabelDropdown && (
                  <div ref={labelRef} className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div
                      className={`w-full text-left px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-100 ${filterLabel === 'all' ? 'bg-slate-100 dark:bg-slate-700 font-semibold' : ''}`}
                      onClick={() => { setFilterLabel('all'); setShowLabelDropdown(false); }}
                    >
                      All Labels
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                    {LABEL_COLORS.map((label) => (
                      <div
                        key={label.name}
                        className={`w-full text-left px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-900 dark:text-slate-100 ${filterLabel === label.name ? 'bg-slate-100 dark:bg-slate-700 font-semibold' : ''}`}
                        onClick={() => { setFilterLabel(label.name); setShowLabelDropdown(false); }}
                      >
                        {label.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>



      {/* Modern Edit Board Modal */}
      {editingBoardId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-40 animate-fadeIn" onClick={() => { setEditingBoardId(null); setEditingBoardTitle(''); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-slate-xl border-2 border-slate-200 dark:border-slate-700 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">Edit Board</h3>
            <input value={editingBoardTitle} onChange={(e) => setEditingBoardTitle(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg mb-5 focus:ring-2 focus:ring-slate-500 focus:border-slate-600 dark:focus:border-slate-500 outline-none font-medium text-slate-900 dark:text-slate-100" />
            <div className="flex justify-end gap-3 text-sm">
              <button onClick={() => { setEditingBoardId(null); setEditingBoardTitle(''); }} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-semibold transition-all">Cancel</button>
              <button onClick={async () => {
                if (!editingBoardTitle.trim()) return;
                try {
                  const updated = await (await import('../services/api')).updateBoardApi(editingBoardId!, { title: editingBoardTitle });
                  setBoards(b => b.map(x => x.id === editingBoardId ? updated : x));
                  setEditingBoardId(null);
                  setEditingBoardTitle('');
                } catch (err) {
                  showSnackbar('Failed to update board', 'error');
                }
              }} className="px-5 py-2.5 btn-slate rounded-lg font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Boards Overview or Board Content */}
      {!currentBoard ? (
        /* Boards Grid View */
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-transparent flex-1 flex flex-col">
          {boards.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center animate-slideUp max-w-lg">
                <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <svg className="w-12 h-12 text-gray-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-2">No boards yet</h3>
                <p className="text-gray-600 dark:text-slate-400 mb-6">Create your first board to organize tasks and projects.</p>
                <button
                  onClick={async () => {
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-3 btn-slate rounded-xl font-semibold text-base hover:scale-105 transition-all"
                >
                  Create First Board
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Boards sort/filter logic */}
              {/*
                processedBoards: filter and sort boards according to dropdowns
              */}
              {(() => {
                // Boards with lists
                // Prepare processedBoards just above the grid
                const processedBoards = [...boards]
                  .filter(b => {
                    // Title search
                    if (boardSearchQuery && !b.title.toLowerCase().includes(boardSearchQuery.toLowerCase())) return false;
                    // boardFilter: filter by presence/absence of lists when counts are available
                    if (boardFilter === 'all') return true;
                    if (boardFilter === 'withLists') return (boardListCounts[b.id] || 0) > 0;
                    if (boardFilter === 'empty') return (boardListCounts[b.id] || 0) === 0;
                    return true;
                  })
                  .sort((a, b) => {
                    if (boardSort === 'az') return a.title.localeCompare(b.title);
                    if (boardSort === 'za') return b.title.localeCompare(a.title);
                    if (boardSort === 'recent') {
                      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
                      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
                      return tb - ta; // newest first
                    }
                    if (boardSort === 'oldest') {
                      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
                      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
                      return ta - tb; // oldest first
                    }
                    return 0;
                  });
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {processedBoards.map(board => (
                      <div
                        key={board.id}
                        onClick={() => setCurrentBoard(board.id)}
                        className="bg-white dark:bg-slate-800 rounded-xl p-5 flex flex-col border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden group h-44"
                      >
                        {/* Top accent line */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-800 to-slate-900"></div>

                        {/* Header with menu */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-1 line-clamp-2 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                              {board.title}
                            </h3>
                          </div>

                          {/* Kebab menu */}
                          <div className="relative ml-2 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowBoardMenu(showBoardMenu === board.id ? null : board.id); }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              title="Board options"
                            >
                              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                              </svg>
                            </button>
                            {showBoardMenu === board.id && (
                              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden animate-slideDown" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={async () => { setEditingBoardId(board.id); setEditingBoardTitle(board.title); setShowBoardMenu(null); }}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-slate-900 dark:text-slate-100 transition-colors text-sm border-b border-slate-100 dark:border-slate-700"
                                >
                                  Edit Board
                                </button>
                                <button
                                  onClick={async () => {
                                    setShowBoardMenu(null);
                                    const okDel = await confirm({ title: 'Delete board', message: 'Delete this board? This cannot be undone.' });
                                    if (!okDel) return;
                                    try {
                                      await (await import('../services/api')).deleteBoardApi(board.id);
                                      setBoards(bs => bs.filter(b => b.id !== board.id));
                                    } catch (err) {
                                      showSnackbar('Failed to delete board', 'error');
                                    }
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold transition-colors text-sm"
                                >
                                  Delete Board
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle section - Description & Task Stats */}
                        <div className="flex-1 mb-3">

                          {/* Task statistics */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {boardListCounts[board.id] || 0} {(boardListCounts[board.id] || 0) === 1 ? 'list' : 'lists'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                Active
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-sm font-semibold">{boardListCounts[board.id] || 0} {(boardListCounts[board.id] || 0) === 1 ? 'list' : 'lists'}</span>
                          </div>

                          {board.createdAt && (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-medium">{formatBoardDate(board.createdAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div
                      onClick={async () => {
                        setShowCreateModal(true);
                      }}
                      className="bg-white dark:bg-slate-800 rounded-xl p-5 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer hover:border-slate-500 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 h-44 group"
                    >
                      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 transition-all">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="text-base font-semibold text-slate-700 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Create new board</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : lists.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12 bg-transparent">
          <div className="text-center animate-slideUp max-w-lg">
            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg className="w-12 h-12 text-gray-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-2">No lists yet</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">Create your first list to organize work and projects.</p>
            {currentBoard && (
              <button
                onClick={async () => {
                  const l = await createListApi(currentBoard!, { title: 'To Do' });
                  setLists(s => [...s, l]);
                  setCards(c => ({ ...c, [l.id]: [] }));
                }}
                className="px-6 py-3 btn-slate rounded-xl font-semibold text-base hover:scale-105 transition-all"
              >
                Create First List
              </button>
            )}
          </div>
        </div>
      ) : (
        <DragDropContext key={currentBoard} onDragEnd={onDragEnd}>
          <div className="flex gap-4 md:gap-6 p-3 md:p-6 overflow-x-auto items-start scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {lists.map(list => {
              const allCards = cards[list.id] || [];
              const listCards = filteredCards(allCards);
              const hasFilters = searchQuery || filterPriority !== 'all' || filterLabel !== 'all';
              return (
                <div key={list.id} className="w-80 flex-shrink-0 bg-white dark:bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md flex flex-col overflow-hidden relative border border-slate-200 dark:border-slate-700/50 animate-fadeIn transition-all duration-300">
                  {/* Modern List Header with Gradient */}
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center justify-between">
                      {editingListId === list.id ? (
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          if (!editingListTitle.trim()) {
                            setEditingListId(null);
                            return;
                          }
                          const updated = await updateListApi(list.id, { title: editingListTitle });
                          setLists(s => s.map(l => l.id === list.id ? updated : l));
                          setEditingListId(null);
                        }} className="flex-1 mr-2">
                          <input
                            autoFocus
                            value={editingListTitle}
                            onChange={e => setEditingListTitle(e.target.value)}
                            onBlur={async () => {
                              if (!editingListTitle.trim()) {
                                setEditingListId(null);
                                return;
                              }
                              const updated = await updateListApi(list.id, { title: editingListTitle });
                              setLists(s => s.map(l => l.id === list.id ? updated : l));
                              setEditingListId(null);
                            }}
                            className="w-full px-2 py-1 text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
                          />
                        </form>
                      ) : (
                        <h3
                          onClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); }}
                          className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base truncate mr-2 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 px-2 py-1 rounded transition-colors -ml-2"
                          title="Click to rename"
                        >
                          {list.title}
                        </h3>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                          {listCards.length}
                        </span>
                        <button
                          onClick={() => deleteList(list.id)}
                          className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-all p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Delete list"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Cards Area - scrollable */}
                  <Droppable droppableId={String(list.id)} isDropDisabled={hasFilters} isCombineEnabled={false} ignoreContainerClipping={false}>
                    {(provided: any, snapshot: any) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 space-y-2.5 transition-all relative flex-1 overflow-auto custom-scrollbar max-h-[calc(100vh-280px)] ${snapshot.isDraggingOver ? 'bg-slate-100/50 dark:bg-slate-800/30' : 'bg-transparent'}`}
                      >
                        {listCards.map((card, idx) => (
                          <Draggable key={card.id} draggableId={String(card.id)} index={idx} isDragDisabled={hasFilters}>
                            {(provided2: any, snapshot2: any) => (
                              <div
                                ref={provided2.innerRef}
                                {...provided2.draggableProps}
                                {...provided2.dragHandleProps}
                                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border ${snapshot2.isDragging ? 'shadow-lg ring-2 ring-slate-400/50 border-slate-400 dark:border-slate-500' : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                                  } relative group overflow-hidden`}
                                style={{ ...provided2.draggableProps.style }}
                              >
                                <div
                                  className="p-4 relative"
                                  onMouseEnter={() => setHoveredCard(card.id)}
                                  onMouseLeave={() => setHoveredCard(prev => (prev === card.id ? null : prev))}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Checkbox with proper spacing from text */}
                                    <div className="flex items-center justify-center flex-shrink-0 mt-2">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (card.completed) {
                                            try {
                                              const updated = await updateCardApi(card.id, { archived: false } as any);
                                              const normalized = { ...updated, completed: !!updated.archived };
                                              setCards(prev => ({
                                                ...prev,
                                                [list.id]: prev[list.id].map((c: any) => (c.id === card.id ? normalized : c)),
                                              }));
                                              if (showCard && showCard.id === card.id) setShowCard(normalized);
                                            } catch (err) {
                                              showSnackbar('Failed to mark card as not done', 'error');
                                            }
                                            return;
                                          }

                                          try {
                                            const updated = await archiveCardApi(card.id);
                                            const normalized = { ...updated, completed: !!updated.archived };
                                            setCards(prev => ({
                                              ...prev,
                                              [list.id]: prev[list.id].map((c: any) => (c.id === card.id ? normalized : c)),
                                            }));
                                            if (showCard && showCard.id === card.id) setShowCard(normalized);
                                          } catch (err) {
                                            showSnackbar('Failed to mark card as done', 'error');
                                          }
                                        }}
                                        className="transform transition-all focus:outline-none"
                                        title={card.completed ? 'Completed' : 'Mark as done'}
                                        aria-pressed={card.completed}
                                      >
                                        {card.completed ? (
                                          <span className="w-5 h-5 rounded-full bg-green-600 inline-flex items-center justify-center text-white">
                                            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          </span>
                                        ) : (
                                          <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-400 dark:border-slate-600 hover:border-slate-600 dark:hover:border-slate-400 inline-flex items-center justify-center transition-colors">
                                          </span>
                                        )}
                                      </button>
                                    </div>

                                    <div onClick={() => openCard(card)} className={`flex-1 font-semibold text-sm truncate transition-all ${card.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100 group-hover:translate-x-1'}`}>
                                      {card.title}
                                    </div>

                                    {/* Delete card button */}
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const okDel = await confirm({ title: 'Delete card', message: 'Delete this card?' });
                                        if (!okDel) return;
                                        try {
                                          await deleteCardApi(card.id);
                                          setCards(prev => ({ ...prev, [list.id]: prev[list.id].filter(c => c.id !== card.id) }));
                                          if (showCard && showCard.id === card.id) setShowCard(null);
                                        } catch (err) {
                                          showSnackbar('Failed to delete card', 'error');
                                        }
                                      }}
                                      title="Delete card"
                                      className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>

                                  {hoveredCard === card.id && (
                                    <div className="absolute left-full top-0 ml-4 w-64 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-slate-lg p-4 z-30">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{card.title}</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{card.dueDate || ''}</div>
                                      </div>
                                      {card.description && <div className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-3 font-medium whitespace-pre-line">{card.description}</div>}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {(card.labels || []).map((l: string) => (
                                          <span key={l} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-semibold">{l}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* Gradient accent bar at bottom */}
                                <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: card.coverColor ? `linear-gradient(90deg, ${card.coverColor}, ${card.coverColor}dd)` : 'linear-gradient(90deg, #475569, #334155)' }}></div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Modern Add Card Form */}
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-700/50">
                    {openAddInputFor === String(list.id) ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const val = addInputRefs.current[String(list.id)]?.value || '';
                          if (!val.trim()) return;
                          const created = await createCardApi(list.id, { title: val.trim() });
                          setCards(c => ({ ...c, [list.id]: [...(c[list.id] || []), created] }));
                          addInputRefs.current[String(list.id)]!.value = '';
                          setOpenAddInputFor(null);
                        }}
                      >
                        <input
                          ref={(el) => { addInputRefs.current[String(list.id)] = el; }}
                          placeholder="What needs to be done?"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm transition-all"
                          autoFocus
                          onBlur={() => setOpenAddInputFor(null)}
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => setOpenAddInputFor(String(list.id))}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add a card
                      </button>
                    )}
                  </div>
                  {/* list-level slat removed so accent shows only on cards */}
                </div>
              );
            })}

            {/* Modern Add List Button */}
            <div className="w-80 flex-shrink-0">
              {isAddingList ? (
                <div className="w-full border border-slate-300 dark:border-slate-700 rounded-2xl p-3 shadow-sm bg-white dark:bg-slate-800 backdrop-blur-md">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newListTitle.trim()) return;
                    const l = await createListApi(currentBoard!, { title: newListTitle });
                    setLists(s => [...s, l]);
                    setCards(c => ({ ...c, [l.id]: [] }));
                    setNewListTitle('');
                    setIsAddingList(false);
                  }}>
                    <input
                      autoFocus
                      placeholder="Enter list title..."
                      value={newListTitle}
                      onChange={e => setNewListTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm transition-all mb-3"
                    />
                    <div className="flex gap-2 text-sm justify-end">
                      <button type="button" onClick={() => setIsAddingList(false)} className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded font-medium transition-colors">Cancel</button>
                      <button type="submit" className="px-4 py-1.5 btn-slate rounded font-medium">Add List</button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  className="w-full h-32 bg-slate-200/20 dark:bg-slate-800/20 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl transition-all flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 group"
                  onClick={() => { setIsAddingList(true); setNewListTitle(''); }}
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-slate-200 dark:border-slate-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold tracking-tight">Add New List</span>
                </button>
              )}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Create Board Modal */}
      <CreateBoardModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={async (title: string) => {
          try {
            await createNewBoard(title);
          } catch (err) {
            showSnackbar('Failed to create board', 'error');
          }
        }}
      />

      {/* Enhanced Card Modal */}
      {
        showCard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center overflow-y-auto z-50 py-4 animate-fadeIn" onClick={() => setShowCard(null)}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-3xl shadow-3xl relative flex flex-col min-h-[520px] max-h-[85vh] mx-4 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors" onClick={(e) => e.stopPropagation()}>

              {/* Cover Background or Default Header Spacer */}
              {showCard.coverColor ? (
                <div
                  className={`w-full shrink-0 rounded-t-3xl relative transition-all duration-300 ${showCard.coverSize === 'full' ? 'h-40' : 'h-24'}`}
                  style={{ backgroundColor: showCard.coverColor }}
                >
                  <div className="absolute inset-0 bg-black/10 rounded-t-3xl"></div>
                </div>
              ) : (
                <div className="w-full h-24 shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-3xl"></div>
              )}

              {/* Header / Top Bar Actions (Absolute Overlay) */}
              <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-8 py-6">
                {/* Status Dropdown */}
                <div className="relative">
                  <div
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-white/20 px-3 py-1 rounded-md cursor-pointer hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{showCard.priority || 'No Priority'}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[220px] animate-slideDown p-2">
                      {[
                        { val: 'low', label: 'Low', color: 'bg-emerald-400', desc: 'Low priority' },
                        { val: 'medium', label: 'Medium', color: 'bg-amber-400', desc: 'Medium priority' },
                        { val: 'high', label: 'High', color: 'bg-orange-400', desc: 'High priority' },
                        { val: 'urgent', label: 'Urgent', color: 'bg-red-500', desc: 'Immediate attention' }
                      ].map(p => (
                        <button
                          key={p.val}
                          onClick={async () => {
                            await updateCardField('priority', p.val);
                            setShowStatusDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-700 text-white transition-colors"
                        >
                          <span className={`w-3 h-3 rounded-full ${p.color} flex-shrink-0`} />
                          <div className="flex-1 text-left">
                            <div className="font-semibold">{p.label}</div>
                            <div className="text-xs text-slate-300">{p.desc}</div>
                          </div>
                          {showCard.priority === p.val && (
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Actions - Updated with Feedback, Divider, Cover */}
                <div className="flex items-center gap-1.5 text-white/90">
                  {/* Feedback / Megaphone */}
                  <button className="p-2 hover:bg-black/20 rounded transition-colors" title="Feedback">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  </button>

                  {/* Vertical Divider */}
                  <div className="h-6 w-px bg-white/20 mx-1"></div>

                  {/* Icon Block (Cover) */}
                  <div className="relative" ref={coverBtnRef}>
                    <button
                      onClick={() => setShowCoverModal(!showCoverModal)}
                      className="p-2 hover:bg-white/20 rounded relative transition-colors"
                      title="Cover color"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                    {showCoverModal && (
                      <DropdownContent
                        wrapperRef={coverBtnRef}
                        className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700 p-3 animate-scaleIn max-h-[80vh] overflow-y-auto"
                        widthClass="w-72 sm:w-80 md:w-[420px]"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-base">Cover</h4>
                          <button
                            onClick={() => setShowCoverModal(false)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Size */}
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-slate-400 mb-2">Size</div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={async () => {
                                await updateCardField('coverSize', 'small');
                                if (!showCard.coverColor) {
                                  await updateCardField('coverColor', COVER_COLORS[0]);
                                }
                                setShowCoverModal(false);
                              }}
                              className={`bg-slate-800 rounded-lg p-2 border-2 transition ${showCard.coverSize === 'small' ? 'border-white' : 'border-slate-700 hover:border-slate-500'
                                }`}
                            >
                              <div className="h-5 bg-slate-600 rounded mb-1"></div>
                              <div className="h-1.5 bg-slate-700 rounded w-3/4"></div>
                            </button>
                            <button
                              onClick={async () => {
                                await updateCardField('coverSize', 'full');
                                if (!showCard.coverColor) {
                                  await updateCardField('coverColor', COVER_COLORS[0]);
                                }
                                setShowCoverModal(false);
                              }}
                              className={`bg-slate-800 rounded-lg p-2 border-2 transition ${showCard.coverSize === 'full' ? 'border-white' : 'border-slate-700 hover:border-slate-500'
                                }`}
                            >
                              <div className="h-8 bg-slate-600 rounded mb-1"></div>
                              <div className="h-1.5 bg-slate-700 rounded w-4/5"></div>
                            </button>
                          </div>
                        </div>

                        {/* Colors */}
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-slate-400 mb-2">Colors</div>
                          <div className="grid grid-cols-6 gap-2">
                            {COVER_COLORS.map(color => (
                              <button
                                key={color}
                                onClick={async () => {
                                  await updateCardField('coverColor', color);
                                  if (!showCard.coverSize) {
                                    await updateCardField('coverSize', 'small');
                                  }
                                  setShowCoverModal(false);
                                }}
                                className={`h-8 rounded-lg border-2 transition ${showCard.coverColor === color ? 'border-white ring-2 ring-white/50' : 'border-transparent hover:border-white'
                                  }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Remove Cover */}
                        {(showCard.coverColor || showCard.coverSize) && (
                          <button
                            onClick={async () => {
                              await updateCardField('coverColor', null);
                              await updateCardField('coverSize', null);
                              setShowCoverModal(false);
                            }}
                            className="w-full mb-3 px-3 py-1.5 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-medium transition"
                          >
                            Remove Cover
                          </button>
                        )}

                        {/* Accessibility */}
                        <button
                          onClick={() => {
                            showSnackbar('Colorblind mode feature coming soon', 'info');
                          }}
                          className="w-full mb-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          Enable colorblind friendly mode
                        </button>

                        {/* Attachments */}
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-slate-400 mb-2">Attachments</div>
                          <button
                            onClick={() => {
                              showSnackbar('Image upload feature coming soon', 'info');
                            }}
                            className="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition"
                          >
                            Upload a cover image
                          </button>
                          <p className="text-xs text-slate-400 mt-1">
                            Tip: Drag an image on to the card to upload it.
                          </p>
                        </div>

                        {/* Unsplash */}
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-slate-400 mb-2">Photos from Unsplash</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <div
                                key={i}
                                onClick={() => {
                                  showSnackbar('Unsplash integration coming soon', 'info');
                                }}
                                className="h-14 rounded-lg bg-slate-700 hover:opacity-80 transition cursor-pointer"
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            showSnackbar('Search feature coming soon', 'info');
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          Search for photos
                        </button>

                        <p className="text-xs text-slate-500 mt-3">
                          By using images from Unsplash, you agree to their license and Terms of Service
                        </p>
                      </DropdownContent>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                      className="p-2 hover:bg-white/20 rounded transition-colors"
                      title="Options"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                    </button>
                    {showOptionsMenu && (
                      <CardOptionsDropdown
                        card={showCard}
                        lists={lists}
                        onClose={() => setShowOptionsMenu(false)}
                        onUpdate={(fields) => {
                          const listId = lists.find(l => (cards[l.id] || []).some(c => c.id === showCard.id))?.id;
                          if (listId) {
                            setCards(prev => ({
                              ...prev,
                              [listId]: prev[listId].map(c => c.id === showCard.id ? { ...c, ...fields } : c)
                            }));
                            setShowCard(prev => prev ? { ...prev, ...fields } : prev);
                          }
                          // Also trigger API update if needed, but for local state this is fine
                          // Ideally we call updateCardField here too
                          Object.entries(fields).forEach(([k, v]) => updateCardField(k as any, v));
                          return Promise.resolve();
                        }}
                        onDelete={async () => {
                          await deleteCardApi(showCard.id);
                          const listId = lists.find(l => (cards[l.id] || []).some(c => c.id === showCard.id))?.id;
                          if (listId) setCards(prev => ({ ...prev, [listId]: prev[listId].filter(c => c.id !== showCard.id) }));
                          setShowCard(null);
                        }}
                        onDuplicate={async () => {
                          const dup = await duplicateCardApi(showCard.id);
                          const listId = lists.find(l => (cards[l.id] || []).some(c => c.id === showCard.id))?.id;
                          if (listId) setCards(c => ({ ...c, [listId]: [...c[listId], dup] }));
                        }}
                        onMove={async (targetListId) => {
                          const currentListId = lists.find(l => (cards[l.id] || []).some(c => c.id === showCard.id))?.id;
                          if (!currentListId || currentListId === targetListId) return;

                          // Optimistic UI update
                          const card = cards[currentListId].find(c => c.id === showCard.id);
                          if (!card) return;

                          setCards(prev => ({
                            ...prev,
                            [currentListId]: prev[currentListId].filter(c => c.id !== showCard.id),
                            [targetListId]: [...(prev[targetListId] || []), card]
                          }));

                          await moveCardApi(showCard.id, targetListId, 0); // Move to top
                          showSnackbar(`Moved to list`, 'success');
                        }}
                        showSnackbar={showSnackbar}
                      />
                    )}
                  </div>
                  <button onClick={() => setShowCard(null)} className="p-2 hover:bg-white/20 rounded ml-2 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              </div>



              <div className="px-6 pt-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 relative">

                {/* Title Section */}
                <div className="flex items-start gap-3">
                  <div className="pt-0">
                    <button
                      onClick={async () => {
                        const newArchived = !showCard.archived;
                        await updateCardField('archived', newArchived);
                      }}
                      className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-center transition-colors"
                    >
                      {showCard.archived && (
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex-1">
                    <input
                      value={showCard.title}
                      onChange={(e) => setShowCard(prev => prev ? { ...prev, title: e.target.value } : prev)}
                      onBlur={(e) => updateCardField('title', e.target.value)}
                      className="w-full bg-transparent text-slate-700 dark:text-slate-100 focus:text-slate-800 dark:focus:text-white font-semibold text-xl border-none outline-none p-0 focus:ring-0 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                      placeholder="Card title"
                    />
                    <div className="text-xs text-slate-700 dark:text-slate-400 mt-1">
                      in list <span className="underline decoration-slate-300 dark:decoration-slate-600 decoration-dotted">{lists.find(l => (cards[l.id] || []).some(c => c.id === showCard.id))?.title || 'To Do'}</span>
                    </div>
                  </div>
                </div>

                {/* Inline Action Buttons */}
                <div className="pl-8 flex flex-wrap gap-2 mt-3">
                  {/* Priority Dropdown */}
                  <div className="relative" ref={priorityBtnRef}>
                    <button
                      onClick={() => setShowPriorityModal(!showPriorityModal)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-medium rounded border border-slate-700 dark:border-slate-600 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Priority
                    </button>
                    {showPriorityModal && (
                      <DropdownContent wrapperRef={priorityBtnRef} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-2 animate-scaleIn transition-colors" widthClass="w-56">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-2 py-1 mb-1">Set Priority</h4>
                        <div className="space-y-1">
                          {[{ val: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
                          { val: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
                          { val: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
                          { val: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }].map(p => (
                            <button
                              key={p.val}
                              onClick={async () => {
                                await updateCardField('priority', p.val);
                                setShowPriorityModal(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between ${showCard.priority === p.val ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
                            >
                              <span className={`px-2 py-0.5 rounded ${p.color} dark:bg-opacity-20`}>{p.label}</span>
                              {showCard.priority === p.val && <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                          ))}
                        </div>
                      </DropdownContent>
                    )}
                  </div>

                  {/* Labels Dropdown */}
                  <div className="relative" ref={labelsBtnRef}>
                    <button
                      onClick={() => setShowLabelsModal(!showLabelsModal)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-medium rounded border border-slate-700 dark:border-slate-600 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      Labels
                    </button>
                    {showLabelsModal && (
                      <DropdownContent wrapperRef={labelsBtnRef} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-3 animate-scaleIn transition-colors" widthClass="w-72">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Labels</h4>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {LABEL_COLORS.map(label => {
                            const isSelected = (showCard.labels || []).includes(label.name);
                            return (
                              <button
                                key={label.name}
                                onClick={async () => {
                                  const currentLabels = showCard.labels || [];
                                  const newLabels = isSelected
                                    ? currentLabels.filter(l => l !== label.name)
                                    : [...currentLabels, label.name];
                                  await updateCardField('labels', newLabels);
                                }}
                                className={`w-full ${label.color} ${label.text} px-3 py-2 rounded-lg font-semibold text-xs text-left transition-all hover:opacity-80 flex items-center justify-between ring-1 ring-inset ring-black/5`}
                              >
                                <span>{label.name}</span>
                                {isSelected && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                              </button>
                            );
                          })}
                        </div>
                      </DropdownContent>
                    )}
                  </div>

                  {/* Dates Dropdown */}
                  <div className="relative" ref={datesBtnRef}>
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-medium rounded border border-slate-700 dark:border-slate-600 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Dates
                    </button>
                    {showDatePicker && (
                      <DropdownContent wrapperRef={datesBtnRef} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 animate-scaleIn transition-colors" widthClass="w-72">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Due Date</h4>
                        <input
                          type="date"
                          value={showCard.dueDate || ''}
                          onChange={async (e) => {
                            await updateCardField('dueDate', e.target.value || null);
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100 outline-none font-medium text-sm mb-3"
                        />
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="w-full px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg font-semibold text-sm transition-colors border border-slate-700 dark:border-slate-600"
                        >
                          Done
                        </button>
                      </DropdownContent>
                    )}
                  </div>

                  <button
                    onClick={() => setShowChecklist(prev => {
                      const next = !prev;
                      if (next) setTimeout(() => document.getElementById('checklist-input')?.focus(), 0);
                      return next;
                    })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-medium rounded border border-slate-700 dark:border-slate-600 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Checklist
                  </button>

                  {/* Members Dropdown */}
                  <div className="relative" ref={membersBtnRef}>
                    <button
                      onClick={() => setShowMembersModal(!showMembersModal)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-medium rounded border border-slate-700 dark:border-slate-600 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Members
                    </button>
                    {showMembersModal && (
                      <DropdownContent wrapperRef={membersBtnRef} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4 animate-scaleIn transition-colors" widthClass="w-72">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Assign Member</h4>
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={showCard.assignee || ''}
                          onChange={async (e) => {
                            await updateCardField('assignee', e.target.value || null);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-600 dark:focus:border-slate-500 outline-none font-medium text-slate-900 dark:text-slate-100 text-sm mb-3"
                          autoFocus
                        />
                        <button
                          onClick={() => setShowMembersModal(false)}
                          className="w-full px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg font-semibold text-sm transition-colors"
                        >
                          Done
                        </button>
                      </DropdownContent>
                    )}
                  </div>
                </div>

                {/* Display current labels */}
                {showCard.labels && showCard.labels.length > 0 && (
                  <div className="pl-8 flex flex-wrap gap-2">
                    {showCard.labels.map(label => {
                      const labelInfo = LABEL_COLORS.find(l => l.name === label) || { name: label, color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-800 dark:text-slate-200' };
                      return (
                        <span key={label} className={`${labelInfo.color} ${labelInfo.text} px-3 py-1 rounded-full text-xs font-semibold`}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Display due date */}
                {showCard.dueDate && (
                  <div className={`pl-8 flex items-center gap-2 text-sm ${new Date(showCard.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) && !showCard.completed ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-medium">Due: {new Date(showCard.dueDate).toLocaleDateString()}{new Date(showCard.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) && !showCard.completed ? ' (Overdue)' : ''}</span>
                  </div>
                )}

                {/* Description */}
                <div className="pl-8">
                  <div className="flex items-center gap-3 mb-2 text-slate-800 dark:text-slate-100 font-bold text-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    Description
                  </div>
                  <textarea
                    value={showCard.description || ''}
                    onChange={(e) => setShowCard(prev => prev ? { ...prev, description: e.target.value } : prev)}
                    onBlur={(e) => updateCardField('description', e.target.value || null)}
                    placeholder="Add a more detailed description..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 outline-none min-h-[120px] text-slate-800 dark:text-slate-200 text-sm resize-y transition-all placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 shadow-sm"
                  />
                </div>

                {/* Checklist Section using Component (shown only when toggled) */}
                <div className="pl-8">
                  {showChecklist && (
                    <Checklist
                      cardId={showCard.id}
                      onChange={(items) => {
                        setShowCard(prev => prev ? { ...prev, checklist: items } : prev);
                        if (!items || items.length === 0) setShowChecklist(false);
                      }}
                      onCardUpdate={(updatedCard) => {
                        const normalized = { ...updatedCard, completed: !!updatedCard.archived };
                        setShowCard(prev => prev ? { ...prev, ...normalized } : prev);

                        const listId = lists.find(l => (cards[l.id] || []).some(c => c.id === normalized.id))?.id;
                        if (listId) {
                          setCards(prev => ({
                            ...prev,
                            [listId]: prev[listId].map(c => c.id === normalized.id ? { ...c, ...normalized } : c)
                          }));
                        }
                      }}
                    />
                  )}
                </div>

                {/* Discussion */}
                <div className="pl-8">
                  <div className="flex items-center gap-3 mb-4 text-slate-800 dark:text-slate-100 font-bold text-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Comments
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold shadow-sm">ME</div>
                    </div>
                    <div className="flex-1">
                      <input
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all shadow-sm"
                        placeholder="Write a comment..."
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if (!val.trim()) return;
                            const res = await addCommentApi(showCard.id, val);
                            setComments(c => ({ ...c, [showCard.id]: [...(c[showCard.id] || []), res] }));
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1.5 ml-1">Press Enter to post</p>
                    </div>
                  </div>
                  <div className="space-y-4 mt-6">
                    {(comments[showCard.id] || []).map(c => (
                      <div key={c.id} className="flex gap-3 animate-fadeIn">
                        <div className="flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold shadow-sm">{c.userId?.charAt(0)}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.userId}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-500 font-medium">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-700 dark:text-slate-300 text-sm border border-slate-100 dark:border-slate-800 inline-block leading-relaxed">{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-2"></div>
              </div>



            </div>
          </div>
        )
      }
    </div >
  );
};

export default BoardPage;
