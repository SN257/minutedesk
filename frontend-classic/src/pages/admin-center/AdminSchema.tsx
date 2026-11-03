import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  getSchemaTables,
  getSchemaColumns,
  createSchemaTable,
  dropSchemaTable,
  addSchemaColumn,
  dropSchemaColumn,
  getSchemaRows,
  createSchemaRow,
  updateSchemaRow,
  deleteSchemaRow,
  type SchemaTableSummary,
  type SchemaColumn,
  type NewColumnInput,
} from '../../services/api';
import GlassPanel from './kit/GlassPanel';
import PageHeader from './kit/PageHeader';
import Badge from './kit/Badge';
import { staggerContainer } from './kit/motion';

const COLUMN_TYPES = ['text', 'varchar', 'integer', 'bigint', 'boolean', 'timestamp', 'date', 'numeric', 'uuid', 'jsonb'];

const emptyColumn = (): NewColumnInput => ({ name: '', type: 'text', nullable: true, defaultValue: '' });

const AdminSchema = () => {
  const [tables, setTables] = useState<SchemaTableSummary[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [columns, setColumns] = useState<SchemaColumn[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumn, setNewColumn] = useState<NewColumnInput>(emptyColumn());
  const [savingColumn, setSavingColumn] = useState(false);

  const [showCreateTable, setShowCreateTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableColumns, setNewTableColumns] = useState<NewColumnInput[]>([emptyColumn()]);
  const [savingTable, setSavingTable] = useState(false);

  const [newRow, setNewRow] = useState<Record<string, string>>({});
  const [savingRow, setSavingRow] = useState(false);

  const selectedSummary = tables.find((t) => t.name === selected);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 5000);
  };

  const loadTables = async () => {
    setLoadingTables(true);
    try {
      setTables(await getSchemaTables());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => { loadTables(); }, []);

  const openTable = async (name: string) => {
    setSelected(name);
    setLoadingDetail(true);
    setShowAddColumn(false);
    try {
      const cols = await getSchemaColumns(name);
      setColumns(cols);
      const isCustom = tables.find((t) => t.name === name)?.isCustom;
      if (isCustom) {
        const { rows: r } = await getSchemaRows(name);
        setRows(r);
      } else {
        setRows([]);
      }
    } catch (err: any) {
      showMessage(err.message || 'Failed to load table.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const submitAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newColumn.name.trim()) return;
    setSavingColumn(true);
    try {
      const cols = await addSchemaColumn(selected, newColumn);
      setColumns(cols);
      setNewColumn(emptyColumn());
      setShowAddColumn(false);
      showMessage(`Column "${newColumn.name}" added to "${selected}".`);
      await loadTables();
    } catch (err: any) {
      showMessage(err.message || 'Failed to add column.');
    } finally {
      setSavingColumn(false);
    }
  };

  const removeColumn = async (colName: string) => {
    if (!selected) return;
    if (!confirm(`Drop column "${colName}" from "${selected}"? This permanently deletes that data.`)) return;
    try {
      const cols = await dropSchemaColumn(selected, colName);
      setColumns(cols);
      showMessage(`Column "${colName}" dropped.`);
    } catch (err: any) {
      showMessage(err.message || 'Failed to drop column.');
    }
  };

  const submitCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim() || newTableColumns.some((c) => !c.name.trim())) return;
    setSavingTable(true);
    try {
      await createSchemaTable(newTableName.trim(), newTableColumns);
      showMessage(`Table "${newTableName.trim()}" created.`);
      setShowCreateTable(false);
      setNewTableName('');
      setNewTableColumns([emptyColumn()]);
      await loadTables();
    } catch (err: any) {
      showMessage(err.message || 'Failed to create table.');
    } finally {
      setSavingTable(false);
    }
  };

  const removeTable = async () => {
    if (!selected) return;
    if (!confirm(`Permanently drop table "${selected}" and all its data? This cannot be undone.`)) return;
    try {
      await dropSchemaTable(selected);
      showMessage(`Table "${selected}" dropped.`);
      setSelected(null);
      await loadTables();
    } catch (err: any) {
      showMessage(err.message || 'Failed to drop table.');
    }
  };

  const submitAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSavingRow(true);
    try {
      await createSchemaRow(selected, newRow);
      setNewRow({});
      const { rows: r } = await getSchemaRows(selected);
      setRows(r);
    } catch (err: any) {
      showMessage(err.message || 'Failed to add row.');
    } finally {
      setSavingRow(false);
    }
  };

  const removeRow = async (id: string) => {
    if (!selected) return;
    try {
      await deleteSchemaRow(selected, id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete row.');
    }
  };

  const updateCell = async (id: string, colName: string, value: string) => {
    if (!selected) return;
    try {
      const updated = await updateSchemaRow(selected, id, { [colName]: value });
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: any) {
      showMessage(err.message || 'Failed to update row.');
    }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 pb-10">
      <PageHeader
        title="Database Schema"
        subtitle="Add columns to any table, or create brand-new tables with their own data grid — changes apply to the live database immediately."
        actions={
          <button
            onClick={() => setShowCreateTable(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            + Create Table
          </button>
        }
      />

      <GlassPanel className="px-5 py-4 border-amber-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-amber-700">This changes the live database schema directly.</strong> You can add columns to any table, including
            built-in ones — but new columns on built-in tables won't automatically appear in the app's existing forms (a developer still needs to wire
            them in). Tables you create <em>here</em> get a full row browser below. Dropping columns/tables is only allowed for tables created in this
            Schema Manager, to protect the app's core data.
          </p>
        </div>
      </GlassPanel>

      {message && (
        <GlassPanel className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{message}</p>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table list */}
        <GlassPanel className="lg:col-span-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Tables</h2>
          </div>
          {loadingTables ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {tables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => openTable(t.name)}
                  className={`w-full text-left px-5 py-3 flex items-center justify-between gap-2 transition-colors ${selected === t.name ? 'bg-slate-900' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-mono font-semibold truncate ${selected === t.name ? 'text-white' : 'text-slate-900'}`}>{t.name}</p>
                    <p className={`text-[11px] ${selected === t.name ? 'text-slate-300' : 'text-slate-500'}`}>~{t.approxRows.toLocaleString()} rows</p>
                  </div>
                  {t.isCustom && (
                    selected === t.name
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-white/10 text-white border-white/20">Custom</span>
                      : <Badge variant="navy">Custom</Badge>
                  )}
                  {t.isProtected && <Badge variant="danger">Protected</Badge>}
                </button>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* Table detail */}
        <div className="lg:col-span-2 space-y-6">
          {!selected ? (
            <GlassPanel className="py-20 text-center">
              <p className="text-sm text-slate-500">Select a table to view its columns.</p>
            </GlassPanel>
          ) : loadingDetail ? (
            <GlassPanel className="py-20 text-center">
              <div className="w-6 h-6 mx-auto border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </GlassPanel>
          ) : (
            <>
              <GlassPanel className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-black text-slate-900 font-mono">{selected}</h2>
                  <div className="flex items-center gap-2">
                    {!selectedSummary?.isProtected && (
                      <button onClick={() => setShowAddColumn((v) => !v)} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        + Add Column
                      </button>
                    )}
                    {selectedSummary?.isCustom && (
                      <button onClick={removeTable} className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors">
                        Drop Table
                      </button>
                    )}
                  </div>
                </div>

                {showAddColumn && (
                  <form onSubmit={submitAddColumn} className="px-5 py-4 border-b border-slate-100 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <input
                      value={newColumn.name}
                      onChange={(e) => setNewColumn((c) => ({ ...c, name: e.target.value }))}
                      placeholder="column_name"
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-mono"
                    />
                    <select
                      value={newColumn.type}
                      onChange={(e) => setNewColumn((c) => ({ ...c, type: e.target.value }))}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    >
                      {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      value={newColumn.defaultValue}
                      onChange={(e) => setNewColumn((c) => ({ ...c, defaultValue: e.target.value }))}
                      placeholder="default (optional)"
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={!newColumn.nullable} onChange={(e) => setNewColumn((c) => ({ ...c, nullable: !e.target.checked }))} />
                        Required
                      </label>
                      <button type="submit" disabled={savingColumn} className="ml-auto px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
                        {savingColumn ? '…' : 'Add'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 whitespace-nowrap">Column</th>
                        <th className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 whitespace-nowrap">Type</th>
                        <th className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 whitespace-nowrap">Nullable</th>
                        <th className="px-5 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((c) => (
                        <tr key={c.name} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-5 py-2.5 font-mono text-slate-700 whitespace-nowrap">{c.name}</td>
                          <td className="px-5 py-2.5 whitespace-nowrap"><Badge variant="info">{c.type}</Badge></td>
                          <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">{c.nullable ? 'yes' : 'no'}</td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            {selectedSummary?.isCustom && !['id', 'createdAt'].includes(c.name) && (
                              <button onClick={() => removeColumn(c.name)} className="text-slate-500 hover:text-rose-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>

              {selectedSummary?.isCustom && (
                <GlassPanel className="overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Rows ({rows.length})</h2>
                  </div>

                  <form onSubmit={submitAddRow} className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-2 items-end">
                    {columns.filter((c) => !['id', 'createdAt'].includes(c.name)).map((c) => (
                      <div key={c.name} className="flex-1 min-w-[120px]">
                        <label className="block text-[10px] text-slate-500 mb-1 font-mono">{c.name}</label>
                        <input
                          value={newRow[c.name] || ''}
                          onChange={(e) => setNewRow((r) => ({ ...r, [c.name]: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    ))}
                    <button type="submit" disabled={savingRow} className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
                      {savingRow ? 'Adding…' : '+ Add Row'}
                    </button>
                  </form>

                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500 px-5 py-10 text-center">No rows yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            {columns.map((c) => <th key={c.name} className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 whitespace-nowrap">{c.name}</th>)}
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                              {columns.map((c) => (
                                <td key={c.name} className="px-4 py-2 whitespace-nowrap">
                                  {['id', 'createdAt'].includes(c.name) ? (
                                    <span className="text-xs text-slate-500 font-mono">{String(r[c.name]).slice(0, 20)}</span>
                                  ) : (
                                    <input
                                      defaultValue={r[c.name] ?? ''}
                                      onBlur={(e) => { if (e.target.value !== String(r[c.name] ?? '')) updateCell(r.id, c.name, e.target.value); }}
                                      className="bg-transparent text-xs text-slate-700 focus:outline-none focus:bg-slate-100 rounded px-1 py-0.5 w-full min-w-[80px]"
                                    />
                                  )}
                                </td>
                              ))}
                              <td className="px-4 py-2 text-right">
                                <button onClick={() => removeRow(r.id)} className="text-slate-500 hover:text-rose-600 transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassPanel>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create table modal */}
      {showCreateTable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <GlassPanel className="w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Table</h3>
            <form onSubmit={submitCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Table Name</label>
                <input
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g. equipment_inventory"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">lowercase letters, numbers, underscores only. An "id" and "createdAt" column are added automatically.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Columns</label>
                <div className="space-y-2">
                  {newTableColumns.map((col, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={col.name}
                        onChange={(e) => setNewTableColumns((cols) => cols.map((c, idx) => (idx === i ? { ...c, name: e.target.value } : c)))}
                        placeholder="column_name"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-mono"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => setNewTableColumns((cols) => cols.map((c, idx) => (idx === i ? { ...c, type: e.target.value } : c)))}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                      >
                        {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {newTableColumns.length > 1 && (
                        <button type="button" onClick={() => setNewTableColumns((cols) => cols.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-rose-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewTableColumns((cols) => [...cols, emptyColumn()])}
                  className="mt-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  + Add another column
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateTable(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTable || !newTableName.trim()}
                  className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {savingTable ? 'Creating…' : 'Create Table'}
                </button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}
    </motion.div>
  );
};

export default AdminSchema;
