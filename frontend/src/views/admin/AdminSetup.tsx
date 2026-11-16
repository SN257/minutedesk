import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Button, Empty, Skeleton, Stagger, useAsync } from '../../ui';
import { spring } from '../../lib/motion';
import { useToast } from '../../lib/toast';
import {
  createCenter, createRole, deleteCenter, deleteRole, getAllCentersAdmin, getAppSettings, getRoles, updateAppSettings, updateCenter, updateRole,
  type CenterEntry, type RoleEntry,
} from '../../lib/api';
import { useBranding } from '../../lib/branding';
import { ConfirmModal, ErrorNote, G, useLast } from './shared';
import { ATile, ATitle } from './tiles';
import { DraftProvider } from './setup/draft';
import { DraftGate, HeaderAction, MenuSection, PublishCard, SectionHeader, TextsSection, ThemeSection, WebsiteSection } from './setup/Sections';

// The database schema editor still lives in the archived classic app (frontend-classic, port 5175 in dev).
const SCHEMA_URL = `${import.meta.env.VITE_CLASSIC_URL || 'http://localhost:5175'}/admin-center/schema`;
const field = 'w-full rounded-2xl bg-white/55 border border-white/70 px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10';
const lbl = 'block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted mb-2';
const chipBtn = 'w-7 h-7 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-ink/10 transition-colors';

