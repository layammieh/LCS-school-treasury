import { useState, useRef } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Expense } from '../lib/api';
import depedLogo from '../assets/deped_logo.png';
import lumbiaLogo from '../assets/lumbia_logo.png';

interface ExpensePDFExportProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  schoolYear: string;
}

// ─── Inline PDF Template ─────────────────────────────────────────────────────
interface TemplatePropType {
  expenses: Expense[];
  schoolYear: string;
  preparedBy: string;
  preparedTitle: string;
  authorizedBy: string;
  authorizedTitle: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  schoolId: string;
}

function ExpensePDFTemplate({
  expenses,
  schoolYear,
  preparedBy,
  preparedTitle,
  authorizedBy,
  authorizedTitle,
  schoolName,
  schoolAddress,
  schoolContact,
  schoolId,
}: TemplatePropType) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const pageStyle: React.CSSProperties = {
    width: '794px',
    minHeight: '1123px',
    padding: '40px 48px',
    boxSizing: 'border-box',
    fontFamily: '"Arial", "Helvetica", sans-serif',
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: '11px',
    lineHeight: '1.4',
  };

  const cell: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '4px 6px',
    color: '#000000',
    backgroundColor: '#ffffff',
    verticalAlign: 'middle',
  };

  const headerCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    fontSize: '10px',
  };

  return (
    <div style={pageStyle}>
      {/* ── Government Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <img
          src={depedLogo}
          alt="DepEd Logo"
          style={{ width: '70px', height: '70px', objectFit: 'contain', marginBottom: '6px' }}
        />
        <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
          <div>Republic of the Philippines</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Department of Education</div>
          <div>Region X</div>
          <div>Division of Cagayan de Oro City</div>
          <div>Southwest 1 District</div>
        </div>
      </div>

      {/* ── Report Title ── */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#cc0000',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          School Canteen Liquidation Report
        </div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            marginTop: '2px',
          }}
        >
          Cash Out/Expenses
        </div>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>
          SCHOOL YEAR {schoolYear}
        </div>
      </div>

      {/* ── Expenses Table ── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontSize: '10px',
          marginBottom: '16px',
        }}
      >
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '68%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={headerCell}>Day</th>
            <th style={headerCell}>Particulars</th>
            <th style={{ ...headerCell, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp, idx) => {
            const d = new Date(exp.date + 'T00:00:00');
            const day = d.getDate();
            return (
              <tr key={exp.id ?? idx}>
                <td style={{ ...cell, textAlign: 'center' }}>{day}</td>
                <td style={cell}>{exp.name}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{fmt(exp.amount)}</td>
              </tr>
            );
          })}

          {/* Blank filler rows so the table looks like the sample form */}
          {Array.from({ length: Math.max(0, 5 - expenses.length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={{ ...cell, height: '20px' }}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
            </tr>
          ))}

          {/* Grand Total */}
          <tr>
            <td
              colSpan={2}
              style={{ ...cell, fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f5f5f5' }}
            >
              TOTAL
            </td>
            <td
              style={{
                ...cell,
                fontWeight: 'bold',
                textAlign: 'right',
                backgroundColor: '#f5f5f5',
              }}
            >
              {fmt(grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Signature Block ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '32px',
          fontSize: '10px',
        }}
      >
        <div>
          <div style={{ marginBottom: '28px' }}>F prepared by :</div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '2px', width: '200px' }}>
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{preparedBy}</div>
            <div>{preparedTitle}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '28px' }}>A authorized by :</div>
          <div
            style={{
              borderTop: '1px solid #000',
              paddingTop: '2px',
              width: '200px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{authorizedBy}</div>
            <div>{authorizedTitle}</div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          marginTop: '36px',
          borderTop: '1px solid #000000',
          paddingTop: '8px',
          fontSize: '9px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <img
          src={lumbiaLogo}
          alt="Lumbia Central School Logo"
          style={{ width: '45px', height: '45px', objectFit: 'contain' }}
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
export default function ExpensePDFExport({
  isOpen,
  onClose,
  expenses,
  schoolYear,
}: ExpensePDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Signatory fields
  const [preparedBy, setPreparedBy] = useState('AMELITA C. LAYAM');
  const [preparedTitle, setPreparedTitle] = useState('SC In-Charge');
  const [authorizedBy, setAuthorizedBy] = useState('LUCILDA GAPE');
  const [authorizedTitle, setAuthorizedTitle] = useState('SC Auditor/ADAS');

  // School info
  const [schoolName, setSchoolName] = useState('LUMBIA CENTRAL SCHOOL');
  const [schoolAddress, setSchoolAddress] = useState('F. Delima St., Lumbia, Cagayan de Oro City');
  const [schoolContact, setSchoolContact] = useState('Lumbia.cs@gmail.com | 09175275969');
  const [schoolId, setSchoolId] = useState('127977');

  const pdfRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
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
              'JPEG',
              0,
              0,
              pdfPageWidth,
              sliceHeightMm
            );
            yOffset += pageHeightPx;
          }
        }

        const label = schoolYear.replace(/\//g, '-');
        pdf.save(`Expense_Liquidation_Report_${label}.pdf`);
      } catch (error) {
        console.error('Failed to generate PDF:', error);
        alert('Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setIsGenerating(false);
        onClose();
      }
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export Expenses PDF</h2>
            <p className="text-xs text-gray-500 mt-1">
              Generates a School Canteen Liquidation Report (Cash Out/Expenses).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* Preview info */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-800">
                {expenses.length} canteen expense{expenses.length !== 1 ? 's' : ''} will be included
              </p>
              <p className="text-[10px] text-red-600 mt-0.5">
                Only <span className="font-bold">(Canteen)</span> expenses are exported. Coconut expenses are excluded.
              </p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Signatory Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Signatories</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Name)</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Title)</label>
                <input
                  type="text"
                  value={preparedTitle}
                  onChange={(e) => setPreparedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Authorized By (Name)</label>
                <input
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Authorized By (Title)</label>
                <input
                  type="text"
                  value={authorizedTitle}
                  onChange={(e) => setAuthorizedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
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
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School Address</label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Contact Details</label>
                <input
                  type="text"
                  value={schoolContact}
                  onChange={(e) => setSchoolContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School ID</label>
                <input
                  type="text"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
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
            disabled={isGenerating || expenses.length === 0}
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

      {/* Hidden PDF render target */}
      <div
        style={{
          position: 'fixed',
          top: '100vh',
          left: 0,
          width: '794px',
          backgroundColor: '#ffffff',
          color: '#000000',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <div ref={pdfRef} style={{ width: '794px', backgroundColor: '#ffffff', color: '#000000' }}>
          <ExpensePDFTemplate
            expenses={expenses}
            schoolYear={schoolYear}
            preparedBy={preparedBy}
            preparedTitle={preparedTitle}
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
