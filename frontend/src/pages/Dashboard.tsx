import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSchoolYearStore } from '../store/schoolYearStore';
import {
  Coins,
  CreditCard,
  Wallet,
  Calendar,
  ChevronDown,
  Loader2,
  TrendingUp,
  Activity,
  Landmark,
  AlertCircle
} from 'lucide-react';
import { dashboardApi, cashOnBankApi } from '../lib/api';
import type { DashboardStats, Transaction } from '../lib/api';

function formatCurrency(n: any) {
  const num = Number(n);
  if (isNaN(num)) return '₱0.00';
  return num.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-green-50 text-green-700',
    pending: 'bg-amber-50 text-amber-700',
    overdue: 'bg-red-50 text-red-700',
    unpaid: 'bg-red-50 text-red-700',
    partial: 'bg-gray-100 text-gray-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}

export default function Dashboard() {
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const [cashOnBank, setCashOnBank] = useState(0);

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
    setLoading(true);
    Promise.all([
      dashboardApi.getStats(schoolYear, filterMonth),
      cashOnBankApi.list(schoolYear, filterMonth)
    ])
      .then(([statsRes, cobRes]) => {
        setStats(statsRes);
        setCashOnBank(cobRes.results.reduce((acc, d) => acc + Number(d.amount || 0), 0));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolYear, filterMonth]);



  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      <Sidebar activePage="dashboard" />

      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Header />

        <main className="flex-1 p-8 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
          
          {/* Dashboard Head */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Financial Overview</h1>
              <p className="text-sm text-slate-500 mt-2 font-medium">Real-time insights and fiscal status for Lumbia Central School.</p>
            </div>
            <div className="relative" ref={monthPickerRef}>
              <button
                onClick={() => setShowMonthPicker(v => !v)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all duration-300 shadow-sm ${
                  filterMonth ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:shadow-md'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>{filterMonth
                  ? new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : 'All Months'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
              {showMonthPicker && (
                <div className="absolute right-0 top-full mt-2 bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-2xl z-30 p-5 w-72 transform origin-top-right transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-slate-800">Select Month</span>
                    {filterMonth && (
                      <button
                        onClick={() => { setFilterMonth(''); setShowMonthPicker(false); }}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-colors"
                      >Clear</button>
                    )}
                  </div>
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={e => { 
                      setFilterMonth(e.target.value); 
                      setShowMonthPicker(false); 
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-slate-50/50 transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-rose-50/80 backdrop-blur-sm border border-rose-200/50 text-rose-700 text-sm font-medium px-5 py-4 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span>Failed to load dashboard: {error}</span>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="space-y-8">
            {/* Canteen Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Canteen</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Income */}
                <div 
                  onClick={() => navigate('/collections', { state: { tab: 'income' } })}
                  className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                    <Coins className="w-24 h-24 text-emerald-600 transform group-hover:scale-110 transition-transform duration-500 rotate-12" />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                      <Coins className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto relative z-10">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
                      Total Income
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-emerald-900 transition-colors">
                      {loading ? '...' : formatCurrency(stats?.total_collections ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Total Expenses */}
                <div 
                  onClick={() => navigate('/collections', { state: { tab: 'expenses' } })}
                  className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                    <CreditCard className="w-24 h-24 text-rose-600 transform group-hover:scale-110 transition-transform duration-500 -rotate-12" />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                      <CreditCard className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto relative z-10">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider group-hover:text-rose-700 transition-colors">
                      Total Expenses
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-rose-900 transition-colors">
                      {loading ? '...' : formatCurrency(stats?.total_expenses ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Total Balance */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-lg shadow-indigo-200 flex flex-col justify-between h-40 group hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                    <Wallet className="w-24 h-24 text-white transform group-hover:scale-110 transition-transform duration-500 rotate-12" />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-2xl text-white">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto relative z-10">
                    <span className="text-xs text-indigo-100 font-medium uppercase tracking-wider">
                      Total Balance
                    </span>
                    <p className="text-3xl font-extrabold text-white tracking-tight mt-1">
                      {loading ? '...' : formatCurrency((Number(stats?.total_collections || 0) - Number(stats?.total_expenses || 0)) + Number(stats?.canteen_cash_return || 0))}
                    </p>
                  </div>
                </div>
                
                {/* Cash on Hand */}
                <div
                  onClick={() => navigate('/collections', { state: { tab: 'cash-on-bank' } })}
                  className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div className="bg-sky-50 p-2.5 rounded-2xl text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                      <Coins className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto relative z-10">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider group-hover:text-sky-700 transition-colors">
                      Cash on Hand
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-sky-900 transition-colors">
                      {loading ? '...' : formatCurrency((Number(stats?.total_collections || 0) - Number(stats?.total_expenses || 0) + Number(stats?.canteen_cash_return || 0)) - Number(cashOnBank))}
                    </p>
                  </div>
                </div>

              </div>
              
              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                {/* Cash on Bank */}
                <div
                  onClick={() => navigate('/collections', { state: { tab: 'cash-on-bank' } })}
                  className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer group hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cash on Bank</span>
                      <p className="text-lg font-bold text-slate-900 tracking-tight">{loading ? '...' : formatCurrency(cashOnBank)}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-300 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Cash Return */}
                <div
                  onClick={() => navigate('/collections', { state: { tab: 'cash-return' } })}
                  className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer group hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-50 p-3 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cash Return</span>
                      <p className="text-lg font-bold text-slate-900 tracking-tight">{loading ? '...' : formatCurrency(stats?.canteen_cash_return ?? 0)}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-300 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>

            {/* Coconut Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Coconut</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Collected */}
                <div 
                  onClick={() => navigate('/collections', { state: { tab: 'income' } })}
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-36"
                >
                  <div className="flex justify-between items-start">
                    <div className="bg-orange-50 p-2.5 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-orange-600 transition-colors">Total Collected</span>
                    <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-orange-700 transition-colors">
                      {loading ? '...' : formatCurrency(stats?.total_coconut_collections ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Total Expenses */}
                <div 
                  onClick={() => navigate('/collections', { state: { tab: 'expenses' } })}
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-36"
                >
                  <div className="flex justify-between items-start">
                    <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                      <Activity className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-rose-600 transition-colors">Total Expenses</span>
                    <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-rose-700 transition-colors">
                      {loading ? '...' : formatCurrency(stats?.total_coconut_expenses ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Total Balance */}
                <div 
                  className="bg-slate-900 p-5 rounded-3xl shadow-[0_10px_40px_-10px_rgba(15,23,42,0.5)] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.6)] transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="bg-slate-800 p-2.5 rounded-2xl text-orange-400">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto relative z-10">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Balance</span>
                    <p className="text-2xl font-extrabold text-white tracking-tight mt-1">
                      {loading ? '...' : formatCurrency((stats?.coconut_balance ?? 0) + (stats?.coconut_cash_return ?? 0))}
                    </p>
                  </div>
                </div>

                {/* Cash Return */}
                <div
                  onClick={() => navigate('/collections', { state: { tab: 'cash-return' } })}
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-36"
                >
                  <div className="flex justify-between items-start">
                    <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                      <Coins className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-auto">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-amber-600 transition-colors">Cash Return</span>
                    <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-amber-700 transition-colors">
                      {loading ? '...' : formatCurrency(stats?.coconut_cash_return ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Overview Graph & Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Revenue & Expenses</h3>
                  <p className="text-sm text-slate-500 font-medium">Monthly trend for {schoolYear}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                    <span>Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm"></span>
                    <span>Expenses</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full relative min-h-[260px]">
                <div className="absolute inset-0 flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[40, 90, 140, 190, 240].map((y, i) => (
                      <line key={i} x1="0" y1={y} x2="600" y2={y} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />
                    ))}

                    {stats?.monthly_chart && stats.monthly_chart.length > 1 && (
                      <>
                        {/* Revenue area + line */}
                        <path 
                          d={(() => {
                            const data = stats.monthly_chart;
                            const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
                            const w = 600; const h = 240;
                            const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.revenue / maxVal) * (h - 20)}`);
                            return `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} L 600,${h} L 0,${h} Z`;
                          })()} 
                          fill="url(#chartGradient)" 
                        />
                        <path 
                          d={(() => {
                            const data = stats.monthly_chart;
                            const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
                            const w = 600; const h = 240;
                            return `M ${data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.revenue / maxVal) * (h - 20)}`).join(' L ')}`;
                          })()} 
                          fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
                        />
                        
                        {/* Expenses area + line */}
                        <path
                          d={(() => {
                            const data = stats.monthly_chart;
                            const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
                            const w = 600; const h = 240;
                            const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.expenses / maxVal) * (h - 20)}`);
                            return `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} L 600,${h} L 0,${h} Z`;
                          })()}
                          fill="url(#expenseGradient)"
                        />
                        <path 
                          d={(() => {
                            const data = stats.monthly_chart;
                            const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
                            const w = 600; const h = 240;
                            return `M ${data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.expenses / maxVal) * (h - 20)}`).join(' L ')}`;
                          })()} 
                          fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="6,6" strokeLinecap="round" strokeLinejoin="round" 
                        />
                      </>
                    )}
                  </svg>
                </div>
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {(stats?.monthly_chart ?? []).map(m => (
                    <span key={m.month}>{m.month.substring(0,3)}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions List */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-extrabold text-slate-800">Recent Transactions</h3>
                <button 
                  onClick={() => navigate('/collections')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[340px]">
                <div className="divide-y divide-slate-100">
                  {loading && !stats ? (
                    <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                  ) : (stats?.recent_transactions ?? []).length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-400 font-medium">No recent transactions</div>
                  ) : (
                    (stats?.recent_transactions ?? []).map((txn: Transaction) => (
                      <div key={txn.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${txn.amount > 0 && txn.transaction_type === 'collection' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {txn.amount > 0 && txn.transaction_type === 'collection' ? <TrendingUp className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{txn.student_name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {txn.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${txn.amount > 0 && txn.transaction_type === 'collection' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {txn.amount > 0 && txn.transaction_type === 'collection' ? '+' : ''}{formatCurrency(txn.amount)}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-[8px] font-extrabold rounded-md uppercase tracking-widest ${getStatusBadge(txn.status)}`}>
                            {txn.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
