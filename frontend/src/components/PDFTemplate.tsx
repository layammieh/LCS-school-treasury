import React from 'react';
import depedLogo from '../assets/deped_logo.png';
import lumbiaLogo from '../assets/lumbia_logo.png';

interface Recipient {
  id: string | number;
  name: string;
  percentage: number;
}

interface PDFTemplateProps {
  recipients: Recipient[];
  months: string[];
  monthlyData: Record<string, number>;
  schoolYear: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  schoolId: string;
  preparedBy: string;
  preparedTitle: string;
  auditedBy: string;
  auditedTitle: string;
  approvedBy: string;
  approvedTitle: string;
}

// A4 portrait at 96 dpi = 794px wide. We use 36px padding on each side = 722px content area.
const PAGE_WIDTH = 794;
const PAGE_PADDING = 36;

export default function PDFTemplate({
  recipients,
  months,
  monthlyData,
  schoolYear,
  schoolName,
  schoolAddress,
  schoolContact,
  schoolId,
  preparedBy,
  preparedTitle,
  auditedBy,
  auditedTitle,
  approvedBy,
  approvedTitle,
}: PDFTemplateProps) {
  const formatCurrency = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalIncomeAllMonths = months.reduce((sum, m) => sum + (monthlyData[m] ?? 0), 0);

  const pageStyle: React.CSSProperties = {
    width: `${PAGE_WIDTH}px`,
    minHeight: '1123px', // A4 height at 96dpi
    padding: `${PAGE_PADDING}px`,
    boxSizing: 'border-box',
    fontFamily: '"Inter", "system-ui", "sans-serif"',
    color: '#000000',
    backgroundColor: '#ffffff',
    fontSize: '11px',
    lineHeight: '1.4',
  };

  const cell: React.CSSProperties = {
    border: '1px solid #000000',
    padding: '3px 4px',
    color: '#000000',
    backgroundColor: '#ffffff',
  };

  const headerCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#ffffff',
  };

  const totalCell: React.CSSProperties = {
    ...cell,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <img
          src={depedLogo}
          alt="DepEd Logo"
          style={{
            width: '64px',
            height: '64px',
            marginBottom: '6px',
            objectFit: 'contain',
          }}
        />
        <div style={{ fontSize: '10px', lineHeight: '1.5' }}>
          <div>Republic of the Philippines</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Department of Education</div>
          <div>Region X</div>
          <div>Division of Cagayan de Oro City</div>
          <div>Southwest 1 District</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#cc0000', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          SC STATEMENT OF RECEIPTS AND UTILIZATION OF NET INCOME
        </div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '3px' }}>
          SCHOOL YEAR {schoolYear}
        </div>
      </div>

      {/* Data Table — tableLayout:fixed prevents columns from overflowing */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        fontSize: '9px',
        marginBottom: '14px',
      }}>
        <colgroup>
          {/* Month label ~15%, Amount ~13%, each recipient col evenly, Total ~13% */}
          <col style={{ width: '13%' }} />
          <col style={{ width: '12%' }} />
          {recipients.map(r => (
            <col key={r.id} style={{ width: `${62 / recipients.length}%` }} />
          ))}
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} colSpan={2} style={{ ...headerCell, verticalAlign: 'middle' }}>MONTHLY INCOME</th>
            {recipients.map(r => (
              <th key={r.id} style={{ ...headerCell, textTransform: 'uppercase', wordBreak: 'break-word' }}>{r.name}</th>
            ))}
            <th style={{ ...headerCell }}>TOTAL</th>
          </tr>
          <tr>
            {recipients.map(r => (
              <th key={`pct-${r.id}`} style={{ ...headerCell }}>{r.percentage}%</th>
            ))}
            <th style={{ ...headerCell }}>100%</th>
          </tr>
        </thead>
        <tbody>
          {months.map(m => {
            const monthDate = new Date(m + '-01T00:00:00');
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
            const total = monthlyData[m] ?? 0;
            return (
              <tr key={m}>
                <td style={{ ...cell, fontWeight: 'bold' }}>{monthName}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{formatCurrency(total)}</td>
                {recipients.map(r => (
                  <td key={`${m}-${r.id}`} style={{ ...cell, textAlign: 'right' }}>
                    {formatCurrency((total * r.percentage) / 100)}
                  </td>
                ))}
                <td style={{ ...cell, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(total)}</td>
              </tr>
            );
          })}
          {/* Grand Total */}
          <tr>
            <td style={{ ...totalCell, fontWeight: 'bold' }}>TOTAL</td>
            <td style={{ ...totalCell, textAlign: 'right' }}>{formatCurrency(totalIncomeAllMonths)}</td>
            {recipients.map(r => (
              <td key={`tot-${r.id}`} style={{ ...totalCell, textAlign: 'right' }}>
                {formatCurrency((totalIncomeAllMonths * r.percentage) / 100)}
              </td>
            ))}
            <td style={{ ...totalCell, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(totalIncomeAllMonths)}</td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontSize: '10px' }}>
        <div>
          <div style={{ marginBottom: '24px' }}>Prepared by:</div>
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{preparedBy}</div>
          <div>{preparedTitle}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>Audited by:</div>
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{auditedBy}</div>
          <div>{auditedTitle}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '24px' }}>Approved by:</div>
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{approvedBy}</div>
          <div>{approvedTitle}</div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '32px',
          borderTop: '1px solid #000',
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
          style={{
            width: '45px',
            height: '45px',
            objectFit: 'contain',
          }}
        />

        <div>
          <div
            style={{
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            {schoolName}
          </div>
          <div>{schoolAddress}</div>
          <div>{schoolContact}</div>
          <div>SCHOOL ID: {schoolId}</div>
        </div>
      </div>
    </div>
  );
}
