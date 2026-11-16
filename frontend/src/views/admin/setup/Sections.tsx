import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Badge, Button, Skeleton } from '../../../ui';
import { spring } from '../../../lib/motion';
import { D_APP_NAV, TEXTS, type AppNavItem, type SiteCfg } from '../../../lib/siteConfig';
import type { NavLink } from '../../../lib/siteDefaults';
import { ErrorNote, SearchBox } from '../shared';
import { useDraft } from './draft';
import { CardEditor, FIELD, LBL, Switch } from './ListEditor';

const pill = (on: boolean) => `px-5 py-2.5 rounded-full text-[15px] font-bold transition-colors ${on ? 'bg-ink text-white' : 'bg-white/55 border border-white/70 text-muted hover:text-ink'}`;

/** The big heading at the top of each Setup section. */
export const SectionHeader = ({ eyebrow, title, desc, right }: { eyebrow: string; title: string; desc: string; right?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-1">
    <div className="min-w-0 flex-1 basis-72">
      <p className="text-xs font-extrabold uppercase tracking-wider text-brand">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">{title}</h2>
      <p className="text-base text-muted mt-2 max-w-2xl">{desc}</p>
    </div>
    {right}
  </div>
);

/* ───────── Publish card (sits in the left rail) ───────── */
export const PublishCard = () => {
  const d = useDraft();
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } finally { setBusy(false); } };
  return (
    <div className="liquid rounded-[1.75rem] p-5">
      <div className="flex items-start gap-3">
        <span className="relative flex w-3.5 h-3.5 shrink-0 mt-1.5">
          {d.dirty && <span className="absolute inset-0 rounded-full bg-warn animate-ping opacity-50" />}
          <span className={`relative w-3.5 h-3.5 rounded-full ${d.dirty ? 'bg-warn' : 'bg-good'}`} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold leading-snug">{d.dirty ? 'Unpublished changes' : 'All published'}</p>
          <p className="text-xs text-muted mt-0.5">{d.saving ? 'Saving draft…' : d.dirty ? 'Saved as a draft. Only you can see it.' : d.publishedAt ? `Published ${new Date(d.publishedAt).toLocaleDateString()}` : 'Showing the built-in content.'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mt-4 rounded-2xl bg-white/45 border border-white/70 px-3.5 py-2.5">
        <span className="text-sm font-bold">Live preview</span>
        <Switch on={d.previewing} onChange={d.setPreviewing} label="Live preview of the draft" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button variant="soft" className="!rounded-full" disabled={!d.dirty || busy} onClick={() => run(d.discard)}>Discard</Button>
        <Button className="!rounded-full" loading={busy} disabled={!d.dirty} onClick={() => run(d.publish)}>Publish</Button>
      </div>
    </div>
  );
};

