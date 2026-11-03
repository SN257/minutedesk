import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSiteConfig } from './api';
import { useBranding } from './branding';
import {
  D_AUDIENCES, D_FAQ, D_MODULES, D_NAV, D_PROBLEMS, D_STEPS, D_TRUST, D_VALUES,
  type AudienceItem, type FaqItem, type ModuleItem, type NavLink, type Problem, type StepItem, type TrustItem, type ValueItem,
} from './siteDefaults';

/* ───────── Shape of the editable configuration ───────── */
export interface AppNavItem { key: string; label: string; hidden?: boolean }
export interface SiteCfg {
  texts: Record<string, string>;
  landing: { nav: NavLink[]; problems: Problem[]; modules: ModuleItem[]; steps: StepItem[]; audiences: AudienceItem[]; trust: TrustItem[]; values: ValueItem[]; faq: FaqItem[] };
  app: { nav: AppNavItem[] };
  theme: { glass: number; defaultTheme: 'light' | 'dark'; font: 'outfit' | 'inter' | 'serif' };
}

/** The app's own menu, in the order shown. `key` must match a real page. */
export const D_APP_NAV: AppNavItem[] = [
  { key: 'today', label: 'Dashboard' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'worklog', label: 'Work log' },
  { key: 'reports', label: 'Insights' },
  { key: 'admin', label: 'Admin' },
];

export const DEFAULT_CFG: SiteCfg = {
  texts: {},
  landing: { nav: D_NAV, problems: D_PROBLEMS, modules: D_MODULES, steps: D_STEPS, audiences: D_AUDIENCES, trust: D_TRUST, values: D_VALUES, faq: D_FAQ },
  app: { nav: D_APP_NAV },
  theme: { glass: 1, defaultTheme: 'light', font: 'outfit' },
};

