import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSchoolYearStore } from '../store/schoolYearStore';
import {
  Plus,
  GraduationCap,
  HeartPulse,
  Wrench,
  Trash2,
  Edit2,
  X,
  Calendar,
  ChevronDown,
  Download,
  Check,
  Loader2
} from 'lucide-react';
import { transactionsApi, revenueRecipientsApi } from '../lib/api';
import type { RevenueRecipient } from '../lib/api';
import PDFExportModal from '../components/PDFExportModal';
import { DeleteModal } from '../components/DeleteModal';
import { useAuthStore } from '../store/authStore';

export default function Revenue() {
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const isViewMode = useAuthStore(state => state.isViewMode);
  const authUser = useAuthStore(state => state.user);

  const [totalIncome, setTotalIncome] = useState(0);
  const [recipients, setRecipients] = useState<RevenueRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientPercentage, setNewRecipientPercentage] = useState('');
  const [modalError, setModalError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteItemName, setDeleteItemName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [showPDFModal, setShowPDFModal] = useState(false);

  const [filterMonth, setFilterMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const totalPercentage = recipients.reduce((sum, r) => sum + Number(r.percentage), 0);

  const icons = ['GraduationCap', 'HeartPulse', 'Wrench', 'Building', 'Shield', 'Lightbulb', 'Users', 'FileText'];
  const colors = ['[#4ADE80]', '[#a855f7]', '[#eab308]', '[#3b82f6]', '[#ef4444]', '[#06b6d4]', '[#f97316]', '[#8b5cf6]'];

  // Load recipients from the database
  function loadRecipients() {
    setLoadingRecipients(true);
    const params: { schoolYear?: string; user_id?: number } = { schoolYear };
    // In view mode, we need the user_id to load public recipients.
    // authUser may carry an id if the public page was reached with a user context.
    if (isViewMode && (authUser as any)?.id) {
      params.user_id = (authUser as any).id;
    }
    revenueRecipientsApi.list(params)
      .then(res => setRecipients(res.results))
      .catch(console.error)
      .finally(() => setLoadingRecipients(false));
  }

  useEffect(() => {
    loadRecipients();
  }, [schoolYear]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    transactionsApi.collectionSummary(undefined, filterMonth, schoolYear)
      .then(stats => {
        setTotalIncome(stats.total_collected);
      })
      .catch(console.error);
  }, [schoolYear, filterMonth]);

  const addRecipient = async () => {
    if (!newRecipientName.trim()) return;
    setModalError('');

    const newRecipient = {
      name: newRecipientName,
      percentage: parseInt(newRecipientPercentage) || 0,
      icon: icons[recipients.length % icons.length],
      color: colors[recipients.length % colors.length],
      order: recipients.length,
      school_year: schoolYear,
    };

    try {
      await revenueRecipientsApi.create(newRecipient);
      setNewRecipientName('');
      setNewRecipientPercentage('');
      setShowAddModal(false);
      loadRecipients();
    } catch (e: any) {
      console.error('Failed to add recipient:', e);
      setModalError(e.message || 'Failed to add recipient. Please try again.');
    }
  };

  const openAddModal = () => {
    setNewRecipientName('');
    setNewRecipientPercentage('');
    setShowAddModal(true);
  };

  const openDeleteModal = (id: number, name: string) => {
    setDeleteItemId(id);
    setDeleteItemName(name);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;
    setIsDeleting(true);
    try {
      await revenueRecipientsApi.delete(deleteItemId);
      setDeleteModalOpen(false);
      setDeleteItemId(null);
      setDeleteItemName('');
      loadRecipients();
    } catch (e: any) {
      console.error('Failed to delete recipient:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditing = (recipient: RevenueRecipient) => {
    setEditingId(recipient.id);
    setEditName(recipient.name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || editingId === null) return;
    try {
      await revenueRecipientsApi.update(editingId, { name: editName });
      setEditingId(null);
      setEditName('');
      loadRecipients();
    } catch (e: any) {
      console.error('Failed to update recipient:', e);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const updatePercentage = async (id: number, value: number) => {
    // Optimistically update UI, then persist
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, percentage: Math.max(0, value) } : r));
    try {
      await revenueRecipientsApi.update(id, { percentage: Math.max(0, value) });
    } catch (e: any) {
      console.error('Failed to update percentage:', e);
      loadRecipients(); // revert on error
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <Sidebar activePage="revenue" />

      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Header />

        <main className="p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-955 tracking-tight leading-none">Revenue Sharing Setup</h1>
              <p className="text-xs text-gray-500 mt-1">Configure automated distribution percentages for incoming funds. Ensure all distributions total 100% before saving changes.</p>
            </div>
            {!isViewMode && (
              <button 
                onClick={() => setShowPDFModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </button>
            )}
          </div>

          {/* Master Content Dashboard Matrix */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-gray-100 grid grid-cols-1 lg:grid-cols-5">
            
            {/* Left Hand Side Block: Rule Management Form Engine */}
            <div className="p-6 lg:col-span-3 flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-gray-905 tracking-tight uppercase">Distribution Rules</h3>
                  {!isViewMode && (
                    <button
                      onClick={openAddModal}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-[#006B4D] hover:bg-[#00523b] text-white text-[10px] font-bold rounded-lg transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Recipient</span>
                    </button>
                  )}
                </div>

                {/* Setup Rules Container Rows */}
                <div className={`space-y-3.5 max-h-[480px] overflow-y-auto pr-1 ${loadingRecipients && recipients.length > 0 ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
                  {loadingRecipients && recipients.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : recipients.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs">
                      No recipients added yet. Click "Add Recipient" to get started.
                    </div>
                  ) : (
                    recipients.map((recipient) => {
                      const IconComponent = recipient.icon === 'GraduationCap' ? GraduationCap :
                        recipient.icon === 'HeartPulse' ? HeartPulse :
                          recipient.icon === 'Wrench' ? Wrench : GraduationCap;

                      return (
                        <div key={recipient.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50/50 border border-gray-200 rounded-xl">
                          <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
                            <div className={`bg-${recipient.color}/15 p-2 rounded-lg text-${recipient.color}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fund Name</p>
                              {editingId === recipient.id ? (
                                <div className="flex items-center space-x-2 mt-0.5">
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                    className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                                    autoFocus
                                  />
                                  <button
                                    onClick={saveEdit}
                                    className="p-1 bg-[#006B4D] text-white rounded-md hover:bg-[#00523b]"
                                    title="Save name"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                    title="Cancel editing"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs font-bold text-gray-800 mt-0.5">{recipient.name}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Percentage</span>
                              <div className="relative w-20">
                                <input
                                  type="number"
                                  value={recipient.percentage}
                                  onChange={(e) => !isViewMode && updatePercentage(recipient.id, parseInt(e.target.value) || 0)}
                                  readOnly={isViewMode}
                                  className={`w-full text-right pr-6 pl-2 py-1.5 bg-gray-100 border border-gray-200 rounded-md font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#006B4D] text-gray-700 ${isViewMode ? 'cursor-default' : ''}`}
                                />
                                <span className="absolute right-2.5 top-2 text-[10px] font-bold text-gray-400">%</span>
                              </div>
                            </div>
                            {!isViewMode && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => startEditing(recipient)}
                                  className={`p-1.5 rounded-md transition-colors ${editingId === recipient.id ? 'text-[#006B4D] bg-[#006B4D]/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                  disabled={editingId === recipient.id}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(recipient.id, recipient.name)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Rules Footer Totals Monitor */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-150">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Configuration State</span>
                  <p className={`text-xs font-bold mt-0.5 ${totalPercentage === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {totalPercentage === 100 ? '✓ Balanced Allocation' : '🛈 Must balance to 100%'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase text-right block">Total Allocation</span>
                  <p className={`text-xl font-extrabold mt-0.5 tracking-tight text-right ${totalPercentage === 100 ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {totalPercentage}%
                  </p>
                </div>
              </div>
            </div>

            {/* Right Hand Side Block: Live Distribution Preview Panel (Expanded View) */}
            <div className="p-6 lg:col-span-2 bg-gray-50/30 flex flex-col justify-between space-y-6">
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-gray-905 tracking-tight uppercase">Live Distribution Preview</h3>
                  
                  {/* Filter controls context */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <div className="relative" ref={monthPickerRef}>
                      <button
                        onClick={() => setShowMonthPicker(v => !v)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${filterMonth
                            ? 'bg-[#006B4D] text-white border-[#006B4D]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <Calendar className="h-3 w-3" />
                        <span>{filterMonth
                          ? new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short' })
                          : 'All Months'}
                        </span>
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                      {showMonthPicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-60">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-bold text-gray-700">Filter Collections</span>
                            {filterMonth && (
                              <button
                                onClick={() => {
                                  setFilterMonth('');
                                  setShowMonthPicker(false);
                                }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-bold"
                              >Clear</button>
                            )}
                          </div>
                          <input
                            type="month"
                            value={filterMonth}
                            onChange={e => setFilterMonth(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Table Workspace with larger height limit and rows */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white flex-1 overflow-y-auto max-h-[420px] shadow-inner">
                  <table className="w-full min-w-[400px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-400 uppercase text-[10px] tracking-wider sticky top-0 z-10">
                        <th className="px-5 py-3.5">Target Fund</th>
                        <th className="px-5 py-3.5">Weight</th>
                        <th className="px-5 py-3.5 text-right">Yield</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-gray-100 ${loadingRecipients && recipients.length > 0 ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
                      {loadingRecipients && recipients.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-16 text-center">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                          </td>
                        </tr>
                      ) : recipients.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-16 text-center text-gray-400 text-xs">
                            Add allocation weights to run yield estimates.
                          </td>
                        </tr>
                      ) : (
                        recipients.map((recipient) => (
                          <tr key={recipient.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-gray-800 truncate max-w-[140px]">{recipient.name}</td>
                            <td className="px-5 py-3.5 font-bold text-gray-500">{recipient.percentage}%</td>
                            <td className="px-5 py-3.5 text-right font-extrabold text-[#006B4D] text-sm">
                              ₱{((totalIncome * recipient.percentage) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Bottom Income Banner context */}
              <div className="flex justify-between items-center bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Evaluated Pool</span>
                <span className="text-base font-black text-gray-900">
                  ₱{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ── Add Recipient Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-900">Add Recipient</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 font-medium">
                  {modalError}
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  placeholder="Enter recipient name..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D] placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Percentage</label>
                <input
                  type="number"
                  value={newRecipientPercentage}
                  onChange={(e) => setNewRecipientPercentage(e.target.value)}
                  placeholder="Enter percentage..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D] placeholder:text-gray-400"
                />
                {newRecipientPercentage && !isNaN(parseInt(newRecipientPercentage)) && (
                  <p className="text-[10px] text-[#006B4D] mt-1 font-semibold">
                    Allocated Amount: ₱{((totalIncome * parseInt(newRecipientPercentage)) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addRecipient}
                disabled={!newRecipientName.trim()}
                className="flex-1 px-3 py-2 bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Add Recipient
              </button>
            </div>
          </div>
        </div>
      )}

      <PDFExportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        recipients={recipients}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Recipient"
        message="Are you sure you want to delete this revenue recipient:"
        itemName={deleteItemName}
        isDeleting={isDeleting}
      />
    </div>
  );
}