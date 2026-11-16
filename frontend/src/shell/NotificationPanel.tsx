import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './icons';
import { getLocalDateString } from '../lib/date';

export interface Notif { id: string; title: string; body?: string; read: boolean; createdAt: string }

const ago = (iso: string) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Pick an icon and a theme tint from what the notification is about. */
const kindOf = (n: Notif) => {
  const t = `${n.title} ${n.body || ''}`.toLowerCase();
  if (/task|card|due|overdue|assign/.test(t)) return { icon: Icon.tasks(18), tint: 'bg-good/15 text-good' };
  if (/meeting|minutes|agenda|schedul/.test(t)) return { icon: Icon.meetings(18), tint: 'bg-char/[0.08] text-char' };
  if (/log|report|remind/.test(t)) return { icon: Icon.worklog(18), tint: 'bg-warn/15 text-warn' };
  return { icon: Icon.bell(18), tint: 'bg-char/[0.08] text-char/70' };
};

export const NotificationPanel = ({ items, pos, onRead, onReadAll, onClose }: { items: Notif[]; pos: { top: number; right: number }; onRead: (id: string) => void; onReadAll: () => void; onClose: () => void }) => {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const unread = items.filter((n) => !n.read).length;
  const today = getLocalDateString();

  const groups = useMemo(() => {
    const list = (tab === 'unread' ? items.filter((n) => !n.read) : items).slice(0, 30);
    const isToday = (n: Notif) => { const d = new Date(n.createdAt); return !Number.isNaN(d.getTime()) && getLocalDateString(d) === today; };
    return [
      { title: 'Today', rows: list.filter(isToday) },
      { title: 'Earlier', rows: list.filter((n) => !isToday(n)) },
    ].filter((g) => g.rows.length > 0);
  }, [items, tab, today]);

  return (
    <>
    <div className="fixed inset-0 z-[55]" onClick={onClose} aria-hidden />
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{ transformOrigin: 'top right', '--np-top': `${pos.top}px`, '--np-right': `${pos.right}px` } as React.CSSProperties}
      className="glass-pop fixed inset-x-3 top-[4.75rem] sm:inset-x-auto sm:top-[var(--np-top)] sm:right-[var(--np-right)] sm:w-[25rem] z-[60] rounded-[1.75rem] overflow-hidden flex flex-col max-h-[min(34rem,calc(100dvh-11rem))] sm:max-h-[min(34rem,calc(100vh-7rem))]"
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="text-[17px] font-semibold tracking-tight">Notifications</h3>
            {unread > 0 && <span className="text-[11px] font-semibold rounded-full bg-char text-white px-2 py-0.5 tabular-nums">{unread} new</span>}
          </div>
          <button onClick={onReadAll} disabled={unread === 0} className="text-[12px] font-medium rounded-full px-3 py-1.5 bg-char/[0.07] hover:bg-char/[0.12] disabled:opacity-40 disabled:hover:bg-char/[0.07] transition-colors whitespace-nowrap">Mark all read</button>
        </div>
        <div className="mt-3 inline-flex rounded-full bg-char/[0.07] p-0.5 text-[12px]">
          {([['all', 'All'], ['unread', 'Unread']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3.5 py-1.5 rounded-full font-medium transition-colors ${tab === k ? 'bg-white shadow-sm text-char' : 'text-char/55 hover:text-char'}`}>
              {label}{k === 'unread' && unread > 0 && <span className="ml-1.5 text-char/50 tabular-nums">{unread}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 scroll-y px-2.5 pb-3">
        {groups.length === 0 ? (
          <div className="py-10 grid place-items-center text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="relative w-16 h-16 rounded-full bg-char/[0.06] text-char/55 grid place-items-center">
                {Icon.bell(26)}
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-good text-white grid place-items-center ring-4 ring-white/70">{Icon.check(13)}</span>
              </span>
              <div><p className="text-[14.5px] font-medium">{tab === 'unread' ? 'Nothing unread' : "You're all caught up"}</p><p className="text-[12.5px] text-char/55 mt-0.5">New activity will show up here.</p></div>
            </div>
          </div>
        ) : groups.map((g) => (
          <section key={g.title} className="mt-1">
            <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-char/45">{g.title}</p>
            <ul className="space-y-0.5">
              {g.rows.map((n) => {
                const k = kindOf(n);
                return (
                  <li key={n.id}>
                    <button onClick={() => !n.read && onRead(n.id)} className={`w-full flex items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors ${n.read ? 'hover:bg-char/[0.04]' : 'bg-char/[0.05] hover:bg-char/[0.09]'}`}>
                      <span className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${k.tint}`}>{k.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-[13.5px] leading-snug ${n.read ? 'text-char/70' : 'font-semibold'}`}>{n.title}</span>
                          <span className="text-[11px] text-char/45 shrink-0 mt-0.5 whitespace-nowrap">{ago(n.createdAt)}</span>
                        </span>
                        {n.body && <span className="mt-0.5 block text-[12.5px] leading-snug text-char/55 line-clamp-2">{n.body}</span>}
                      </span>
                      {!n.read && <span aria-label="Unread" className="w-2.5 h-2.5 rounded-full bg-good mt-1.5 shrink-0 ring-4 ring-good/15" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </motion.div>
    </>
  );
};
