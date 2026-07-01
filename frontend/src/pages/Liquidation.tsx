import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSchoolYearStore } from '../store/schoolYearStore';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { liquidationApi } from '../lib/api';
import type { Liquidation as LiquidationType } from '../lib/api';
import { Plus, Loader2, Download, Trash2, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import depedLogo from '../assets/deped_logo.png';
import lumbiaLogo from '../assets/lumbia_logo.png';

// ── Currency formatter ──────────────────────────────────────────────
function fmt(n: any): string {
  const num = Number(n);
  if (isNaN(num)) return '0.00';
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + withCommas + '.' + decPart;
}

// ── PDF Template ─────────────────────────────────────────────────────
function LiquidationPDFTemplate({
  data,
  schoolYear,
  preparedBy,
  preparedTitle,
  certifiedBy,
  certifiedTitle,
  approvedBy,
  approvedTitle,
  schoolName,
  schoolAddress,
}: {
  data: LiquidationType[];
  schoolYear: string;
  preparedBy: string;
  preparedTitle: string;
  certifiedBy: string;
  certifiedTitle: string;
  approvedBy: string;
  approvedTitle: string;
  schoolName: string;
  schoolAddress: string;
}) {
  const totalIncome = data.reduce((s, r) => s + Number(r.income || 0), 0);
  const totalExpenses = data.reduce((s, r) => s + Number(r.expenses || 0), 0);
  const totalDeposit = data.reduce((s, r) => s + Number(r.cash_deposit || 0), 0);
  const totalWithdrawn = data.reduce((s, r) => s + Number(r.cash_withdrawn || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  const pageStyle: React.CSSProperties = {
    width: '794px',
    minHeight: '1123px',
    padding: '36px 48px',
    boxSizing: 'border-box',
    fontFamily: '"Arial", "Helvetica", sans-serif',
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: '11px',
    lineHeight: '1.4',
  };

  const cell: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '4px 8px',
    color: '#000000',
    backgroundColor: '#ffffff',
    verticalAlign: 'middle',
  };

  const hCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '10px',
    backgroundColor: '#f0f0f0',
  };

  return (
    <div style={pageStyle}>
      {/* Government Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', gap: '18px' }}>
        <img src={depedLogo} alt="DepEd" style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '10px' }}>Republic of the Philippines</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Department of Education</div>
          <div style={{ fontSize: '10px' }}>Region X – Northern Mindanao</div>
          <div style={{ fontSize: '10px' }}>Division of Cagayan de Oro City</div>
          <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>{schoolName}</div>
          <div style={{ fontSize: '10px' }}>{schoolAddress}</div>
        </div>
        <img src={lumbiaLogo} alt="School Logo" style={{ width: '65px', height: '65px', objectFit: 'contain', borderRadius: '50%' }} />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '16px', borderTop: '2px solid #000', paddingTop: '10px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>SCHOOL CANTEEN LIQUIDATION REPORT</div>
        <div style={{ fontSize: '11px', marginTop: '3px' }}>School Year {schoolYear}</div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
        <colgroup>
          <col style={{ width: '15%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={hCell}>Month</th>
            <th style={hCell}>Income</th>
            <th style={hCell}>Expenses</th>
            <th style={hCell}>Cash Deposit</th>
            <th style={hCell}>Cash Withdrawn</th>
            <th style={hCell}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td style={{ ...cell, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {new Date(row.month + '-01').toLocaleDateString('en-US', { month: 'long' })}
              </td>
              <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.income)}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.expenses)}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{Number(row.cash_deposit) > 0 ? fmt(row.cash_deposit) : ''}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{Number(row.cash_withdrawn) > 0 ? fmt(row.cash_withdrawn) : ''}</td>
              <td style={cell}>{row.remarks || ''}</td>
            </tr>
          ))}
          {/* Total Row */}
          <tr>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'center' }}>TOTAL</td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right' }}>{fmt(totalIncome)}</td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right' }}>{fmt(totalExpenses)}</td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right' }}>{totalDeposit > 0 ? fmt(totalDeposit) : ''}</td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right' }}>{totalWithdrawn > 0 ? fmt(totalWithdrawn) : ''}</td>
            <td style={{ ...cell, fontWeight: 'bold' }}>Net Balance: {fmt(netBalance)}</td>
          </tr>
        </tbody>
      </table>

      {/* Signature Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px', gap: '24px' }}>
        {[
          { label: 'Prepared by:', name: preparedBy, title: preparedTitle },
          { label: 'Certified by:', name: certifiedBy, title: certifiedTitle },
          { label: 'Approved by:', name: approvedBy, title: approvedTitle },
        ].map(({ label, name, title }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '20px' }}>{label}</div>
            <div style={{ borderBottom: '1px solid #000', marginBottom: '4px' }} />
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{name || '____________________'}</div>
            <div style={{ fontSize: '10px', color: '#555' }}>{title || '____________________'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PDF Export Modal ───────────────────────────────────────────────────
function LiquidationExportModal({
  isOpen,
  onClose,
  data,
  schoolYear,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: LiquidationType[];
  schoolYear: string;
}) {
  const [preparedBy, setPreparedBy] = useState('');
  const [preparedTitle, setPreparedTitle] = useState('Canteen Manager');
  const [certifiedBy, setCertifiedBy] = useState('');
  const [certifiedTitle, setCertifiedTitle] = useState('School Treasurer');
  const [approvedBy, setApprovedBy] = useState('');
  const [approvedTitle, setApprovedTitle] = useState('School Principal');
  const [schoolName, setSchoolName] = useState('Lumbia Central School');
  const [schoolAddress, setSchoolAddress] = useState('Lumbia, Cagayan de Oro City');
  const [isGenerating, setIsGenerating] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!templateRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pdfW;

      if (imgH <= pdfH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, imgH);
      } else {
        const pageHPx = (pdfH / pdfW) * canvas.width;
        let yOffset = 0;
        while (yOffset < canvas.height) {
          const sliceH = Math.min(pageHPx, canvas.height - yOffset);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(canvas, 0, -yOffset);
          }
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, (sliceH / canvas.width) * pdfW);
          yOffset += pageHPx;
        }
      }
      pdf.save(`Liquidation_Report_${schoolYear.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      alert('Failed to generate PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export Liquidation PDF</h2>
            <p className="text-xs text-gray-500 mt-1">Fill in signatories and school info, then download.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="School Name" value={schoolName} onChange={setSchoolName} />
            <Field label="School Address" value={schoolAddress} onChange={setSchoolAddress} />
          </div>
          <hr className="border-gray-100" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Prepared By</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={preparedBy} onChange={setPreparedBy} />
            <Field label="Title / Position" value={preparedTitle} onChange={setPreparedTitle} />
          </div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Certified By</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={certifiedBy} onChange={setCertifiedBy} />
            <Field label="Title / Position" value={certifiedTitle} onChange={setCertifiedTitle} />
          </div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Approved By</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={approvedBy} onChange={setApprovedBy} />
            <Field label="Title / Position" value={approvedTitle} onChange={setApprovedTitle} />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 shrink-0 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center px-5 py-2 bg-[#006B4D] text-white text-sm font-bold rounded-lg hover:bg-[#005a40] disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Hidden PDF template (off-screen) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div ref={templateRef}>
          <LiquidationPDFTemplate
            data={data}
            schoolYear={schoolYear}
            preparedBy={preparedBy}
            preparedTitle={preparedTitle}
            certifiedBy={certifiedBy}
            certifiedTitle={certifiedTitle}
            approvedBy={approvedBy}
            approvedTitle={approvedTitle}
            schoolName={schoolName}
            schoolAddress={schoolAddress}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function Liquidation() {
  const { isViewMode } = useAuthStore();
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const [data, setData] = useState<LiquidationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newMonth, setNewMonth] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  useEffect(() => { loadData(); }, [schoolYear]);

  const handleAddMonth = async () => {
    if (!newMonth) return;
    setErrorMsg('');
    try {
      setAdding(true);
      await liquidationApi.create({ school_year: schoolYear, month: newMonth });
      setNewMonth('');
      loadData();
    } catch (err: any) {
      const msg = err?.message || 'Failed to add month.';
      setErrorMsg(msg.includes('unique') || msg.includes('already')
        ? 'This month already exists for this school year.'
        : msg);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: number, field: keyof LiquidationType, value: any) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    try {
      await liquidationApi.update(id, { [field]: value });
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this month\'s record?')) return;
    setDeletingId(id);
    try {
      await liquidationApi.delete(id);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const totalIncome = data.reduce((s, r) => s + Number(r.income || 0), 0);
  const totalExpenses = data.reduce((s, r) => s + Number(r.expenses || 0), 0);
  const totalDeposit = data.reduce((s, r) => s + Number(r.cash_deposit || 0), 0);
  const totalWithdrawn = data.reduce((s, r) => s + Number(r.cash_withdrawn || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar activePage="liquidation" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Page heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Monthly Liquidation</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {data.length > 0 && (
                  <button
                    onClick={() => setExportOpen(true)}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2 text-[#006B4D]" />
                    Export PDF
                  </button>
                )}
                {!isViewMode && (
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={newMonth}
                      onChange={e => { setNewMonth(e.target.value); setErrorMsg(''); }}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                    />
                    <button
                      onClick={handleAddMonth}
                      disabled={!newMonth || adding}
                      className="flex items-center px-4 py-2 bg-[#006B4D] text-white text-sm font-bold rounded-lg hover:bg-[#005a40] disabled:opacity-50 shadow-sm"
                    >
                      {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Month
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Table */}
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
                      {!isViewMode && <th className="px-4 py-3 text-xs" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#006B4D]" />
                          Loading…
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                          No liquidation records for this school year.<br />
                          <span className="text-xs">Select a month above and click <strong>Add Month</strong> to start tracking.</span>
                        </td>
                      </tr>
                    ) : (
                      data.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900 uppercase whitespace-nowrap">
                            {new Date(row.month + '-01').toLocaleDateString('en-US', { month: 'long' })}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[#006B4D] whitespace-nowrap">
                            {fmt(row.income)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-600 whitespace-nowrap">
                            {fmt(row.expenses)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isViewMode ? (
                              <span className="font-medium">{fmt(row.cash_deposit)}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                                value={row.cash_deposit || ''}
                                onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, cash_deposit: Number(e.target.value) } : item))}
                                onBlur={e => handleUpdate(row.id, 'cash_deposit', Number(e.target.value) || 0)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isViewMode ? (
                              <span className="font-medium">{fmt(row.cash_withdrawn)}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
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
                                placeholder="Add remarks…"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                                value={row.remarks || ''}
                                onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, remarks: e.target.value } : item))}
                                onBlur={e => handleUpdate(row.id, 'remarks', e.target.value)}
                              />
                            )}
                          </td>
                          {!isViewMode && (
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleDelete(row.id)}
                                disabled={deletingId === row.id}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Delete row"
                              >
                                {deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data.length > 0 && (
                    <tfoot className="bg-[#e8f5e9] border-t-2 border-[#003D29]">
                      <tr>
                        <td className="px-4 py-4 font-bold text-[#003D29] uppercase tracking-wider text-sm">TOTAL</td>
                        <td className="px-4 py-4 text-right font-bold text-[#006B4D]">{fmt(totalIncome)}</td>
                        <td className="px-4 py-4 text-right font-bold text-red-600">{fmt(totalExpenses)}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-800">{totalDeposit > 0 ? fmt(totalDeposit) : '—'}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-800">{totalWithdrawn > 0 ? fmt(totalWithdrawn) : '—'}</td>
                        <td className="px-4 py-4 font-bold text-[#003D29]">
                          Net Balance: <span className={netBalance >= 0 ? 'text-[#006B4D]' : 'text-red-600'}>{fmt(netBalance)}</span>
                        </td>
                        {!isViewMode && <td />}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* PDF Export Modal */}
      <LiquidationExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        data={data}
        schoolYear={schoolYear}
      />
    </div>
  );
}
