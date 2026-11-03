import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adminDiscardSiteDraft, adminGetSiteDraft, adminPublishSite, adminSaveSiteDraft } from '../../../lib/api';
import { mergeCfg, useSiteConfig, type SiteCfg } from '../../../lib/siteConfig';
import { useToast } from '../../../lib/toast';

interface DraftApi {
  loading: boolean;
  error: string | null;
  cfg: SiteCfg;
  dirty: boolean;
  saving: boolean;
  publishedAt: string | null;
  previewing: boolean;
  setPreviewing: (on: boolean) => void;
  /** Set one section of the saved configuration, e.g. set('landing.faq', [...]). */
  set: (path: string, value: unknown) => void;
  publish: () => Promise<void>;
  discard: () => Promise<void>;
}
const Ctx = createContext<DraftApi | null>(null);
export const useDraft = () => { const c = useContext(Ctx); if (!c) throw new Error('useDraft outside DraftProvider'); return c; };

const setIn = (obj: Record<string, any>, path: string[], value: unknown): Record<string, any> => {
  const [head, ...rest] = path;
  return { ...obj, [head]: rest.length ? setIn(obj[head] && typeof obj[head] === 'object' ? obj[head] : {}, rest, value) : value };
};

/** Holds the draft being edited, saves it as you type, and drives the live preview. */
export const DraftProvider = ({ children }: { children: ReactNode }) => {
  const toast = useToast();
  const site = useSiteConfig();
  const [raw, setRaw] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(true);
  const latest = useRef<Record<string, any>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    adminGetSiteDraft()
      .then((d) => { latest.current = d.draft; setRaw(d.draft); setDirty(d.dirty); setPublishedAt(d.publishedAt); })
      .catch((e) => setError(e?.message || 'Could not load the draft.'));
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setSaving(true);
    try { const d = await adminSaveSiteDraft(latest.current); setDirty(d.dirty); setPublishedAt(d.publishedAt); }
    catch (e: any) { toast(e?.message || 'Could not save the draft.', 'error'); }
    finally { setSaving(false); }
  }, [toast]);

  const set = useCallback((path: string, value: unknown) => {
    latest.current = setIn(latest.current, path.split('.'), value);
    setRaw(latest.current);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 700);
  }, [flush]);

  /* the rest of the app shows the draft while previewing */
  useEffect(() => {
    if (previewing && raw) site.setPreview(raw); else site.setPreview(null);
  }, [previewing, raw, site.setPreview]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => site.setPreview(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = useCallback(async () => {
    try {
      if (timer.current) await flush();
      const d = await adminPublishSite();
      setDirty(d.dirty); setPublishedAt(d.publishedAt);
      await site.refresh();
      toast('Published. Everyone now sees these changes.');
    } catch (e: any) { toast(e?.message || 'Could not publish.', 'error'); }
  }, [flush, site, toast]);

  const discard = useCallback(async () => {
    try {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      const d = await adminDiscardSiteDraft();
      latest.current = d.draft; setRaw(d.draft); setDirty(d.dirty);
      toast('Draft discarded. Back to what is published.');
    } catch (e: any) { toast(e?.message || 'Could not discard.', 'error'); }
  }, [toast]);

  const cfg = useMemo(() => mergeCfg(raw), [raw]);
  const value: DraftApi = { loading: raw === null && !error, error, cfg, dirty, saving, publishedAt, previewing, setPreviewing, set, publish, discard };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
