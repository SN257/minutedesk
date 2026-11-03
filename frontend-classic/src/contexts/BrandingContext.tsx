import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getAppSettings } from '../services/api';

interface BrandingState {
  siteName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
}

interface BrandingContextType extends BrandingState {
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULTS: BrandingState = { siteName: 'Nexus', primaryColor: '#1e293b' };

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Site-wide branding (name, logo, color, favicon) set by a super admin in the
// Admin Center and applied everywhere — including the logged-out login page.
export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<BrandingState>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      setBranding({
        siteName: settings.siteName || DEFAULTS.siteName,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        primaryColor: settings.primaryColor || DEFAULTS.primaryColor,
      });
    } catch {
      setBranding(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    document.title = branding.siteName;
    document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);

    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ ...branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within a BrandingProvider');
  return ctx;
};
