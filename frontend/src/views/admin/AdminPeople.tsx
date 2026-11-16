import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, Badge, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { spring } from '../../lib/motion';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { adminCreateUser, adminDeleteUser, adminGetUsers, adminSetPassword, adminUpdateUser, getRoles, type AdminUser, type RoleEntry } from '../../lib/api';
import { ATile } from './tiles';
import { FilterMenu } from '../../ui/filter';
import { ConfirmModal, ErrorNote, G, PModal, RoleBadge, SearchBox, fmtJoined, useLast } from './shared';

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
  { key: 'followup', label: 'Follow-up', hint: 'One person’s work, and reminders' },
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
  admin: 'linear-gradient(135deg, color-mix(in srgb, var(--color-warn) 85%, #06141b), color-mix(in srgb, var(--color-bad) 75%, #06141b))',
  user: 'linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 85%, #06141b), color-mix(in srgb, var(--color-good) 55%, var(--color-brand)))',
  other: 'linear-gradient(135deg, color-mix(in srgb, var(--color-good) 82%, #06141b), color-mix(in srgb, var(--color-brand) 55%, var(--color-good)))',
};
/** A short, stable ID number taken from the account id. */
const idNo = (id: string) => id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase().padEnd(8, '0');
/** Bar widths for the little barcode, derived from the id so every card is different but never changes. */
const bars = (id: string) => [...id.replace(/-/g, '').padEnd(32, '7')].slice(0, 32).map((c) => 1 + (c.charCodeAt(0) % 3));

