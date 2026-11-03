import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBranding } from '../lib/branding';
import { useSiteConfig } from '../lib/siteConfig';
import { usePrefs } from '../lib/prefs';
import { useAuth } from '../lib/auth';
import { navigatePath, useRoute, type View } from '../lib/nav';
import { spring, viewTransition } from '../lib/motion';
import { getNotifications, markNotificationRead } from '../lib/api';
import { formatLocalDate, getLocalDateString } from '../lib/date';
import { Avatar } from '../ui';
import { CommandPalette, type Command } from './CommandPalette';
import { useExtraCrumbs } from '../lib/crumbs';
import { Icon } from './icons';
import { useNeeds } from './needs';
import { NotificationPanel, type Notif } from './NotificationPanel';


const LIGHT_FIELD = [
  'radial-gradient(42% 48% at 4% 6%, color-mix(in srgb, var(--brand-accent, #6e8696) 55%, transparent), transparent 70%)',
  'radial-gradient(38% 44% at 98% 4%, color-mix(in srgb, var(--brand-accent, #4fb89f) 38%, transparent), transparent 70%)',
  'radial-gradient(40% 46% at 92% 96%, rgb(120 140 200 / 0.28), transparent 70%)',
  'radial-gradient(36% 40% at 14% 98%, rgb(224 162 74 / 0.22), transparent 70%)',
  'linear-gradient(160deg, #eef1f3 0%, #e1e6e9 100%)',
].join(',');
const DARK_FIELD = [
  'radial-gradient(42% 48% at 6% 4%, color-mix(in srgb, var(--brand-accent, #4a5c6a) 50%, transparent), transparent 70%)',
  'radial-gradient(38% 44% at 96% 8%, rgb(79 184 159 / 0.20), transparent 70%)',
  'radial-gradient(40% 46% at 90% 98%, rgb(100 120 190 / 0.18), transparent 70%)',
  'linear-gradient(160deg, #0e202c 0%, #06141b 100%)',
].join(',');

const Moon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
const Sun = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;

// The dashboard must never create a scrollbar, so it fades in without sliding.
const fadeOnly = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.3 } }, exit: { opacity: 0, transition: { duration: 0.12 } } };

/** A hover label: visible only while the pointer is over the icon (or on keyboard focus), and gone as soon as it is clicked. */
const Tip = ({ label, side = 'right', children }: { label: string; side?: 'right' | 'bottom'; children: ReactNode }) => {
  const [clicked, setClicked] = useState(false);
  return (
    <span className="relative group/tip inline-flex" onClickCapture={() => setClicked(true)} onMouseLeave={() => setClicked(false)} onBlurCapture={() => setClicked(false)}>
      {children}
      <span role="tooltip" aria-hidden={clicked} className={`pointer-events-none absolute z-[70] whitespace-nowrap rounded-lg bg-char text-white text-[12px] font-medium px-2.5 py-1.5 shadow-[0_10px_24px_-8px_rgba(6,20,27,0.5)] transition-all duration-150 ${clicked ? 'opacity-0' : 'opacity-0 group-hover/tip:opacity-100 group-has-[:focus-visible]/tip:opacity-100'} ${side === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-3 -translate-x-1 group-hover/tip:translate-x-0 group-has-[:focus-visible]/tip:translate-x-0' : 'top-full left-1/2 -translate-x-1/2 mt-2 -translate-y-1 group-hover/tip:translate-y-0 group-has-[:focus-visible]/tip:translate-y-0'} ${clicked ? '!opacity-0' : ''}`}>{label}</span>
    </span>
  );
};

const readTheme = (fallback: boolean) => {
  try {
    const v = localStorage.getItem('md_theme');
    if (v === 'auto') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? fallback;
    return v === null ? fallback : v === 'dark';
  } catch { return fallback; }
};