/* ───────── Look & feel ───────── */
export const ThemeSection = () => {
  const d = useDraft();
  const t = d.cfg.theme;
  const upd = (p: Partial<SiteCfg['theme']>) => d.set('theme', { ...t, ...p });
  const card = 'liquid rounded-[1.75rem] p-6';
  return (
    <div className="grid md:grid-cols-3 gap-3 sm:gap-5">
      <div className={card}>
        <h3 className="text-lg font-extrabold">Glass strength</h3>
        <p className="text-sm text-muted mt-1 mb-5">How see-through the cards and panels are.</p>
        <input type="range" min={0.4} max={1.5} step={0.05} value={t.glass} onChange={(e) => upd({ glass: Number(e.target.value) })} className="w-full accent-[var(--color-brand)] h-2" aria-label="Glass strength" />
        <div className="flex justify-between text-xs text-muted mt-2"><span>See-through</span><span className="font-extrabold text-ink text-sm">{Math.round(t.glass * 100)}%</span><span>Frosted</span></div>
      </div>
      <div className={card}>
        <h3 className="text-lg font-extrabold">Headline font</h3>
        <p className="text-sm text-muted mt-1 mb-5">The typeface used for titles and the menu.</p>
        <div className="flex flex-wrap gap-2.5">
          {([['outfit', 'Outfit'], ['inter', 'Inter'], ['serif', 'Serif']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={t.font === k} onClick={() => upd({ font: k })} className={pill(t.font === k)}>{l}</button>)}
        </div>
      </div>
      <div className={card}>
        <h3 className="text-lg font-extrabold">Starts in</h3>
        <p className="text-sm text-muted mt-1 mb-5">For people who have not picked a theme yet.</p>
        <div className="flex flex-wrap gap-2.5">
          {([['light', 'Light'], ['dark', 'Dark']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={t.defaultTheme === k} onClick={() => upd({ defaultTheme: k })} className={pill(t.defaultTheme === k)}>{l}</button>)}
        </div>
      </div>
    </div>
  );
};

/* ───────── App menu ───────── */
export const MenuSection = () => {
  const d = useDraft();
  const nav = d.cfg.app.nav;
  return (
    <div>
      <CardEditor<AppNavItem>
        items={nav}
        onChange={(v) => d.set('app.nav', v)}
        title={(i) => i.label}
        excerpt={(i) => (i.hidden ? 'Hidden from the menu' : i.key === 'admin' ? 'Admins only' : `Opens the ${i.key} page`)}
        noun="page"
        blank={() => ({ key: 'today', label: '' })}
        canAdd={false}
        canDelete={false}
        cols="sm:grid-cols-2 xl:grid-cols-3"
        fields={[{ key: 'label', label: 'Menu name' }]}
        cardExtra={(it, patch) => (
          <div className="flex items-center justify-between rounded-2xl bg-white/45 border border-white/70 px-3.5 py-2.5">
            <span className="text-sm font-bold">{it.key === 'admin' ? 'Always shown' : 'Show in menu'}</span>
            {it.key !== 'admin' && <Switch on={!it.hidden} onChange={(v) => patch({ hidden: !v })} label="Show in menu" />}
          </div>
        )}
      />
    </div>
  );
};

/** Buttons that sit beside a section's heading. */
export const HeaderAction = ({ tab }: { tab: string }) => {
  const d = useDraft();
  if (tab === 'menu') return <Button variant="soft" className="!rounded-full" onClick={() => d.set('app.nav', D_APP_NAV)}>Reset menu</Button>;
  return null;
};

/* ───────── Home page content ───────── */
export const WebsiteSection = () => {
  const d = useDraft();
  const L = d.cfg.landing;
  const [open, setOpen] = useState('nav');
  const blocks: { key: string; title: string; count: number; body: ReactNode }[] = [
    { key: 'nav', title: 'Header links', count: L.nav.length, body: (
      <CardEditor<NavLink> items={L.nav} onChange={(v) => d.set('landing.nav', v)} title={(i) => i.label} excerpt={(i) => (i.hidden ? 'Hidden' : `Jumps to “${i.id}”`)} noun="link" blank={() => ({ id: 'top', label: '' })} canAdd={false} canDelete={false} cols="sm:grid-cols-2 xl:grid-cols-3"
        fields={[{ key: 'label', label: 'Link text' }]}
        cardExtra={(it, patch) => <div className="flex items-center justify-between rounded-2xl bg-white/45 border border-white/70 px-3.5 py-2.5"><span className="text-sm font-bold">Show this link</span><Switch on={!it.hidden} onChange={(v) => patch({ hidden: !v })} label="Show this link" /></div>} />
    ) },
    { key: 'problems', title: 'Problems', count: L.problems.length, body: (
      <CardEditor items={L.problems} onChange={(v) => d.set('landing.problems', v)} title={(i) => i.h} excerpt={(i) => i.t} noun="card" blank={() => ({ h: '', t: '' })} fields={[{ key: 'h', label: 'Heading' }, { key: 't', label: 'Text', kind: 'long' }]} />
    ) },
    { key: 'modules', title: 'Modules', count: L.modules.length, body: (
      <CardEditor items={L.modules} onChange={(v) => d.set('landing.modules', v)} title={(i) => i.name} excerpt={(i) => i.tagline} iconOf={(i) => i.icon} noun="module" blank={() => ({ id: `module-${Date.now() % 100000}`, icon: 'check', name: '', tagline: '', text: '', points: [''] })}
        fields={[{ key: 'name', label: 'Name', half: true }, { key: 'tagline', label: 'Tagline', half: true }, { key: 'icon', label: 'Icon', kind: 'icon' }, { key: 'text', label: 'Description', kind: 'long' }, { key: 'points', label: 'Bullet points', kind: 'lines' }]} />
    ) },
    { key: 'steps', title: 'How it works', count: L.steps.length, body: (
      <CardEditor items={L.steps} onChange={(v) => d.set('landing.steps', v)} title={(i) => `${i.n} · ${i.title}`} excerpt={(i) => i.text} noun="step" blank={() => ({ n: String(L.steps.length + 1).padStart(2, '0'), title: '', text: '' })}
        fields={[{ key: 'n', label: 'Number', half: true }, { key: 'title', label: 'Title', half: true }, { key: 'text', label: 'Text', kind: 'long' }]} />
    ) },
    { key: 'audiences', title: 'Who it’s for', count: L.audiences.length, body: (
      <CardEditor items={L.audiences} onChange={(v) => d.set('landing.audiences', v)} title={(i) => i.who} excerpt={(i) => i.text} noun="audience" blank={() => ({ who: '', text: '' })} fields={[{ key: 'who', label: 'Who' }, { key: 'text', label: 'Text', kind: 'long' }]} />
    ) },
    { key: 'trust', title: 'Trust', count: L.trust.length, body: (
      <CardEditor items={L.trust} onChange={(v) => d.set('landing.trust', v)} title={(i) => i.title} excerpt={(i) => i.text} iconOf={(i) => i.icon} noun="safeguard" blank={() => ({ icon: 'check', title: '', text: '' })} fields={[{ key: 'title', label: 'Title' }, { key: 'icon', label: 'Icon', kind: 'icon' }, { key: 'text', label: 'Text', kind: 'long' }]} />
    ) },
    { key: 'values', title: 'Values', count: L.values.length, body: (
      <CardEditor items={L.values} onChange={(v) => d.set('landing.values', v)} title={(i) => i.h} excerpt={(i) => i.t} noun="value" blank={() => ({ h: '', t: '' })} fields={[{ key: 'h', label: 'Heading' }, { key: 't', label: 'Text', kind: 'long' }]} />
    ) },
    { key: 'faq', title: 'FAQ', count: L.faq.length, body: (
      <CardEditor items={L.faq} onChange={(v) => d.set('landing.faq', v)} title={(i) => i.q} excerpt={(i) => i.a} noun="question" blank={() => ({ q: '', a: '' })} fields={[{ key: 'q', label: 'Question' }, { key: 'a', label: 'Answer', kind: 'long' }]} />
    ) },
  ];
  const cur = blocks.find((b) => b.key === open) ?? blocks[0];
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="inline-flex gap-1 rounded-full liquid p-1.5" role="tablist" aria-label="Home page blocks">
          {blocks.map((b) => (
            <button key={b.key} type="button" role="tab" aria-selected={open === b.key} onClick={() => setOpen(b.key)} className={`relative shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-bold transition-colors ${open === b.key ? 'text-white' : 'text-muted hover:text-ink'}`}>
              {open === b.key && <motion.span layoutId="web-block" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative">{b.title}</span>
              <span className={`relative text-xs tabular-nums rounded-full px-2 py-0.5 ${open === b.key ? 'bg-white/20' : 'bg-ink/[0.08]'}`}>{b.count}</span>
            </button>
          ))}
        </div>
      </div>
      <motion.div key={cur.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{cur.body}</motion.div>
      <p className="text-sm text-muted px-1">Headings and paragraphs of this page are in the <strong>Texts</strong> section.</p>
    </div>
  );
};

/* ───────── Texts ───────── */
export const TextsSection = () => {
  const d = useDraft();
  const [q, setQ] = useState('');
  const texts = d.cfg.texts;
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const m = new Map<string, [string, (typeof TEXTS)[string]][]>();
    Object.entries(TEXTS).forEach(([k, v]) => {
      if (s && !`${v.label} ${v.group} ${v.value} ${texts[k] ?? ''}`.toLowerCase().includes(s)) return;
      m.set(v.group, [...(m.get(v.group) || []), [k, v]]);
    });
    return [...m.entries()];
  }, [q, texts]);
  const setText = (k: string, v: string) => {
    const next = { ...texts };
    if (v === '' || v === TEXTS[k].value) delete next[k]; else next[k] = v;
    d.set('texts', next);
  };
  const changed = Object.keys(texts).length;
  return (
    <div className="space-y-5">
      <div className="liquid rounded-[1.75rem] p-5 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Find a text…" />
        {changed > 0 && <Badge tone="warn">{changed} changed</Badge>}
        <p className="basis-full text-sm text-muted">Leave a box empty to keep the original wording. Write <code className="font-mono bg-ink/[0.07] rounded px-1.5 py-0.5">{'{site}'}</code> to insert your site name.</p>
      </div>
      {groups.length === 0 && <p className="text-base text-muted py-6 text-center">Nothing matches that.</p>}
      {groups.map(([g, list]) => (
        <section key={g} className="liquid rounded-[1.75rem] p-5 sm:p-6">
          <h3 className="text-lg font-extrabold mb-4">{g}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {list.map(([k, v]) => (
              <label key={k} className={`block ${v.long ? 'md:col-span-2' : ''}`}>
                <span className={`${LBL} flex items-center justify-between`}>
                  <span>{v.label}</span>
                  {texts[k] !== undefined && <button type="button" onClick={(e) => { e.preventDefault(); setText(k, ''); }} className="normal-case tracking-normal font-bold text-brand hover:underline">Reset</button>}
                </span>
                {v.long
                  ? <textarea className={`${FIELD} resize-y`} rows={3} value={texts[k] ?? ''} placeholder={v.value} onChange={(e) => setText(k, e.target.value)} />
                  : <input className={FIELD} value={texts[k] ?? ''} placeholder={v.value} onChange={(e) => setText(k, e.target.value)} />}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export const DraftGate = ({ children }: { children: ReactNode }) => {
  const d = useDraft();
  if (d.error) return <ErrorNote message={d.error} onRetry={() => window.location.reload()} />;
  if (d.loading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  return <>{children}</>;
};

