import { useState } from 'react';
import { updateAppSettings } from '../../services/api';
import { useBranding } from '../../contexts/BrandingContext';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';

const AdminBranding = () => {
  const branding = useBranding();
  const [siteName, setSiteName] = useState(branding.siteName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(branding.faviconUrl || '');
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateAppSettings({ siteName, logoUrl: logoUrl || undefined, faviconUrl: faviconUrl || undefined, primaryColor });
      await branding.refresh();
      setMessage('Branding updated — applied site-wide immediately.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to update branding.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Branding" subtitle="Site name, logo, favicon and accent color — no redeploy needed, changes apply as soon as you save." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <GlassPanel className="p-6">
          {message && (
            <div className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-5">
              {message}
            </div>
          )}
          <form onSubmit={save} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Site Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">Shown in the browser tab, login screen, and workspace sidebar.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…/logo.png"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Favicon URL</label>
              <input
                type="url"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://…/favicon.ico"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Used as the accent color for key highlights across the app.</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving…' : 'Save Branding'}
            </button>
          </form>
        </GlassPanel>

        {/* Live preview */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 px-1">Live Preview</p>

          {/* Mini login card preview */}
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-8 flex flex-col items-center text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, #0f172a)` }}>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3 overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} /> : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </div>
              <p className="text-white font-black text-lg">{siteName || 'Site Name'}</p>
              <p className="text-white/60 text-xs mt-1">Login screen preview</p>
            </div>
            <div className="bg-[#0d0d16] p-4">
              <div className="h-2 w-1/2 bg-white/10 rounded mb-2" />
              <div className="h-8 bg-white/5 rounded-lg border border-white/10" />
            </div>
          </div>

          {/* Mini sidebar preview */}
          <GlassPanel className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} /> : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
              </div>
              <span className="text-white font-bold text-sm">{siteName || 'Site Name'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Workspace sidebar preview</p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

export default AdminBranding;
