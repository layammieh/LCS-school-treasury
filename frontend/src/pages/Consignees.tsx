import { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  Plus,
  Filter,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  Search,
  Loader2
} from 'lucide-react';
import { consigneesApi } from '../lib/api';
import type { Consignee } from '../lib/api';
import { useSchoolYearStore } from '../store/schoolYearStore';
import { DeleteModal } from '../components/DeleteModal';
import { useAuthStore } from '../store/authStore';

export default function Consignees() {
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const isViewMode = useAuthStore(state => state.isViewMode);
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteItemName, setDeleteItemName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    vendor_name: '',
    stall_no: '',
    contact_person: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    date_registered: new Date().toISOString().slice(0, 10),
  });

  const PAGE_SIZE = 20;

  const activeCount = consignees.filter(c => c.status === 'active').length;
  const inactiveCount = consignees.filter(c => c.status === 'inactive').length;

  const filteredConsignees = consignees.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch = c.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function loadData(p = 1) {
    setLoading(true);
    consigneesApi.list({ schoolYear, page: p })
      .then(res => { setConsignees(res.results); setCount(res.count); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(page); }, [page, schoolYear]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // Set contact_person to vendor_name so backend models (non-null field) are satisfied
      const payload = { ...form, contact_person: form.vendor_name, school_year: schoolYear };

      console.log('Saving consignee with payload:', payload);

      if (editingId !== null) {
        await consigneesApi.update(editingId, payload);
      } else {
        await consigneesApi.create(payload);
      }
      closeModal();
      loadData(page);
    } catch (e: any) {
      console.error('Error saving consignee:', e);
      alert(e.message || JSON.stringify(e));
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(id: number, name: string) {
    setDeleteItemId(id);
    setDeleteItemName(name);
    setDeleteModalOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteItemId) return;
    setIsDeleting(true);
    try {
      await consigneesApi.delete(deleteItemId);
      setDeleteModalOpen(false);
      setDeleteItemId(null);
      setDeleteItemName('');
      loadData(page);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsDeleting(false);
    }
  }

  function startEdit(consignee: Consignee) {
    setEditingId(consignee.id);
    setForm({
      vendor_name: consignee.vendor_name,
      stall_no: consignee.stall_no,
      contact_person: consignee.contact_person,
      phone: consignee.phone,
      status: consignee.status,
      date_registered: consignee.date_registered,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm({
      vendor_name: '',
      stall_no: '',
      contact_person: '',
      phone: '',
      status: 'active',
      date_registered: new Date().toISOString().slice(0, 10)
    });
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <Sidebar activePage="consignees" />

      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Header />

        <main className="p-8 space-y-6">
          {/* Page Title & Button */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-955 tracking-tight leading-none">Canteen Vendor Directory</h1>
              <p className="text-xs text-gray-500 mt-1">Manage institutional consignees and coconut income for this academic year.</p>
            </div>
            {!isViewMode && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus className="h-3.5 w-3.5" />
                <span>Add New Consignee</span>
              </button>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg">{error}</div>}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm shadow-slate-300/50 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#006B4D] bg-[#4ade80]/15 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Vendors</span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">{loading ? '...' : count}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm shadow-slate-300/50 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#006B4D] bg-[#4ade80]/15 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Active Stalls</span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">{loading ? '...' : activeCount}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm shadow-slate-300/50 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Inactive</span>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Inactive Stalls</span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">{loading ? '...' : inactiveCount}</p>
              </div>
            </div>

          </div>

          {/* Consignee Table */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm shadow-slate-300/50">
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/40 rounded-t-xl">
              <h3 className="text-sm font-bold text-gray-900">Consignee List</h3>
              <div ref={filterMenuRef} className="flex flex-row space-x-2 relative items-center w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200/60 text-xs text-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B4D] w-full sm:w-48"
                  />
                </div>
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200/60 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-55 transition-colors whitespace-nowrap shrink-0"
                >
                  <Filter className="h-3.5 w-3.5" /><span>Filter</span><ChevronDown className="h-3.5 w-3.5" />
                </button>
                {showFilterMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200/60 z-30 p-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Status</label>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full px-2 py-1.5 border border-slate-200/60 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[350px]">
              <table className="w-full min-w-[800px] table-fixed text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm border-b border-slate-200/60">
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pl-24 pr-10 py-3.5 w-[40%] text-left">Vendor Name</th>
                    <th className="px-10 py-3.5 w-[20%] text-left">Phone Number</th>
                    <th className="px-10 py-3.5 w-[20%] text-center">Status</th>
                    <th className="px-10 py-3.5 w-[20%] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-200 text-xs bg-white ${loading && consignees.length > 0 ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
                  {loading && consignees.length === 0 ? (
                    <tr><td colSpan={4} className="px-10 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                  ) : filteredConsignees.length === 0 ? (
                    <tr><td colSpan={4} className="px-10 py-10 text-center text-gray-400">No consignees found. Click "Add New Consignee" to add one.</td></tr>
                  ) : filteredConsignees.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="pl-10 pr-10 py-4 w-[40%]">
                        <div className="flex items-center space-x-6">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                            {c.vendor_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="font-bold text-gray-800 leading-tight">{c.vendor_name}</p>
                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                              Registered: {new Date(c.date_registered).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-4 w-[20%] text-left">
                        <span className="text-gray-700 font-medium">{c.phone || '-'}</span>
                      </td>
                      <td className="px-10 py-4 w-[20%] text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase ${c.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          <span className={`w-1 h-1 rounded-full mr-1 ${c.status === 'active' ? 'bg-green-700' : 'bg-red-700'}`}></span>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-10 py-4 w-[20%]">
                        {!isViewMode && (
                          <div className="flex justify-center space-x-3.5 items-center">
                            <button
                              onClick={() => startEdit(c)}
                              className="text-[#006B4D] hover:text-[#00523b] transition-colors"
                              title="Edit Consignee"
                            >
                              <Edit2 className="h-4 w-4 cursor-pointer" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(c.id, c.vendor_name)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Delete Consignee"
                            >
                              <Trash2 className="h-4 w-4 cursor-pointer" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 flex justify-between items-center bg-gray-50 border-t border-slate-100/40 text-[11px] text-gray-500 rounded-b-xl">
              <span>Showing {consignees.length} of {count} entries</span>
              <div className="flex space-x-1.5 items-center">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-2 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-40">&lt;</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded font-bold ${p === page ? 'bg-[#006B4D] text-white' : 'text-gray-605 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-2 py-1 text-gray-400 hover:text-gray-600 disabled:opacity-40">&gt;</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add / Edit Consignee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-900">{editingId !== null ? 'Edit Consignee' : 'Add New Consignee'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              {[
                { label: 'Vendor Name', key: 'vendor_name', placeholder: 'e.g. Green Harvest Salads' },
                { label: 'Phone Number', key: 'phone', placeholder: 'e.g. 09123456789' },
                { label: 'Date Registered', key: 'date_registered', placeholder: '' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    type={f.key === 'date_registered' ? 'date' : 'text'}
                    value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200/60 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 border border-slate-200/60 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-200/60 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.vendor_name}
                className="flex-1 px-4 py-2 bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editingId !== null ? 'Save Changes' : 'Add Consignee'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Consignee"
        message="Are you sure you want to delete this consignee:"
        itemName={deleteItemName}
        isDeleting={isDeleting}
      />
    </div>
  );
}
