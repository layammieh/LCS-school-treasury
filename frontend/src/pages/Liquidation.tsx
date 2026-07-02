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
import { DeleteModal } from '../components/DeleteModal';

// ── Currency formatter ──────────────────────────────────────────────
function fmt(n: any): string {
  const num = Number(n);
  if (isNaN(num)) return '0.00';
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + withCommas + '.' + decPart;
}

// ── PDF Template (matches ExpensePDFTemplate style exactly) ──────────
interface LiquidationTemplatePropType {
  data: LiquidationType[];
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

function LiquidationPDFTemplate({
  data,
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
}: LiquidationTemplatePropType) {
  const totalIncome   = data.reduce((s, r) => s + Number(r.income   || 0), 0);
  const totalExpenses = data.reduce((s, r) => s + Number(r.expenses || 0), 0);
  const totalDeposit  = data.reduce((s, r) => s + Number(r.cash_deposit  || 0), 0);
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
  };

  return (
    <div style={pageStyle}>
      {/* ── Government Header (identical to ExpensePDFTemplate) ── */}
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

      {/* ── Report Title ── */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 'bold',
          color: '#cc0000',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        }}>
          School Canteen Liquidation Report
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          marginTop: '2px',
        }}>
          Monthly Summary
        </div>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>
          SCHOOL YEAR {schoolYear}
        </div>
      </div>

      {/* ── Liquidation Table ── */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        fontSize: '10px',
        marginBottom: '16px',
      }}>
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
            <th style={headerCell}>Month</th>
            <th style={{ ...headerCell, textAlign: 'right', paddingRight: '8px' }}>Income</th>
            <th style={{ ...headerCell, textAlign: 'right', paddingRight: '8px' }}>Expenses</th>
            <th style={{ ...headerCell, textAlign: 'right', paddingRight: '8px' }}>Cash Deposit</th>
            <th style={{ ...headerCell, textAlign: 'right', paddingRight: '8px' }}>Cash Withdrawn</th>
            <th style={headerCell}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td style={{ ...cell, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {new Date(row.month + '-01').toLocaleDateString('en-US', { month: 'long' })}
              </td>
              <td style={{ ...cell, textAlign: 'right', paddingRight: '8px' }}>{fmt(row.income)}</td>
              <td style={{ ...cell, textAlign: 'right', paddingRight: '8px' }}>{fmt(row.expenses)}</td>
              <td style={{ ...cell, textAlign: 'right', paddingRight: '8px' }}>
                {Number(row.cash_deposit) > 0 ? fmt(row.cash_deposit) : ''}
              </td>
              <td style={{ ...cell, textAlign: 'right', paddingRight: '8px' }}>
                {Number(row.cash_withdrawn) > 0 ? fmt(row.cash_withdrawn) : ''}
              </td>
              <td style={cell}>{row.remarks || ''}</td>
            </tr>
          ))}

          {/* Grand Total row — matches expense PDF style */}
          <tr>
            <td style={{
              ...cell,
              fontWeight: 'bold',
              textAlign: 'right',
              backgroundColor: '#e8e8e8',
              paddingRight: '10px',
              letterSpacing: '0.5px',
            }}>
              TOTAL
            </td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#e8e8e8', paddingRight: '8px' }}>
              {fmt(totalIncome)}
            </td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#e8e8e8', paddingRight: '8px' }}>
              {fmt(totalExpenses)}
            </td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#e8e8e8', paddingRight: '8px' }}>
              {totalDeposit > 0 ? fmt(totalDeposit) : ''}
            </td>
            <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#e8e8e8', paddingRight: '8px' }}>
              {totalWithdrawn > 0 ? fmt(totalWithdrawn) : ''}
            </td>
            <td style={{ ...cell, fontWeight: 'bold', backgroundColor: '#e8e8e8' }}>
              Net Balance: {fmt(netBalance)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Signature Block (identical to ExpensePDFTemplate) ── */}
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

      {/* ── Footer (identical to ExpensePDFTemplate) ── */}
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

// ── PDF Export Modal (matches ExpensePDFExport modal exactly) ─────────
interface LiquidationPDFExportProps {
  isOpen: boolean;
  onClose: () => void;
  data: LiquidationType[];
  schoolYear: string;
}

