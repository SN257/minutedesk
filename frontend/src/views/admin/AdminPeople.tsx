import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, Badge, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { spring } from '../../lib/motion';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { adminCreateUser, adminDeleteUser, adminGetUsers, adminUpdateUser, getRoles, type AdminUser, type RoleEntry } from '../../lib/api';
import { ATile } from './tiles';
import { ConfirmModal, ErrorNote, G, PModal, Pills, RoleBadge, SearchBox, fmtJoined, useLast } from './shared';

type Editing = { mode: 'add' } | { mode: 'edit'; user: AdminUser };

/** Pages that can be switched on or off for a person. */
const PAGES: { key: string; label: string; hint: string }[] = [
  { key: 'today', label: 'Dashboard', hint: 'The home overview' },
  { key: 'meetings', label: 'Meetings', hint: 'Minutes and scheduling' },
  { key: 'tasks', label: 'Tasks', hint: 'Tasks and boards' },
  { key: 'worklog', label: 'Work log', hint: 'The daily log' },
  { key: 'reports', label: 'Insights', hint: 'Personal numbers' },
];
/** Admin-panel sections that can be switched on for an admin-type role. */
const ADMIN_TABS: { key: string; label: string; hint: string }[] = [
  { key: 'overview', label: 'Overview', hint: 'Numbers at a glance' },
  { key: 'people', label: 'People', hint: 'Accounts and access' },
  { key: 'performance', label: 'Performance', hint: 'Who is delivering' },
  { key: 'logs', label: 'Logs', hint: 'Activity and errors' },
  { key: 'system', label: 'System', hint: 'Health, backups, news' },
  { key: 'setup', label: 'Setup', hint: 'Brand, menu, lists' },
];
/** A short line for the ID card. */
const accessLine = (u: { role: string; allowedPages?: string[] | null; adminTabs?: string[] | null }) => {
  if (u.role === 'super_admin') return 'Admin workspace + all pages';
  const at = (u as { adminTabs?: string[] | null }).adminTabs;
  if (u.role !== 'user' && Array.isArray(at) && at.length) return `Admin: ${at.map((k) => ADMIN_TABS.find((t) => t.key === k)?.label ?? k).join(', ')}`;
  if (!Array.isArray(u.allowedPages)) return 'All pages';
  if (u.allowedPages.length === 0) return 'No pages yet';
  return `${u.allowedPages.map((k) => PAGES.find((p) => p.key === k)?.label ?? k).join(', ')} only`;
};

/** Card header colours per kind of person, made from the app's own colours. */
const ID_BAND = {
  admin: 'linear-gradient(135deg, color-mix(in srgb, var(--color-warn) 85%, var(--color-ink)), color-mix(in srgb, var(--color-bad) 75%, var(--color-ink)))',
  user: 'linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 85%, var(--color-ink)), color-mix(in srgb, var(--color-good) 55%, var(--color-brand)))',
  other: 'linear-gradient(135deg, color-mix(in srgb, var(--color-good) 82%, var(--color-ink)), color-mix(in srgb, var(--color-brand) 55%, var(--color-good)))',
};
/** A short, stable ID number taken from the account id. */
const idNo = (id: string) => id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase().padEnd(8, '0');
/** Bar widths for the little barcode, derived from the id so every card is different but never changes. */
const bars = (id: string) => [...id.replace(/-/g, '').padEnd(32, '7')].slice(0, 32).map((c) => 1 + (c.charCodeAt(0) % 3));

