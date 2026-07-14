import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSchoolYearStore } from '../store/schoolYearStore';
import {
  Plus, ChevronDown, Calendar, Layers, Coins, X,
  Pencil, Trash2, AlertCircle, Search, CreditCard, Loader2, Download
} from 'lucide-react';
import { transactionsApi, consigneesApi, expensesApi, cashOnBankApi, cashReturnApi, dashboardApi } from '../lib/api';
import type {
  Transaction, CollectionSummary, Consignee, Expense, ExpenseSummary, CashOnBankDeposit, CashReturnDeposit, DashboardStats
} from '../lib/api';
import { DeleteModal } from '../components/DeleteModal';
import { useAuthStore } from '../store/authStore';
import ExpensePDFExport from '../components/ExpensePDFExport';
import IncomePDFExport from '../components/IncomePDFExport';

/* ─────────────────────────── helpers ─────────────────────────── */
const COLLECTION_STATUSES = ['All Statuses', 'paid', 'unpaid', 'partial', 'overdue', 'pending'] as const;
type CollectionStatusFilter = typeof COLLECTION_STATUSES[number];

function formatCurrency(n: any) {
  const num = Number(n);
  if (isNaN(num)) return '₱0.00';
  return num.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-green-50 text-green-700',
    partial: 'bg-gray-150 text-gray-700',
    unpaid: 'bg-red-50 text-red-700',
    overdue: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_INCOME_FORM = {
  consignee_name: '',
  amount: '',
  status: 'paid',
  date: TODAY,
  canteen: '',
};

const EMPTY_EXPENSE_FORM = {
  name: '',
  requested_by: '',
  amount: '',
  date: TODAY,
  reason: '',
};

const EMPTY_CASH_RETURN_FORM = {
  returned_by: '',
  amount: '',
  date: TODAY,
  reason: '',
};

const CANTEENS = ['Canteen 1', 'Canteen 2'] as const;
type CanteenName = typeof CANTEENS[number];

function normalizeCanteen(value?: string | null): CanteenName {
  const normalized = (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return normalized.includes('2') ? 'Canteen 2' : 'Canteen 1';
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function Collections() {
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const isViewMode = useAuthStore(state => state.isViewMode);
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'cash-on-bank' | 'cash-return'>(
    location.state?.tab === 'expenses' ? 'expenses'
    : location.state?.tab === 'cash-on-bank' ? 'cash-on-bank'
    : location.state?.tab === 'cash-return' ? 'cash-return'
    : 'income'
  );

  useEffect(() => {
    if (location.state?.tab === 'expenses') {
      setActiveTab('expenses');
    } else if (location.state?.tab === 'income') {
      setActiveTab('income');
    } else if (location.state?.tab === 'cash-on-bank') {
      setActiveTab('cash-on-bank');
    } else if (location.state?.tab === 'cash-return') {
      setActiveTab('cash-return');
    }
  }, [location.state]);

  /* ─────────────────── CASH ON BANK state ─────────────────── */
  const [cashOnBankDeposits, setCashOnBankDeposits] = useState<CashOnBankDeposit[]>([]);
  const cashOnBankAmount = cashOnBankDeposits.reduce((acc, d) => acc + Number(d.amount || 0), 0);
  const [cashOnBankInput, setCashOnBankInput] = useState('');
  const [cashOnBankDate, setCashOnBankDate] = useState(TODAY);
  const [loadingCashOnBank, setLoadingCashOnBank] = useState(false);
  const [savingCashOnBank, setSavingCashOnBank] = useState(false);
  const [cashOnBankSaved, setCashOnBankSaved] = useState(false);
  const [cashOnBankError, setCashOnBankError] = useState('');
  const [editingCashOnBankId, setEditingCashOnBankId] = useState<number | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  /* ─────────────────── CASH RETURN state ─────────────────── */
  const [cashReturnDeposits, setCashReturnDeposits] = useState<CashReturnDeposit[]>([]);
  const [loadingCashReturn, setLoadingCashReturn] = useState(false);
  const [cashReturnPage, setCashReturnPage] = useState(1);
  const [showCashReturnModal, setShowCashReturnModal] = useState(false);
  const [cashReturnModalTab, setCashReturnModalTab] = useState<'Canteen' | 'Coconut'>('Canteen');
  const [cashReturnForm, setCashReturnForm] = useState(EMPTY_CASH_RETURN_FORM);
  const [editingCashReturnId, setEditingCashReturnId] = useState<number | null>(null);
  
  const [cashReturnFilterDate, setCashReturnFilterDate] = useState('');
  const [showCashReturnDatePicker, setShowCashReturnDatePicker] = useState(false);
  const [cashReturnFilterMonth, setCashReturnFilterMonth] = useState('');
  const [showCashReturnMonthPicker, setShowCashReturnMonthPicker] = useState(false);
  const cashReturnDatePickerRef = useRef<HTMLDivElement>(null);
  const cashReturnMonthPickerRef = useRef<HTMLDivElement>(null);

  const [cashReturnSearchQuery, setCashReturnSearchQuery] = useState('');
  const [cashReturnSearchDebounceText, setCashReturnSearchDebounceText] = useState('');
  const [expandedCashReturnIds, setExpandedCashReturnIds] = useState<Set<number>>(new Set());

  const toggleCashReturnExpand = (id: number) => {
    setExpandedCashReturnIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ─────────────────── COMMON state ─────────────────── */
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteItemType, setDeleteItemType] = useState<'income' | 'expense' | 'cash-return'>('income');
  const [deleteItemName, setDeleteItemName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  /* ─────────────────── INCOME state ─────────────────── */
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [incomeModalTab, setIncomeModalTab] = useState<'consignee' | 'external'>('consignee');
  const [form, setForm] = useState(EMPTY_INCOME_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [filterDate, setFilterDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CollectionStatusFilter>('All Statuses');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounceText, setSearchDebounceText] = useState('');
  const [consigneeQuery, setConsigneeQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Consignee[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedConsignee, setSelectedConsignee] = useState<Consignee | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);
  const [showExternalSuggestions, setShowExternalSuggestions] = useState(false);
  const externalSuggestRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);


  /* ─────────────────── EXPENSES state ─────────────────── */
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [expensePage, setExpensePage] = useState(1);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalTab, setExpenseModalTab] = useState<'canteen' | 'coconut'>('canteen');
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [showExpensePDFModal, setShowExpensePDFModal] = useState(false);
  const [showIncomePDFModal, setShowIncomePDFModal] = useState(false);

  const [expenseFilterDate, setExpenseFilterDate] = useState('');
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [expenseFilterMonth, setExpenseFilterMonth] = useState('');
  const [showExpenseMonthPicker, setShowExpenseMonthPicker] = useState(false);
  const expenseDatePickerRef = useRef<HTMLDivElement>(null);
  const expenseMonthPickerRef = useRef<HTMLDivElement>(null);

  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [expenseSearchDebounceText, setExpenseSearchDebounceText] = useState('');
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<Set<number>>(new Set());

  const toggleExpenseExpand = (id: number) => {
    setExpandedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  /* ─────────────────── INCOME helpers ─────────────────── */
  function loadData(p = 1, date?: string, status?: string, month?: string, search?: string) {
    if (activeTab !== 'income') return;
    setLoading(true);
    const params: { page: number; date?: string; month?: string; status?: string; schoolYear: string; search?: string } = { page: p, schoolYear };
    if (date) params.date = date;
    if (month) params.month = month;
    if (search) params.search = search;
    if (status && status !== 'All Statuses') params.status = status;
    Promise.all([
      transactionsApi.listCollections(params),
      transactionsApi.collectionSummary(date, month, schoolYear),
    ]).then(([txnRes, sumRes]) => {
      setTransactions(txnRes.results);
      setSummary(sumRes);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  /* ─────────────────── EXPENSES helpers ─────────────────── */
  function loadExpensesData(p = 1, date?: string, month?: string, search?: string) {
    if (activeTab !== 'expenses') return;
    setLoadingExpenses(true);
    const params: any = { page: p, schoolYear };
    if (date) params.date = date;
    if (month) params.month = month;
    if (search) params.search = search;

    Promise.all([
      expensesApi.list(params),
      expensesApi.summary({ date, month, schoolYear })
    ]).then(([expRes, sumRes]) => {
      setExpenses(expRes.results);
      setExpenseSummary(sumRes);
    }).catch(e => setError(e.message))
      .finally(() => setLoadingExpenses(false));
  }

  /* ─────────────────── Effects ─────────────────── */
  useEffect(() => {
    if (activeTab === 'income') {
      loadData(page, filterDate, filterStatus, filterMonth, searchDebounceText);
    } else if (activeTab === 'expenses') {
      loadExpensesData(expensePage, expenseFilterDate, expenseFilterMonth, expenseSearchDebounceText);
    } else if (activeTab === 'cash-on-bank') {
      loadCashOnBank();
    } else if (activeTab === 'cash-return') {
      loadCashReturn(cashReturnPage, cashReturnFilterDate, cashReturnFilterMonth, cashReturnSearchDebounceText);
    }
  }, [
    activeTab, schoolYear,
    page, filterDate, filterStatus, filterMonth, searchDebounceText,
    expensePage, expenseFilterDate, expenseFilterMonth, expenseSearchDebounceText,
    cashReturnPage, cashReturnFilterDate, cashReturnFilterMonth, cashReturnSearchDebounceText
  ]);

  async function loadCashOnBank() {
    setLoadingCashOnBank(true);
    setCashOnBankError('');
    try {
      const [res, stats] = await Promise.all([
        cashOnBankApi.list(schoolYear),
        dashboardApi.getStats(schoolYear, '')
      ]);
      setCashOnBankDeposits(res.results || []);
      setDashboardStats(stats);
    } catch (e: any) {
      setCashOnBankError(e.message || 'Failed to load cash on bank.');
    } finally {
      setLoadingCashOnBank(false);
    }
  }

  async function handleSaveCashOnBank() {
    const amount = parseFloat(cashOnBankInput) || 0;
    if (amount <= 0) return;
    setSavingCashOnBank(true);
    setCashOnBankError('');
    try {
      if (editingCashOnBankId !== null) {
        await cashOnBankApi.update(editingCashOnBankId, { school_year: schoolYear, amount, date: cashOnBankDate });
      } else {
        await cashOnBankApi.create({ school_year: schoolYear, amount, date: cashOnBankDate });
      }
      setCashOnBankInput('');
      setCashOnBankDate(TODAY);
      setEditingCashOnBankId(null);
      setCashOnBankSaved(true);
      loadCashOnBank();
      setTimeout(() => setCashOnBankSaved(false), 2500);
    } catch (e: any) {
      setCashOnBankError(e.message || 'Failed to save.');
    } finally {
      setSavingCashOnBank(false);
    }
  }

  async function handleDeleteCashOnBank(id: number) {
    if (!confirm('Are you sure you want to delete this deposit?')) return;
    try {
      await cashOnBankApi.delete(id);
      loadCashOnBank();
    } catch (e: any) {
      setCashOnBankError(e.message || 'Failed to delete deposit.');
    }
  }

  function handleEditCashOnBank(dep: CashOnBankDeposit) {
    setEditingCashOnBankId(dep.id);
    setCashOnBankInput(String(dep.amount));
    setCashOnBankDate(dep.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─────────────────── CASH RETURN helpers ─────────────────── */
  async function loadCashReturn(p = 1, date?: string, month?: string, search?: string) {
    setLoadingCashReturn(true);
    try {
      const [res, stats] = await Promise.all([
        cashReturnApi.list({ schoolYear, page: p, date, month, search }),
        dashboardApi.getStats(schoolYear, month || '')
      ]);
      setCashReturnDeposits(res.results || []);
      setDashboardStats(stats);
    } catch (e: any) {
      setError(e.message || 'Failed to load cash return.');
    } finally {
      setLoadingCashReturn(false);
    }
  }

  function applyCashReturnFilters(date: string, month: string = '') {
    setCashReturnPage(1);
    loadCashReturn(1, date, month, cashReturnSearchDebounceText);
  }

  async function handleSaveCashReturn() {
    const amount = parseFloat(cashReturnForm.amount) || 0;
    if (amount <= 0 || !cashReturnForm.returned_by.trim()) {
      setError('Please provide a valid amount and returned by name.');
      return;
    }
    setSaving(true);
    setError('');
    
    const data = {
      school_year: schoolYear,
      returned_by: cashReturnForm.returned_by.trim(),
      type: cashReturnModalTab,
      amount: amount,
      date: cashReturnForm.date,
      reason: cashReturnForm.reason?.trim() || undefined,
    };

    try {
      if (editingCashReturnId !== null) {
        await cashReturnApi.update(editingCashReturnId, data);
      } else {
        await cashReturnApi.create(data);
      }
      setShowCashReturnModal(false);
      setEditingCashReturnId(null);
      setCashReturnForm(EMPTY_CASH_RETURN_FORM);
      loadCashReturn(cashReturnPage, cashReturnFilterDate, cashReturnFilterMonth, cashReturnSearchDebounceText);
    } catch (e: any) {
      setError(e.message || 'Failed to save cash return.');
    } finally {
      setSaving(false);
    }
  }



  function handleEditCashReturn(dep: CashReturnDeposit) {
    setEditingCashReturnId(dep.id);
    setCashReturnModalTab(dep.type as 'Canteen' | 'Coconut');
    setCashReturnForm({
      returned_by: dep.returned_by,
      amount: String(dep.amount),
      date: dep.date,
      reason: dep.reason || '',
    });
    setShowCashReturnModal(true);
  }

  function openCreateCashReturnModal() {
    setEditingCashReturnId(null);
    setCashReturnForm(EMPTY_CASH_RETURN_FORM);
    setCashReturnModalTab('Canteen');
    setShowCashReturnModal(true);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounceText(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExpenseSearchDebounceText(expenseSearchQuery);
      setExpensePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [expenseSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCashReturnSearchDebounceText(cashReturnSearchQuery);
      setCashReturnPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [cashReturnSearchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (externalSuggestRef.current && !externalSuggestRef.current.contains(e.target as Node)) setShowExternalSuggestions(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false);
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) setShowMonthPicker(false);
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setShowStatusMenu(false);

      if (expenseDatePickerRef.current && !expenseDatePickerRef.current.contains(e.target as Node)) setShowExpenseDatePicker(false);
      if (expenseMonthPickerRef.current && !expenseMonthPickerRef.current.contains(e.target as Node)) setShowExpenseMonthPicker(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ─────────────────── INCOME actions ─────────────────── */
  function handleConsigneeInput(val: string) {
    setConsigneeQuery(val);
    setSelectedConsignee(null);
    setForm(prev => ({ ...prev, consignee_name: val }));
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await consigneesApi.list({ search: val, schoolYear });
        setSuggestions(res.results);
        setShowSuggestions(res.results.length > 0);
      } catch { setSuggestions([]); }
    }, 250);
  }

  function handleSelectConsignee(c: Consignee) {
    setSelectedConsignee(c);
    setConsigneeQuery(c.vendor_name);
    setForm(prev => ({ ...prev, consignee_name: c.vendor_name, canteen: normalizeCanteen(c.stall_no) }));
    setShowSuggestions(false);
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkPaid() {
    if (!selectedIds.size) return;
    await transactionsApi.bulkPaid(Array.from(selectedIds));
    setSelectedIds(new Set());
    loadData(page, filterDate, filterStatus, filterMonth, searchDebounceText);
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected payment(s)?`)) {
      try {
        await transactionsApi.bulkDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
        setPage(1);
        loadData(1, filterDate, filterStatus, filterMonth, searchDebounceText);
      } catch (e: any) {
        setError(e.message || 'Failed to delete payments.');
      }
    }
  }

  async function handleSaveIncome() {
    setSaving(true);
    setModalError('');
    try {
      const name = form.consignee_name.trim();
      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const canteen = incomeModalTab === 'external' ? 'External' : normalizeCanteen(selectedConsignee?.stall_no || form.canteen);
      if (!editingId && incomeModalTab === 'consignee' && !selectedConsignee) {
        setModalError('Please select a consignee from the list so the payment is filed under the correct canteen.');
        return;
      }
      if (editingId) {
        const cat = name.toLowerCase() === 'coconut' ? 'Coconut' : 'General';
        await transactionsApi.update(editingId, {
          student_name: name, student_initials: initials,
          amount: parseFloat(form.amount), status: form.status, date: form.date, canteen,
          category: cat,
        });
      } else {
        const cat = name.toLowerCase() === 'coconut' ? 'Coconut' : 'General';
        await transactionsApi.create({
          transaction_type: 'collection', student_name: name, student_initials: initials,
          grade_section: '', id_number: '', amount: parseFloat(form.amount),
          category: cat, canteen, status: form.status, date: form.date,
        });
      }
      setShowModal(false);
      setForm(EMPTY_INCOME_FORM);
      setConsigneeQuery('');
      setSelectedConsignee(null);
      setEditingId(null);
      loadData(page, filterDate, filterStatus, filterMonth, searchDebounceText);
    } catch (e: any) {
      setModalError(e.message || 'Failed to save payment. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function openCreateModal() {
    setForm({ ...EMPTY_INCOME_FORM, date: filterDate || TODAY });
    setConsigneeQuery(''); setSelectedConsignee(null);
    setModalError(''); setEditingId(null); setIncomeModalTab('consignee'); setShowModal(true);
    consigneesApi.list({ schoolYear }).then(res => {
      setSuggestions(res.results);
      setShowSuggestions(res.results.length > 0);
    }).catch(() => setSuggestions([]));
  }

  function applyFilters(date: string, status: CollectionStatusFilter, month: string = filterMonth) {
    setPage(1); loadData(1, date, status, month, searchDebounceText);
  }

  function openEditModal(txn: Transaction) {
    setEditingId(txn.id);
    setForm({
      consignee_name: txn.student_name || '', amount: String(txn.amount),
      status: txn.status, date: txn.date, canteen: txn.canteen || '',
    });
    setConsigneeQuery(txn.student_name || '');
    setIncomeModalTab(txn.canteen === 'External' ? 'external' : 'consignee');
    setSelectedConsignee(null); setSuggestions([]); setModalError(''); setShowModal(true);
  }

  /* ─────────────────── EXPENSES actions ─────────────────── */
  function openCreateExpenseModal() {
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, date: expenseFilterDate || TODAY });
    setModalError(''); setEditingExpenseId(null); setExpenseModalTab('canteen'); setShowExpenseModal(true);
  }

  function openEditExpenseModal(exp: Expense) {
    setEditingExpenseId(exp.id);
    const isCoconut = exp.name.toLowerCase().includes('coconut');
    let displayName = exp.name;
    // Strip the type suffix so the input field shows only the bare name
    if (isCoconut && displayName.endsWith(' (Coconut)')) {
      displayName = displayName.replace(' (Coconut)', '');
    } else if (!isCoconut && displayName.endsWith(' (Canteen)')) {
      displayName = displayName.replace(' (Canteen)', '');
    }
    setExpenseForm({
      name: displayName,
      requested_by: exp.requested_by || '',
      amount: String(exp.amount),
      date: exp.date,
      reason: exp.reason || '',
    });
    setExpenseModalTab(isCoconut ? 'coconut' : 'canteen');
    setModalError(''); setShowExpenseModal(true);
  }

  async function handleSaveExpense() {
    setSaving(true);
    setModalError('');
    try {
      let finalName = expenseForm.name.trim();
      // Strip any existing suffix so we never double-append
      finalName = finalName.replace(/ \(Canteen\)$/, '').replace(/ \(Coconut\)$/, '');
      if (expenseModalTab === 'coconut') {
        finalName = finalName + ' (Coconut)';
      } else {
        finalName = finalName + ' (Canteen)';
      }
      const payload = {
        name: finalName,
        requested_by: expenseForm.requested_by.trim(),
        amount: parseFloat(expenseForm.amount) || 0,
        date: expenseForm.date,
        reason: expenseForm.reason.trim(),
        school_year: schoolYear,
      };

      if (editingExpenseId) {
        await expensesApi.update(editingExpenseId, payload);
      } else {
        await expensesApi.create(payload);
      }
      setShowExpenseModal(false);
      setExpenseForm(EMPTY_EXPENSE_FORM);
      setEditingExpenseId(null);
      loadExpensesData(expensePage, expenseFilterDate, expenseFilterMonth, expenseSearchDebounceText);
    } catch (e: any) {
      setModalError(e.message || 'Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function applyExpenseFilters(date: string, month: string = expenseFilterMonth) {
    setExpensePage(1); loadExpensesData(1, date, month, expenseSearchDebounceText);
  }


  /* ─────────────────── COMMON actions ─────────────────── */
  function openDeleteModal(id: number, name: string, type: 'income' | 'expense' | 'cash-return') {
    setDeleteItemId(id);
    setDeleteItemName(name);
    setDeleteItemType(type);
    setDeleteModalOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteItemId) return;
    setIsDeleting(true);
    try {
      if (deleteItemType === 'income') {
        await transactionsApi.delete(deleteItemId);
        setPage(1);
        loadData(1, filterDate, filterStatus, filterMonth, searchDebounceText);
      } else if (deleteItemType === 'expense') {
        await expensesApi.delete(deleteItemId);
        setExpensePage(1);
        loadExpensesData(1, expenseFilterDate, expenseFilterMonth, expenseSearchDebounceText);
      } else if (deleteItemType === 'cash-return') {
        await cashReturnApi.delete(deleteItemId);
        setCashReturnPage(1);
        loadCashReturn(1, cashReturnFilterDate, cashReturnFilterMonth, cashReturnSearchDebounceText);
      }
      setDeleteModalOpen(false);
      setDeleteItemId(null);
      setDeleteItemName('');
    } catch (e: any) {
      setError(e.message || 'Failed to delete.');
    } finally {
      setIsDeleting(false);
    }
  }

  /* ═══════════════════ RENDER ══════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <Sidebar activePage="collections" />

      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Header />

        <main className="p-6 space-y-6">

          {/* Breadcrumb & Title */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-gray-955 tracking-tight leading-none mt-1">Collections & Ledger</h1>
              <p className="text-xs text-gray-500 mt-1">Monitor and record real-time fee collections and expenses.</p>
            </div>
            <div className="flex space-x-2.5 items-center">
              {/* Export PDF buttons */}
              {activeTab === 'income' && (
                <button
                  onClick={() => setShowIncomePDFModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-green-50 text-[#006B4D] text-xs font-semibold rounded-lg border border-green-200 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export PDF</span>
                </button>
              )}
              {activeTab === 'expenses' && (
                <button
                  onClick={() => setShowExpensePDFModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-200 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export PDF</span>
                </button>
              )}
              {!isViewMode && activeTab !== 'cash-on-bank' && (
                <>
                  {activeTab === 'income' ? (
                    <button
                      onClick={openCreateModal}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Record New Payment</span>
                    </button>
                  ) : activeTab === 'expenses' ? (
                    <button
                      onClick={openCreateExpenseModal}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Record New Expense</span>
                    </button>
                  ) : activeTab === 'cash-return' ? (
                    <button
                      onClick={openCreateCashReturnModal}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Record New Cash Return</span>
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 space-x-6">
            <button
              onClick={() => setActiveTab('income')}
              className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 ${activeTab === 'income' ? 'border-[#006B4D] text-[#006B4D]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Income
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 ${activeTab === 'expenses' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('cash-return')}
              className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 ${activeTab === 'cash-return' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Cash Return
            </button>
            <button
              onClick={() => setActiveTab('cash-on-bank')}
              className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 ${activeTab === 'cash-on-bank' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Cash on Bank
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg">{error}</div>}

          {/* ================= INCOME VIEW ================= */}
          {activeTab === 'income' && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-[#4ade80]/10 p-2 rounded-lg text-[#006B4D]"><Coins className="h-5 w-5" /></div>
                    <span className="text-[9px] font-bold text-[#006B4D] bg-[#4ade80]/15 px-2 py-0.5 rounded-full">CANTEEN</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Collected - CANTEEN</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loading ? '...' : formatCurrency(summary?.total_canteen ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Layers className="h-5 w-5" /></div>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Outstanding</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Outstanding</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loading ? '...' : formatCurrency(summary?.outstanding ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-green-50 p-2 rounded-lg text-green-600"><Coins className="h-5 w-5" /></div>
                    <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Coconut</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total collected - COCONUT</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loading ? '...' : formatCurrency(summary?.total_coconut ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Collections table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[240px]">
                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100/40 rounded-t-xl bg-white">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-bold text-gray-900">All Collections</h3>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline-block">
                      {transactions.length} payments
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-white border border-slate-200/60 text-xs text-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B4D] w-32 sm:w-48"
                      />
                    </div>
                    {/* Status dropdown */}
                    <div className="relative" ref={statusMenuRef}>
                      <button
                        onClick={() => { setShowStatusMenu(v => !v); setShowDatePicker(false); setShowMonthPicker(false); }}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterStatus !== 'All Statuses'
                          ? 'bg-[#006B4D] text-white border-[#006B4D]'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150'
                          }`}
                      >
                        <span className="capitalize">{filterStatus}</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showStatusMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1.5 w-44">
                          {COLLECTION_STATUSES.map(s => (
                            <button
                              key={s}
                              onClick={() => { setFilterStatus(s); setShowStatusMenu(false); applyFilters(filterDate, s); }}
                              className={`w-full text-left flex items-center justify-between px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors ${filterStatus === s ? 'text-[#006B4D]' : 'text-gray-700'}`}
                            >
                              <span className="capitalize">{s}</span>
                              {filterStatus === s && <span className="text-[#006B4D]">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date dropdown */}
                    <div className="relative" ref={datePickerRef}>
                      <button
                        onClick={() => { setShowDatePicker(v => !v); setShowStatusMenu(false); setShowMonthPicker(false); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterDate ? 'bg-[#006B4D] text-white border-[#006B4D]' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150'
                          }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{filterDate
                          ? new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'All Dates'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showDatePicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-64">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-700">Select Date</span>
                            {filterDate && (
                              <button
                                onClick={() => { setFilterDate(''); setShowDatePicker(false); applyFilters('', filterStatus); }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                              >Clear</button>
                            )}
                          </div>
                          <input
                            type="date"
                            value={filterDate}
                            onChange={e => { setFilterDate(e.target.value); setShowDatePicker(false); applyFilters(e.target.value, filterStatus); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                          />
                          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                            Filter records by date, or pick a future date to record advance payments.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Month dropdown */}
                    <div className="relative" ref={monthPickerRef}>
                      <button
                        onClick={() => { setShowMonthPicker(v => !v); setShowStatusMenu(false); setShowDatePicker(false); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterMonth ? 'bg-[#006B4D] text-white border-[#006B4D]' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150'
                          }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{filterMonth
                          ? new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : 'All Months'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showMonthPicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-64">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-700">Select Month</span>
                            {filterMonth && (
                              <button
                                onClick={() => { setFilterMonth(''); setShowMonthPicker(false); applyFilters(filterDate, filterStatus, ''); }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                              >Clear</button>
                            )}
                          </div>
                          <input
                            type="month"
                            value={filterMonth}
                            onChange={e => {
                              setFilterMonth(e.target.value);
                              setFilterDate('');
                              setShowMonthPicker(false);
                              applyFilters('', filterStatus, e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                          />
                        </div>
                      )}
                    </div>


                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <div className="min-w-[800px]">
                    {/* Fixed header */}
                    <div className="bg-gray-50 border-b border-gray-200 rounded-t-xl overflow-hidden">
                      <table className="w-full table-fixed text-left border-collapse">
                        <colgroup>
                          <col style={{ width: '30%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                        </colgroup>
                        <thead>
                          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="pl-8 pr-4 py-3 text-left">Consignee</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Date</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                      </table>
                    </div>

                    {/* Scrollable body */}
                    <div className="overflow-y-auto max-h-[400px]">
                      <table className="w-full table-fixed text-left border-collapse">
                        <colgroup>
                          <col style={{ width: '30%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                        </colgroup>
                        <tbody className={`divide-y divide-slate-200 text-xs ${loading && transactions.length > 0 ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
                          {loading && transactions.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                          ) : transactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-12 text-center h-28">
                                <div className="min-h-28 flex flex-col items-center justify-center space-y-2 text-gray-400">
                                  <Coins className="h-7 w-7 opacity-30" />
                                  <p className="text-xs font-semibold">No payments recorded</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            transactions.map(txn => (
                              <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="pl-8 pr-4 py-3 w-[30%]">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#006B4D] flex items-center justify-center font-bold text-[11px] shrink-0">
                                      {txn.student_initials || txn.student_name?.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-gray-800 truncate">{txn.student_name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 w-[20%] text-right font-bold text-gray-800 whitespace-nowrap">{formatCurrency(txn.amount)}</td>
                                <td className="px-4 py-3 w-[20%] text-center text-gray-500 font-medium text-[11px]">
                                  {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3 w-[15%] text-center">
                                  <span className={`inline-flex px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wide ${statusBadge(txn.status)}`}>
                                    {txn.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 w-[15%] text-center">
                                  {!isViewMode && (
                                    <div className="flex items-center justify-center space-x-1">
                                      <button onClick={() => openEditModal(txn)} title="Edit" className="p-1 rounded-md text-gray-400 hover:text-[#006B4D] hover:bg-[#006B4D]/5 transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => openDeleteModal(txn.id, txn.student_name || 'payment', 'income')} title="Delete" className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= EXPENSES VIEW ================= */}
          {activeTab === 'expenses' && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-red-50 p-2 rounded-lg text-red-600"><CreditCard className="h-5 w-5" /></div>
                    <span className="text-[9px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Canteen</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Expenses - CANTEEN</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loadingExpenses ? '...' : formatCurrency(expenseSummary?.total_canteen ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><CreditCard className="h-5 w-5" /></div>
                    <span className="text-[9px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Coconut</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Expenses - COCONUT</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loadingExpenses ? '...' : formatCurrency(expenseSummary?.total_coconut ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expenses table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[240px]">
                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100/40 rounded-t-xl bg-white">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-bold text-gray-900">All Expenses</h3>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline-block">
                      {expenses.length} expenses
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search expense..."
                        value={expenseSearchQuery}
                        onChange={(e) => setExpenseSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-white border border-slate-200/60 text-xs text-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#006B4D] w-32 sm:w-48"
                      />
                    </div>

                    {/* Date dropdown */}
                    <div className="relative" ref={expenseDatePickerRef}>
                      <button
                        onClick={() => { setShowExpenseDatePicker(v => !v); setShowExpenseMonthPicker(false); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${expenseFilterDate ? 'bg-red-600 text-white border-red-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150'
                          }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{expenseFilterDate
                          ? new Date(expenseFilterDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'All Dates'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showExpenseDatePicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-64">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-700">Select Date</span>
                            {expenseFilterDate && (
                              <button
                                onClick={() => { setExpenseFilterDate(''); setShowExpenseDatePicker(false); applyExpenseFilters(''); }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                              >Clear</button>
                            )}
                          </div>
                          <input
                            type="date"
                            value={expenseFilterDate}
                            onChange={e => { setExpenseFilterDate(e.target.value); setShowExpenseDatePicker(false); applyExpenseFilters(e.target.value); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Month dropdown */}
                    <div className="relative" ref={expenseMonthPickerRef}>
                      <button
                        onClick={() => { setShowExpenseMonthPicker(v => !v); setShowExpenseDatePicker(false); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${expenseFilterMonth ? 'bg-red-600 text-white border-red-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150'
                          }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{expenseFilterMonth
                          ? new Date(expenseFilterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : 'All Months'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showExpenseMonthPicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-64">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-700">Select Month</span>
                            {expenseFilterMonth && (
                              <button
                                onClick={() => { setExpenseFilterMonth(''); setShowExpenseMonthPicker(false); applyExpenseFilters(expenseFilterDate, ''); }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                              >Clear</button>
                            )}
                          </div>
                          <input
                            type="month"
                            value={expenseFilterMonth}
                            onChange={e => {
                              setExpenseFilterMonth(e.target.value);
                              setExpenseFilterDate('');
                              setShowExpenseMonthPicker(false);
                              applyExpenseFilters('', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <div className="min-w-[800px]">
                    {/* Fixed header */}
                    <div className="bg-gray-50 border-b border-gray-200 rounded-t-xl overflow-hidden">
                      <table className="w-full table-fixed text-left border-collapse">
                        <colgroup>
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <thead>
                          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="pl-8 pr-4 py-3 text-left">Expense Name</th>
                            <th className="px-4 py-3 text-center">Type</th>
                            <th className="px-4 py-3 text-left">Requested By</th>
                            <th className="px-4 py-3 text-left">Reason</th>
                            <th className="px-4 py-3 text-center">Date</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                      </table>
                    </div>

                    {/* Scrollable body */}
                    <div className="overflow-y-auto max-h-[400px]">
                      <table className="w-full table-fixed text-left border-collapse">
                        <colgroup>
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <tbody className={`divide-y divide-slate-200 text-xs ${loadingExpenses && expenses.length > 0 ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
                          {loadingExpenses && expenses.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                          ) : expenses.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-12 text-center h-28">
                                <div className="min-h-28 flex flex-col items-center justify-center space-y-2 text-gray-400">
                                  <CreditCard className="h-7 w-7 opacity-30" />
                                  <p className="text-xs font-semibold">No expenses recorded</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            expenses.map(exp => {
                              const isExpanded = expandedExpenseIds.has(exp.id);
                              let displayName = exp.name;
                              let expType = '';
                              if (displayName.endsWith(' (Coconut)')) {
                                expType = 'Coconut';
                                displayName = displayName.replace(' (Coconut)', '');
                              } else if (displayName.endsWith(' (Canteen)')) {
                                expType = 'Canteen';
                                displayName = displayName.replace(' (Canteen)', '');
                              } else {
                                expType = 'Canteen';
                              }

                              return (
                              <tr key={exp.id} onClick={() => toggleExpenseExpand(exp.id)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                                <td className="pl-8 pr-4 py-3 w-[20%]">
                                  <span className={`font-bold text-gray-800 ${isExpanded ? 'whitespace-normal break-words block' : 'truncate block'}`}>{displayName}</span>
                                </td>
                                <td className="px-4 py-3 w-[15%] text-center">
                                  <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded-full ${expType === 'Canteen' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {expType}
                                  </span>
                                </td>
                                <td className="px-4 py-3 w-[15%]">
                                  <span className={`text-gray-700 ${isExpanded ? 'whitespace-normal break-words block' : 'truncate block'}`}>{exp.requested_by || '-'}</span>
                                </td>
                                <td className="px-4 py-3 w-[15%]">
                                  <span className={`text-gray-600 ${isExpanded ? 'whitespace-normal break-words block' : 'truncate block'}`} title={exp.reason || ''}>{exp.reason || '-'}</span>
                                </td>
                                <td className="px-4 py-3 w-[15%] text-center text-gray-500 font-medium text-[11px]">
                                  {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3 w-[10%] text-right font-bold text-red-600 whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                                <td className="px-4 py-3 w-[10%] text-center" onClick={(e) => e.stopPropagation()}>
                                  {!isViewMode && (
                                    <div className="flex items-center justify-center space-x-1">
                                      <button onClick={() => openEditExpenseModal(exp)} title="Edit" className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => openDeleteModal(exp.id, exp.name, 'expense')} title="Delete" className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )})
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= CASH ON BANK VIEW ================= */}
          {activeTab === 'cash-on-bank' && (
            <div className="space-y-6">
              {cashOnBankError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg">{cashOnBankError}</div>
              )}

              {/* Info cards row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cash on Bank card */}
                <div className="bg-white p-5 rounded-xl border-2 border-blue-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Bank</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Current Cash on Bank</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loadingCashOnBank ? '...' : formatCurrency(cashOnBankAmount)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">for {schoolYear}</p>
                  </div>
                </div>

                {/* Total Balance card */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Canteen</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Balance (Canteen)</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loadingCashOnBank ? '...' : formatCurrency(Number(dashboardStats?.total_collections || 0) - Number(dashboardStats?.total_expenses || 0))}
                    </p>
                  </div>
                </div>

                {/* Cash on Hand card */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">On Hand</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cash on Hand</span>
                    <p className={`text-2xl font-bold tracking-tight mt-0.5 ${
                      (Number(dashboardStats?.total_collections || 0) - Number(dashboardStats?.total_expenses || 0)) - Number(cashOnBankAmount) >= 0 ? 'text-gray-900' : 'text-red-600'
                    }`}>
                      {loadingCashOnBank ? '...' : formatCurrency((Number(dashboardStats?.total_collections || 0) - Number(dashboardStats?.total_expenses || 0)) - Number(cashOnBankAmount))}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Total Balance − Cash on Bank</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input section */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">
                      {editingCashOnBankId !== null ? 'Edit Bank Deposit' : 'Add Bank Deposit'}
                    </h3>
                    <p className="text-xs text-gray-500 mb-5">
                      {editingCashOnBankId !== null ? 'Update the details of the selected deposit.' : 'Record a new bank deposit.'}
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Amount (PHP)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashOnBankInput}
                            onChange={e => setCashOnBankInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveCashOnBank()}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Date Deposited</label>
                        <input
                          type="date"
                          value={cashOnBankDate}
                          onChange={e => setCashOnBankDate(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="flex items-center space-x-3 pt-2">
                        {editingCashOnBankId !== null && (
                          <button
                            onClick={() => {
                              setEditingCashOnBankId(null);
                              setCashOnBankInput('');
                              setCashOnBankDate(TODAY);
                            }}
                            className="px-4 py-2.5 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={handleSaveCashOnBank}
                          disabled={savingCashOnBank || !cashOnBankInput}
                          className="flex-1 flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors justify-center"
                        >
                          {savingCashOnBank ? (
                            <Loader2 className="animate-spin h-3.5 w-3.5" />
                          ) : editingCashOnBankId !== null ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          <span>{savingCashOnBank ? 'Saving...' : editingCashOnBankId !== null ? 'Save Changes' : 'Add Deposit'}</span>
                        </button>
                      </div>

                      {cashOnBankSaved && (
                        <div className="flex items-center justify-center space-x-1 text-emerald-600 text-xs font-semibold animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span>Saved successfully!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table section */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-sm font-bold text-gray-800">Deposit History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-200">
                            <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/3">Date Deposited</th>
                            <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-1/2 text-right">Amount</th>
                            <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center w-1/6">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {loadingCashOnBank && cashOnBankDeposits.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-5 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td>
                            </tr>
                          ) : cashOnBankDeposits.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-5 py-10 text-center text-gray-400 text-xs">No bank deposits found for this school year.</td>
                            </tr>
                          ) : (
                            cashOnBankDeposits.map((dep) => (
                              <tr key={dep.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-5 py-3 text-sm text-gray-600 font-medium">
                                  {new Date(dep.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                                  {formatCurrency(dep.amount)}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  {!isViewMode && (
                                    <div className="flex items-center justify-center space-x-1">
                                      <button 
                                        onClick={() => handleEditCashOnBank(dep)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Edit deposit"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteCashOnBank(dep.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Delete deposit"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= CASH RETURN VIEW ================= */}
          {activeTab === 'cash-return' && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Coins className="h-5 w-5" /></div>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Canteen</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Cash Return - CANTEEN</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loadingCashReturn ? '...' : formatCurrency(dashboardStats?.canteen_cash_return ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Coins className="h-5 w-5" /></div>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Coconut</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Cash Return - COCONUT</span>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                      {loadingCashReturn ? '...' : formatCurrency(dashboardStats?.coconut_cash_return ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cash Return table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[240px]">
                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100/40 rounded-t-xl bg-white">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-bold text-gray-900">All Cash Returns</h3>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline-block">
                      {cashReturnDeposits.length} entries
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search returns..."
                        value={cashReturnSearchQuery}
                        onChange={(e) => setCashReturnSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-white border border-slate-200/60 text-xs text-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 w-32 sm:w-48"
                      />
                    </div>

                    {/* Date dropdown */}
                    <div className="relative" ref={cashReturnDatePickerRef}>
                      <button
                        onClick={() => { setShowCashReturnDatePicker(v => !v); setShowCashReturnMonthPicker(false); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${cashReturnFilterDate ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150'
                          }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{cashReturnFilterDate
                          ? new Date(cashReturnFilterDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'All Dates'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showCashReturnDatePicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-64">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-700">Select Date</span>
                            {cashReturnFilterDate && (
                              <button
                                onClick={() => { setCashReturnFilterDate(''); setShowCashReturnDatePicker(false); applyCashReturnFilters(''); }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                              >Clear</button>
                            )}
                          </div>
                          <input
                            type="date"
                            value={cashReturnFilterDate}
                            onChange={e => { setCashReturnFilterDate(e.target.value); setShowCashReturnDatePicker(false); applyCashReturnFilters(e.target.value); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Month dropdown */}
                    <div className="relative" ref={cashReturnMonthPickerRef}>
                      <button
                        onClick={() => { setShowCashReturnMonthPicker(v => !v); setShowCashReturnDatePicker(false); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${cashReturnFilterMonth ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150'
                          }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{cashReturnFilterMonth
                          ? new Date(cashReturnFilterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : 'All Months'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showCashReturnMonthPicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-4 w-64">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-700">Select Month</span>
                            {cashReturnFilterMonth && (
                              <button
                                onClick={() => { setCashReturnFilterMonth(''); setShowCashReturnMonthPicker(false); applyCashReturnFilters(cashReturnFilterDate, ''); }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
                              >Clear</button>
                            )}
                          </div>
                          <input
                            type="month"
                            value={cashReturnFilterMonth}
                            onChange={e => {
                              setCashReturnFilterMonth(e.target.value);
                              setCashReturnFilterDate('');
                              setShowCashReturnMonthPicker(false);
                              applyCashReturnFilters('', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <div className="min-w-[800px]">
                    {/* Fixed header */}
                    <div className="bg-gray-50 border-b border-gray-200 rounded-t-xl overflow-hidden">
                      <table className="w-full table-fixed text-left border-collapse">
                        <colgroup>
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '15%' }} />
                        </colgroup>
                        <thead>
                          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="pl-8 pr-4 py-3 text-left">Returned By</th>
                            <th className="px-4 py-3 text-left">Reason</th>
                            <th className="px-4 py-3 text-center">Type</th>
                            <th className="px-4 py-3 text-center">Date</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                      </table>
                    </div>

                    {/* Scrollable body */}
                    <div className="overflow-y-auto max-h-[400px]">
                      <table className="w-full table-fixed text-left border-collapse">
                        <colgroup>
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '15%' }} />
                        </colgroup>
                        <tbody className={`divide-y divide-slate-200 text-xs ${loadingCashReturn && cashReturnDeposits.length > 0 ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
                          {loadingCashReturn && cashReturnDeposits.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                          ) : cashReturnDeposits.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-12 text-center h-28">
                                <div className="min-h-28 flex flex-col items-center justify-center space-y-2 text-gray-400">
                                  <Coins className="h-7 w-7 opacity-30" />
                                  <p className="text-xs font-semibold">No cash returns recorded</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            cashReturnDeposits.map(dep => {
                              const isExpanded = expandedCashReturnIds.has(dep.id);
                              return (
                              <tr key={dep.id} onClick={() => toggleCashReturnExpand(dep.id)} className="hover:bg-amber-50/30 transition-colors cursor-pointer">
                                <td className="pl-8 pr-4 py-3 w-[25%]">
                                  <span className={`font-bold text-gray-800 ${isExpanded ? 'whitespace-normal break-words block' : 'truncate block'}`}>{dep.returned_by}</span>
                                </td>
                                <td className="px-4 py-3 w-[20%]">
                                  <span className={`text-gray-600 ${isExpanded ? 'whitespace-normal break-words block' : 'truncate block'}`} title={dep.reason || ''}>{dep.reason || '-'}</span>
                                </td>
                                <td className="px-4 py-3 w-[15%] text-center">
                                  <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded-full ${dep.type === 'Canteen' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {dep.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 w-[15%] text-center text-gray-500 font-medium text-[11px]">
                                  {new Date(dep.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3 w-[10%] text-right font-bold text-amber-600 whitespace-nowrap">{formatCurrency(dep.amount)}</td>
                                <td className="px-4 py-3 w-[15%] text-center" onClick={(e) => e.stopPropagation()}>
                                  {!isViewMode && (
                                    <div className="flex items-center justify-center space-x-1">
                                      <button onClick={() => handleEditCashReturn(dep)} title="Edit" className="p-1 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => openDeleteModal(dep.id, dep.returned_by, 'cash-return')} title="Delete" className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )})
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ INCOME MODAL ══════════════ */}
          {showModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-gray-900">{editingId !== null ? 'Edit Payment' : 'Record New Payment'}</h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>

                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Modal Tabs */}
                {!editingId && (
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      onClick={() => {
                        setIncomeModalTab('consignee');
                        setForm(EMPTY_INCOME_FORM);
                        setConsigneeQuery('');
                      }}
                      className={`flex-1 pb-2 text-xs font-bold tracking-tight transition-colors border-b-2 ${incomeModalTab === 'consignee' ? 'border-[#006B4D] text-[#006B4D]' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Consignee Payment
                    </button>
                    <button
                      onClick={() => {
                        setIncomeModalTab('external');
                        setForm(EMPTY_INCOME_FORM);
                        setConsigneeQuery('');
                      }}
                      className={`flex-1 pb-2 text-xs font-bold tracking-tight transition-colors border-b-2 ${incomeModalTab === 'external' ? 'border-[#006B4D] text-[#006B4D]' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      External Source
                    </button>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  {incomeModalTab === 'consignee' ? (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Consignee Name</label>
                      <div className="relative" ref={suggestRef}>
                        <input
                          type="text"
                          value={consigneeQuery}
                          onChange={e => handleConsigneeInput(e.target.value)}
                          placeholder="Search consignee..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                        />
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
                            {suggestions.map(c => (
                              <button key={c.id} onClick={() => handleSelectConsignee(c)} className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center justify-between">
                                <span>{c.vendor_name}</span>
                                <span className="text-[10px] text-gray-400">{c.stall_no}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Source Name</label>
                      <div className="relative" ref={externalSuggestRef}>
                        <input
                          type="text"
                          value={form.consignee_name}
                          onChange={e => {
                            setForm(prev => ({ ...prev, consignee_name: e.target.value }));
                            setShowExternalSuggestions(true);
                          }}
                          onFocus={() => setShowExternalSuggestions(true)}
                          placeholder="Enter external source name..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                        />
                        {showExternalSuggestions && 'Coconut'.toLowerCase().includes(form.consignee_name.toLowerCase()) && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
                            <button
                              onClick={() => {
                                setForm(prev => ({ ...prev, consignee_name: 'Coconut' }));
                                setShowExternalSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center justify-between"
                            >
                              <span>Coconut</span>
                              <span className="text-[10px] text-gray-400">External Category</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Amount</label>
                    <input type="number" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]">
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveIncome} disabled={saving || !form.consignee_name || !form.amount} className="flex-1 px-4 py-2 bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
                    {saving ? 'Saving...' : editingId !== null ? 'Save Changes' : 'Record Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ EXPENSES MODAL ══════════════ */}
          {showExpenseModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-gray-900">{editingExpenseId !== null ? 'Edit Expense' : 'Record New Expense'}</h2>
                  <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>

                {/* Modal Tabs */}
                {!editingExpenseId && (
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      onClick={() => setExpenseModalTab('canteen')}
                      className={`flex-1 pb-2 text-xs font-bold tracking-tight transition-colors border-b-2 ${expenseModalTab === 'canteen' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Canteen Expenses
                    </button>
                    <button
                      onClick={() => setExpenseModalTab('coconut')}
                      className={`flex-1 pb-2 text-xs font-bold tracking-tight transition-colors border-b-2 ${expenseModalTab === 'coconut' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Coconut Expenses
                    </button>
                  </div>
                )}

                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Expense Name</label>
                    <input
                      type="text"
                      value={expenseForm.name}
                      onChange={e => setExpenseForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Utilities, Supplies..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Requested By</label>
                    <input
                      type="text"
                      value={expenseForm.requested_by}
                      onChange={e => setExpenseForm(prev => ({ ...prev, requested_by: e.target.value }))}
                      placeholder="e.g. John Doe, PTA..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reason (Optional)</label>
                    <input
                      type="text"
                      value={expenseForm.reason}
                      onChange={e => setExpenseForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Additional details..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Amount</label>
                    <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-600" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Date</label>
                    <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-600" />
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button onClick={() => setShowExpenseModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveExpense} disabled={saving || !expenseForm.name || !expenseForm.amount} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
                    {saving ? 'Saving...' : editingExpenseId !== null ? 'Save Changes' : 'Record Expense'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ CASH RETURN MODAL ══════════════ */}
          {showCashReturnModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-gray-900">{editingCashReturnId !== null ? 'Edit Cash Return' : 'Record New Cash Return'}</h2>
                  <button onClick={() => setShowCashReturnModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>

                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Modal Tabs */}
                {!editingCashReturnId && (
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      onClick={() => {
                        setCashReturnModalTab('Canteen');
                        setCashReturnForm(EMPTY_CASH_RETURN_FORM);
                      }}
                      className={`flex-1 pb-2 text-xs font-bold tracking-tight transition-colors border-b-2 ${cashReturnModalTab === 'Canteen' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Canteen Cash Return
                    </button>
                    <button
                      onClick={() => {
                        setCashReturnModalTab('Coconut');
                        setCashReturnForm(EMPTY_CASH_RETURN_FORM);
                      }}
                      className={`flex-1 pb-2 text-xs font-bold tracking-tight transition-colors border-b-2 ${cashReturnModalTab === 'Coconut' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Coconut Cash Return
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Returned By</label>
                    <input
                      type="text"
                      value={cashReturnForm.returned_by}
                      onChange={e => setCashReturnForm(prev => ({ ...prev, returned_by: e.target.value }))}
                      placeholder="e.g. John Doe, PTA..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reason (Optional)</label>
                    <input
                      type="text"
                      value={cashReturnForm.reason}
                      onChange={e => setCashReturnForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Additional details..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Amount</label>
                    <input type="number" value={cashReturnForm.amount} onChange={e => setCashReturnForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Date</label>
                    <input type="date" value={cashReturnForm.date} onChange={e => setCashReturnForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button onClick={() => setShowCashReturnModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveCashReturn} disabled={saving || !cashReturnForm.returned_by || !cashReturnForm.amount} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
                    {saving ? 'Saving...' : editingCashReturnId !== null ? 'Save Changes' : 'Record Return'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <IncomePDFExport
            isOpen={showIncomePDFModal}
            onClose={() => setShowIncomePDFModal(false)}
            schoolYear={schoolYear}
          />

          <ExpensePDFExport
            isOpen={showExpensePDFModal}
            onClose={() => setShowExpensePDFModal(false)}
            schoolYear={schoolYear}
          />

          <DeleteModal
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            title={deleteItemType === 'income' ? 'Delete Payment' : 'Delete Expense'}
            message={`Are you sure you want to delete this ${deleteItemType === 'income' ? 'payment from' : 'expense'}`}
            itemName={deleteItemName}
            isDeleting={isDeleting}
          />
        </main>
      </div>
    </div>
  );
}