/** Every piece of wording that can be edited as plain text. Grouped by where it appears. */
export const TEXTS: Record<string, { group: string; label: string; value: string; long?: boolean }> = {
  'hero.title1': { group: 'Home page · Hero', label: 'Headline, first part', value: 'Run Better' },
  'hero.title2': { group: 'Home page · Hero', label: 'Headline, highlighted word', value: 'Meetings,' },
  'hero.title3': { group: 'Home page · Hero', label: 'Headline, second line', value: 'Finish What You Decide' },
  'hero.sub': { group: 'Home page · Hero', label: 'Sub-headline', long: true, value: 'Agendas, minutes, follow-up tasks and daily work logs in one calm workspace — so every decision has an owner and a date.' },
  'software.eyebrow': { group: 'Home page · The software', label: 'Small label', value: 'The software' },
  'software.title': { group: 'Home page · The software', label: 'Heading', value: 'One place for the whole' },
  'software.em': { group: 'Home page · The software', label: 'Heading, light part', value: 'meeting cycle' },
  'software.sub': { group: 'Home page · The software', label: 'Intro', long: true, value: 'Most organisations already hold meetings, write minutes and chase follow-ups. The trouble is that each step lives somewhere different. {site} keeps the whole cycle together.' },
  'software.body': { group: 'Home page · The software', label: 'Paragraph', long: true, value: 'It replaces scattered documents, chat threads and spreadsheets with a single workspace that every member of the organisation can use from any device, with nothing to install.' },
  'modules.eyebrow': { group: 'Home page · Modules', label: 'Small label', value: 'Modules' },
  'modules.title': { group: 'Home page · Modules', label: 'Heading', value: 'Five modules,' },
  'modules.em': { group: 'Home page · Modules', label: 'Heading, light part', value: 'one workspace' },
  'modules.sub': { group: 'Home page · Modules', label: 'Intro', long: true, value: 'Each module does one job well, and they share the same data — a decision in a meeting becomes a task, and a finished task shows up in your insights.' },
  'how.eyebrow': { group: 'Home page · How it works', label: 'Small label', value: 'How it works' },
  'how.title': { group: 'Home page · How it works', label: 'Heading', value: 'From first agenda to' },
  'how.em': { group: 'Home page · How it works', label: 'Heading, light part', value: 'finished work' },
  'audience.eyebrow': { group: 'Home page · Who it’s for', label: 'Small label', value: 'Who it’s for' },
  'audience.title': { group: 'Home page · Who it’s for', label: 'Heading', value: 'Built for people who' },
  'audience.em': { group: 'Home page · Who it’s for', label: 'Heading, light part', value: 'run on meetings' },
  'trust.eyebrow': { group: 'Home page · Trust', label: 'Small label', value: 'Trust & reliability' },
  'trust.title': { group: 'Home page · Trust', label: 'Heading', value: 'Dependable' },
  'trust.em': { group: 'Home page · Trust', label: 'Heading, light part', value: 'by default' },
  'trust.sub': { group: 'Home page · Trust', label: 'Intro', long: true, value: 'Practical safeguards that keep your organisation’s records safe and your administrators informed.' },
  'company.eyebrow': { group: 'Home page · Company', label: 'Small label', value: 'Our company' },
  'company.title': { group: 'Home page · Company', label: 'Heading', value: 'Software that respects' },
  'company.em': { group: 'Home page · Company', label: 'Heading, light part', value: 'your time' },
  'company.p1': { group: 'Home page · Company', label: 'Paragraph 1', long: true, value: '{site} is built by a small team that believes organisations are made of conversations — and that those conversations deserve better tools than a folder of documents.' },
  'company.p2': { group: 'Home page · Company', label: 'Paragraph 2', long: true, value: 'Our mission is simple: make it effortless to hold a meeting, record what was decided and make sure it gets done, so people can spend their energy on the work itself rather than on administering it.' },
  'company.missionLabel': { group: 'Home page · Company', label: 'Mission label', value: 'Our mission' },
  'company.mission': { group: 'Home page · Company', label: 'Mission statement', long: true, value: 'Turn every meeting into clear decisions, owned tasks and visible progress.' },
  'company.believe': { group: 'Home page · Company', label: 'Values label', value: 'What we believe' },
  'faq.eyebrow': { group: 'Home page · FAQ', label: 'Small label', value: 'FAQ' },
  'faq.title': { group: 'Home page · FAQ', label: 'Heading', value: 'Questions,' },
  'faq.em': { group: 'Home page · FAQ', label: 'Heading, light part', value: 'answered' },
  'faq.sub': { group: 'Home page · FAQ', label: 'Intro', long: true, value: 'Can’t find what you need? Your organisation’s administrator can help with accounts and access.' },
  'cta.pre': { group: 'Home page · Closing banner', label: 'Heading, start', value: 'Ready for a' },
  'cta.em': { group: 'Home page · Closing banner', label: 'Heading, highlighted', value: 'calmer' },
  'cta.post': { group: 'Home page · Closing banner', label: 'Heading, end', value: 'workday?' },
  'cta.sub': { group: 'Home page · Closing banner', label: 'Sub-line', long: true, value: 'Sign in with your organisation’s account and pick up where you left off.' },
  'footer.tagline': { group: 'Home page · Footer', label: 'Tagline', long: true, value: 'Meeting, task and daily-work software for organisations that run on meetings.' },
  'footer.account': { group: 'Home page · Footer', label: 'Account note', long: true, value: 'Need an account? Ask your organisation’s administrator.' },
  'footer.rights': { group: 'Home page · Footer', label: 'Rights line', value: 'All rights reserved.' },
  'signin.signIn': { group: 'Sign-in screen', label: 'Heading, sign in', value: 'Welcome back' },
  'signin.newTo': { group: 'Sign-in screen', label: 'No-account note', value: 'New to {site}?' },
  'signin.ask': { group: 'Sign-in screen', label: 'Ask-admin link', value: 'Ask your administrator for access' },
  'insights.eyebrow': { group: 'App pages', label: 'Insights · small label', value: 'Insights' },
  'insights.title': { group: 'App pages', label: 'Insights · heading', value: 'Your numbers' },
  'worklog.title': { group: 'App pages', label: 'Work log · heading', value: 'Work log' },
  'worklog.sub': { group: 'App pages', label: 'Work log · sub-line', value: 'A calm two-minute wrap-up of your day.' },
  'tasks.title': { group: 'App pages', label: 'Tasks · heading', value: 'Tasks' },
  'tasks.new': { group: 'App pages', label: 'Tasks · new button', value: 'New task' },
  'meetings.empty.title': { group: 'App pages', label: 'Meetings · empty heading', value: 'Nothing on the calendar' },
  'meetings.empty.sub': { group: 'App pages', label: 'Meetings · empty text', long: true, value: 'Plan your next meeting or log one that just happened. Minutes take about a minute.' },
  'meetings.schedule': { group: 'App pages', label: 'Meetings · schedule button', value: 'Schedule a meeting' },
  'schedule.title': { group: 'App pages', label: 'Schedule · heading', value: 'Schedule a meeting' },
  'admin.eyebrow': { group: 'App pages', label: 'Admin · small label', value: 'Admin' },
  'admin.title': { group: 'App pages', label: 'Admin · heading', value: 'Control room' },
};

