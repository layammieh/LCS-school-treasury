/**
 * Base API client for communicating with the Django backend.
 * All requests automatically include the auth token from localStorage.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('view_mode');
      window.location.href = '/';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    console.error('API Error:', error);
    throw new Error(error.detail || error.error || JSON.stringify(error) || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) return {} as T;

  return response.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; username: string; full_name: string; email: string; bio?: string; avatar?: string }>(
      '/auth/login/',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    ),

  register: (username: string, email: string, password: string, fullName: string) =>
    request<{ token: string; username: string; full_name: string; email: string; bio?: string; avatar?: string }>(
      '/auth/register/',
      { method: 'POST', body: JSON.stringify({ username, email, password, fullName }) }
    ),

  logout: () =>
    request<void>('/auth/logout/', { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export const profileApi = {
  getProfile: () => request<{ username: string; full_name: string; email: string; bio?: string; avatar?: string }>('/auth/profile/'),

  updateProfile: (data: FormData) =>
    request<{ username: string; full_name: string; email: string; bio?: string; avatar?: string }>(
      '/auth/profile/',
      { method: 'PUT', body: data }
    ),

  changePassword: (data: any) =>
    request<{ detail: string }>('/auth/change-password/', { method: 'POST', body: JSON.stringify(data) })
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

export interface DashboardStats {
  total_collections: number;
  outstanding_fees: number;
  total_expenses: number;
  available_balance: number;
  total_coconut_collections: number;
  total_coconut_expenses: number;
  coconut_balance: number;
  canteen_cash_return: number;
  coconut_cash_return: number;
  canteen_cash_on_bank: number;
  coconut_cash_on_bank: number;
  monthly_chart: MonthlyData[];
  recent_transactions: Transaction[];
}

export const dashboardApi = {
  getStats: (schoolYear?: string, month?: string) => {
    const qs = new URLSearchParams();
    if (schoolYear) qs.set('school_year', schoolYear);
    if (month) qs.set('month', month);
    const queryString = qs.toString();
    return request<DashboardStats>(`/dashboard/${queryString ? '?' + queryString : ''}`);
  },
};

// ---------------------------------------------------------------------------
// Consignees
// ---------------------------------------------------------------------------
export interface Consignee {
  id: number;
  vendor_name: string;
  stall_no: string;
  contact_person: string;
  phone: string;
  status: 'active' | 'inactive';
  date_registered: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const consigneesApi = {
  list: (params?: { search?: string; status?: string; page?: number; schoolYear?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    return request<PaginatedResponse<Consignee>>(`/consignees/?${qs}`);
  },

  create: (data: Omit<Consignee, 'id'>) =>
    request<Consignee>('/consignees/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Consignee>) =>
    request<Consignee>(`/consignees/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<void>(`/consignees/${id}/`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export interface Transaction {
  id: number;
  transaction_type: 'collection' | 'ledger';
  student_name?: string;
  student_initials?: string;
  grade_section?: string;
  id_number?: string;
  description?: string;
  debit?: number | null;
  credit?: number | null;
  running_balance?: number | null;
  amount: number;
  category: string;
  canteen?: string;
  status: string;
  date: string;
  time?: string;
}

export interface CollectionSummary {
  total_collected: number;
  outstanding: number;
  overdue_count: number;
  efficiency: number;
  total_coconut: number;
  total_canteen: number;
}

export interface LedgerSummary {
  total_debit: number;
  total_credit: number;
  current_balance: number;
}

export const transactionsApi = {
  listCollections: (params?: { status?: string; date?: string; month?: string; search?: string; page?: number; schoolYear?: string; canteen?: string }) => {
    const qs = new URLSearchParams({ type: 'collection' });
    if (params?.status) qs.set('status', params.status);
    if (params?.date) qs.set('date', params.date);
    if (params?.month) qs.set('month', params.month);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    if (params?.canteen) qs.set('canteen', params.canteen);
    return request<PaginatedResponse<Transaction>>(`/transactions/?${qs}`);
  },

  listLedger: (params?: { status?: string; search?: string; page?: number; schoolYear?: string; canteen?: string }) => {
    const qs = new URLSearchParams({ type: 'ledger' });
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    if (params?.canteen) qs.set('canteen', params.canteen);
    return request<PaginatedResponse<Transaction>>(`/transactions/?${qs}`);
  },

  create: (data: Omit<Transaction, 'id'>) =>
    request<Transaction>('/transactions/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Transaction>) =>
    request<Transaction>(`/transactions/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<void>(`/transactions/${id}/`, { method: 'DELETE' }),

  bulkPaid: (ids: number[]) =>
    request<{ updated: number }>('/transactions/bulk-paid/', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  bulkDelete: (ids: number[]) =>
    request<{ deleted: number }>('/transactions/bulk-delete/', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  collectionSummary: (date?: string, month?: string, schoolYear?: string, canteen?: string) => {
    const qs = new URLSearchParams();
    if (date) qs.set('date', date);
    if (month) qs.set('month', month);
    if (schoolYear) qs.set('school_year', schoolYear);
    if (canteen) qs.set('canteen', canteen);
    return request<CollectionSummary>(`/transactions/summary/?${qs.toString()}`);
  },

  ledgerSummary: (schoolYear?: string) => {
    const qs = new URLSearchParams();
    if (schoolYear) qs.set('school_year', schoolYear);
    return request<LedgerSummary>(`/transactions/ledger-summary/?${qs.toString()}`);
  },

  getTotalIncome: () => request<{ total_income: number }>('/transactions/total-income/'),
};

// ---------------------------------------------------------------------------
// Revenue Distribution
// ---------------------------------------------------------------------------
export interface DistributionRecipient {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

export interface Distribution {
  recipients: DistributionRecipient[];
  total_amount: number;
  date: string;
}

export const revenueApi = {
  saveDistribution: (data: Distribution) =>
    request<Distribution>('/revenue/distribution/', { method: 'POST', body: JSON.stringify(data) }),
};


// ---------------------------------------------------------------------------
// Revenue Recipients (database-backed)
// ---------------------------------------------------------------------------
export interface RevenueRecipient {
  id: number;
  name: string;
  percentage: number;
  icon: string;
  color: string;
  order: number;
  school_year?: string;
}

export const revenueRecipientsApi = {
  list: (params?: { schoolYear?: string; user_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    if (params?.user_id) qs.set('user_id', String(params.user_id));
    return request<PaginatedResponse<RevenueRecipient>>(`/revenue-recipients/?${qs}`);
  },

  create: (data: Omit<RevenueRecipient, 'id'>) =>
    request<RevenueRecipient>('/revenue-recipients/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Omit<RevenueRecipient, 'id'>>) =>
    request<RevenueRecipient>(`/revenue-recipients/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<void>(`/revenue-recipients/${id}/`, { method: 'DELETE' }),
};





// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export interface Expense {
  id: number;
  school_year: string;
  name: string;
  requested_by?: string | null;
  amount: number;
  date: string;
  reason?: string | null;
}

export interface ExpenseSummary {
  total_expenses: number;
  total_canteen: number;
  total_coconut: number;
  expense_count: number;
  highest_expense: number;
  highest_expense_name: string;
  latest_expense_date: string;
}

export const expensesApi = {
  list: (params?: { date?: string; month?: string; search?: string; page?: number; schoolYear?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    if (params?.month) qs.set('month', params.month);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    return request<PaginatedResponse<Expense>>(`/expenses/?${qs}`);
  },

  create: (data: Omit<Expense, 'id'>) =>
    request<Expense>('/expenses/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Omit<Expense, 'id'>>) =>
    request<Expense>(`/expenses/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<void>(`/expenses/${id}/`, { method: 'DELETE' }),

  summary: (params?: { date?: string; month?: string; schoolYear?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    if (params?.month) qs.set('month', params.month);
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    return request<ExpenseSummary>(`/expenses/expense-summary/?${qs}`);
  },
};

// ---------------------------------------------------------------------------
// Liquidations
// ---------------------------------------------------------------------------
export interface Liquidation {
  id: number;
  school_year: string;
  month: string;
  cash_deposit: number;
  cash_withdrawn: number;
  remarks: string;
  income: number;
  expenses: number;
}

export const liquidationApi = {
  list: (params?: { schoolYear?: string }) => {
    const qs = new URLSearchParams();
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    return request<PaginatedResponse<Liquidation>>(`/liquidations/?${qs}`);
  },

  create: (data: Partial<Liquidation>) =>
    request<Liquidation>('/liquidations/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Liquidation>) =>
    request<Liquidation>(`/liquidations/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<void>(`/liquidations/${id}/`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Cash on Bank
// ---------------------------------------------------------------------------
export interface CashOnBankDeposit {
  id: number;
  school_year: string;
  type: string;
  amount: number;
  date: string;
  updated_at: string;
}

export const cashOnBankApi = {
  list: (schoolYear: string, month?: string) => {
    const qs = new URLSearchParams();
    if (schoolYear) qs.set('school_year', schoolYear);
    if (month) qs.set('month', month);
    return request<PaginatedResponse<CashOnBankDeposit>>(`/cash-on-bank/?${qs}`);
  },

  create: (data: { school_year: string; type: string; amount: number; date: string }) =>
    request<CashOnBankDeposit>('/cash-on-bank/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { school_year: string; type: string; amount: number; date: string }) =>
    request<CashOnBankDeposit>(`/cash-on-bank/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/cash-on-bank/${id}/`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Cash Return (Coconut)
// ---------------------------------------------------------------------------
export interface CashReturnDeposit {
  id: number;
  school_year: string;
  returned_by: string;
  type: string;
  amount: number;
  date: string;
  reason: string | null;
  updated_at: string;
}

export const cashReturnApi = {
  list: (params?: { schoolYear?: string; page?: number; date?: string; month?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.schoolYear) qs.set('school_year', params.schoolYear);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.date) qs.set('date', params.date);
    if (params?.month) qs.set('month', params.month);
    if (params?.search) qs.set('search', params.search);
    return request<PaginatedResponse<CashReturnDeposit>>(`/cash-return/?${qs}`);
  },

  create: (data: { school_year: string; returned_by: string; type: string; amount: number; date: string; reason?: string }) =>
    request<CashReturnDeposit>('/cash-return/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { school_year: string; returned_by: string; type: string; amount: number; date: string; reason?: string }) =>
    request<CashReturnDeposit>(`/cash-return/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/cash-return/${id}/`, { method: 'DELETE' }),
};
