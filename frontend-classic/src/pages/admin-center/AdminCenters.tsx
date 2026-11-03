import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getAllCentersAdmin, createCenter, updateCenter, deleteCenter, type CenterEntry } from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';
import { staggerContainer } from './kit/motion';

const AdminCenters = () => {
  const [centers, setCenters] = useState<CenterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setCenters(await getAllCentersAdmin());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createCenter(newName.trim());
      setNewName('');
      showMessage(`"${newName.trim()}" added — it now appears in the meeting form's center list.`);
      await load();
    } catch (err: any) {
      showMessage(err.message || 'Failed to add center.');
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (c: CenterEntry) => {
    try {
      await updateCenter(c.id, { isActive: !c.isActive });
      await load();
    } catch (err: any) {
      showMessage(err.message || 'Failed to update.');
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await updateCenter(id, { name: editValue });
      setEditingId(null);
      await load();
    } catch (err: any) {
      showMessage(err.message || 'Failed to rename.');
    }
  };

  const remove = async (c: CenterEntry) => {
    try {
      await deleteCenter(c.id);
      showMessage(`"${c.name}" removed.`);
      await load();
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete.');
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-10">
      <PageHeader
        title="Centers"
        subtitle="The list of centers/locations available across meeting forms. Add one here and it shows up for every user immediately — no code changes needed."
      />

      {message && (
        <GlassPanel className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">{message}</p>
        </GlassPanel>
      )}

      <GlassPanel className="p-5">
        <form onSubmit={add} className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Houston"
            className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add Center'}
          </button>
        </form>
      </GlassPanel>

      <GlassPanel className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : centers.length === 0 ? (
          <p className="text-sm text-slate-500 px-6 py-14 text-center">No centers yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {centers.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center flex-wrap sm:flex-nowrap justify-between gap-x-4 gap-y-2">
                {editingId === c.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditingId(null); }}
                    onBlur={() => saveEdit(c.id)}
                    className="flex-1 bg-white border border-slate-400 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                ) : (
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-sm font-semibold ${c.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{c.name}</span>
                    {!c.isActive && <Badge variant="neutral">Inactive</Badge>}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setEditingId(c.id); setEditValue(c.name); }} className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                    Rename
                  </button>
                  <button onClick={() => toggleActive(c)} className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(c)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-colors" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
};

export default AdminCenters;