/* ───────── Centers ───────── */
const Centers = () => {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(getAllCentersAdmin, []);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [del, setDel] = useState<CenterEntry | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const shown = useLast(del);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await createCenter(name.trim());
      toast(`${name.trim()} added. It now shows in the meeting form.`);
      setName('');
      reload();
    } catch (err: any) { toast(err?.message || 'Could not add that center.', 'error'); } finally { setAdding(false); }
  };
  const toggle = async (c: CenterEntry) => {
    try { await updateCenter(c.id, { isActive: !c.isActive }); toast(c.isActive ? `${c.name} hidden from new meetings.` : `${c.name} is active again.`); reload(); }
    catch (err: any) { toast(err?.message || 'Could not update.', 'error'); }
  };
  const rename = async (c: CenterEntry) => {
    const v = editVal.trim();
    setEditId(null);
    if (!v || v === c.name) return;
    try { await updateCenter(c.id, { name: v }); toast('Renamed.'); reload(); }
    catch (err: any) { toast(err?.message || 'Could not rename.', 'error'); }
  };
  const remove = async () => {
    if (!del) return;
    setDeleting(true);
    try { await deleteCenter(del.id); toast(`${del.name} deleted.`); setDelOpen(false); reload(); }
    catch (err: any) { toast(err?.message || 'Could not delete this center.', 'error'); } finally { setDeleting(false); }
  };

  const list = data ?? [];
  const live = list.filter((c) => c.isActive).length;
  return (
    <ATile glow="good" className="xl:col-span-3">
      <ATitle icon={G.db} right={list.length > 0 ? <span className="text-xs font-bold text-muted">{live} live · {list.length - live} hidden</span> : undefined}>Centers</ATitle>
      <p className="text-xs text-muted -mt-1 mb-4 max-w-md">The places people pick from when they log a meeting. Use the switch to hide or show one.</p>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a center, e.g. Mumbai Hub" aria-label="New center name" />
        <Button type="submit" loading={adding} disabled={!name.trim()} className="!rounded-full">Add</Button>
      </form>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data ? <div className="grid sm:grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div> : list.length === 0 ? (
        <Empty icon="🏢" title="No centers yet" hint="Add your first one above." />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-2.5 max-h-[24rem] overflow-y-auto scroll-y pr-1">
          <AnimatePresence initial={false}>
            {list.map((c) => (
              <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring}
                className={`flex items-center gap-2 rounded-2xl border pl-3.5 pr-2 py-2 min-w-0 transition-colors ${c.isActive ? 'bg-white/55 border-white/80' : 'bg-ink/[0.04] border-transparent'}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.isActive ? 'bg-good' : 'bg-ink/25'}`} />
                {editId === c.id ? (
                  <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={() => rename(c)}
                    onKeyDown={(e) => { if (e.key === 'Enter') rename(c); if (e.key === 'Escape') setEditId(null); }} className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold border-b border-ink/30" />
                ) : (
                  <p className={`flex-1 min-w-0 text-[15px] font-semibold truncate ${c.isActive ? '' : 'text-muted line-through'}`} title={c.name}>{c.name}</p>
                )}
                <button type="button" onClick={() => toggle(c)} aria-pressed={c.isActive} aria-label={c.isActive ? 'Hide center' : 'Show center'} title={c.isActive ? 'Live: tap to hide' : 'Hidden: tap to show'}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${c.isActive ? 'bg-good' : 'bg-ink/20'}`}>
                  <motion.span layout transition={spring} className={`absolute top-0.5 w-4 h-4 rounded-full shadow ${c.isActive ? 'bg-white right-0.5' : 'bg-white dark:bg-ink/70 left-0.5'}`} />
                </button>
                <button type="button" aria-label="Rename" title="Rename" className={chipBtn} onClick={() => { setEditId(c.id); setEditVal(c.name); }}>{G.edit}</button>
                <button type="button" aria-label="Delete" title="Delete" className={`${chipBtn} hover:!text-bad`} onClick={() => { setDel(c); setDelOpen(true); }}>{G.trash}</button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <ConfirmModal open={delOpen} title="Delete this center?" confirmLabel="Delete center" danger loading={deleting} onConfirm={remove} onClose={() => setDelOpen(false)}>
        <p><strong>{shown?.name}</strong> will be removed from the list.</p>
        <p className="text-muted">If you only want to stop new meetings using it, hide it instead.</p>
      </ConfirmModal>
    </ATile>
  );
};

/* ───────── Roles ───────── */
const Roles = () => {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(getRoles, []);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [eLabel, setELabel] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [del, setDel] = useState<RoleEntry | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const shown = useLast(del);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await createRole({ key: key.trim().toLowerCase().replace(/\s+/g, '_'), label: label.trim(), description: desc.trim() || undefined });
      toast(`${label.trim()} role created.`);
      setKey(''); setLabel(''); setDesc('');
      reload();
    } catch (err: any) { toast(err?.message || 'Could not create that role.', 'error'); } finally { setAdding(false); }
  };
  const save = async (r: RoleEntry) => {
    try { await updateRole(r.id, { label: eLabel.trim() || r.label, description: eDesc.trim() }); toast('Role updated.'); setEditId(null); reload(); }
    catch (err: any) { toast(err?.message || 'Could not update.', 'error'); }
  };
  const remove = async () => {
    if (!del) return;
    setDeleting(true);
    try { await deleteRole(del.id); toast(`${del.label} role deleted.`); setDelOpen(false); reload(); }
    catch (err: any) { toast(err?.message || 'Could not delete this role.', 'error'); } finally { setDeleting(false); }
  };

  const list = data ?? [];
  const [formOpen, setFormOpen] = useState(false);
  return (
    <ATile glow="brand" className="xl:col-span-2">
      <ATitle icon={G.users} right={<Button size="sm" variant="soft" className="!rounded-full" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'Close' : '+ New role'}</Button>}>Roles</ATitle>
      <p className="text-xs text-muted -mt-1 mb-4">Only Super admin unlocks this workspace; custom roles behave like a standard user for now.</p>
      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.form onSubmit={async (e) => { await add(e); }} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid sm:grid-cols-2 gap-2 pb-4">
              <input className={`${field} font-mono`} value={key} onChange={(e) => setKey(e.target.value)} placeholder="key, e.g. manager" aria-label="Role key" />
              <input className={field} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Manager" aria-label="Role label" />
              <input className={`${field} sm:col-span-2`} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" aria-label="Role description" />
              <Button type="submit" loading={adding} disabled={!key.trim() || !label.trim()} className="sm:col-span-2 !rounded-full">Create role</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div> : list.length === 0 ? (
        <Empty icon="🏷️" title="No roles yet" />
      ) : (
        <ul className="space-y-2.5 max-h-[22rem] overflow-y-auto scroll-y pr-1">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.li key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring} className="relative rounded-2xl bg-white/50 border border-white/70 p-3.5 pl-5 overflow-hidden min-w-0">
                <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1.5 ${r.isSystem ? 'bg-ink' : 'bg-brand'}`} />
                {editId === r.id ? (
                  <div className="space-y-2">
                    <input className={field} value={eLabel} onChange={(e) => setELabel(e.target.value)} aria-label="Label" autoFocus />
                    <input className={field} value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Description" aria-label="Description" />
                    <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button><Button size="sm" className="!rounded-full" onClick={() => save(r)}>Save</Button></div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-extrabold">{r.label}</p>
                        <span className="font-mono text-[10px] rounded-md bg-ink/[0.07] px-1.5 py-0.5">{r.key}</span>
                        {r.isSystem && <Badge tone="dark">🔒 Built in</Badge>}
                      </div>
                      {r.description && <p className="text-xs text-muted mt-1 break-words">{r.description}</p>}
                    </div>
                    {!r.isSystem && (
                      <span className="inline-flex shrink-0">
                        <button type="button" aria-label="Edit" title="Edit" className={chipBtn} onClick={() => { setEditId(r.id); setELabel(r.label); setEDesc(r.description || ''); }}>{G.edit}</button>
                        <button type="button" aria-label="Delete" title="Delete" className={`${chipBtn} hover:!text-bad`} onClick={() => { setDel(r); setDelOpen(true); }}>{G.trash}</button>
                      </span>
                    )}
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <ConfirmModal open={delOpen} title="Delete this role?" confirmLabel="Delete role" danger loading={deleting} onConfirm={remove} onClose={() => setDelOpen(false)}>
        <p>The <strong>{shown?.label}</strong> role will no longer be assignable.</p>
        <p className="text-muted">The server will refuse if someone still holds it. Reassign those people first.</p>
      </ConfirmModal>
    </ATile>
  );
};

/* ───────── Branding ───────── */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
/** Ready-made accent colours to start from. */
const SWATCHES = ['#253745', '#2f5d8a', '#1f7a6d', '#6b4fa3', '#b4532a', '#a3304f'];

const Branding = () => {
  const applied = useBranding();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(getAppSettings, []);
  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [color, setColor] = useState('#253745');
  const [saving, setSaving] = useState(false);
  const [logoBad, setLogoBad] = useState(false);

  useEffect(() => {
    if (!data) return;
    setSiteName(data.siteName || '');
    setLogoUrl(data.logoUrl || '');
    setFaviconUrl(data.faviconUrl || '');
    setColor(data.primaryColor || '#253745');
  }, [data]);
  useEffect(() => setLogoBad(false), [logoUrl]);

  const valid = HEX.test(color);
  const dirty = !!data && (siteName !== (data.siteName || '') || logoUrl !== (data.logoUrl || '') || faviconUrl !== (data.faviconUrl || '') || color !== (data.primaryColor || ''));
  const accent = valid ? color : '#253745';
  const name = siteName.trim() || 'Your workspace';

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await updateAppSettings({ siteName: siteName.trim(), logoUrl: logoUrl.trim(), faviconUrl: faviconUrl.trim(), primaryColor: color });
      toast('Branding saved. It now shows across the app.');
      reload();
      void applied.refresh();
    } catch (err: any) { toast(err?.message || 'Could not save branding.', 'error'); } finally { setSaving(false); }
  };

  const logo = (size: number, round?: string) => (
    <span className={`grid place-items-center overflow-hidden shrink-0 text-white font-black ${round || 'rounded-xl'}`} style={{ width: size, height: size, background: accent, fontSize: size * 0.42 }}>
      {logoUrl && !logoBad ? <img src={logoUrl} alt="" className="w-full h-full object-cover" onError={() => setLogoBad(true)} /> : name.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <ATile glow="warn">
      <ATitle icon={G.edit} right={dirty ? <span className="text-xs text-warn font-bold">Unsaved changes</span> : <span className="text-xs text-muted">Saved with its own button, applies at once</span>}>Branding studio</ATitle>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data ? <Skeleton className="h-64" /> : (
        <div className="grid lg:grid-cols-5 gap-6 items-stretch">
          {/* live stage */}
          <div className="lg:col-span-3 min-w-0">
            <div className="pin-light relative rounded-[1.75rem] overflow-hidden p-6 sm:p-8 min-h-[320px] flex flex-col items-center justify-center text-center transition-colors duration-500" style={{ background: `radial-gradient(120% 90% at 20% 0%, color-mix(in srgb, ${accent} 70%, white), transparent 60%), linear-gradient(135deg, ${accent}, #06141b)` }}>
              <span aria-hidden className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
              <motion.div key={accent} initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>{logo(64, 'rounded-[1.4rem]')}</motion.div>
              <p className="text-white font-extrabold text-2xl mt-4 break-words max-w-full">{name}</p>
              <p className="text-white/60 text-xs">Sign-in screen preview</p>
              <div className="mt-5 w-full max-w-[260px] rounded-2xl bg-white/15 border border-white/25 p-3 space-y-2 text-left">
                <div className="h-8 rounded-lg bg-white/20" />
                <div className="h-8 rounded-lg bg-white/95 grid place-items-center text-[11px] font-extrabold" style={{ color: accent }}>Sign in</div>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white/50 border border-white/70 px-4 py-3 flex items-center gap-3">
              {logo(32, 'rounded-lg')}
              <span className="font-bold text-sm truncate">{name}</span>
              <Badge tone="brand">Sidebar</Badge>
              <span className="ml-auto w-3.5 h-3.5 rounded-full shrink-0 ring-4 ring-white/70" style={{ background: accent }} />
            </div>
          </div>

          {/* controls */}
          <form onSubmit={save} className="lg:col-span-2 space-y-4 min-w-0">
            <label className="block"><span className={lbl}>Site name</span><input className={field} value={siteName} onChange={(e) => setSiteName(e.target.value)} required /><span className="block text-[11px] text-muted mt-1">Shown in the browser tab, sign-in screen and sidebar.</span></label>
            <label className="block"><span className={lbl}>Logo URL</span><input className={field} type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" /></label>
            <label className="block"><span className={lbl}>Favicon URL</span><input className={field} type="url" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://…/favicon.ico" /></label>
            <div>
              <span className={lbl}>Accent colour</span>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button key={c} type="button" aria-label={`Use ${c}`} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ring-offset-2 ring-offset-transparent transition-transform hover:scale-110 ${color.toLowerCase() === c ? 'ring-2 ring-ink' : 'ring-1 ring-white/70'}`} style={{ background: c }} />
                ))}
                <input type="color" value={valid && color.length === 7 ? color : '#253745'} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded-full border border-white/70 bg-white/50 cursor-pointer p-0.5" aria-label="Pick any colour" />
              </div>
              <input className={`${field} font-mono mt-2`} value={color} onChange={(e) => setColor(e.target.value)} aria-invalid={!valid} />
              <span className="block text-[11px] text-muted mt-1">{valid ? 'Used for highlights and accents.' : 'Enter a hex colour such as #253745.'}</span>
            </div>
            <div className="flex justify-end pt-1"><Button type="submit" loading={saving} disabled={!dirty || !valid || !siteName.trim()} className="!rounded-full">Save branding</Button></div>
          </form>
        </div>
      )}
    </ATile>
  );
};

type SetupTab = 'brand' | 'menu' | 'website' | 'texts' | 'lists';
const IC = {
  brand: 'M12 3a9 9 0 100 18 2 2 0 002-2c0-1-1-1.5-1-2.5S14 15 15 15h2a4 4 0 004-4 8 8 0 00-9-8zM7.5 11h.01M10 7.5h.01M15 8h.01',
  menu: 'M4 6h16M4 12h16M4 18h10',
  website: 'M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  texts: 'M4 7V5h16v2M9 19h6M12 5v14',
  lists: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
};
const SETUP_TABS: { key: SetupTab; label: string; desc: string; title: string; sub: string }[] = [
  { key: 'brand', label: 'Brand & look', desc: 'Name, logo, colours, feel', title: 'Brand & look', sub: 'Your name, logo and colours, plus the overall feel of the app.' },
  { key: 'menu', label: 'App menu', desc: 'Rename, reorder, hide pages', title: 'App menu', sub: 'The pages in the sidebar. Rename them, change their order, or hide the ones you don’t use.' },
  { key: 'website', label: 'Home page', desc: 'Sections, FAQ, modules', title: 'Home page', sub: 'Everything people read on the public home page. Open a card to edit it, or add a new one.' },
  { key: 'texts', label: 'Texts', desc: 'Any heading or sentence', title: 'Texts', sub: 'Change the wording of headings, labels and sentences across the app.' },
  { key: 'lists', label: 'Centers & roles', desc: 'Lists used in forms', title: 'Centers & roles', sub: 'The lists people choose from in forms. These save instantly.' },
];

const Lists = () => (
  <div className="space-y-3 sm:space-y-5">
    <div className="grid xl:grid-cols-5 gap-3 sm:gap-5 items-stretch">
      <Centers />
      <Roles />
    </div>
    <ATile glow="bad">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-ink text-white grid place-items-center shrink-0">{G.db}</div>
          <div className="min-w-0">
            <h3 className="font-extrabold tracking-tight">Database schema editor</h3>
            <p className="text-sm text-muted mt-0.5 max-w-xl">Create tables, add columns and edit live rows. These changes act directly on the live database, so this tool stays in the classic admin.</p>
          </div>
        </div>
        <a href={SCHEMA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-white/50 text-ink border border-white/70 hover:bg-white/70 transition-colors">
          Open classic admin {G.external}
        </a>
      </div>
    </ATile>
  </div>
);

const AdminSetup = () => {
  const [tab, setTab] = useState<SetupTab>('brand');
  const cur = SETUP_TABS.find((t) => t.key === tab)!;
  return (
    <DraftProvider>
      <div className="grid lg:grid-cols-[17.5rem_minmax(0,1fr)] gap-3 sm:gap-6 items-start">
        {/* left rail: sections + publish */}
        <aside className="lg:sticky lg:top-0 space-y-4 min-w-0">
          <nav className="liquid rounded-[1.75rem] p-2.5" aria-label="Setup sections">
            <ul className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible [scrollbar-width:none]">
              {SETUP_TABS.map((t) => {
                const on = tab === t.key;
                return (
                  <li key={t.key} className="shrink-0 lg:shrink">
                    <button type="button" onClick={() => setTab(t.key)} aria-current={on ? 'page' : undefined} className={`relative w-full flex items-center gap-3 rounded-[1.25rem] px-2.5 py-2 lg:px-3.5 lg:py-3 text-left transition-colors ${on ? 'text-white' : 'text-ink hover:bg-white/50'}`}>
                      {on && <motion.span layoutId="setup-rail" transition={spring} className="absolute inset-0 rounded-[1.25rem] bg-ink" />}
                      <span className={`relative w-9 h-9 lg:w-10 lg:h-10 shrink-0 rounded-xl grid place-items-center ${on ? 'bg-white/15' : 'bg-ink/[0.07]'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC[t.key]} /></svg>
                      </span>
                      <span className="relative min-w-0">
                        <span className="block text-[15px] font-extrabold leading-tight whitespace-nowrap">{t.label}</span>
                        <span className={`hidden lg:block text-xs mt-0.5 ${on ? 'text-white/65' : 'text-muted'}`}>{t.desc}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          {tab !== 'lists' && <PublishCard />}
        </aside>

        {/* editor */}
        <div className="min-w-0 space-y-3 sm:space-y-6">
          <SectionHeader eyebrow={`Setup · ${cur.label}`} title={cur.title} desc={cur.sub} right={<HeaderAction tab={tab} />} />
          <DraftGate>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-3 sm:space-y-5">
                {tab === 'brand' && <><Stagger><Branding /></Stagger><ThemeSection /></>}
                {tab === 'menu' && <MenuSection />}
                {tab === 'website' && <WebsiteSection />}
                {tab === 'texts' && <TextsSection />}
                {tab === 'lists' && <motion.div initial="show" animate="show"><Stagger><Lists /></Stagger></motion.div>}
              </motion.div>
            </AnimatePresence>
          </DraftGate>
        </div>
      </div>
    </DraftProvider>
  );
};
export default AdminSetup;
