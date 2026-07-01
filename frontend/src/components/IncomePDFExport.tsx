import { useState, useRef } from 'react';
import { X, Plus, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { transactionsApi } from '../lib/api';
import type { Transaction } from '../lib/api';
import depedLogo from '../assets/deped_logo.png';
import lumbiaLogo from '../assets/lumbia_logo.png';

interface IncomePDFExportProps {
  isOpen: boolean;
  onClose: () => void;
  schoolYear: string;
}

// ─── Safe currency formatter ──────────────────────────────────────────────────
function fmt(n: any): string {
  const num = Number(n);
  if (isNaN(num)) return '0.00';
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + withCommas + '.' + decPart;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayRow {
  day: number;
  totalIncome: number;
  remarks: string;
}

interface MonthData {
  month: string; // "YYYY-MM"
  rows: DayRow[];
}

// ─── PDF Template ─────────────────────────────────────────────────────────────
interface TemplatePropType {
  monthlyData: MonthData[];
  schoolYear: string;
  preparedBy: string;
  preparedTitle: string;
  approvedBy: string;
  approvedTitle: string;
  authorizedBy: string;
  authorizedTitle: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  schoolId: string;
}

function IncomePDFTemplate({
  monthlyData,
  schoolYear,
  preparedBy,
  preparedTitle,
  approvedBy,
  approvedTitle,
  authorizedBy,
  authorizedTitle,
  schoolName,
  schoolAddress,
  schoolContact,
  schoolId,
}: TemplatePropType) {
  const grandTotal = monthlyData.reduce(
    (sum, { rows }) => sum + rows.reduce((s, r) => s + r.totalIncome, 0),
    0
  );

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
    padding: '3px 6px',
    color: '#000000',
    backgroundColor: '#ffffff',
    verticalAlign: 'middle',
  };

  const headerCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '10px',
    backgroundColor: '#f0f0f0',
  };

  return (
    <div style={pageStyle}>
      {/* Government Header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <img
          src={depedLogo}
          alt="DepEd Logo"
          style={{ width: '68px', height: '68px', objectFit: 'contain', marginBottom: '5px' }}
        />
        <div style={{ fontSize: '10px', lineHeight: '1.55' }}>
          <div>Republic of the Philippines</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Department of Education</div>
          <div>Region X</div>
          <div>Division of Cagayan de Oro City</div>
          <div>Southwest 1 District</div>
        </div>
      </div>

      {/* Report Title */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 'bold',
          color: '#006B4D',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        }}>
          School Canteen Income Report
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          marginTop: '2px',
        }}>
          Cash In / Daily Income Summary
        </div>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>
          SCHOOL YEAR {schoolYear}
        </div>
        {monthlyData.length > 0 && (
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase' }}>
            {monthlyData
              .map(m => new Date(m.month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
              .join(', ')}
          </div>
        )}
      </div>

      {/* Income Tables — one per month */}
      {monthlyData.map(({ month, rows }) => {
        const monthTotal = rows.reduce((s, r) => s + r.totalIncome, 0);
        const monthLabel = new Date(month + '-01T00:00:00').toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });

        return (
          <div key={month} style={{ marginBottom: '20px' }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: '10px',
              textTransform: 'uppercase',
              backgroundColor: '#006B4D',
              color: '#ffffff',
              padding: '4px 8px',
            }}>
              {monthLabel}
            </div>

            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: '10px',
            }}>
              <colgroup>
                <col style={{ width: '8%' }} />
                <col style={{ width: '62%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={headerCell}>Day</th>
                  <th style={{ ...headerCell, textAlign: 'left', paddingLeft: '8px' }}>Remarks</th>
                  <th style={{ ...headerCell, textAlign: 'right', paddingRight: '8px' }}>Total Income</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.day}>
                    <td style={{ ...cell, textAlign: 'center', fontWeight: row.totalIncome > 0 ? 'bold' : 'normal' }}>
                      {row.day}
                    </td>
                    <td style={{ ...cell, paddingLeft: '8px', color: row.totalIncome > 0 ? '#000' : '#555' }}>
                      {row.remarks}
                    </td>
                    <td style={{
                      ...cell,
                      textAlign: 'right',
                      paddingRight: '8px',
                      fontWeight: row.totalIncome > 0 ? 'bold' : 'normal',
                      color: row.totalIncome > 0 ? '#000000' : '#888888',
                    }}>
                      {row.totalIncome > 0 ? fmt(row.totalIncome) : '\u2014'}
                    </td>
                  </tr>
                ))}

                {/* Month subtotal */}
                <tr>
                  <td colSpan={2} style={{
                    ...cell,
                    fontWeight: 'bold',
                    textAlign: 'right',
                    backgroundColor: '#d4edda',
                    paddingRight: '10px',
                    letterSpacing: '0.5px',
                    color: '#006B4D',
                  }}>
                    TOTAL \u2014 {monthLabel.toUpperCase()}
                  </td>
                  <td style={{
                    ...cell,
                    fontWeight: 'bold',
                    textAlign: 'right',
                    backgroundColor: '#d4edda',
                    paddingRight: '8px',
                    color: '#006B4D',
                  }}>
                    {fmt(monthTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Grand Total (multi-month only) */}
      {monthlyData.length > 1 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '16px' }}>
          <colgroup>
            <col style={{ width: '70%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={{
                ...cell,
                fontWeight: 'bold',
                textAlign: 'right',
                backgroundColor: '#006B4D',
                color: '#ffffff',
                paddingRight: '10px',
                letterSpacing: '0.5px',
              }}>
                GRAND TOTAL
              </td>
              <td style={{
                ...cell,
                fontWeight: 'bold',
                textAlign: 'right',
                backgroundColor: '#006B4D',
                color: '#ffffff',
                paddingRight: '8px',
              }}>
                {fmt(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Signature Block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '28px',
        fontSize: '10px',
      }}>
        <div>
          <div style={{ marginBottom: '26px' }}>Prepared by:</div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', width: '210px' }}>
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{preparedBy}</div>
            <div>{preparedTitle}</div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: '26px' }}>Approved by:</div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', width: '210px' }}>
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{approvedBy}</div>
            <div>{approvedTitle}</div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: '26px' }}>Authorized by:</div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', width: '210px' }}>
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{authorizedBy}</div>
            <div>{authorizedTitle}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '32px',
        borderTop: '1px solid #000000',
        paddingTop: '8px',
        fontSize: '9px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <img
          src={lumbiaLogo}
          alt="Lumbia Central School Logo"
          style={{ width: '44px', height: '44px', objectFit: 'contain' }}
        />
        <div>
          <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{schoolName}</div>
          <div>{schoolAddress}</div>
          <div>{schoolContact}</div>
          <div>SCHOOL ID: {schoolId}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Component ──────────────────────────────────────────────────────────
