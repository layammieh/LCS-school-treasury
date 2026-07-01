import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSchoolYearStore } from '../store/schoolYearStore';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { liquidationApi, Liquidation as LiquidationType } from '../lib/api';
import { Plus, Loader2 } from 'lucide-react';

export default function Liquidation() {
  const { isViewMode } = useAuthStore();
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const [data, setData] = useState<LiquidationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newMonth, setNewMonth] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await liquidationApi.list({ schoolYear });
      setData(res.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolYear]);

  const handleAddMonth = async () => {
    if (!newMonth) return;
    try {
      setAdding(true);
      // Create liquidation entry for the month
      await liquidationApi.create({
        school_year: schoolYear,
        month: newMonth,
      });
      setNewMonth('');
      loadData();
    } catch (err) {
      alert("Failed to add month. It may already exist.");
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: number, field: keyof LiquidationType, value: any) => {
    // Optimistic update locally
    setData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    try {
      await liquidationApi.update(id, { [field]: value });
    } catch (err) {
      console.error(err);
      loadData(); // Revert on failure
    }
  };

  const totalIncome = data.reduce((sum, item) => sum + Number(item.income || 0), 0);
  const totalExpenses = data.reduce((sum, item) => sum + Number(item.expenses || 0), 0);
  const totalDeposit = data.reduce((sum, item) => sum + Number(item.cash_deposit || 0), 0);
  const totalWithdrawn = data.reduce((sum, item) => sum + Number(item.cash_withdrawn || 0), 0);
  const totalBalance = totalIncome - totalExpenses;

  const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar activePage="liquidation" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title="Liquidation Report" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Monthly Liquidation</h1>
              {!isViewMode && (
                <div className="flex items-center space-x-2">
                  <input
                    type="month"
                    value={newMonth}
                    onChange={e => setNewMonth(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                  />
                  <button
                    onClick={handleAddMonth}
                    disabled={!newMonth || adding}
                    className="flex items-center px-4 py-2 bg-[#006B4D] text-white text-sm font-bold rounded hover:bg-[#005a40] disabled:opacity-50"
                  >
                    {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Month
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#003D29] text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Month</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Income</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Expenses</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right whitespace-nowrap">Cash Deposit</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right whitespace-nowrap">Cash Withdrawn</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#006B4D]" />
                          Loading...
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No liquidation records found for this school year. Select a month above to start tracking.
                        </td>
                      </tr>
                    ) : (
                      data.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 uppercase">
                            {new Date(row.month + '-01').toLocaleDateString('en-US', { month: 'long' })}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[#006B4D]">
                            {fmt(Number(row.income))}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">
                            {fmt(Number(row.expenses))}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isViewMode ? (
                              <span className="font-medium">{fmt(Number(row.cash_deposit))}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                className="w-full min-w-[100px] text-right border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                                value={row.cash_deposit || ''}
                                onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, cash_deposit: Number(e.target.value) } : item))}
                                onBlur={e => handleUpdate(row.id, 'cash_deposit', Number(e.target.value) || 0)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isViewMode ? (
                              <span className="font-medium">{fmt(Number(row.cash_withdrawn))}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                className="w-full min-w-[100px] text-right border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                                value={row.cash_withdrawn || ''}
                                onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, cash_withdrawn: Number(e.target.value) } : item))}
                                onBlur={e => handleUpdate(row.id, 'cash_withdrawn', Number(e.target.value) || 0)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isViewMode ? (
                              <span className="text-gray-600">{row.remarks}</span>
                            ) : (
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                                value={row.remarks || ''}
                                onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, remarks: e.target.value } : item))}
                                onBlur={e => handleUpdate(row.id, 'remarks', e.target.value)}
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data.length > 0 && (
                    <tfoot className="bg-[#e8f5e9] border-t-2 border-[#003D29]">
                      <tr>
                        <td className="px-4 py-4 font-bold text-[#003D29] uppercase tracking-wider">TOTAL</td>
                        <td className="px-4 py-4 text-right font-bold text-[#006B4D] text-base">{fmt(totalIncome)}</td>
                        <td className="px-4 py-4 text-right font-bold text-red-600 text-base">{fmt(totalExpenses)}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-900 text-base">{totalDeposit > 0 ? fmt(totalDeposit) : ''}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-900 text-base">{totalWithdrawn > 0 ? fmt(totalWithdrawn) : ''}</td>
                        <td className="px-4 py-4 font-bold text-gray-900 text-base">
                          {fmt(totalBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