const UserForm = ({ editing, roles, selfId, onDone }: { editing: Editing; roles: RoleEntry[]; selfId?: string; onDone: (msg: string) => void }) => {
  const toast = useToast();
  const u = editing.mode === 'edit' ? editing.user : null;
  const [name, setName] = useState(u?.name || '');
  const [email, setEmail] = useState(u?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(u?.role || 'user');
  const [limited, setLimited] = useState(Array.isArray(u?.allowedPages));
  const [pages, setPages] = useState<string[]>(Array.isArray(u?.allowedPages) ? u!.allowedPages! : PAGES.map((p) => p.key));
  const [adminTabs, setAdminTabs] = useState<string[]>(Array.isArray(u?.adminTabs) ? u!.adminTabs! : []);
  const [saving, setSaving] = useState(false);
  const { isAdmin: iAmSuper } = useAuth();
  const isSelf = !!u && u.id === selfId;
  const adminLike = role !== 'user' && role !== 'super_admin';
  const roleOptions = (roles.length ? roles : ([{ key: 'user', label: 'User' }, { key: 'super_admin', label: 'Super admin' }] as RoleEntry[])).filter((r) => iAmSuper || r.key !== 'super_admin');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const allowedPages = role === 'super_admin' || !limited ? null : pages;
    try {
      if (u) {
        await adminUpdateUser(u.id, { name: name.trim(), email: email.trim(), role, allowedPages, ...(iAmSuper ? { adminTabs: adminLike ? adminTabs : null } : {}) });
        onDone(`${name.trim() || email.trim()} updated.`);
      } else {
        await adminCreateUser({ email: email.trim(), password, name: name.trim() || undefined, role, allowedPages, ...(iAmSuper ? { adminTabs: adminLike ? adminTabs : null } : {}) });
        onDone(`${name.trim() || email.trim()} can now sign in.`);
      }
    } catch (err: any) {
      toast(err?.message || 'That did not work. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const kind = role === 'super_admin' ? 'admin' : role === 'user' ? 'user' : 'other';
  const preview = { role, allowedPages: role === 'super_admin' || !limited ? null : pages, adminTabs: adminLike ? adminTabs : null };
  const field = 'w-full rounded-xl bg-white/50 border border-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10';
  const lbl = 'block text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted mb-1.5';

  return (
    <form onSubmit={submit} className="grid md:grid-cols-[240px_1fr] gap-6">
      {/* live ID card */}
      <div className="md:sticky md:top-0 self-start">
        <div className="liquid rounded-[1.75rem] overflow-hidden">
          <div className="relative h-20 m-1.5 rounded-[1.4rem] overflow-hidden shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_-12px_24px_-12px_rgb(0_0_0/0.25)]" style={{ backgroundImage: `linear-gradient(180deg, rgb(255 255 255 / 0.28), transparent 55%), ${ID_BAND[kind]}` }}>
            <span aria-hidden className="absolute left-1/2 -translate-x-1/2 top-2 w-12 h-2 rounded-full bg-black/25" />
            <div className="flex items-center justify-between px-4 pt-7 text-[#ffffff]">
              <span className="text-[9px] font-extrabold tracking-[0.2em]">MINUTEDESK</span>
              <span className="text-[9px] font-extrabold tracking-[0.2em] opacity-80">{kind === 'admin' ? 'ADMIN PASS' : 'MEMBER'}</span>
            </div>
          </div>
          <div className="relative z-10 px-4 -mt-9 text-center pb-4">
            <span className="inline-block rounded-full ring-4 ring-white/70 shadow-card bg-white/60"><Avatar name={name || email || '?'} size={72} /></span>
            <p className="mt-2.5 text-base font-extrabold leading-tight break-words">{name.trim() || <span className="font-medium text-muted italic">New person</span>}</p>
            <div className="mt-1.5"><RoleBadge role={role} labels={Object.fromEntries(roleOptions.map((r) => [r.key, r.label]))} /></div>
            <p className="text-xs text-muted truncate mt-2">{email || 'email@company.com'}</p>
            <div className="text-left mt-3 pt-3 border-t border-ink/10">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Access</p>
              <p className="text-xs font-bold line-clamp-3">{accessLine(preview)}</p>
            </div>
            <div className="flex items-end h-6 gap-[2px] overflow-hidden mt-3" aria-hidden>
              {bars(u?.id ?? (email || 'newperson')).map((w, k) => <span key={k} className="h-full bg-ink/70 shrink-0" style={{ width: w }} />)}
            </div>
          </div>
        </div>
      </div>

      {/* fields */}
      <div className="space-y-4 min-w-0">
        <p className="text-sm text-muted">{u ? 'Update this person’s details and access.' : 'Create an account. Share the password with them securely.'}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className={lbl}>Full name</span><input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Patel" autoFocus /></label>
          <label className="block"><span className={lbl}>Email</span><input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="asha@company.com" /></label>
        </div>
        {!u && (
          <label className="block"><span className={lbl}>Temporary password</span>
            <input className={field} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
            <span className="block text-[11px] text-muted mt-1">They can change it from Settings after signing in.</span>
          </label>
        )}

        <div>
          <span className={lbl}>Role</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Role">
            {roleOptions.map((r) => {
              const on = role === r.key;
              return (
                <button key={r.key} type="button" role="radio" aria-checked={on} disabled={isSelf} onClick={() => setRole(r.key)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-ink text-white' : 'bg-white/50 border border-white/70 text-muted hover:text-ink'}`}>{r.label}</button>
              );
            })}
          </div>
          <span className="block text-[11px] text-muted mt-1.5">{isSelf ? 'You can’t change your own role, so you never lock yourself out.' : 'Super admins can open this Admin workspace. Other roles behave like a standard user.'}</span>
        </div>

        <div>
          <span className={lbl}>Page access</span>
          {role === 'super_admin' ? (
            <p className="text-xs text-muted rounded-xl bg-ink/[0.05] px-3.5 py-3">Super admins can always open every page, including this Admin workspace.</p>
          ) : (
            <>
              <div className="inline-flex rounded-full bg-ink/[0.06] p-1 mb-3" role="group" aria-label="Access level">
                {[{ v: false, l: 'All pages' }, { v: true, l: 'Choose pages' }].map((o) => (
                  <button key={o.l} type="button" aria-pressed={limited === o.v} onClick={() => setLimited(o.v)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${limited === o.v ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>{o.l}</button>
                ))}
              </div>
              {limited && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAGES.map((pg) => {
                      const on = pages.includes(pg.key);
                      return (
                        <button key={pg.key} type="button" role="checkbox" aria-checked={on} onClick={() => setPages((p) => (on ? p.filter((k) => k !== pg.key) : [...p, pg.key]))}
                          className={`relative text-left rounded-2xl border px-3 py-2.5 transition-colors ${on ? 'border-brand/50 bg-brand/10' : 'border-white/70 bg-white/40 hover:bg-white/60'}`}>
                          <span className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full border-2 grid place-items-center ${on ? 'bg-ink border-ink text-white' : 'border-ink/20'}`}>{on && <span className="scale-[0.6]">{G.check}</span>}</span>
                          <span className="block text-sm font-bold pr-5">{pg.label}</span>
                          <span className="block text-[11px] text-muted leading-snug">{pg.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted pt-2">{pages.length === 0 ? 'Nothing selected: this person could only open Settings.' : `They will only see ${pages.length === 1 ? 'this page' : `these ${pages.length} pages`} and Settings.`}</p>
                </>
              )}
            </>
          )}
        </div>

        {adminLike && iAmSuper && (
          <div>
            <span className={lbl}>Admin panel access</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ADMIN_TABS.map((t) => {
                const on = adminTabs.includes(t.key);
                return (
                  <button key={t.key} type="button" role="checkbox" aria-checked={on} onClick={() => setAdminTabs((a) => (on ? a.filter((k) => k !== t.key) : [...a, t.key]))}
                    className={`relative text-left rounded-2xl border px-3 py-2.5 transition-colors ${on ? 'border-brand/50 bg-brand/10' : 'border-white/70 bg-white/40 hover:bg-white/60'}`}>
                    <span className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full border-2 grid place-items-center ${on ? 'bg-ink border-ink text-white' : 'border-ink/20'}`}>{on && <span className="scale-[0.6]">{G.check}</span>}</span>
                    <span className="block text-sm font-bold pr-5">{t.label}</span>
                    <span className="block text-[11px] text-muted leading-snug">{t.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted pt-2">{adminTabs.length === 0 ? 'No sections yet: this person will not see the Admin page.' : `They will see the Admin page with ${adminTabs.length === 1 ? 'this section' : `these ${adminTabs.length} sections`} only.`}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button type="submit" loading={saving} disabled={!email.trim() || (!u && password.length < 6)} className="!rounded-full">{u ? 'Save changes' : 'Create account'}</Button>
        </div>
      </div>
    </form>
  );
};

const AdminPeople = () => {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data: users, loading, error, reload } = useAsync(adminGetUsers, []);
  const { data: roles } = useAsync(() => getRoles().catch(() => [] as RoleEntry[]), []);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<AdminUser | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const shownEditing = useLast(editing);
  const shownDel = useLast(delTarget);
  const labels = useMemo(() => Object.fromEntries((roles ?? []).map((r) => [r.key, r.label])), [roles]);

  const list = users ?? [];
  const admins = list.filter((u) => u.role === 'super_admin').length;
  const filtered = list.filter((u) => {
    const s = q.trim().toLowerCase();
    return (roleFilter === 'all' || u.role === roleFilter) && (!s || (u.name || '').toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  });
  const roleKeys = Array.from(new Set(list.map((u) => u.role)));

  const open = (e: Editing) => { setEditing(e); setDrawerOpen(true); };
  const askDelete = (u: AdminUser) => { setDelTarget(u); setDelOpen(true); };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await adminDeleteUser(delTarget.id);
      toast(`${delTarget.name || delTarget.email} was removed.`);
      setDelOpen(false);
      reload();
    } catch (e: any) {
      toast(e?.message || 'Could not delete this account.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stagger className="space-y-4 sm:space-y-5">
      {/* Toolbar */}
      <ATile glow="brand">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name or email" />
          <Button onClick={() => open({ mode: 'add' })} className="!rounded-full">{G.users} Add person</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <Pills
            value={roleFilter}
            onChange={setRoleFilter}
            items={[{ key: 'all', label: 'Everyone', count: list.length }, ...roleKeys.map((k) => ({ key: k, label: labels[k] || (k === 'super_admin' ? 'Super admins' : k), count: list.filter((u) => u.role === k).length }))]}
          />
          {!loading && <p className="text-xs text-muted">{list.length} account{list.length === 1 ? '' : 's'} · {admins} super admin{admins === 1 ? '' : 's'}</p>}
        </div>
      </ATile>

      {error && <ErrorNote message={error} onRetry={reload} />}

      {loading && !users ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="liquid rounded-[2rem]"><Empty icon="🔎" title={list.length ? 'No one matches that' : 'No accounts yet'} hint={list.length ? 'Try a different name or clear the filter.' : 'Add the first person to get started.'} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence initial={false}>
            {filtered.map((u, i) => {
              const self = u.id === me?.id;
              const admin = u.role === 'super_admin';
              return (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ ...spring, delay: Math.min(i, 8) * 0.03 }}
                  whileHover={{ y: -5, rotate: -0.4 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => open({ mode: 'edit', user: u })}
                  onKeyDown={(e) => { if (e.key === 'Enter') open({ mode: 'edit', user: u }); }}
                  className="group relative w-full liquid rounded-[1.75rem] overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex flex-col"
                >
                  {/* header band with the lanyard slot */}
                  <div className="relative h-28 px-5 pt-3.5 m-1.5 rounded-[1.4rem] overflow-hidden shadow-[inset_0_1px_0_rgb(255_255_255/0.55),inset_0_-12px_24px_-12px_rgb(0_0_0/0.25)]" style={{ backgroundImage: `linear-gradient(180deg, rgb(255 255 255 / 0.28), transparent 55%), ${ID_BAND[admin ? 'admin' : u.role === 'user' ? 'user' : 'other']}` }}>
                    <span aria-hidden className="absolute left-1/2 -translate-x-1/2 top-2.5 w-14 h-2.5 rounded-full bg-black/25 shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)]" />
                    <div className="flex items-center justify-between pt-5 text-[#ffffff]">
                      <span className="text-[10px] font-extrabold tracking-[0.2em]">MINUTEDESK</span>
                      <span className="text-[10px] font-extrabold tracking-[0.2em] opacity-80">{admin ? 'ADMIN PASS' : 'MEMBER'}</span>
                    </div>
                    <div className="absolute right-3 top-3 flex items-center md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity rounded-full bg-black/20 backdrop-blur-sm">
                      <button type="button" aria-label="Edit" title="Edit" onClick={(e) => { e.stopPropagation(); open({ mode: 'edit', user: u }); }} className="w-8 h-8 rounded-full grid place-items-center text-[#ffffff] hover:bg-white/20">{G.edit}</button>
                      <button type="button" aria-label={self ? 'You can’t delete your own account' : 'Delete'} title={self ? 'You can’t delete your own account' : 'Delete'} disabled={self} onClick={(e) => { e.stopPropagation(); askDelete(u); }} className="w-8 h-8 rounded-full grid place-items-center text-[#ffffff] hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none">{G.trash}</button>
                    </div>
                  </div>

                  {/* photo + name */}
                  <div className="relative z-10 px-5 -mt-12 text-center">
                    <span className="inline-block rounded-full ring-4 ring-white/70 shadow-card bg-white/60"><Avatar name={u.name || u.email} size={88} /></span>
                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                      <p className="text-lg font-extrabold leading-tight truncate max-w-full">{u.name || <span className="font-medium text-muted italic">No name</span>}</p>
                      {self && <Badge tone="brand">You</Badge>}
                    </div>
                    <div className="mt-1.5"><RoleBadge role={u.role} labels={labels} /></div>
                    <p className="text-xs text-muted truncate mt-2">{u.email}</p>
                  </div>

                  {/* details */}
                  <dl className="grid grid-cols-2 gap-3 px-5 mt-4 text-left">
                    <div><dt className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">ID No.</dt><dd className="text-sm font-bold font-mono tracking-wide">{idNo(u.id)}</dd></div>
                    <div><dt className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Joined</dt><dd className="text-sm font-bold">{fmtJoined(u.createdAt)}</dd></div>
                    <div className="col-span-2"><dt className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Access</dt><dd className="text-sm font-bold line-clamp-2">{accessLine(u)}</dd></div>
                  </dl>

                  {/* barcode */}
                  <div className="mt-auto px-5 pt-4 pb-4">
                    <div className="flex items-end h-9 gap-[2px] overflow-hidden" aria-hidden>
                      {bars(u.id).map((w, k) => <span key={k} className="h-full bg-ink/80 shrink-0" style={{ width: w }} />)}
                    </div>
                    <p className="text-[9px] font-mono tracking-[0.3em] text-muted text-center mt-1.5">{idNo(u.id)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <PModal wide open={drawerOpen} onClose={() => setDrawerOpen(false)} title={shownEditing?.mode === 'edit' ? 'Edit person' : 'Add a person'}>
        {shownEditing && (
          <UserForm
            key={shownEditing.mode === 'edit' ? shownEditing.user.id : 'new'}
            editing={shownEditing}
            roles={roles ?? []}
            selfId={me?.id}
            onDone={(msg) => { toast(msg); setDrawerOpen(false); reload(); }}
          />
        )}
      </PModal>

      <ConfirmModal open={delOpen} title="Delete this account?" confirmLabel="Delete account" danger loading={deleting} onConfirm={confirmDelete} onClose={() => setDelOpen(false)}>
        <p><strong>{shownDel?.name || shownDel?.email}</strong> ({shownDel?.email}) will lose access immediately.</p>
        <p className="text-muted">This is permanent and happens on the live database, so it can’t be undone.</p>
      </ConfirmModal>
    </Stagger>
  );
};
export default AdminPeople;
