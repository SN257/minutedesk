import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getRoles, createRole, updateRole, deleteRole, type RoleEntry } from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';
import { staggerContainer } from './kit/motion';

const AdminRoles = () => {
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRoles(await getRoles());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 5000);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newLabel.trim()) return;
    setAdding(true);
    try {
      await createRole({ key: newKey, label: newLabel, description: newDescription || undefined });
      setNewKey('');
      setNewLabel('');
      setNewDescription('');
      showMessage(`"${newLabel}" added — it's now selectable on the Users page.`);
      await load();
    } catch (err: any) {
      showMessage(err.message || 'Failed to add role.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (r: RoleEntry) => {
    try {
      await deleteRole(r.id);
      showMessage(`"${r.label}" removed.`);
      await load();
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete role.');
    }
  };

  const rename = async (r: RoleEntry, label: string) => {
    try {
      await updateRole(r.id, { label });
      await load();
    } catch (err: any) {
      showMessage(err.message || 'Failed to rename.');
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-10">
      <PageHeader title="Roles" subtitle="The list of roles assignable to users, managed here instead of hardcoded in the app." />

      <GlassPanel className="px-5 py-4 border-amber-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-amber-700">Scope of what a custom role does today:</strong> only the built-in <strong>Super Admin</strong> role
            unlocks the Admin Center — any role you add here (e.g. "Manager") is selectable and shows up everywhere a role is displayed, but
            behaves like a standard <strong>User</strong> for permissions until specific access rules are built for it.
          </p>
        </div>
      </GlassPanel>

      {message && (
        <GlassPanel className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">{message}</p>
        </GlassPanel>
      )}

      <GlassPanel className="p-5">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="key (e.g. manager)"
            className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-mono"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Manager)"
            className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
          <button
            type="submit"
            disabled={adding || !newKey.trim() || !newLabel.trim()}
            className="sm:col-span-3 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add Role'}
          </button>
        </form>
      </GlassPanel>

      <GlassPanel className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {roles.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-slate-900">{r.label}</p>
                    <Badge variant={r.isSystem ? 'navy' : 'neutral'}>{r.key}</Badge>
                    {r.isSystem && <Badge variant="neutral">System</Badge>}
                  </div>
                  {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                </div>
                {!r.isSystem && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        const next = prompt('New label', r.label);
                        if (next && next.trim()) rename(r, next.trim());
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Rename
                    </button>
                    <button onClick={() => remove(r)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
};

export default AdminRoles;