function LiquidationPDFExport({ isOpen, onClose, data, schoolYear }: LiquidationPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Signatory fields — same defaults as ExpensePDFExport
  const [preparedBy, setPreparedBy]       = useState('AMELITA C. LAYAM');
  const [preparedTitle, setPreparedTitle] = useState('SC In-Charge');
  const [approvedBy, setApprovedBy]       = useState('DANTE G. SISTO P-III');
  const [approvedTitle, setApprovedTitle] = useState('School Principal');
  const [authorizedBy, setAuthorizedBy]   = useState('LUCILDA GAPE');
  const [authorizedTitle, setAuthorizedTitle] = useState('SC Auditor/ADAS');

  // School info — same defaults as ExpensePDFExport
  const [schoolName, setSchoolName]       = useState('LUMBIA CENTRAL SCHOOL');
  const [schoolAddress, setSchoolAddress] = useState('F. Delima St., Lumbia, Cagayan de Oro City');
  const [schoolContact, setSchoolContact] = useState('Lumbia.cs@gmail.com | 09175275969');
  const [schoolId, setSchoolId]           = useState('127977');

  const pdfRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Wait for React to render the hidden template
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
          const pdfPageWidth  = pdf.internal.pageSize.getWidth();
          const pdfPageHeight = pdf.internal.pageSize.getHeight();
          const imgHeightMm   = (canvas.height / canvas.width) * pdfPageWidth;

          if (imgHeightMm <= pdfPageHeight) {
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, imgHeightMm);
          } else {
            const pageHeightPx = (pdfPageHeight / pdfPageWidth) * canvas.width;
            let yOffset = 0;
            while (yOffset < canvas.height) {
              const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);
              const sliceCanvas = document.createElement('canvas');
              sliceCanvas.width  = canvas.width;
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
          pdf.save(`Liquidation_Report_${label}.pdf`);
        } catch (error) {
          console.error('Failed to generate PDF:', error);
          alert('Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
          setIsGenerating(false);
          onClose();
        }
      }, 500);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)));
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export Liquidation PDF</h2>
            <p className="text-xs text-gray-500 mt-1">
              Generates a School Canteen Liquidation Report (Monthly Summary).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* Signatories */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Signatories</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Name)</label>
                <input type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Title)</label>
                <input type="text" value={preparedTitle} onChange={e => setPreparedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Approved By (Name)</label>
                <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Approved By (Title)</label>
                <input type="text" value={approvedTitle} onChange={e => setApprovedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Authorized By (Name)</label>
                <input type="text" value={authorizedBy} onChange={e => setAuthorizedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Authorized By (Title)</label>
                <input type="text" value={authorizedTitle} onChange={e => setAuthorizedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School Address</label>
                <input type="text" value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Contact Details</label>
                <input type="text" value={schoolContact} onChange={e => setSchoolContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School ID</label>
                <input type="text" value={schoolId} onChange={e => setSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center text-sm disabled:opacity-50"
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

      {/* ── Hidden PDF render target (matches ExpensePDFExport placement) ── */}
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
          <LiquidationPDFTemplate
            data={data}
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; month: string } | null>(null);

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

  const requestDelete = (id: number, month: string) => {
    setItemToDelete({ id, month });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete.id);
    try {
      await liquidationApi.delete(itemToDelete.id);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const displayData = data;

  const totalIncome    = displayData.reduce((s, r) => s + Number(r.income    || 0), 0);
  const totalExpenses  = displayData.reduce((s, r) => s + Number(r.expenses  || 0), 0);
  const totalDeposit   = displayData.reduce((s, r) => s + Number(r.cash_deposit   || 0), 0);
  const totalWithdrawn = displayData.reduce((s, r) => s + Number(r.cash_withdrawn || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar activePage="liquidation" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-5">

            {/* ── Page heading ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Monthly Liquidation</h1>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Export PDF — hidden in public view mode */}
                {!isViewMode && displayData.length > 0 && (
                  <button
                    onClick={() => setExportOpen(true)}
                    className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2 text-[#006B4D]" />
                    Export PDF
                  </button>
                )}

                {/* Add Month */}
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={newMonth}
                    onChange={e => { setNewMonth(e.target.value); setErrorMsg(''); }}
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                  />
                  <button
                    onClick={handleAddMonth}
                    disabled={!newMonth || adding}
                    className="flex items-center whitespace-nowrap px-4 py-2 bg-[#006B4D] text-white text-sm font-bold rounded-lg hover:bg-[#005a40] disabled:opacity-50 shadow-sm transition-colors"
                  >
                    {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Month
                  </button>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* ── Desktop / Tablet Table (sm and up) ── */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
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
                      {!isViewMode && <th className="px-4 py-3 text-xs w-10" />}
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
                    ) : displayData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                          {isViewMode ? (
                            <span>No records available in public view.</span>
                          ) : (
                            <>
                              No liquidation records for this school year.<br />
                              <span className="text-xs">Select a month above and click <strong>Add Month</strong> to start tracking.</span>
                            </>
                          )}
                        </td>
                      </tr>
                    ) : (
                      displayData.map((row) => (
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
                                type="number" step="0.01"
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
                                type="number" step="0.01"
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
                                type="text" placeholder="Add remarks…"
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
                                onClick={() => requestDelete(row.id, row.month)}
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
                  {displayData.length > 0 && (
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

            {/* ── Mobile Cards (visible only on small screens, < sm) ── */}
            <div className="sm:hidden space-y-3">
              {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-10 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#006B4D]" />
                  Loading…
                </div>
              ) : displayData.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-10 text-center text-gray-400 text-sm">
                  {isViewMode ? (
                    <span>No records available in public view.</span>
                  ) : (
                    <>
                      No liquidation records for this school year.<br />
                      <span className="text-xs">Select a month above and click <strong>Add Month</strong> to start tracking.</span>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {displayData.map((row) => (
                    <div key={row.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                          {new Date(row.month + '-01').toLocaleDateString('en-US', { month: 'long' })}
                        </span>
                        {!isViewMode && (
                          <button
                            onClick={() => requestDelete(row.id, row.month)}
                            disabled={deletingId === row.id}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            title="Delete row"
                          >
                            {deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Income / Expenses */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 rounded-lg p-2.5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Income</p>
                          <p className="text-sm font-bold text-[#006B4D]">{fmt(row.income)}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2.5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Expenses</p>
                          <p className="text-sm font-bold text-red-600">{fmt(row.expenses)}</p>
                        </div>
                      </div>

                      {/* Cash Deposit */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Cash Deposit</label>
                        {isViewMode ? (
                          <div className="w-full text-right bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">{fmt(row.cash_deposit)}</div>
                        ) : (
                          <input
                            type="number" step="0.01"
                            className="w-full text-right border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                            value={row.cash_deposit || ''}
                            onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, cash_deposit: Number(e.target.value) } : item))}
                            onBlur={e => handleUpdate(row.id, 'cash_deposit', Number(e.target.value) || 0)}
                          />
                        )}
                      </div>

                      {/* Cash Withdrawn */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Cash Withdrawn</label>
                        {isViewMode ? (
                          <div className="w-full text-right bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">{fmt(row.cash_withdrawn)}</div>
                        ) : (
                          <input
                            type="number" step="0.01"
                            className="w-full text-right border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                            value={row.cash_withdrawn || ''}
                            onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, cash_withdrawn: Number(e.target.value) } : item))}
                            onBlur={e => handleUpdate(row.id, 'cash_withdrawn', Number(e.target.value) || 0)}
                          />
                        )}
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Remarks</label>
                        {isViewMode ? (
                          <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 min-h-[38px]">{row.remarks || ''}</div>
                        ) : (
                          <input
                            type="text" placeholder="Add remarks…"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                            value={row.remarks || ''}
                            onChange={e => setData(prev => prev.map(item => item.id === row.id ? { ...item, remarks: e.target.value } : item))}
                            onBlur={e => handleUpdate(row.id, 'remarks', e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Mobile Totals Card */}
                  <div className="bg-[#003D29] rounded-xl p-4 space-y-2 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">Summary Totals</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-[10px] text-white/60 uppercase tracking-wider">Total Income</p>
                        <p className="font-bold text-green-300">{fmt(totalIncome)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/60 uppercase tracking-wider">Total Expenses</p>
                        <p className="font-bold text-red-300">{fmt(totalExpenses)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/60 uppercase tracking-wider">Cash Deposit</p>
                        <p className="font-bold">{totalDeposit > 0 ? fmt(totalDeposit) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/60 uppercase tracking-wider">Cash Withdrawn</p>
                        <p className="font-bold">{totalWithdrawn > 0 ? fmt(totalWithdrawn) : '—'}</p>
                      </div>
                    </div>
                    <div className="border-t border-white/20 pt-2 mt-1">
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">Net Balance</p>
                      <p className={`text-base font-bold ${netBalance >= 0 ? 'text-green-300' : 'text-red-300'}`}>{fmt(netBalance)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* PDF Export Modal — only rendered for authenticated users */}
      {!isViewMode && (
        <LiquidationPDFExport
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          data={displayData}
          schoolYear={schoolYear}
        />
      )}

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Liquidation Record"
        message="Are you sure you want to delete the record for"
        itemName={itemToDelete ? new Date(itemToDelete.month + '-01').toLocaleDateString('en-US', { month: 'long' }) : undefined}
        isDeleting={deletingId !== null}
      />
    </div>
  );
}
