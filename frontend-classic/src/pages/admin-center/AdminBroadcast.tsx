import { useEffect, useState } from 'react';
import { getBroadcastHistory, sendBroadcast, type BroadcastEntry } from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';

const AUDIENCES: { value: 'all' | 'user' | 'super_admin'; label: string; desc: string }[] = [
  { value: 'all', label: 'Everyone', desc: 'All accounts, regardless of role' },
  { value: 'user', label: 'Users only', desc: 'Excludes super admins' },
  { value: 'super_admin', label: 'Super admins only', desc: 'Just the admin team' },
];

const AdminBroadcast = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'user' | 'super_admin'>('all');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<BroadcastEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setHistory(await getBroadcastHistory());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const result = await sendBroadcast({ title, body: body || undefined, audience });
      setMessage(`Sent to ${result.recipientCount} user${result.recipientCount === 1 ? '' : 's'}.`);
      setTitle('');
      setBody('');
      await load();
    } catch (err: any) {
      setMessage(err.message || 'Failed to send broadcast.');
    } finally {
      setSending(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Broadcast" subtitle="Send a notification (in-app + email) to every user, or a specific group, in one shot." />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <GlassPanel className="lg:col-span-2 p-6">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Scheduled maintenance tonight"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Optional details…"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Audience</label>
              <div className="space-y-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAudience(a.value)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-left transition-colors ${
                      audience === a.value ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                      <p className="text-[11px] text-slate-500">{a.desc}</p>
                    </div>
                    {audience === a.value && (
                      <svg className="w-4 h-4 text-slate-900 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <div className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !title.trim()}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {sending ? 'Sending…' : 'Send Broadcast'}
            </button>
          </form>
        </GlassPanel>

        <GlassPanel className="lg:col-span-3 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">History</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500 px-5 py-12 text-center">No broadcasts sent yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {history.map((b) => (
                <div key={b.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="navy">{b.audience === 'all' ? 'Everyone' : b.audience === 'user' ? 'Users' : 'Super Admins'}</Badge>
                    <span className="text-[11px] text-slate-500">{b.recipientCount} recipient{b.recipientCount === 1 ? '' : 's'}</span>
                    <span className="text-[11px] text-slate-400">·</span>
                    <span className="text-[11px] text-slate-500">{new Date(b.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900">{b.title}</p>
                  {b.body && <p className="text-xs text-slate-500 mt-0.5">{b.body}</p>}
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default AdminBroadcast;
