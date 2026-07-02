import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSchoolYearStore } from '../store/schoolYearStore';
import {
  Settings,
  ExternalLink,
  Coins,
  CreditCard,
  Wallet,
  Calendar,
  ChevronDown,
  Loader2,
  TrendingUp,
  Activity
} from 'lucide-react';
import { dashboardApi } from '../lib/api';
import type { DashboardStats, Transaction } from '../lib/api';

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'PHP' });
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
    dashboardApi.getStats(schoolYear, filterMonth)
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolYear, filterMonth]);

  // Build SVG chart path from monthly data
  const buildChartPath = (data: { revenue: number; expenses: number }[], key: 'revenue' | 'expenses') => {
    if (!data.length) return '';
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
    const w = 600;
    const h = 180;
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (d[key] / maxVal) * (h - 20);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const buildAreaPath = (data: { revenue: number }[]) => {
    if (!data.length) return '';
    const maxVal = Math.max(...data.map(d => d.revenue), 1);
    const w = 600;
    const h = 180;
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (d.revenue / maxVal) * (h - 20);
      return `${x},${y}`;
    });
    return `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} L 600,${h} L 0,${h} Z`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <Sidebar activePage="dashboard" />

      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Header />

        <main className="flex-1 p-8 space-y-6">
          
          {/* Dashboard Head */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-955 tracking-tight leading-none">Financial Dashboard</h1>
              <p className="text-xs text-gray-500 mt-1">Overview of Lumbia Central School fiscal status.</p>
            </div>
            <div className="relative" ref={monthPickerRef}>
              <button
                onClick={() => setShowMonthPicker(v => !v)}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  filterMonth ? 'bg-[#006B4D] text-white border-[#006B4D]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
                        onClick={() => { setFilterMonth(''); setShowMonthPicker(false); }}
                        className="text-[10px] text-red-500 hover:text-red-700 font-semibold"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                  />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-lg">
              Failed to load dashboard: {error}
            </div>
          )}

          {/* Cards Grid */}
          {/* Canteen Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Canteen</h3>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Income */}
            <div 
              onClick={() => navigate('/collections', { state: { tab: 'income' } })}
              className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-green-50 active:bg-green-100 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="bg-[#4ade80]/10 p-2 rounded-lg text-[#006B4D]">
                  <Coins className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Total Income - CANTEEN{filterMonth ? ` · ${new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
                </span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  {loading ? '...' : formatCurrency(stats?.total_collections ?? 0)}
                </p>
              </div>
            </div>

            {/* Total Expenses */}
            <div 
              onClick={() => navigate('/collections', { state: { tab: 'expenses' } })}
              className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-green-50 active:bg-green-100 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="bg-red-50 p-2 rounded-lg text-red-600">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Total Expenses - CANTEEN{filterMonth ? ` · ${new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
                </span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  {loading ? '...' : formatCurrency(stats?.total_expenses ?? 0)}
                </p>
              </div>
            </div>

            {/* Total Balance */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Total Balance - CANTEEN{filterMonth ? ` · ${new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
                </span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  {loading ? '...' : formatCurrency((stats?.total_collections ?? 0) - (stats?.total_expenses ?? 0))}
                </p>
              </div>
            </div>
          </div>
          </div>

          {/* Coconut Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Coconut</h3>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Collected - COCONUT */}
            <div 
              onClick={() => navigate('/collections', { state: { tab: 'income' } })}
              className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-green-50 active:bg-green-100 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="bg-[#4ade80]/15 p-2 rounded-lg text-[#006B4D]">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Total Collected - COCONUT{filterMonth ? ` · ${new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
                </span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  {loading ? '...' : formatCurrency(stats?.total_coconut_collections ?? 0)}
                </p>
              </div>
            </div>

            {/* Total Expenses - COCONUT */}
            <div 
              onClick={() => navigate('/collections', { state: { tab: 'expenses' } })}
              className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-green-50 active:bg-green-100 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="bg-red-50 p-2 rounded-lg text-red-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Total Expenses - COCONUT{filterMonth ? ` · ${new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
                </span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  {loading ? '...' : formatCurrency(stats?.total_coconut_expenses ?? 0)}
                </p>
              </div>
            </div>

            {/* Total Balance - COCONUT */}
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Total Balance - COCONUT{filterMonth ? ` · ${new Date(filterMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
                </span>
                <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  {loading ? '...' : formatCurrency(stats?.coconut_balance ?? 0)}
                </p>
              </div>
            </div>
          </div>
          </div>

          {/* Financial Overview Graph */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">Financial Overview</h3>
                  <p className="text-[10px] text-gray-500">Revenue & Expenses over time (Jan - Dec)</p>
                </div>
                <button className="flex items-center space-x-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-150 text-gray-700 text-[10px] font-semibold rounded-lg border border-gray-200 transition-colors">
                  <span>{schoolYear}</span>
                </button>
              </div>

              <div className="overflow-x-auto w-full pb-4">
                <div className="min-w-[600px]">
                  <div className="relative flex-1 min-h-[220px] flex items-end">
                <svg className="w-full h-[180px]" viewBox="0 0 600 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="75" x2="600" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="120" x2="600" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="165" x2="600" y2="165" stroke="#f1f5f9" strokeWidth="1" />

                  {stats?.monthly_chart && stats.monthly_chart.length > 1 && (
                    <>
                      {/* Revenue area + line */}
                      <path d={buildAreaPath(stats.monthly_chart)} fill="url(#chartGradient)" />
                      <path d={buildChartPath(stats.monthly_chart, 'revenue')} fill="none" stroke="#006B4D" strokeWidth="2.5" strokeLinecap="round" />
                      {/* Expenses area + line */}
                      <path
                        d={(() => {
                          const data = stats.monthly_chart;
                          const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
                          const w = 600; const h = 180;
                          const pts = data.map((d, i) => {
                            const x = (i / (data.length - 1)) * w;
                            const y = h - (d.expenses / maxVal) * (h - 20);
                            return `${x},${y}`;
                          });
                          return `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} L 600,${h} L 0,${h} Z`;
                        })()}
                        fill="url(#expenseGradient)"
                      />
                      <path d={buildChartPath(stats.monthly_chart, 'expenses')} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="5,3" />
                    </>
                  )}
                </svg>

                <div className="absolute bottom-[-15px] left-0 right-0 flex justify-between px-2 text-[9px] text-gray-400 font-semibold uppercase">
                  {(stats?.monthly_chart ?? []).map(m => (
                    <span key={m.month}>{m.month}</span>
                  ))}
                </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-5 mt-6 text-[10px] font-semibold text-gray-600 justify-start">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#006B4D]"></span>
                  <span>Revenue</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400"></span>
                  <span>Expenses</span>
                </div>
              </div>
            </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border border-slate-100/60 shadow-md shadow-slate-200/60 overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100/40">
              <h3 className="text-sm font-bold text-gray-900">Recent Transactions</h3>
              <div className="flex space-x-3 text-gray-400">
                <button className="hover:text-gray-600"><Settings className="h-4.5 w-4.5" /></button>
                <button className="hover:text-gray-600"><ExternalLink className="h-4.5 w-4.5" /></button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-slate-100/60 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Vendor</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-200 text-xs ${loading && stats ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
                  {loading && !stats ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
                  ) : (stats?.recent_transactions ?? []).map((txn: Transaction) => (
                    <tr key={txn.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3.5 font-bold text-gray-800">{txn.student_name}</td>
                      <td className="px-6 py-3.5 text-gray-500 font-medium">
                        {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-md">{txn.category}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-gray-800">{formatCurrency(txn.amount)}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wide ${getStatusBadge(txn.status)}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <a href="#view" className="text-gray-400 hover:text-gray-600 font-semibold text-[11px] underline">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 flex justify-between items-center bg-gray-50 border-t border-slate-100/40 text-[11px] text-gray-500">
              <span>Showing {stats?.recent_transactions?.length ?? 0} recent transactions</span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-white border border-gray-200 rounded-md font-semibold text-gray-700 hover:bg-gray-50">Previous</button>
                <button className="px-3 py-1 bg-white border border-gray-200 rounded-md font-semibold text-gray-700 hover:bg-gray-50">Next</button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