export default function IncomePDFExport({
  isOpen,
  onClose,
  schoolYear,
}: IncomePDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Month selection
  const [months, setMonths] = useState<string[]>([]);
  const [newMonth, setNewMonth] = useState('');

  // monthlyData: processed rows used to render the hidden PDF template
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);

  // remarks: keyed by "YYYY-MM-DD" for no-income days
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  // Preview state
  const [previewData, setPreviewData] = useState<MonthData[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Signatory fields
  const [preparedBy, setPreparedBy] = useState('AMELITA C. LAYAM');
  const [preparedTitle, setPreparedTitle] = useState('SC In-Charge');
  const [approvedBy, setApprovedBy] = useState('DANTE G. SISTO P-III');
  const [approvedTitle, setApprovedTitle] = useState('School Principal');
  const [authorizedBy, setAuthorizedBy] = useState('LUCILDA GAPE');
  const [authorizedTitle, setAuthorizedTitle] = useState('SC Auditor/ADAS');

  // School info
  const [schoolName, setSchoolName] = useState('LUMBIA CENTRAL SCHOOL');
  const [schoolAddress, setSchoolAddress] = useState('F. Delima St., Lumbia, Cagayan de Oro City');
  const [schoolContact, setSchoolContact] = useState('Lumbia.cs@gmail.com | 09175275969');
  const [schoolId, setSchoolId] = useState('127977');

  const pdfRef = useRef<HTMLDivElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const addMonth = () => {
    if (newMonth && !months.includes(newMonth)) {
      setMonths(prev => [...prev, newMonth].sort());
      setNewMonth('');
    }
  };

  const removeMonth = (m: string) => {
    setMonths(months.filter(x => x !== m));
    setPreviewData(prev => prev.filter(d => d.month !== m));
  };

  function buildDayRows(month: string, transactions: Transaction[], currentRemarks: Record<string, string>): DayRow[] {
    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, mon);

    const dailyTotals: Record<number, number> = {};
    for (const txn of transactions) {
      const d = new Date(txn.date + 'T00:00:00').getDate();
      dailyTotals[d] = (dailyTotals[d] || 0) + Number(txn.amount || 0);
    }

    const rows: DayRow[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${month}-${String(day).padStart(2, '0')}`;
      rows.push({
        day,
        totalIncome: dailyTotals[day] || 0,
        remarks: currentRemarks[dateKey] || '',
      });
    }
    return rows;
  }

  const handlePreview = async () => {
    if (months.length === 0) {
      alert('Please add at least one month.');
      return;
    }
    setIsFetching(true);
    try {
      const fetched: MonthData[] = [];
      for (const m of months) {
        const res = await transactionsApi.listCollections({ month: m, schoolYear, page: 1 });
        let allTxns: Transaction[] = [...res.results];
        if (res.count > res.results.length) {
          const totalPages = Math.ceil(res.count / res.results.length);
          for (let p = 2; p <= Math.min(totalPages, 10); p++) {
            const pRes = await transactionsApi.listCollections({ month: m, schoolYear, page: p });
            allTxns = [...allTxns, ...pRes.results];
          }
        }
        fetched.push({ month: m, rows: buildDayRows(m, allTxns, remarks) });
      }
      setPreviewData(fetched);
    } catch (err: any) {
      alert('Failed to fetch income data: ' + (err?.message || String(err)));
    } finally {
      setIsFetching(false);
    }
  };

  const handleRemarkChange = (dateKey: string, value: string) => {
    setRemarks(prev => ({ ...prev, [dateKey]: value }));
    setPreviewData(prev =>
      prev.map(md => ({
        ...md,
        rows: md.rows.map(row => {
          const rowKey = `${md.month}-${String(row.day).padStart(2, '0')}`;
          if (rowKey === dateKey) return { ...row, remarks: value };
          return row;
        }),
      }))
    );
  };

  const handleGenerate = async () => {
    if (previewData.length === 0) {
      alert('Please click "Load Preview & Fill Remarks" first to fetch income data.');
      return;
    }
    setIsGenerating(true);

    const finalData: MonthData[] = previewData.map(md => ({
      ...md,
      rows: md.rows.map(row => {
        const dateKey = `${md.month}-${String(row.day).padStart(2, '0')}`;
        return { ...row, remarks: remarks[dateKey] ?? row.remarks };
      }),
    }));
    setMonthlyData(finalData);

    setTimeout(async () => {
      try {
        if (!pdfRef.current) throw new Error('PDF template ref not found');

        const canvas = await html2canvas(pdfRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (_doc) => {
            _doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) =>
              l.parentNode?.removeChild(l)
            );
            _doc.querySelectorAll('style').forEach((s) => {
              if (s.textContent && s.textContent.includes('oklch')) {
                s.parentNode?.removeChild(s);
              }
            });
          },
        });

        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error('Canvas is empty — the template could not be rendered. Try again.');
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const imgHeightMm = (canvas.height / canvas.width) * pdfPageWidth;

        if (imgHeightMm <= pdfPageHeight) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, imgHeightMm);
        } else {
          const pageHeightPx = (pdfPageHeight / pdfPageWidth) * canvas.width;
          let yOffset = 0;
          while (yOffset < canvas.height) {
            const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);
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
            const sliceHeightMm = (sliceH / canvas.width) * pdfPageWidth;
            pdf.addImage(
              sliceCanvas.toDataURL('image/jpeg', 0.95),
              'JPEG', 0, 0, pdfPageWidth, sliceHeightMm
            );
            yOffset += pageHeightPx;
          }
        }

        const label = schoolYear.replace(/\//g, '-');
        pdf.save(`Income_Report_${label}.pdf`);
      } catch (error) {
        console.error('Failed to generate PDF:', error);
        alert('Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setIsGenerating(false);
        onClose();
      }
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export Income PDF</h2>
            <p className="text-xs text-gray-500 mt-1">
              Generates a daily income summary report with remarks for each month.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* Months Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Included Months</h3>
            <div className="flex space-x-2">
              <input
                type="month"
                value={newMonth}
                onChange={e => setNewMonth(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
              />
              <button
                onClick={addMonth}
                className="px-4 py-2 bg-[#006B4D] text-white rounded-lg hover:bg-[#00523b] font-semibold text-sm transition-colors flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {months.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No months added yet.</p>
              ) : (
                months.map(m => (
                  <div key={m} className="bg-green-50 border border-green-200 rounded-md px-3 py-1.5 flex items-center text-xs font-bold text-green-800">
                    {new Date(m + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    <button onClick={() => removeMonth(m)} className="ml-2 text-green-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {months.length > 0 && (
              <button
                onClick={handlePreview}
                disabled={isFetching}
                className="mt-1 flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isFetching ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Loading data...</>
                ) : (
                  'Load Preview & Fill Remarks'
                )}
              </button>
            )}
          </div>

          {/* Remarks Editor */}
          {previewData.length > 0 && (
            <div className="space-y-4">
              <hr className="border-gray-100" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Daily Income Preview &amp; Remarks
              </h3>
              <p className="text-[10px] text-gray-400">
                Days with <span className="font-bold text-gray-600">no income</span> are highlighted in amber. You can add remarks for any day.
              </p>
              {previewData.map(({ month, rows }) => {
                const monthLabel = new Date(month + '-01T00:00:00').toLocaleDateString('en-US', {
                  month: 'long', year: 'numeric',
                });
                const monthTotal = rows.reduce((s, r) => s + r.totalIncome, 0);
                return (
                  <div key={month} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-[#006B4D] text-white text-xs font-bold px-4 py-2 uppercase tracking-wider flex justify-between">
                      <span>{monthLabel}</span>
                      <span>Total: &#8369;{monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase w-12">Day</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-400 uppercase w-36">Total Income</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rows.map(row => {
                            const dateKey = `${month}-${String(row.day).padStart(2, '0')}`;
                            const hasIncome = row.totalIncome > 0;
                            return (
                              <tr key={row.day} className={hasIncome ? 'bg-white' : 'bg-amber-50/60'}>
                                <td className={`px-3 py-1.5 font-bold ${hasIncome ? 'text-gray-800' : 'text-gray-400'}`}>
                                  {row.day}
                                </td>
                                <td className={`px-3 py-1.5 text-right font-bold ${hasIncome ? 'text-[#006B4D]' : 'text-gray-300'}`}>
                                  {hasIncome
                                    ? `\u20B1${row.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                    : '\u2014'}
                                </td>
                                <td className="px-3 py-1">
                                  <input
                                    type="text"
                                    value={remarks[dateKey] || ''}
                                    onChange={e => handleRemarkChange(dateKey, e.target.value)}
                                    placeholder={hasIncome ? "Optional remark..." : "e.g. HOLIDAY, NO CLASS..."}
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#006B4D] bg-white"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <hr className="border-gray-100" />

          {/* Signatories */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Signatories</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Name)</label>
                <input type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Title)</label>
                <input type="text" value={preparedTitle} onChange={e => setPreparedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Approved By (Name)</label>
                <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Approved By (Title)</label>
                <input type="text" value={approvedTitle} onChange={e => setApprovedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Authorized By (Name)</label>
                <input type="text" value={authorizedBy} onChange={e => setAuthorizedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Authorized By (Title)</label>
                <input type="text" value={authorizedTitle} onChange={e => setAuthorizedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* School Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">School Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School Name</label>
                <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School Address</label>
                <input type="text" value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Contact Details</label>
                <input type="text" value={schoolContact} onChange={e => setSchoolContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School ID</label>
                <input type="text" value={schoolId} onChange={e => setSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || previewData.length === 0}
            className="px-5 py-2.5 bg-[#006B4D] hover:bg-[#00523b] text-white font-semibold rounded-lg transition-colors flex items-center text-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden PDF render target */}
      <div style={{
        position: 'fixed',
        top: '100vh',
        left: 0,
        width: '794px',
        backgroundColor: '#ffffff',
        color: '#000000',
        zIndex: -1,
        pointerEvents: 'none',
      }}>
        <div ref={pdfRef} style={{ width: '794px', backgroundColor: '#ffffff', color: '#000000' }}>
          <IncomePDFTemplate
            monthlyData={monthlyData}
            schoolYear={schoolYear}
            preparedBy={preparedBy}
            preparedTitle={preparedTitle}
            approvedBy={approvedBy}
            approvedTitle={approvedTitle}
            authorizedBy={authorizedBy}
            authorizedTitle={authorizedTitle}
            schoolName={schoolName}
            schoolAddress={schoolAddress}
            schoolContact={schoolContact}
            schoolId={schoolId}
          />
        </div>
      </div>
    </div>
  );
}
