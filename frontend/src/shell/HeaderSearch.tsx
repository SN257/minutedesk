import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { adminGetUsers, getAllCardsApi, getMeetings, getTasks } from '../lib/api';
import { useAuth } from '../lib/auth';
import { shortcut } from '../lib/platform';
import type { View } from '../lib/nav';
import { Icon } from './icons';
import type { Command } from './CommandPalette';
import { meetingTitle } from '../views/meetings/helpers';

interface Item { id: string; group: string; title: string; sub?: string; text: string; icon: ReactNode; run: () => void }

const GROUPS = ['Quick actions', 'Meetings', 'Tasks', 'Board cards', 'People'];
const CACHE_MS = 60_000;

/**
 * The search box in the top bar. It is a real field: hover for a hint, click to type, and results for
 * what you type appear in a list right below (quick actions, meetings, tasks, cards and, for admins, people).
 */
export const HeaderSearch = ({ commands, go, canSeePeople }: { commands: Command[]; go: (v: View, p?: string | null) => void; canSeePeople: boolean }) => {
  const { can } = useAuth();
  const canMeetings = can('meetings');
  const canTasks = can('tasks');
  // Only search what this person can open.
  const what = [canMeetings && 'meetings', canTasks && 'tasks', canSeePeople && 'people'].filter(Boolean) as string[];
  const placeholder = what.length ? `Search ${what.join(', ')}…` : 'Search or jump to…';
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [hover, setHover] = useState(false);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Item[]>([]);
  const loadedAt = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const sheetInput = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const close = useCallback(() => { setFocused(false); setSheet(false); setQ(''); input.current?.blur(); sheetInput.current?.blur(); }, []);

  /* the list sits under the field; measure the field so it can float above the header */
  const place = useCallback(() => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) });
  }, []);
  useEffect(() => { if (focused) place(); }, [focused, place]);
  useEffect(() => {
    if (!focused) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || panel.current?.contains(t) || sheetInput.current?.parentElement?.contains(t)) return;
      close();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('resize', place); };
  }, [focused, close, place]);

  /* load what can be searched, once per minute while the field is used */
  const load = useCallback(async () => {
    if (Date.now() - loadedAt.current < CACHE_MS) return;
    loadedAt.current = Date.now();
    setLoading(true);
    const [m, t, c, u] = await Promise.allSettled([canMeetings ? getMeetings() : Promise.resolve([]), canTasks ? getTasks() : Promise.resolve([]), canTasks ? getAllCardsApi() : Promise.resolve([]), canSeePeople ? adminGetUsers() : Promise.resolve([])]);
    const items: Item[] = [];
    if (m.status === 'fulfilled' && Array.isArray(m.value)) {
      m.value.forEach((x: any) => items.push({
        id: `m-${x.id}`, group: 'Meetings', title: meetingTitle(x), sub: [x.meetingType, String(x.date ?? '').slice(0, 10), x.place].filter(Boolean).join(' · '),
        text: [x.center, x.meetingType, x.personName, x.place, String(x.date ?? '').slice(0, 10)].filter(Boolean).join(' '), icon: Icon.meetings(16), run: () => go('meetings', x.id),
      }));
    }
    if (t.status === 'fulfilled' && Array.isArray(t.value)) {
      t.value.forEach((x: any) => items.push({
        id: `t-${x.id}`, group: 'Tasks', title: x.title, sub: [x.completed ? 'Done' : 'Open', x.dueDate ? `due ${String(x.dueDate).slice(0, 10)}` : ''].filter(Boolean).join(' · '),
        text: `${x.title} ${x.description ?? ''}`, icon: Icon.tasks(16), run: () => go('tasks'),
      }));
    }
    if (c.status === 'fulfilled' && Array.isArray(c.value)) {
      c.value.forEach((x: any) => items.push({
        id: `c-${x.id}`, group: 'Board cards', title: x.title, sub: [x.archived ? 'Done' : 'Open', x.dueDate ? `due ${String(x.dueDate).slice(0, 10)}` : ''].filter(Boolean).join(' · '),
        text: `${x.title} ${x.description ?? ''}`, icon: Icon.tasks(16), run: () => go('tasks', x.id),
      }));
    }
    if (u.status === 'fulfilled' && Array.isArray(u.value)) {
      u.value.forEach((x: any) => items.push({
        id: `u-${x.id}`, group: 'People', title: x.name || x.email, sub: x.name ? x.email : x.role, text: `${x.name ?? ''} ${x.email} ${x.role}`, icon: Icon.admin(16), run: () => go('admin', 'people'),
      }));
    }
    setData(items);
    setLoading(false);
  }, [canSeePeople, canMeetings, canTasks, go]);

  useEffect(() => { if (focused) void load(); }, [focused, load]);

  /* ⌘K / Ctrl K jumps into the field */
  useEffect(() => {
    const on = () => { if (window.innerWidth < 640) { setSheet(true); setFocused(true); setTimeout(() => sheetInput.current?.focus(), 30); } else { input.current?.focus(); input.current?.select(); } };
    window.addEventListener('md2:search-focus', on);
    return () => window.removeEventListener('md2:search-focus', on);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const cmd: Item[] = commands.map((c) => ({ id: `cmd-${c.id}`, group: 'Quick actions', title: c.label, sub: c.hint, text: `${c.label} ${c.hint ?? ''}`, icon: c.icon, run: c.run }));
    const pool = [...cmd, ...data];
    const hit = s ? pool.filter((i) => i.text.toLowerCase().includes(s) || i.title.toLowerCase().includes(s)) : cmd.slice(0, 6);
    return GROUPS.flatMap((g) => hit.filter((i) => i.group === g).slice(0, s ? 5 : 6));
  }, [q, commands, data]);

  useEffect(() => setIdx(0), [q]);

  const pick = (i?: Item) => { if (!i) return; close(); setQ(''); i.run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[idx]); }
    else if (e.key === 'Escape') { e.preventDefault(); setQ(''); close(); }
  };

  const grouped = GROUPS.map((g) => [g, results.filter((r) => r.group === g)] as const).filter(([, l]) => l.length);
  const root = document.querySelector('[data-app-root]') ?? document.body;

  const list = (
    <div className="max-h-[min(26rem,calc(100dvh-9rem))] overflow-y-auto scroll-y p-2">
      {grouped.length === 0 && !loading && <p className="text-center text-sm text-muted py-8">{q ? <>Nothing matches “{q}”</> : 'Start typing to search'}</p>}
      {grouped.map(([g, items]) => (
        <div key={g} className="mb-1 last:mb-0">
          <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{g}</p>
          {items.map((r) => {
            const i = results.indexOf(r);
            return (
              <button key={r.id} type="button" onMouseEnter={() => setIdx(i)} onClick={() => pick(r)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${i === idx ? 'bg-ink/[0.07]' : ''}`}>
                <span className="w-8 h-8 shrink-0 rounded-lg bg-ink/[0.06] grid place-items-center text-ink-2">{r.icon}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{r.title}</span>{r.sub && <span className="block text-xs text-muted truncate">{r.sub}</span>}</span>
                {i === idx && <span className="text-[10px] text-muted font-bold">↵</span>}
              </button>
            );
          })}
        </div>
      ))}
      {loading && <p className="text-center text-xs text-muted py-3">Loading your data…</p>}
    </div>
  );

  return (
    <div className="relative">
      {/* phones: a round button that opens a full-width field */}
      <button type="button" onClick={() => { setSheet(true); setFocused(true); setTimeout(() => sheetInput.current?.focus(), 30); }} aria-label="Search" className="sm:hidden w-10 h-10 rounded-full bg-white/55 border border-white/80 grid place-items-center text-char/60">{Icon.search(16)}</button>

      {/* wider screens: the field itself */}
      <div
        ref={box}
        className={`max-sm:hidden relative h-10 flex items-center gap-2.5 px-3.5 rounded-xl border transition-[width,background-color,box-shadow,border-color] duration-200 ${focused ? 'w-[26rem] bg-white border-brand/50 shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-brand)_15%,transparent)]' : 'w-[19rem] bg-white/55 border-white/80 hover:bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none dark:border-white/15'}`}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      >
        <span className={focused ? 'text-brand' : 'text-char/55'}>{Icon.search(16)}</span>
        <input
          ref={input} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocused(true)} onKeyDown={onKey}
          placeholder={placeholder} aria-label="Search" autoComplete="off" spellCheck={false}
          className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-ink placeholder:text-char/55"
        />
        {q ? (
          <button type="button" aria-label="Clear" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(''); input.current?.focus(); }} className="w-6 h-6 rounded-full grid place-items-center text-muted hover:bg-ink/10">✕</button>
        ) : (
          <kbd className="text-[10px] rounded-md border border-char/10 bg-char/[0.04] px-1.5 py-0.5 text-char/55">{focused ? 'esc' : shortcut('K')}</kbd>
        )}
        <AnimatePresence>
          {hover && !focused && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} role="tooltip"
              className="pointer-events-none absolute left-0 top-full mt-2 z-[70] flex items-start gap-2 rounded-xl bg-char text-white text-[12px] leading-snug px-3 py-2 shadow-[0_12px_28px_-10px_rgba(6,20,27,0.5)] w-64">
              <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full border border-white/70 grid place-items-center text-[10px] font-bold italic">i</span>
              <span>Search meetings, tasks, board cards and people. Click to type, or press <b>{shortcut('K')}</b> from anywhere.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {createPortal(
        <AnimatePresence>
          {focused && (
            <>
              {sheet && (
                <motion.div key="bar" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="sm:hidden fixed inset-x-3 top-3 h-16 z-[310] rounded-full bg-white shadow-pop flex items-center gap-3 px-5">
                  <span className="text-brand">{Icon.search(18)}</span>
                  <input ref={sheetInput} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={placeholder} aria-label="Search" autoComplete="off" spellCheck={false} className="flex-1 min-w-0 bg-transparent outline-none text-base text-ink placeholder:text-char/55" />
                  <button type="button" aria-label="Close search" onClick={() => { setQ(''); close(); }} className="w-8 h-8 rounded-full grid place-items-center text-muted hover:bg-ink/10">✕</button>
                </motion.div>
              )}
              <motion.div
                key="list" ref={panel} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
                style={sheet ? undefined : { top: pos.top, right: pos.right }}
                className={`fixed z-[300] glass-pop !bg-white rounded-2xl overflow-hidden ${sheet ? 'inset-x-3 top-[5.25rem]' : 'w-[min(30rem,calc(100vw-1.5rem))]'}`}
              >
                {list}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        root,
      )}
    </div>
  );
};