/* ───────── Merge saved config on top of the defaults ───────── */
const arr = <T,>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);
export const mergeCfg = (raw: Record<string, any> | null | undefined): SiteCfg => {
  const r = raw ?? {};
  const l = r.landing ?? {};
  return {
    texts: r.texts && typeof r.texts === 'object' ? r.texts : {},
    landing: {
      nav: arr(l.nav, D_NAV), problems: arr(l.problems, D_PROBLEMS), modules: arr(l.modules, D_MODULES), steps: arr(l.steps, D_STEPS),
      audiences: arr(l.audiences, D_AUDIENCES), trust: arr(l.trust, D_TRUST), values: arr(l.values, D_VALUES), faq: arr(l.faq, D_FAQ),
    },
    app: { nav: arr(r.app?.nav, D_APP_NAV) },
    theme: { ...DEFAULT_CFG.theme, ...(r.theme ?? {}) },
  };
};

interface Ctx { cfg: SiteCfg; refresh: () => Promise<void>; previewing: boolean; setPreview: (raw: Record<string, any> | null) => void }
const SiteCfgCtx = createContext<Ctx>({ cfg: DEFAULT_CFG, refresh: async () => {}, previewing: false, setPreview: () => {} });

const FONT: Record<SiteCfg['theme']['font'], string> = {
  outfit: '"Outfit", "Inter", ui-sans-serif, sans-serif',
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
};

export const SiteConfigProvider = ({ children }: { children: ReactNode }) => {
  const [published, setPublished] = useState<SiteCfg>(DEFAULT_CFG);
  const [preview, setPreviewRaw] = useState<SiteCfg | null>(null);

  const refresh = useCallback(async () => {
    try { setPublished(mergeCfg(await getSiteConfig())); } catch { /* keep the built-in content */ }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const cfg = preview ?? published;

  /* theme: glass strength and font, as CSS variables on the page */
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty('--glass', String(cfg.theme.glass));
    el.style.setProperty('--font-display', FONT[cfg.theme.font] ?? FONT.outfit);
  }, [cfg.theme.glass, cfg.theme.font]);

  const setPreview = useCallback((raw: Record<string, any> | null) => setPreviewRaw(raw ? mergeCfg(raw) : null), []);
  const value = useMemo(() => ({ cfg, refresh, previewing: !!preview, setPreview }), [cfg, refresh, preview, setPreview]);
  return <SiteCfgCtx.Provider value={value}>{children}</SiteCfgCtx.Provider>;
};

export const useSiteConfig = () => useContext(SiteCfgCtx);

/** t('key') gives the edited wording, or the built-in one. {site} becomes the site name. */
export const useT = () => {
  const { cfg } = useSiteConfig();
  const { siteName } = useBranding();
  return useCallback((key: string) => {
    const base = cfg.texts[key];
    const text = typeof base === 'string' && base !== '' ? base : TEXTS[key]?.value ?? key;
    return text.replace(/\{site\}/g, siteName);
  }, [cfg.texts, siteName]);
};
