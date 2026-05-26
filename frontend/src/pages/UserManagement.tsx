import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  type AdminUser,
} from '../services/api';

type ModalMode = 'add' | 'edit' | null;

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'super_admin', label: 'Super Admin' },
];

const UserManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formLoading, setFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Guard – only super_admin can access this page
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/user-dashboard');
    }
  }, [user, navigate]);

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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close modal on outside click
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
    <div className="space-y-5 pb-8">
      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute -top-8 -right-8 w-56 h-56 bg-slate-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-32 h-32 bg-slate-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between px-7 py-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Admin Console</span>
              <span className="text-slate-700 text-xs">·</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Users</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">User Management</h1>
            {!loading && (
              <p className="text-slate-400 text-xs mt-1.5 font-medium">
                {users.length} account{users.length !== 1 ? 's' : ''}
                <span className="mx-2 text-slate-700">·</span>
                <span className="text-slate-300">{adminCount} admin{adminCount !== 1 ? 's' : ''}</span>
                <span className="mx-2 text-slate-700">·</span>
                {userCount} user{userCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 active:scale-95 transition-all shadow-sm flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold border flex items-center gap-2.5 ${
          alert.type === 'success'
            ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
        }`}>
          {alert.type === 'success'
            ? <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {alert.msg}
        </div>
      )}

      {/* ── Users Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Search bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 dark:border-slate-700 dark:border-t-slate-400 rounded-full animate-spin" />
            <span className="text-sm">Loading users…</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-semibold text-sm text-slate-500">{searchQuery ? 'No users match your search' : 'No users found'}</p>
            {searchQuery && <p className="text-xs text-slate-400 mt-1">Try a different name or email</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">User</th>
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 hidden md:table-cell">Email</th>
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Role</th>
                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 hidden lg:table-cell">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                    i < filteredUsers.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/60' : ''
                  }`}
                >
                  {/* User */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        u.role === 'super_admin'
                          ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {u.name || <span className="text-slate-400 italic font-normal">No name</span>}
                          </span>
                          {u.id === user?.id && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">You</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 md:hidden">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">{u.email}</td>
                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      u.role === 'super_admin'
                        ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-slate-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {u.role === 'super_admin' ? (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          Super Admin
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                          User
                        </>
                      )}
                    </span>
                  </td>
                  {/* Joined */}
                  <td className="px-6 py-4 text-slate-400 dark:text-slate-500 text-xs hidden lg:table-cell">{formatDate(u.createdAt)}</td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete user"
                        >
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
        )}

        {/* Footer */}
        {!loading && filteredUsers.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {searchQuery ? `${filteredUsers.length} of ${users.length}` : users.length} user{users.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                {userCount} user{userCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                {adminCount} admin{adminCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal — right-side drawer (portalled to body to escape AppLayout stacking context) */}
      {modalMode && typeof document !== 'undefined' && document.body && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={() => setModalMode(null)} />

          {/* Drawer — fixed to full viewport height */}
          <div
            ref={modalRef}
            className="fixed top-0 right-0 h-screen w-full max-w-[460px] bg-white dark:bg-[#0d1117] flex flex-col shadow-2xl animate-slide-in-right overflow-hidden z-[101]"
          >
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-5 h-13 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Cancel
              </button>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {modalMode === 'add' ? 'New User' : 'Edit User'}
              </span>
              <button
                type="submit"
                form="user-drawer-form"
                disabled={formLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-700 dark:hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {formLoading ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
                    {modalMode === 'add' ? 'Creating…' : 'Saving…'}
                  </span>
                ) : modalMode === 'add' ? 'Create' : 'Save'}
              </button>
            </div>

            {/* ── Avatar hero ── */}
            <div className="relative flex flex-col items-center pt-10 pb-8 px-8 flex-shrink-0 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
              {/* Background grid dots */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              {/* Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl opacity-20 bg-slate-400" />

              {/* Avatar */}
              <div className="relative z-10 mb-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-2xl ring-4 ring-white/10 bg-gradient-to-br from-slate-600 to-slate-800">
                  {formName ? formName.charAt(0).toUpperCase() : modalMode === 'add' ? (
                    <svg className="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (editingUser?.name || editingUser?.email || 'U').charAt(0).toUpperCase()}
                </div>
                {/* Status dot */}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 bg-slate-400 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>
              </div>

              {/* Name + email */}
              <div className="relative z-10 text-center">
                <p className="text-white font-bold text-lg leading-tight">
                  {formName || (modalMode === 'add' ? 'New User' : editingUser?.name || 'User')}
                </p>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  {formEmail || (modalMode === 'edit' ? editingUser?.email : 'No email yet')}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-bold border bg-white/10 text-slate-300 border-white/15">
                  {formRole === 'super_admin' ? '★ Super Admin' : '● User'}
                </div>
              </div>
            </div>

            {/* ── Scrollable form ── */}
            <form id="user-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">

              {/* Identity */}
              <div className="px-6 pt-7 pb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-5">Identity</p>
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-0 pb-2.5 border-0 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm font-medium placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-slate-800 dark:focus:border-slate-300 transition-colors"
                    />
                  </div>
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      Email Address <span className="text-red-400 font-normal normal-case">— required</span>
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="user@company.com"
                      required
                      className="w-full px-0 pb-2.5 border-0 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm font-medium placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-slate-800 dark:focus:border-slate-300 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Security — add only */}
              {modalMode === 'add' && (
                <div className="px-6 pt-7 pb-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-5">Security</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      Password <span className="text-red-400 font-normal normal-case">— required, min 6 chars</span>
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-0 pb-2.5 border-0 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-slate-800 dark:focus:border-slate-300 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Access level */}
              <div className="px-6 pt-7 pb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-4">Access Level</p>
                <div className="space-y-3">

                  {/* User */}
                  <button
                    type="button"
                    onClick={() => setFormRole('user')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${formRole === 'user' ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-transparent'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${formRole === 'user' ? 'bg-white/10 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <svg className={`w-5 h-5 ${formRole === 'user' ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${formRole === 'user' ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>User</p>
                      <p className={`text-xs mt-0.5 ${formRole === 'user' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400'}`}>View and manage own data across all modules</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${formRole === 'user' ? 'border-white/50 bg-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {formRole === 'user' && <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </button>

                  {/* Super Admin */}
                  <button
                    type="button"
                    onClick={() => setFormRole('super_admin')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${formRole === 'super_admin' ? 'border-slate-700 dark:border-slate-200 bg-slate-800 dark:bg-slate-200' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-transparent'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${formRole === 'super_admin' ? 'bg-white/10 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <svg className={`w-5 h-5 ${formRole === 'super_admin' ? 'text-white dark:text-slate-800' : 'text-slate-500 dark:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${formRole === 'super_admin' ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>Super Admin</p>
                      <p className={`text-xs mt-0.5 ${formRole === 'super_admin' ? 'text-slate-400 dark:text-slate-600' : 'text-slate-400'}`}>Full platform access — manage users, data & settings</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${formRole === 'super_admin' ? 'border-white/50 bg-white dark:border-slate-900/50 dark:bg-slate-900' : 'border-slate-300 dark:border-slate-600'}`}>
                      {formRole === 'super_admin' && <svg className="w-3 h-3 text-slate-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>, document.body
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete User</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete <strong className="text-slate-700 dark:text-slate-300">{deleteTarget.name || deleteTarget.email}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
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
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