/** A switch row: label and hint on the left, the switch on the right, so every row lines up. */
const SwitchRow = ({ on, label, hint, onChange, disabled }: { on: boolean; label: string; hint: string; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left rounded-2xl hover:bg-ink/[0.04] transition-colors disabled:opacity-60">
    <span className="min-w-0">
      <span className="block text-sm font-bold text-ink leading-tight">{label}</span>
      <span className="block text-xs text-muted mt-0.5 leading-snug">{hint}</span>
    </span>
    <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-ink' : 'bg-ink/20'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#ffffff] shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
    </span>
  </button>
);

/** 0 to 4: a rough idea of how hard a password is to guess. */
const strength = (pw: string) => {
  let n = 0;
  if (pw.length >= 6) n++;
  if (pw.length >= 10) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) n++;
  return n;
};

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
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
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

  const savePassword = async () => {
    if (!u) return;
    if (newPw !== newPw2) { toast("The two passwords don't match.", 'error'); return; }
    setPwBusy(true);
    try {
      await adminSetPassword(u.id, newPw, newPw2);
      setNewPw(''); setNewPw2('');
      toast(`Password updated for ${u.name || u.email}.`, 'success');
    } catch (err: any) {
      toast(err?.message || 'Could not update the password.', 'error');
    } finally {
      setPwBusy(false);
    }
  };

  const kind = role === 'super_admin' ? 'admin' : role === 'user' ? 'user' : 'other';
  const field = 'w-full rounded-xl bg-white/50 border border-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10';
  const lbl = 'block text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted mb-1.5';

  const [tab, setTab] = useState<'profile' | 'access' | 'security'>('profile');
  const tabs: { key: typeof tab; label: string }[] = [{ key: 'profile', label: 'Profile' }, { key: 'access', label: 'Access' }, ...(u ? [{ key: 'security' as const, label: 'Security' }] : [])];
  const st = strength(newPw);
  const match = newPw2.length > 0 && newPw === newPw2;
  const mismatch = newPw2.length > 0 && newPw !== newPw2;
  const accessCount = role === 'super_admin' || !limited ? 'All pages' : `${pages.length} of ${PAGES.length} pages`;

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* header: who this is, at a glance */}
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6 text-[#ffffff]" style={{ backgroundImage: ID_BAND[kind] }}>
        <span aria-hidden className="absolute -right-10 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <span aria-hidden className="absolute right-16 -bottom-16 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4 sm:gap-5">
          <span className="shrink-0 rounded-full ring-4 ring-white/40 bg-white/30"><Avatar name={name || email || '?'} size={72} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xl sm:text-2xl font-extrabold leading-tight break-words">{name.trim() || <span className="font-medium opacity-80 italic">New person</span>}</p>
            <p className="text-sm opacity-85 truncate">{email || 'email@company.com'}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <span className="rounded-full bg-white/20 px-2.5 py-1">{roleOptions.find((r) => r.key === role)?.label ?? role}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-1">{accessCount}</span>
              {u && <span className="rounded-full bg-white/20 px-2.5 py-1">Since {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-2xl bg-ink/[0.06] p-1" role="tablist" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`relative flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${tab === t.key ? 'text-ink' : 'text-muted hover:text-ink'}`}>
            {tab === t.key && <motion.span layoutId="person-tab" transition={spring} className="absolute inset-0 rounded-xl bg-white/70 glass-fill shadow-[0_6px_16px_-8px_rgba(6,20,27,0.35)]" />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[15rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'profile' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block"><span className={lbl}>Full name</span><input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Patel" autoFocus /></label>
                <label className="block"><span className={lbl}>Email</span><input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="asha@company.com" /></label>
                {!u && (
                  <label className="block sm:col-span-2"><span className={lbl}>Temporary password</span>
                    <input className={field} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
                    <span className="block text-xs text-muted mt-1.5">Share it with them securely. They can change it from Settings after signing in.</span>
                  </label>
                )}
                <div className="sm:col-span-2">
                  <span className={lbl}>Role</span>
                  <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-2xl bg-ink/[0.06] p-1" role="radiogroup" aria-label="Role">
                    {roleOptions.map((r) => {
                      const on = role === r.key;
                      return <button key={r.key} type="button" role="radio" aria-checked={on} disabled={isSelf} onClick={() => setRole(r.key)} className={`rounded-xl px-3 py-2.5 text-sm font-bold truncate transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${on ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>{r.label}</button>;
                    })}
                  </div>
                  <span className="block text-xs text-muted mt-1.5">{isSelf ? 'You can’t change your own role, so you never lock yourself out.' : 'Super admins can open the Admin workspace. Other roles behave like a standard user.'}</span>
                </div>
              </div>
            )}

            {tab === 'access' && (
              <div className="space-y-5">
                {role === 'super_admin' ? (
                  <p className="text-sm text-muted rounded-2xl bg-ink/[0.05] px-4 py-3.5">Super admins can always open every page, including the Admin workspace.</p>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-1.5 px-1">
                      <span className={`${lbl} !mb-0`}>Pages</span>
                      <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.06] p-1" role="group" aria-label="Access level">
                        {[{ v: false, l: 'All' }, { v: true, l: 'Choose' }].map((o) => (
                          <button key={o.l} type="button" aria-pressed={limited === o.v} onClick={() => setLimited(o.v)} className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${limited === o.v ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>{o.l}</button>
                        ))}
                      </div>
                    </div>
                    <div className={`rounded-2xl border border-ink/10 divide-y divide-ink/10 transition-opacity ${limited ? '' : 'opacity-50 pointer-events-none'}`}>
                      {PAGES.map((pg) => <SwitchRow key={pg.key} on={!limited || pages.includes(pg.key)} label={pg.label} hint={pg.hint} onChange={(v) => setPages((p) => (v ? [...p, pg.key] : p.filter((k) => k !== pg.key)))} />)}
                    </div>
                    <p className="text-xs text-muted mt-2 px-1">{!limited ? 'They can open every page.' : pages.length === 0 ? 'Nothing selected: this person could only open Settings.' : `They will only see ${pages.length === 1 ? 'this page' : `these ${pages.length} pages`} and Settings.`}</p>
                  </div>
                )}
                {adminLike && iAmSuper && (
                  <div>
                    <span className={`${lbl} px-1`}>Admin panel sections</span>
                    <div className="rounded-2xl border border-ink/10 divide-y divide-ink/10">
                      {ADMIN_TABS.map((t) => <SwitchRow key={t.key} on={adminTabs.includes(t.key)} label={t.label} hint={t.hint} onChange={(v) => setAdminTabs((a) => (v ? [...a, t.key] : a.filter((k) => k !== t.key)))} />)}
                    </div>
                    <p className="text-xs text-muted mt-2 px-1">{adminTabs.length === 0 ? 'No sections yet: this person will not see the Admin page.' : `They will see the Admin page with ${adminTabs.length === 1 ? 'this section' : `these ${adminTabs.length} sections`} only.`}</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'security' && u && (
              <div className="max-w-xl space-y-4">
                <p className="text-sm text-muted">Set a new password directly. It takes effect straight away, with no verification code. Share it with them securely.</p>
                <label className="block"><span className={lbl}>New password</span>
                  <span className="relative block">
                    <input className={`${field} pr-16`} type={showPw ? 'text' : 'password'} minLength={6} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-bold text-muted hover:text-ink hover:bg-ink/5 transition-colors">{showPw ? 'Hide' : 'Show'}</button>
                  </span>
                  <span className="mt-2 flex items-center gap-1.5" aria-hidden>
                    {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < st ? (st <= 1 ? 'bg-bad' : st === 2 ? 'bg-warn' : 'bg-good') : 'bg-ink/10'}`} />)}
                    <span className="text-[11px] font-bold text-muted w-14 text-right">{newPw ? ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][st] : ''}</span>
                  </span>
                </label>
                <label className="block"><span className={lbl}>Confirm new password</span>
                  <input className={`${field} ${mismatch ? '!border-bad focus:!ring-bad/10' : ''}`} type={showPw ? 'text' : 'password'} minLength={6} value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="Type it again" autoComplete="new-password" />
                </label>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p role={mismatch ? 'alert' : undefined} className={`text-[13px] font-medium break-words min-w-0 ${mismatch ? 'text-bad' : match && newPw.length >= 6 ? 'text-good' : 'text-muted'}`}>
                    {!newPw2 ? 'Type it twice to confirm.' : mismatch ? 'The two passwords don’t match.' : newPw.length < 6 ? 'Use at least 6 characters.' : 'Passwords match.'}
                  </p>
                  <Button type="button" loading={pwBusy} disabled={newPw.length < 6 || !match} onClick={savePassword} className="!rounded-xl shrink-0">Set password</Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* pinned bar */}
      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md px-4 py-3 shadow-[0_12px_30px_-18px_rgba(6,20,27,0.35)]">
        <p className="text-xs text-muted hidden sm:block">{u ? 'Name, email, role and access are saved together.' : 'They can sign in as soon as you create the account.'}</p>
        <Button type="submit" loading={saving} disabled={!email.trim() || (!u && password.length < 6)} className="!rounded-full ml-auto">{u ? 'Save changes' : 'Create account'}</Button>
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
  const [roleSel, setRoleSel] = useState<string[]>([]);
  const [access, setAccess] = useState('any');
  const [joined, setJoined] = useState('any');
  const [sort, setSort] = useState('name');
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
  const daysAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;
  const filtered = list.filter((u) => {
    const s = q.trim().toLowerCase();
    if (roleSel.length && !roleSel.includes(u.role)) return false;
    if (access === 'all' && Array.isArray(u.allowedPages)) return false;
    if (access === 'limited' && !Array.isArray(u.allowedPages)) return false;
    if (access === 'adminTabs' && !(Array.isArray(u.adminTabs) && u.adminTabs.length)) return false;
    if (joined !== 'any' && daysAgo(u.createdAt) > Number(joined)) return false;
    return !s || (u.name || '').toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
  }).sort((a, b) => sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : sort === 'role' ? a.role.localeCompare(b.role) || (a.name || a.email).localeCompare(b.name || b.email) : (a.name || a.email).localeCompare(b.name || b.email));
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
    <Stagger className="space-y-3 sm:space-y-5">
      {/* Toolbar */}
      <ATile glow="brand">
        <div className="flex items-center gap-3">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name or email" />
          <FilterMenu title="Filter people" groups={[
            { id: 'role', kind: 'multi', label: 'Role', value: roleSel, onChange: setRoleSel, options: roleKeys.map((k) => ({ value: k, label: labels[k] || (k === 'super_admin' ? 'Super admins' : k), count: list.filter((u) => u.role === k).length })) },
            { id: 'access', kind: 'single', label: 'Page access', value: access, defaultValue: 'any', onChange: setAccess, options: [
              { value: 'any', label: 'Anyone' }, { value: 'all', label: 'All pages' }, { value: 'limited', label: 'Limited to some pages' }, { value: 'adminTabs', label: 'Has admin sections' },
            ] },
            { id: 'joined', kind: 'single', label: 'Joined', value: joined, defaultValue: 'any', onChange: setJoined, options: [
              { value: 'any', label: 'Any time' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' },
            ] },
            { id: 'sort', kind: 'single', view: true, label: 'Sort by', value: sort, defaultValue: 'name', onChange: setSort, options: [
              { value: 'name', label: 'Name (A to Z)' }, { value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'role', label: 'Role' },
            ] },
          ]} />
          <Button onClick={() => open({ mode: 'add' })} className="!rounded-full shrink-0">{G.users} <span className="max-sm:hidden">Add person</span></Button>
        </div>
        {!loading && <p className="text-xs text-muted mt-3">{filtered.length === list.length ? `${list.length} account${list.length === 1 ? '' : 's'}` : `${filtered.length} of ${list.length} accounts`} · {admins} super admin{admins === 1 ? '' : 's'}</p>}
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
                      <span className="text-[10px] font-extrabold tracking-[0.2em] opacity-80 max-md:hidden">{admin ? 'ADMIN PASS' : 'MEMBER'}</span>
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
