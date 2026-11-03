import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAppSettings } from './api';

interface Branding { siteName: string; logoUrl?: string; faviconUrl?: string; primaryColor: string; refresh: () => Promise<void> }

const DEFAULT_NAME = 'Minutedesk';
const DEFAULT_COLOR = '#253745';
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const Ctx = createContext<Branding>({ siteName: DEFAULT_NAME, primaryColor: DEFAULT_COLOR, refresh: async () => {} });

/** Site-wide branding set by a super admin: name, logo, favicon and accent colour. Public, so it applies on the sign-in screen too. */
export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [s, setS] = useState<{ siteName: string; logoUrl?: string; faviconUrl?: string; primaryColor: string }>({ siteName: DEFAULT_NAME, primaryColor: DEFAULT_COLOR });

  const refresh = useCallback(async () => {
    try {
      const d = await getAppSettings();
      setS({ siteName: d.siteName || DEFAULT_NAME, logoUrl: d.logoUrl || undefined, faviconUrl: d.faviconUrl || undefined, primaryColor: HEX.test(d.primaryColor || '') ? d.primaryColor : DEFAULT_COLOR });
    } catch { /* keep the defaults */ }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    document.title = `${s.siteName} — meetings, tasks and daily work in one flow`;
    const own = document.querySelector<HTMLLinkElement>('link[data-brand-icon]');
    if (s.faviconUrl) {
      const link = own ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
      link.setAttribute('data-brand-icon', '');
      link.href = s.faviconUrl;
    } else own?.remove();

    let tag = document.getElementById('brand-accent') as HTMLStyleElement | null;
    if (s.primaryColor.toLowerCase() === DEFAULT_COLOR) { tag?.remove(); return; }
    if (!tag) { tag = document.createElement('style'); tag.id = 'brand-accent'; document.head.appendChild(tag); }
    const c = s.primaryColor;
    const mix = (p: number, over: string) => `color-mix(in srgb,${c} ${p}%,${over})`;
    tag.textContent = `
.app-light{--brand-accent:${c};--color-brand:${mix(80, '#06141b')};--color-brand-soft:${mix(14, 'white')};--color-ink:${mix(22, '#06141b')};--color-char:${mix(22, '#06141b')};--color-ink-2:${mix(30, '#11212d')};--color-muted:${mix(24, '#4a5c6a')}}
.app-light .liquid,.app-light .glass{background:linear-gradient(145deg,${mix(11, 'rgb(255 255 255/calc(.62*var(--glass,1)))')},${mix(6, 'rgb(255 255 255/calc(.26*var(--glass,1)))')});border-color:${mix(14, 'rgb(255 255 255/.78)')}}
.app-light .glass-chrome{background:linear-gradient(145deg,${mix(12, 'rgb(255 255 255/calc(.62*var(--glass,1)))')},${mix(6, 'rgb(255 255 255/calc(.26*var(--glass,1)))')})}
.app-dark{--brand-accent:${c};--color-brand:${mix(45, 'white')};--color-brand-soft:${mix(30, '#06141b')};--color-ink:${mix(10, '#ccd0cf')};--color-char:${mix(10, '#ccd0cf')}}
.app-dark .liquid,.app-dark .glass{background:linear-gradient(145deg,${mix(22, 'rgb(255 255 255/calc(.10*var(--glass,1)))')},${mix(10, 'rgb(255 255 255/calc(.035*var(--glass,1)))')});border-color:${mix(26, 'rgb(255 255 255/.14)')}}`;
  }, [s]);

  /* a logo that fails to load (a page link instead of an image, say) falls back to the default letter */
  const [okLogo, setOkLogo] = useState<string | undefined>();
  useEffect(() => {
    setOkLogo(undefined);
    if (!s.logoUrl) return;
    const img = new Image();
    img.onload = () => setOkLogo(s.logoUrl);
    img.src = s.logoUrl;
    return () => { img.onload = null; };
  }, [s.logoUrl]);

  const value = useMemo(() => ({ ...s, logoUrl: okLogo, refresh }), [s, okLogo, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useBranding = () => useContext(Ctx);
