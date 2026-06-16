import { useState, useRef } from 'react';
import { X, Plus, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { transactionsApi } from '../lib/api';
import PDFTemplate from '../components/PDFTemplate';

interface Recipient {
  id: string;
  name: string;
  percentage: number;
}

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
}

export default function PDFExportModal({ isOpen, onClose, recipients }: PDFExportModalProps) {
  const [months, setMonths] = useState<string[]>([]);
  const [newMonth, setNewMonth] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthlyData, setMonthlyData] = useState<Record<string, number>>({});

  // Signatory states
  const [preparedBy, setPreparedBy] = useState('AMELITA C. LAYAM');
  const [preparedTitle, setPreparedTitle] = useState('SC In-Charge');
  const [auditedBy, setAuditedBy] = useState('LUCILDA GAPE');
  const [auditedTitle, setAuditedTitle] = useState('SC Auditor/ADAS');
  const [approvedBy, setApprovedBy] = useState('DANTE G. SISTO P-III');
  const [approvedTitle, setApprovedTitle] = useState('School Principal');
  const [schoolYear, setSchoolYear] = useState('2025-2026');

  const [schoolName, setSchoolName] = useState('LUMBIA CENTRAL SCHOOL');
  const [schoolAddress, setSchoolAddress] = useState('F. Delima St., Lumbia, Cagayan de Oro City');
  const [schoolContact, setSchoolContact] = useState('Lumbia.cs@gmail.com | 09175275969');
  const [schoolId, setSchoolId] = useState('127977');

  const pdfRef = useRef<HTMLDivElement>(null);



  const addMonth = () => {
    if (newMonth && !months.includes(newMonth)) {
      setMonths(prev => [...prev, newMonth].sort());
      setNewMonth('');
    }
  };

  const removeMonth = (m: string) => {
    setMonths(months.filter(x => x !== m));
  };

  const handleGenerate = async () => {
    if (months.length === 0) {
      alert('Please add at least one month.');
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Fetch data for all selected months
      const data: Record<string, number> = {};
      for (const m of months) {
        const res = await transactionsApi.collectionSummary(undefined, m);
        data[m] = res.total_collected;
      }
      setMonthlyData(data);

      // Wait a tick for React to render the table with the new data
      setTimeout(async () => {
        try {
          if (!pdfRef.current) {
            throw new Error("Print template ref not found");
          }

          // 2. Generate PDF
          // html2canvas captures the element at its natural pixel width (794px = A4 portrait at 96dpi)
          const canvas = await html2canvas(pdfRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            onclone: (_doc) => {
              _doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => l.parentNode?.removeChild(l));
              _doc.querySelectorAll('style').forEach((s) => {
                if (s.textContent && s.textContent.includes('oklch')) {
                  s.parentNode?.removeChild(s);
                }
              });
            },
          });

          // Validate canvas — an off-screen element can produce an empty 0x0 canvas
          if (canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas is empty — the template could not be rendered. Try again.');
          }

          // Use JPEG (more forgiving than PNG for jsPDF)
          const imgData = canvas.toDataURL('image/jpeg', 0.95);

          // Always portrait A4
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfPageWidth = pdf.internal.pageSize.getWidth();   // 210mm
          const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm
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
              pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfPageWidth, sliceHeightMm);
              yOffset += pageHeightPx;
            }
          }
          pdf.save(`Distribution_Report_${schoolYear}.pdf`);

        } catch (error) {
          console.error('Failed to generate PDF inside setTimeout:', error);
          alert('Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
          setIsGenerating(false);
          onClose();
        }
      }, 500);

    } catch (error) {
      console.error('Failed to fetch data for PDF:', error);
      alert('Failed to fetch data: ' + (error instanceof Error ? error.message : String(error)));
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;



  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Export PDF Report</h2>
            <p className="text-xs text-gray-500 mt-1">Configure months and signatories for the official report.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

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

            <div className="flex flex-wrap gap-2 mt-3">
              {months.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No months added yet.</p>
              ) : (
                months.map(m => (
                  <div key={m} className="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 flex items-center text-xs font-bold text-gray-700">
                    {new Date(m + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    <button onClick={() => removeMonth(m)} className="ml-2 text-gray-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Document Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Document Settings</h3>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School Year</label>
              <input type="text" value={schoolYear} onChange={e => setSchoolYear(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Name)</label>
                <input type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Prepared By (Title)</label>
                <input type="text" value={preparedTitle} onChange={e => setPreparedTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Audited By (Name)</label>
                <input type="text" value={auditedBy} onChange={e => setAuditedBy(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Audited By (Title)</label>
                <input type="text" value={auditedTitle} onChange={e => setAuditedTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Approved By (Name)</label>
                <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Approved By (Title)</label>
                <input type="text" value={approvedTitle} onChange={e => setApprovedTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School Name</label>
                <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School Address</label>
                <input type="text" value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Contact Details</label>
                <input type="text" value={schoolContact} onChange={e => setSchoolContact(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">School ID</label>
                <input type="text" value={schoolId} onChange={e => setSchoolId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || months.length === 0}
            className="px-5 py-2.5 bg-[#006B4D] hover:bg-[#00523b] text-white font-semibold rounded-lg transition-colors flex items-center disabled:opacity-50"
          >
            {isGenerating ? 'Generating PDF...' : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* 
        ===========================================================
        HIDDEN PRINT TEMPLATE
        This replicates the DepEd exact layout for html2canvas
        ===========================================================
      */}
      <div
        id="pdf-template"
        style={{
          position: 'fixed',
          top: '100vh',    // Just below the visible viewport — still rendered, not visible
          left: 0,
          width: '794px',
          backgroundColor: '#ffffff',
          color: '#000000',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <div ref={pdfRef} style={{ width: '794px', backgroundColor: '#ffffff', color: '#000000' }}>
          <PDFTemplate
            recipients={recipients}
            months={months}
            monthlyData={monthlyData}
            schoolYear={schoolYear}
            schoolName={schoolName}
            schoolAddress={schoolAddress}
            schoolContact={schoolContact}
            schoolId={schoolId}
            preparedBy={preparedBy}
            preparedTitle={preparedTitle}
            auditedBy={auditedBy}
            auditedTitle={auditedTitle}
            approvedBy={approvedBy}
            approvedTitle={approvedTitle}
          />
        </div>
      </div>

    </div>
  );
}
