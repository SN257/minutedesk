import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  getRoles,
  type AdminUser,
  type RoleEntry,
} from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';
import { motion } from 'framer-motion';
import { staggerContainer } from './kit/motion';

type ModalMode = 'add' | 'edit' | null;

// Deterministic flat slate shade per user id — avoids a rainbow of hues while still
// giving each avatar some visual distinction.
const AVATAR_SHADES = ['bg-slate-700', 'bg-slate-600', 'bg-slate-800'];
const avatarShade = (id: string | number) => {
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return AVATAR_SHADES[Math.abs(hash) % AVATAR_SHADES.length];
};

const AdminUsers = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formLoading, setFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [roles, setRoles] = useState<RoleEntry[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRoles().then(setRoles).catch(() => {});
  }, []);

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminGetUsers();
      setUsers(data);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalMode(null);
        setDeleteTarget(null);
      }
    };
    if (modalMode || deleteTarget) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [modalMode, deleteTarget]);

  const openAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('user');
    setEditingUser(null);
    setModalMode('add');
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setFormName(u.name || '');
    setFormEmail(u.email);
    setFormRole(u.role || 'user');
    setFormPassword('');
    setModalMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (modalMode === 'add') {
        await adminCreateUser({ email: formEmail, password: formPassword, name: formName, role: formRole });
        showAlert('success', 'User created successfully.');
      } else if (modalMode === 'edit' && editingUser) {
        await adminUpdateUser(editingUser.id, { name: formName, email: formEmail, role: formRole });
        showAlert('success', 'User updated successfully.');
      }
      setModalMode(null);
      await fetchUsers();
    } catch (err: any) {
      showAlert('error', err.message || 'Operation failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminDeleteUser(deleteTarget.id);
      showAlert('success', `User "${deleteTarget.name || deleteTarget.email}" deleted.`);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return !q || (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const adminCount = users.filter((u) => u.role === 'super_admin').length;
  const userCount = users.filter((u) => u.role !== 'super_admin').length;

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5 pb-10">
      <PageHeader
        title="Users"
        subtitle={!loading ? `${users.length} account${users.length !== 1 ? 's' : ''} · ${adminCount} admin${adminCount !== 1 ? 's' : ''} · ${userCount} user${userCount !== 1 ? 's' : ''}` : undefined}
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        }
      />

      {alert && (
        <GlassPanel className={`px-4 py-3 flex items-center gap-2.5 ${alert.type === 'error' ? 'border-rose-200' : ''}`}>
          {alert.type === 'success'
            ? <svg className="w-4 h-4 flex-shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4 flex-shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          <span className="text-sm font-semibold text-slate-700">{alert.msg}</span>
        </GlassPanel>
      )}

      <GlassPanel className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-3">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <span className="text-sm">Loading users…</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-semibold text-sm text-slate-500">{searchQuery ? 'No users match your search' : 'No users found'}</p>
            {searchQuery && <p className="text-xs text-slate-400 mt-1">Try a different name or email</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">User</th>
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 hidden md:table-cell">Email</th>
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Role</th>
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 hidden lg:table-cell">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${i < filteredUsers.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        u.role === 'super_admin' ? 'bg-slate-900 text-white' : `${avatarShade(u.id)} text-white`
                      }`}>
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {u.name || <span className="text-slate-400 italic font-normal">No name</span>}
                          </span>
                          {u.id === user?.id && <Badge variant="navy">You</Badge>}
                        </div>
                        <span className="text-xs text-slate-500 md:hidden">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 hidden md:table-cell">{u.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={u.role === 'super_admin' ? 'navy' : 'neutral'}>{roles.find((r) => r.key === u.role)?.label || u.role}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs hidden lg:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(u)} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        Edit
                      </button>
                      {u.id !== user?.id && (
                        <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors" title="Delete user">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </GlassPanel>

      {/* Add / Edit drawer */}
      {modalMode && typeof document !== 'undefined' && document.body && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setModalMode(null)} />
          <div ref={modalRef} className="fixed top-0 right-0 h-screen w-full max-w-[460px] bg-white border-l border-slate-200 flex flex-col shadow-2xl animate-slide-in-right overflow-hidden z-[101]">
            <div className="flex items-center justify-between px-5 h-13 py-3 border-b border-slate-200 flex-shrink-0">
              <button type="button" onClick={() => setModalMode(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Cancel
              </button>
              <span className="text-sm font-bold text-slate-900">{modalMode === 'add' ? 'New User' : 'Edit User'}</span>
              <button
                type="submit"
                form="user-drawer-form"
                disabled={formLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {formLoading ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {modalMode === 'add' ? 'Creating…' : 'Saving…'}
                  </span>
                ) : modalMode === 'add' ? 'Create' : 'Save'}
              </button>
            </div>

            <div className="relative flex flex-col items-center pt-10 pb-8 px-8 flex-shrink-0 overflow-hidden bg-slate-50 border-b border-slate-200">
              <div className="relative z-10 mb-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-sm bg-slate-900">
                  {formName ? formName.charAt(0).toUpperCase() : modalMode === 'add' ? (
                    <svg className="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (editingUser?.name || editingUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-50 bg-emerald-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>
              </div>

              <div className="relative z-10 text-center">
                <p className="text-slate-900 font-bold text-lg leading-tight">{formName || (modalMode === 'add' ? 'New User' : editingUser?.name || 'User')}</p>
                <p className="text-slate-500 text-xs mt-1 font-medium">{formEmail || (modalMode === 'edit' ? editingUser?.email : 'No email yet')}</p>
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-bold border bg-white text-slate-600 border-slate-200">
                  {formRole === 'super_admin' ? '★ ' : '● '}{roles.find((r) => r.key === formRole)?.label || formRole}
                </div>
              </div>
            </div>

            <form id="user-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 pt-7 pb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-5">Identity</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-0 pb-2.5 border-0 border-b-2 border-slate-200 bg-transparent text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">
                      Email Address <span className="text-rose-600 font-normal normal-case">— required</span>
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="user@company.com"
                      required
                      className="w-full px-0 pb-2.5 border-0 border-b-2 border-slate-200 bg-transparent text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {modalMode === 'add' && (
                <div className="px-6 pt-7 pb-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-5">Security</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">
                      Password <span className="text-rose-600 font-normal normal-case">— required, min 6 chars</span>
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-0 pb-2.5 border-0 border-b-2 border-slate-200 bg-transparent text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="px-6 pt-7 pb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-4">Access Level</p>
                <div className="space-y-3">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormRole(r.key)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${formRole === r.key ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${formRole === r.key ? 'bg-slate-900' : 'bg-slate-100'}`}>
                        <svg className={`w-5 h-5 ${formRole === r.key ? 'text-white' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {r.key === 'super_admin' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          )}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900">{r.label}</p>
                        <p className="text-xs mt-0.5 text-slate-500">{r.description || (r.isSystem ? '' : 'Custom role')}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${formRole === r.key ? 'border-slate-900 bg-slate-900' : 'border-slate-300'}`}>
                        {formRole === r.key && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </>, document.body
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <GlassPanel className="w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete User</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to delete <strong className="text-slate-700">{deleteTarget.name || deleteTarget.email}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg font-semibold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </span>
                  ) : 'Delete'}
                </button>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </motion.div>
  );
};

export default AdminUsers;