export const Shell = ({ render }: { render: (view: View, param: string | null, go: ReturnType<typeof useRoute>['go']) => ReactNode }) => {
  const { user, hasAdmin, can, logout } = useAuth();
  const brand = useBranding();
  const { cfg } = useSiteConfig();
  const { view, param, go } = useRoute();
  const { needs } = useNeeds();
  const [palette, setPalette] = useState(false);
  const [pop, setPop] = useState<null | 'bell' | 'new' | 'user'>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [dark, setDark] = useState(() => readTheme(cfg.theme.defaultTheme === 'dark'));
  const [bellPos, setBellPos] = useState({ top: 76, right: 120 });

  const toggleTheme = () => setDark((d) => { const n = !d; try { localStorage.setItem('md_theme', n ? 'dark' : 'light'); } catch { /* storage unavailable */ } return n; });
  // Settings changes the theme choice; "auto" follows the device and updates when the device switches.
  useEffect(() => {
    const sync = () => setDark(readTheme(cfg.theme.defaultTheme === 'dark'));
    window.addEventListener('md-theme', sync);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', sync);
    return () => { window.removeEventListener('md-theme', sync); mq?.removeEventListener?.('change', sync); };
  }, [cfg.theme.defaultTheme]);
  // Open on the person's chosen start page, once, when they arrive without a page in the address.
  const { prefs } = usePrefs();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sp = prefs.appearance.startPage;
    if (sp && !window.location.hash.replace(/^#\/?/, '')) go(sp as View);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = useMemo(() => {
    const items: { key: View; label: string; icon: (s?: number) => ReactNode; dot: boolean }[] = [
      { key: 'today', label: 'Dashboard', icon: Icon.dashboard, dot: false },
      { key: 'meetings', label: 'Meetings', icon: Icon.meetings, dot: needs.meetingsToday > 0 },
      { key: 'tasks', label: 'Tasks', icon: Icon.tasks, dot: needs.overdue > 0 },
      { key: 'worklog', label: 'Work log', icon: Icon.worklog, dot: needs.logMissing > 0 },
      { key: 'reports', label: 'Insights', icon: Icon.reports, dot: false },
    ];
    if (hasAdmin) items.push({ key: 'admin', label: 'Admin', icon: Icon.admin, dot: false });
    // Setup can rename, hide and reorder these. Admin is never hidden from admins, and a saved menu never loses a page.
    const set = cfg.app.nav;
    const rank = (k: string) => { const i = set.findIndex((x) => x.key === k); return i < 0 ? 999 : i; };
    const shaped = items
      .map((i) => { const o = set.find((x) => x.key === i.key); return o?.label ? { ...i, label: o.label } : i; })
      .filter((i) => i.key === 'admin' || !set.find((x) => x.key === i.key)?.hidden)
      .sort((a, b) => rank(a.key) - rank(b.key));
    // People limited to some pages only see those.
    return shaped.filter((i) => i.key === 'admin' || can(i.key));
  }, [hasAdmin, needs, can, cfg.app.nav]);

  const allowedHere = view === 'settings' || (view === 'admin' ? hasAdmin : can(view));
  useEffect(() => { if (!allowedHere) go(nav[0]?.key ?? 'settings'); }, [allowedHere, nav, go]);

  const loadNotifs = useCallback(() => { getNotifications().then((n) => setNotifs(Array.isArray(n) ? n : [])).catch(() => {}); }, []);
  useEffect(() => { loadNotifs(); const t = setInterval(loadNotifs, 60000); return () => clearInterval(t); }, [loadNotifs]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const signOut = () => logout().then(() => navigatePath('/'));

  const commands: Command[] = useMemo(() => [
    ...(can('meetings') ? [{ id: 'new-meeting', label: 'Log minutes', hint: 'Create', icon: Icon.plus(16), run: () => go('meetings', 'new') }] : []),
    ...(can('tasks') ? [{ id: 'new-task', label: 'New task', hint: 'Create', icon: Icon.plus(16), run: () => go('tasks', 'new') }] : []),
    ...(can('worklog') ? [{ id: 'log-today', label: "Write today's work log", hint: 'Create', icon: Icon.worklog(16), run: () => go('worklog') }] : []),
    ...nav.map((n) => ({ id: `go-${n.key}`, label: `Go to ${n.label}`, hint: 'Navigate', icon: n.icon(16), run: () => go(n.key) })),
    { id: 'settings', label: 'Settings & profile', hint: 'Navigate', icon: Icon.settings(16), run: () => go('settings') },
    { id: 'logout', label: 'Sign out', icon: Icon.logout(16), run: () => { signOut(); } },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [go, nav, logout, can]);

  const unread = notifs.filter((n) => !n.read).length;
  const current = view === 'settings' ? 'Settings' : nav.find((n) => n.key === view)?.label ?? 'Dashboard';
  const extra = useExtraCrumbs();
  const nice = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ');
  /** Levels under the section, taken from the route. Screens can add more through lib/crumbs. */
  const routeCrumb: string | null =
    view === 'meetings' ? (!param ? null : param === 'new' || param.startsWith('start:') ? 'Log minutes' : param === 'schedule' ? 'Schedule' : param.startsWith('edit:') ? 'Edit minutes' : param.startsWith('center:') ? decodeURIComponent(param.slice(7)) || 'Center' : 'Minutes')
    : view === 'tasks' ? (!param ? null : param === 'new' ? 'New task' : 'Card')
    : view === 'admin' ? (param ? nice(param) : null)
    : null;
  const crumbs: { label: string; run?: () => void }[] = [
    { label: brand.siteName, run: () => go('today') },
    { label: current, run: view === 'today' ? undefined : () => { go(view); if (view === 'tasks') window.dispatchEvent(new Event('md2:tasks-home')); } },
    ...(view === 'tasks' ? extra : []),
    ...(routeCrumb ? [{ label: routeCrumb }] : []),
  ];
  const todayLabel = formatLocalDate(getLocalDateString(), { weekday: 'long', month: 'long', day: 'numeric' });
  const pct = needs.totalWeek ? Math.round((needs.doneWeek / needs.totalWeek) * 100) : 0;

  type SubItem = { label: string; icon: ReactNode; n?: number; active?: boolean; run: () => void };
  const create: SubItem[] = [
    ...(can('meetings') ? [{ label: 'Log minutes', icon: Icon.plus(16), run: () => go('meetings', 'new') }] : []),
    ...(can('tasks') ? [{ label: 'New task', icon: Icon.plus(16), run: () => go('tasks', 'new') }] : []),
    ...(can('meetings') ? [{ label: 'Schedule a meeting', icon: Icon.meetings(16), run: () => go('meetings', 'schedule') }] : []),
  ];
  // The second menu exists only for pages that have sub-items; every other page uses the full width.
  const subMenu: { title: string; items: SubItem[] }[] | null =
    view === 'meetings' ? [{ title: 'Meetings', items: [
        { label: 'All meetings', icon: Icon.meetings(16), active: !param, run: () => go('meetings') },
        { label: 'Log minutes', icon: Icon.plus(16), active: param === 'new', run: () => go('meetings', 'new') },
        { label: 'Schedule a meeting', icon: Icon.worklog(16), active: param === 'schedule', run: () => go('meetings', 'schedule') },
      ] }]
        : null;

  const menuBox = 'absolute z-50 rounded-2xl bg-white border border-char/10 shadow-[0_24px_50px_-20px_rgba(6,20,27,0.45)]';
  const iconBtn = 'relative w-10 h-10 rounded-full grid place-items-center text-char/70 hover:bg-char/[0.07] hover:text-char transition-colors';

  return (
    <div data-app-root className={`${dark ? 'app-dark' : 'app-light theme-light'} h-full flex font-display text-char relative overflow-hidden md:p-3`} style={{ background: dark ? DARK_FIELD : LIGHT_FIELD }}>
      {/* ───── Icon rail ───── */}
      <aside className="hidden md:flex glass-chrome z-50 w-[4.75rem] shrink-0 flex-col items-center py-4 gap-1.5 rounded-[2rem] mr-3">
        <Tip label={`${brand.siteName} home`}><button onClick={() => go('today')} aria-label={`${brand.siteName} home`} className="w-11 h-11 rounded-2xl bg-char text-white grid place-items-center text-lg font-semibold mb-3 shadow-[0_12px_24px_-10px_rgba(6,20,27,0.6)] hover:scale-105 transition-transform overflow-hidden">{brand.logoUrl ? <img src={brand.logoUrl} alt="" className="w-full h-full object-cover" /> : brand.siteName.charAt(0).toUpperCase()}</button></Tip>
        {nav.map((n) => {
          const active = view === n.key;
          return (
            <Tip key={n.key} label={n.label + (n.dot ? ' · needs attention' : '')}>
              <button onClick={() => go(n.key)} aria-label={n.label}
                className={`relative w-11 h-11 rounded-full grid place-items-center transition-colors ${active ? 'text-white' : 'text-char/60 hover:text-char hover:bg-char/[0.07]'}`}>
                {active && <motion.span layoutId="rail-pill" transition={spring} className="absolute inset-0 rounded-full bg-char shadow-[0_14px_26px_-10px_rgba(6,20,27,0.65),inset_0_1px_0_rgba(255,255,255,0.2)]" />}
                <span className="relative">{n.icon(19)}</span>
                {n.dot && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-warn ring-2 ring-white/80" />}
              </button>
            </Tip>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-1.5">
          <Tip label="Settings"><button onClick={() => go('settings')} aria-label="Settings" className={`w-11 h-11 rounded-full grid place-items-center transition-colors ${view === 'settings' ? 'bg-char text-white' : 'text-char/60 hover:text-char hover:bg-char/[0.07]'}`}>{Icon.settings(19)}</button></Tip>
          <div className="relative">
            <Tip label={user?.name || 'Account'}><button onClick={() => setPop(pop === 'user' ? null : 'user')} aria-label="Account" className="relative mt-1">
              <Avatar name={user?.name || user?.email} size={40} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-good ring-2 ring-white/90" />
            </button></Tip>
            <AnimatePresence>
              {pop === 'user' && (
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className={`${menuBox} left-full bottom-0 ml-3 w-60 p-2`}>
                  <div className="px-3 py-2"><p className="text-sm font-medium truncate">{user?.name || 'Account'}</p><p className="text-xs text-char/55 truncate">{user?.email}</p></div>
                  <button onClick={() => { setPop(null); go('settings'); }} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-char/5">Settings & profile</button>
                  <button onClick={signOut} className="w-full text-left px-3 py-2 rounded-xl text-sm text-bad hover:bg-bad/10">Sign out</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ───── Second menu: only when the open page has sub-items ───── */}
      <AnimatePresence initial={false}>
        {subMenu && (
          <motion.aside key="submenu" initial={{ width: 0, opacity: 0, marginRight: 0 }} animate={{ width: '15.5rem', opacity: 1, marginRight: 12 }} exit={{ width: 0, opacity: 0, marginRight: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block glass-chrome z-30 shrink-0 overflow-hidden rounded-[2rem]">
            <div className="w-[15.5rem] h-full flex flex-col p-4 gap-5">
              <div className="px-2 pt-1">
                <h2 className="text-xl font-medium tracking-tight">{current}</h2>
                <p className="text-[12px] text-char/55 mt-0.5">{todayLabel}</p>
              </div>

              {subMenu.map((g) => (
                <div key={g.title}>
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-char/45">{g.title}</p>
                  <ul className="mt-2 space-y-0.5">
                    {g.items.map((it) => (
                      <li key={it.label}>
                        <button onClick={it.run} className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] transition-colors ${it.active ? 'bg-char/[0.08] text-char font-medium' : 'text-char/75 hover:bg-white/70 hover:text-char'}`}>
                          <span className="text-char/50">{it.icon}</span>
                          <span className="flex-1 text-left truncate">{it.label}</span>
                          {it.n !== undefined && <span className={`min-w-[1.5rem] text-center text-[11px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums ${it.n > 0 ? 'bg-char text-white' : 'bg-char/[0.07] text-char/45'}`}>{it.n}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="mt-auto rounded-2xl bg-white/70 border border-char/[0.08] p-3.5">
                <div className="flex items-center justify-between text-[12px]"><span className="font-medium">This week</span><span className="text-char/55 tabular-nums">{needs.doneWeek}/{needs.totalWeek}</span></div>
                <div className="mt-2 h-1.5 rounded-full bg-char/10 overflow-hidden"><motion.div className="h-full rounded-full bg-char" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} /></div>
                <p className="mt-2 text-[11px] text-char/55">{needs.totalWeek ? `${needs.doneWeek} of ${needs.totalWeek} tasks finished` : 'No tasks due this week'}</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Frosted band across the top: whatever scrolls up behind the top bar is blurred, fading out below it.
          It sits under the rail and the side menu (z-30), so those are never blurred. */}
      <div aria-hidden className="top-fade pointer-events-none absolute inset-x-0 top-0 z-[15] h-[6.25rem] md:h-[6.5rem]" />

      {/* ───── Main column ───── */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        <header className="glass-chrome absolute inset-x-3 top-3 md:inset-x-0 md:top-0 z-40 h-16 px-3 sm:px-4 rounded-full flex items-center gap-2 sm:gap-3">
          <button onClick={() => go('today')} className="md:hidden w-10 h-10 rounded-xl bg-char text-white grid place-items-center text-base font-semibold" aria-label="Home">M</button>
          <nav className="hidden lg:block min-w-0" aria-label="Breadcrumb">
            <ol className="flex items-center gap-0.5 text-[13px] min-w-0">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={`${c.label}-${i}`} className="flex items-center gap-0.5 min-w-0">
                    {i > 0 && <span aria-hidden className="text-char/35 px-0.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>}
                    {last || !c.run ? (
                      <span aria-current={last ? 'page' : undefined} className={`px-1.5 py-1 truncate max-w-[14rem] ${last ? 'text-char font-semibold' : 'text-char/55'}`}>{c.label}</span>
                    ) : (
                      <button type="button" onClick={c.run} className="px-1.5 py-1 rounded-lg truncate max-w-[12rem] text-char/55 hover:text-char hover:bg-char/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-char/30">{c.label}</button>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setPalette(true)} className="h-10 w-10 sm:w-[19rem] rounded-full sm:rounded-xl bg-white/55 border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] px-0 sm:px-3.5 flex items-center justify-center sm:justify-start gap-2.5 text-[13.5px] text-char/55 hover:bg-white/80 transition-colors">
              {Icon.search(16)}<span className="hidden sm:block flex-1 text-left truncate">Search meetings, tasks, people…</span>
              <kbd className="hidden sm:block text-[10px] rounded-md border border-char/10 bg-char/[0.04] px-1.5 py-0.5 text-char/55">⌘K</kbd>
            </button>
            <span className="hidden sm:inline-flex"><Tip side="bottom" label="Schedule"><button onClick={() => go('meetings', 'schedule')} className={iconBtn} aria-label="Schedule">{Icon.meetings(18)}</button></Tip></span>
            <Tip side="bottom" label={dark ? 'Light theme' : 'Dark theme'}><button onClick={toggleTheme} className={iconBtn} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun /> : <Moon />}</button></Tip>
            <div className="relative">
              <Tip side="bottom" label="Notifications"><button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setBellPos({ top: r.bottom + 12, right: Math.max(12, window.innerWidth - r.right - 8) }); setPop(pop === 'bell' ? null : 'bell'); }} className={iconBtn} aria-label="Notifications">
                {Icon.bell(18)}
                {unread > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-good text-white text-[9px] font-bold grid place-items-center">{unread}</span>}
              </button></Tip>
              <AnimatePresence>
              </AnimatePresence>
            </div>
            <div className="relative">
              <button onClick={() => setPop(pop === 'new' ? null : 'new')} className="h-10 rounded-xl bg-char text-white px-3.5 sm:px-4 text-[13.5px] font-medium inline-flex items-center gap-1.5 shadow-[0_10px_20px_-10px_rgba(6,20,27,0.55)] hover:opacity-90 transition">{Icon.plus(15)}<span className="hidden sm:inline">New</span></button>
              <AnimatePresence>
                {pop === 'new' && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className={`${menuBox} right-0 mt-2 w-56 p-1.5`}>
                    {[...create, ...(can('worklog') ? [{ label: "Today's work log", icon: Icon.worklog(16), run: () => go('worklog') }] : [])].map((c) => (
                      <button key={c.label} onClick={() => { setPop(null); c.run(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] hover:bg-char/[0.06]"><span className="text-char/55">{c.icon}</span>{c.label}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="relative flex-1 min-h-0 scroll-y max-md:[container-type:size] px-3 md:px-1 pt-[5.25rem] md:pt-[6.25rem] pb-24 md:pb-3 md:-mt-3 md:-mb-3" onClick={() => setPop(null)}>
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={view === 'today' ? fadeOnly : viewTransition} initial="initial" animate="animate" exit="exit" className={view === 'today' ? 'w-full big:h-full' : 'max-w-[1400px] mx-auto'}>
              {allowedHere ? render(view, param, go) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ───── Mobile bottom bar ───── */}
      <nav className="md:hidden glass-chrome glass-bar absolute bottom-3 left-3 right-3 z-40 rounded-full flex items-center justify-around px-2 py-2.5">
        {nav.map((n) => {
          const active = view === n.key;
          return (
            <button key={n.key} onClick={() => go(n.key)} className="relative flex-1 h-12 grid place-items-center" aria-label={n.label} aria-current={active ? 'page' : undefined}>
              {active && (
                <span className="absolute inset-0 grid place-items-center">
                  <motion.span layoutId="bar-pill" transition={spring} className="w-12 h-12 rounded-full bg-char/90 shadow-[0_10px_20px_-8px_rgba(6,20,27,0.55),inset_0_1px_0_rgba(255,255,255,0.22)]" />
                </span>
              )}
              <span className={`relative ${active ? 'text-white' : 'text-char/75'}`}>{n.icon(21)}</span>
              {n.dot && !active && <span className="absolute top-2 right-[28%] w-2 h-2 rounded-full bg-warn ring-2 ring-white" />}
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {pop === 'bell' && (
          <NotificationPanel
            key="notifs" items={notifs} pos={bellPos} onClose={() => setPop(null)}
            onRead={(id) => { markNotificationRead(id).then(loadNotifs).catch(() => {}); }}
            onReadAll={() => { Promise.all(notifs.filter((n) => !n.read).map((n) => markNotificationRead(n.id))).then(loadNotifs).catch(() => {}); }}
          />
        )}
      </AnimatePresence>

      <CommandPalette open={palette} onClose={() => setPalette(false)} commands={commands} />
    </div>
  );
};
