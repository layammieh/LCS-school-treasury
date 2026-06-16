import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSchoolYearStore } from '../store/schoolYearStore';
import { useEffect } from 'react';
import { transactionsApi } from '../lib/api';

export default function Calendar() {
  const user = useAuthStore(state => state.user);
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const isDemoUser = user?.username === 'admin';

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        await transactionsApi.listCollections({ schoolYear });
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      }
    };

    fetchCalendarEvents();
  }, [schoolYear]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <Sidebar activePage="calendar" />

      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Header searchPlaceholder="Search transactions, students or dates..." />

        <main className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Calendar View (3 Columns) */}
          <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header controls */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-955 tracking-tight leading-none">October 2023</h1>
                  <p className="text-xs text-gray-500 mt-1">Payment scheduling and collection overview</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-colors flex items-center">
                    <ChevronLeft className="h-3 w-3 mr-0.5" />
                    <span>Prev</span>
                  </button>
                  <button className="px-3 py-1 bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-bold rounded-lg transition-colors">
                    Today
                  </button>
                  <button className="px-3 py-1 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-colors flex items-center">
                    <span>Next</span>
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 border-t border-l border-gray-200 text-center">
                
                {/* Header SUN - SAT */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="border-r border-b border-gray-200 py-2.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {d}
                  </div>
                ))}

                {/* Week 1 empty days */}
                <div className="border-r border-b border-gray-200 min-h-[90px] bg-gray-50/20"></div>
                <div className="border-r border-b border-gray-200 min-h-[90px] bg-gray-50/20"></div>

                {/* Oct 1 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">1</span>
                  {isDemoUser && (
                    <div className="mt-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded px-1.5 py-0.5 text-[8.5px] font-bold truncate">
                      Tuition Cycle A (42)
                    </div>
                  )}
                </div>

                {/* Oct 2 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">2</span>
                </div>

                {/* Oct 3 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">3</span>
                  {isDemoUser && (
                    <div className="mt-1.5 bg-red-50 text-red-800 border border-red-100 rounded px-1.5 py-0.5 text-[8.5px] font-bold truncate">
                      Overdue: Facility Fee
                    </div>
                  )}
                </div>

                {/* Oct 4 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">4</span>
                </div>

                {/* Oct 5 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">5</span>
                </div>

                {/* Oct 6 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">6</span>
                </div>

                {/* Oct 7 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">7</span>
                </div>

                {/* Oct 8 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">8</span>
                </div>

                {/* Oct 9 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">9</span>
                  {isDemoUser && (
                    <div className="mt-1.5 bg-[#006B4D]/10 text-[#006B4D] border border-[#006B4D]/15 rounded px-1.5 py-0.5 text-[8.5px] font-bold truncate">
                      Salary Disbursement
                    </div>
                  )}
                </div>

                {/* Oct 10 */}
                <div className={`p-1.5 min-h-[90px] text-left ${isDemoUser ? 'border-2 border-[#006B4D] bg-green-50/10' : 'border-r border-b border-gray-200'}`}>
                  <span className={`text-[10px] ${isDemoUser ? 'font-extrabold text-[#006B4D]' : 'font-bold text-gray-500'}`}>
                    10 {isDemoUser && '(Today)'}
                  </span>
                  {isDemoUser && (
                    <div className="mt-1 space-y-1">
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded px-1.5 py-0.5 text-[8.5px] font-bold truncate">
                        Exam Reg. (15)
                      </div>
                      <div className="bg-blue-50 text-blue-800 border border-blue-100 rounded px-1.5 py-0.5 text-[8.5px] font-bold truncate">
                        Pending Sync
                      </div>
                    </div>
                  )}
                </div>

                {/* Oct 11 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">11</span>
                </div>

                {/* Oct 12 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">12</span>
                </div>

                {/* Oct 13 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">13</span>
                </div>

                {/* Oct 14 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">14</span>
                </div>

                {/* Oct 15 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">15</span>
                </div>

                {/* Oct 16 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">16</span>
                  {isDemoUser && (
                    <div className="mt-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 text-[8.5px] font-bold truncate">
                      Bulk Vendor Pymt.
                    </div>
                  )}
                </div>

                {/* Oct 17 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">17</span>
                </div>

                {/* Oct 18 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">18</span>
                </div>

                {/* Oct 19 */}
                <div className="border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left">
                  <span className="text-[10px] font-bold text-gray-500">19</span>
                </div>

                {/* Oct 20 - 21 padding empty */}
                <div className="border-r border-b border-gray-200 min-h-[90px] bg-gray-50/10"></div>
                <div className="border-r border-b border-gray-200 min-h-[90px] bg-gray-50/10"></div>

              </div>
            </div>
          </div>

          {/* Right Deadlines & Forecast (1 Column) */}
          <div className="space-y-6">
            
            {/* Upcoming Deadlines */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-900 tracking-tight uppercase mb-4">Upcoming Deadlines</h3>
                <div className="space-y-3">
                  {isDemoUser ? (
                    <>
                      {/* Deadline 1 (Critical) */}
                      <div className="border border-red-150 p-3 rounded-lg bg-red-50/10">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] font-extrabold uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Critical</span>
                          <span className="text-[9px] font-semibold text-gray-400">In 2 days</span>
                        </div>
                        <p className="text-xs font-bold text-gray-905 mt-2">Quarterly Utility Batch</p>
                        <p className="text-[10px] text-gray-400 mt-1">$12,450.00 Remaining</p>
                      </div>

                      {/* Deadline 2 (Scheduled) */}
                      <div className="border border-blue-150 p-3 rounded-lg bg-blue-50/10">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] font-extrabold uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Scheduled</span>
                          <span className="text-[9px] font-semibold text-gray-400">Oct 15</span>
                        </div>
                        <p className="text-xs font-bold text-gray-905 mt-2">Faculty Health Insurance</p>
                        <p className="text-[10px] text-gray-400 mt-1">85 Employees</p>
                      </div>

                      {/* Deadline 3 (Draft) */}
                      <div className="border border-gray-200 p-3 rounded-lg bg-gray-55/20">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] font-extrabold uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Draft</span>
                          <span className="text-[9px] font-semibold text-gray-400">Oct 20</span>
                        </div>
                        <p className="text-xs font-bold text-gray-905 mt-2">Library Resource Renewal</p>
                        <p className="text-[10px] text-gray-400 mt-1">Vendor: Global Books Ltd</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400 text-xs py-6 text-center font-normal">
                      No upcoming deadlines.
                    </div>
                  )}
                </div>
              </div>

              <button className="w-full border border-gray-200 hover:bg-gray-55 text-gray-700 font-bold text-xs py-2 rounded-lg mt-4 transition-colors flex items-center justify-center space-x-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>New Payment</span>
              </button>
            </div>

            {/* Monthly Forecast Banner */}
            <div className="bg-[#003D29] p-5 rounded-xl text-white shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] text-[#4ade80] font-bold uppercase tracking-widest">Monthly Forecast</span>
                <p className="text-2xl font-bold tracking-tight mt-3 text-white">
                  {isDemoUser ? "$284.2k" : "$0.00"}
                </p>
                <div className="flex justify-between items-baseline mt-4 text-[9px] text-gray-300">
                  <span>Completed</span>
                  <span>{isDemoUser ? "65%" : "0%"}</span>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#4ADE80] h-full rounded-full" style={{ width: isDemoUser ? '65%' : '0%' }}></div>
                </div>
              </div>
            </div>

            {/* Calendar Key */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3">Calendar Key</h4>
              <div className="space-y-2 text-xs font-medium text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006B4D] block"></span>
                  <span>Completed Collection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] block"></span>
                  <span>Scheduled Disbursement</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                  <span>Overdue Payment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 block"></span>
                  <span>Internal Transfer</span>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* Floating Action Button bottom right */}
      <button className="fixed bottom-6 right-6 bg-[#003D29] hover:bg-[#002D1E] text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105">
        <CalendarIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
