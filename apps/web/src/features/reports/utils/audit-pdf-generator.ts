import { AuditLogItem, AuditMetricsSummary } from '@dispenco/types';

interface GenerateAuditPdfOptions {
  pharmacyName?: string;
  storeName?: string;
  items: AuditLogItem[];
  summary?: AuditMetricsSummary | null;
  dateRangeStr?: string;
  filterCategory?: string;
}

export async function generateAuditPdf({
  pharmacyName = 'Dispenco Pharmacy Network',
  storeName = 'Main Branch',
  items,
  summary,
  dateRangeStr = 'Last 30 Days',
  filterCategory = 'All Operational Events',
}: GenerateAuditPdfOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [15, 118, 110]; // #0f766e (Teal / Pharmacy brand)
  const darkColor = [24, 24, 27]; // #18181b
  const mutedColor = [113, 113, 122]; // #71717a
  const borderColor = [228, 228, 231]; // #e4e4e7
  const lightBg = [244, 244, 245]; // #f4f4f5
  const warningColor = [217, 119, 6]; // Amber
  const criticalColor = [220, 38, 38]; // Red

  let currentY = 16;

  // 1. Top Decorative Brand Bar
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(14, currentY, 182, 1.5, 'F');
  currentY += 8;

  // 2. Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text(pharmacyName.toUpperCase(), 14, currentY);

  pdf.setFontSize(14);
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.text('COMPLIANCE AUDIT DOSSIER', 196, currentY, { align: 'right' });
  currentY += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.text(`${storeName} • Official Audit & Inspection Record`, 14, currentY);

  const nowStr = new Date().toLocaleString();
  pdf.text(`Generated: ${nowStr}`, 196, currentY, { align: 'right' });
  currentY += 6;

  // Separator Line
  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setLineWidth(0.4);
  pdf.line(14, currentY, 196, currentY);
  currentY += 6;

  // 3. Inspection Scope Metadata Box
  pdf.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  pdf.roundedRect(14, currentY, 182, 18, 1.5, 1.5, 'F');
  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.roundedRect(14, currentY, 182, 18, 1.5, 1.5, 'D');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.text('AUDIT PERIOD:', 18, currentY + 5.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(dateRangeStr, 48, currentY + 5.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('CATEGORY FILTER:', 18, currentY + 11.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(filterCategory, 48, currentY + 11.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL LOGGED EVENTS:', 115, currentY + 5.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(summary?.totalEvents ?? items.length), 160, currentY + 5.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('INTEGRITY STATUS:', 115, currentY + 11.5);
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text('VERIFIED & UNMODIFIED', 160, currentY + 11.5);

  currentY += 24;

  // 4. Executive Metrics Row
  if (summary) {
    const cardWidth = 43;
    const cardHeight = 16;
    const gap = 3.3;

    const cards = [
      { label: 'Total Events', val: String(summary.totalEvents), color: primaryColor },
      { label: 'Sale Voids', val: String(summary.voidsCount), color: criticalColor },
      { label: 'Stock Adjustments', val: String(summary.stockAdjustmentsCount), color: warningColor },
      { label: 'Security & Keys', val: String(summary.securityEventsCount), color: darkColor },
    ];

    cards.forEach((c, idx) => {
      const x = 14 + idx * (cardWidth + gap);
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      pdf.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text(c.label.toUpperCase(), x + 4, currentY + 5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(c.color[0], c.color[1], c.color[2]);
      pdf.text(c.val, x + 4, currentY + 12);
    });

    currentY += 22;
  }

  // 5. Audit Log Table Header
  pdf.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.rect(14, currentY, 182, 7, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('DATE / TIME', 16, currentY + 4.8);
  pdf.text('SEVERITY', 45, currentY + 4.8);
  pdf.text('ACTION & SCOPE', 65, currentY + 4.8);
  pdf.text('ACTOR (STAFF)', 105, currentY + 4.8);
  pdf.text('NARRATIVE & AUDIT REASON', 140, currentY + 4.8);

  currentY += 7;

  // 6. Audit Log Rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  const pageHeightLimit = 265;

  items.slice(0, 50).forEach((item, index) => {
    // Check if new page needed
    if (currentY > pageHeightLimit) {
      pdf.addPage();
      currentY = 16;

      // Repeat Table Header on subsequent pages
      pdf.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.rect(14, currentY, 182, 7, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text('DATE / TIME', 16, currentY + 4.8);
      pdf.text('SEVERITY', 45, currentY + 4.8);
      pdf.text('ACTION & SCOPE', 65, currentY + 4.8);
      pdf.text('ACTOR (STAFF)', 105, currentY + 4.8);
      pdf.text('NARRATIVE & AUDIT REASON', 140, currentY + 4.8);
      currentY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
    }

    const rowBg = index % 2 === 0 ? [255, 255, 255] : lightBg;
    pdf.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    pdf.rect(14, currentY, 182, 9, 'F');

    // Date
    const d = new Date(item.createdAt);
    const dateFormatted = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    pdf.text(dateFormatted, 16, currentY + 5.5);

    // Severity
    if (item.severity === 'critical') {
      pdf.setTextColor(criticalColor[0], criticalColor[1], criticalColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CRITICAL', 45, currentY + 5.5);
    } else if (item.severity === 'warning') {
      pdf.setTextColor(warningColor[0], warningColor[1], warningColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('WARNING', 45, currentY + 5.5);
    } else {
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.setFont('helvetica', 'normal');
      pdf.text('INFO', 45, currentY + 5.5);
    }

    // Action & Scope
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const actionTruncated = item.action.length > 20 ? item.action.slice(0, 18) + '...' : item.action;
    pdf.text(actionTruncated, 65, currentY + 5.5);

    // Actor
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const actorName = item.user?.name || 'System Auto';
    const actorRole = item.user?.role ? `(${item.user.role})` : '';
    pdf.text(`${actorName.slice(0, 15)} ${actorRole}`.slice(0, 22), 105, currentY + 5.5);

    // Narrative Summary
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    const narrativeTruncated =
      item.summaryText.length > 40
        ? item.summaryText.slice(0, 38) + '...'
        : item.summaryText;
    pdf.text(narrativeTruncated, 140, currentY + 5.5);

    // Bottom border for row
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(0.2);
    pdf.line(14, currentY + 9, 196, currentY + 9);

    currentY += 9;
  });

  // 7. Official Sign-off Box at bottom (or new page if near bottom)
  if (currentY > 230) {
    pdf.addPage();
    currentY = 20;
  } else {
    currentY += 12;
  }

  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.line(14, currentY, 196, currentY);
  currentY += 14;

  const signWidth = 80;
  // Pharmacist Signature
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  pdf.line(14, currentY, 14 + signWidth, currentY);
  pdf.text('SUPERINTENDENT PHARMACIST SIGNATURE & STAMP', 14, currentY + 4.5);

  // Inspector Signature
  pdf.line(116, currentY, 116 + signWidth, currentY);
  pdf.text('GOVERNMENT DRUG INSPECTOR / LEAD AUDITOR SIGNATURE', 116, currentY + 4.5);

  // Save the PDF
  const filenameDate = new Date().toISOString().split('T')[0];
  pdf.save(`dispenco-compliance-audit-dossier-${filenameDate}.pdf`);
}
