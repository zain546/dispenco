import { jsPDF } from 'jspdf';
import type { SalesReportResponse, StorePerformanceBreakdown } from '../services/reports-api';

export interface SalesReportPdfOptions {
  reportData: SalesReportResponse['data'];
  storeName: string;
  storeAddress?: string | null;
  periodLabel: string;
  startDate: string;
  endDate: string;
  preparedBy?: string;
  orgStores?: StorePerformanceBreakdown[];
}

function fmtMoney(val: number | undefined | null): string {
  const num = Number(val ?? 0);
  return `PKR ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDateReadable(dateStr: string): string {
  if (!dateStr) return '-';
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const d = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTimeShort(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function generateSalesReportPdfDoc(options: SalesReportPdfOptions): {
  doc: jsPDF;
  filename: string;
} {
  const {
    reportData,
    storeName,
    storeAddress,
    periodLabel,
    startDate,
    endDate,
    preparedBy = 'Pharmacy Staff',
    orgStores,
  } = options;

  const summary = reportData.summary;
  const totalRevenue = Number(summary.totalRevenue ?? 0);
  const totalCost = Number(summary.totalCost ?? 0);
  const totalProfit = Number(summary.totalProfit ?? totalRevenue - totalCost);
  const totalTransactions = Number(summary.totalTransactions ?? 0);
  const totalItemsSold = Number(summary.totalItemsSold ?? 0);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  };

  const dateRangeDisplay =
    startDate === endDate
      ? fmtDateReadable(startDate)
      : `${fmtDateReadable(startDate)} to ${fmtDateReadable(endDate)}`;

  // =========================================================================
  // 1. CLEAN MINIMALIST HEADER
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(storeName || 'Dispenco Pharmacy', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Sales & Profit Report', pageWidth - margin, y, { align: 'right' });
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    storeAddress || `Prepared by: ${preparedBy}`,
    margin,
    y,
  );
  doc.text(
    `${periodLabel} (${dateRangeDisplay})`,
    pageWidth - margin,
    y,
    { align: 'right' },
  );
  y += 4.5;

  if (storeAddress) {
    doc.setFontSize(8);
    doc.text(`Prepared by: ${preparedBy}`, margin, y);
  }
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`,
    pageWidth - margin,
    y,
    { align: 'right' },
  );
  y += 4.5;

  // Subtle divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // =========================================================================
  // 2. SIMPLE 4-BOX SUMMARY
  // =========================================================================
  const cardGap = 3.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 20;

  const kpiCards = [
    {
      label: 'Total Sales',
      value: fmtMoney(totalRevenue),
      sub: `${totalTransactions} ${totalTransactions === 1 ? 'receipt' : 'receipts'}`,
      isProfit: false,
    },
    {
      label: 'Total Cost',
      value: fmtMoney(totalCost),
      sub: 'Purchase cost of items',
      isProfit: false,
    },
    {
      label: 'Total Profit',
      value: fmtMoney(totalProfit),
      sub: 'Net earnings',
      isProfit: true,
    },
    {
      label: 'Items Sold',
      value: String(totalItemsSold),
      sub: 'Medicine units sold',
      isProfit: false,
    },
  ];

  kpiCards.forEach((card, idx) => {
    const cx = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cx + 3.5, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    if (card.isProfit) {
      doc.setTextColor(
        totalProfit >= 0 ? 5 : 220,
        totalProfit >= 0 ? 150 : 38,
        totalProfit >= 0 ? 105 : 38,
      );
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(card.value, cx + 3.5, y + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(card.sub, cx + 3.5, y + 17.5);
  });

  y += cardHeight + 4;

  // =========================================================================
  // 3. SIMPLE PAYMENT SUMMARY BAR
  // =========================================================================
  if (summary.paymentBreakdown) {
    const pb = summary.paymentBreakdown;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.2, 1.2, 'FD');

    const py = y + 5.6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text('Payment Summary:', margin + 3.5, py);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`Cash: ${fmtMoney(pb.cash.amount)}`, margin + 36, py);
    doc.text(`Online: ${fmtMoney(pb.digital.amount)}`, margin + 92, py);
    doc.text(`Credit (Khata): ${fmtMoney(pb.credit.amount)}`, margin + 142, py);

    y += 14;
  } else {
    y += 4;
  }

  // =========================================================================
  // 4. BRANCH SUMMARY (ONLY IF MULTIPLE BRANCHES)
  // =========================================================================
  if (orgStores && orgStores.length > 1) {
    checkPageBreak(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Branch Summary', margin, y);
    y += 3;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const bhY = y + 4.4;
    doc.text('Branch', margin + 3, bhY);
    doc.text('Receipts', margin + 68, bhY, { align: 'right' });
    doc.text('Items Sold', margin + 95, bhY, { align: 'right' });
    doc.text('Total Sales', margin + 128, bhY, { align: 'right' });
    doc.text('Total Cost', margin + 156, bhY, { align: 'right' });
    doc.text('Profit', pageWidth - margin - 3, bhY, { align: 'right' });
    y += 6.5;

    orgStores.forEach((st) => {
      checkPageBreak(6.5);
      const stCost = Number(st.totalCost ?? 0);
      const stProfit = Number(st.totalProfit ?? st.totalRevenue - stCost);
      const rY = y + 4.4;

      doc.setFont('helvetica', 'medium');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(st.storeName.slice(0, 34), margin + 3, rY);

      doc.setFont('helvetica', 'normal');
      doc.text(String(st.totalTransactions), margin + 68, rY, { align: 'right' });
      doc.text(String(st.totalItemsSold), margin + 95, rY, { align: 'right' });
      doc.text(fmtMoney(st.totalRevenue), margin + 128, rY, { align: 'right' });
      doc.text(fmtMoney(stCost), margin + 156, rY, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        stProfit >= 0 ? 5 : 220,
        stProfit >= 0 ? 150 : 38,
        stProfit >= 0 ? 105 : 38,
      );
      doc.text(fmtMoney(stProfit), pageWidth - margin - 3, rY, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6.2, pageWidth - margin, y + 6.2);
      y += 6.2;
    });

    y += 6;
  }

  // =========================================================================
  // 5. DAILY BREAKDOWN (ONLY WHEN REPORT SPANS MULTIPLE DAYS)
  // =========================================================================
  const salesOverTime = reportData.salesOverTime || [];
  if (salesOverTime.length > 1) {
    checkPageBreak(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Daily Summary', margin, y);
    y += 3;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const thY = y + 4.4;
    doc.text('Date', margin + 3, thY);
    doc.text('Receipts', margin + 55, thY, { align: 'right' });
    doc.text('Items Sold', margin + 82, thY, { align: 'right' });
    doc.text('Total Sales', margin + 118, thY, { align: 'right' });
    doc.text('Total Cost', margin + 150, thY, { align: 'right' });
    doc.text('Profit', pageWidth - margin - 3, thY, { align: 'right' });
    y += 6.5;

    salesOverTime.forEach((row) => {
      checkPageBreak(6.5);
      const rowRev = Number(row.revenue ?? 0);
      const rowCost = Number(row.cost ?? 0);
      const rowProfit = Number(row.profit ?? rowRev - rowCost);
      const rY = y + 4.4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(fmtDateReadable(row.date), margin + 3, rY);
      doc.text(String(row.count), margin + 55, rY, { align: 'right' });
      doc.text(String(row.itemsSold ?? '-'), margin + 82, rY, { align: 'right' });
      doc.text(fmtMoney(rowRev), margin + 118, rY, { align: 'right' });
      doc.text(fmtMoney(rowCost), margin + 150, rY, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        rowProfit >= 0 ? 5 : 220,
        rowProfit >= 0 ? 150 : 38,
        rowProfit >= 0 ? 105 : 38,
      );
      doc.text(fmtMoney(rowProfit), pageWidth - margin - 3, rY, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6.2, pageWidth - margin, y + 6.2);
      y += 6.2;
    });

    y += 6;
  }

  // =========================================================================
  // 6. SALES RECEIPTS LIST
  // =========================================================================
  const transactions = reportData.transactions || [];
  checkPageBreak(26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Sales Receipts', margin, y);
  y += 3;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 6.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const rthY = y + 4.4;
  doc.text('Receipt #', margin + 3, rthY);
  doc.text('Date & Time', margin + 38, rthY);
  doc.text('Customer', margin + 72, rthY);
  doc.text('Payment', margin + 104, rthY);
  doc.text('Sale Amount', margin + 136, rthY, { align: 'right' });
  doc.text('Cost', margin + 158, rthY, { align: 'right' });
  doc.text('Profit', pageWidth - margin - 3, rthY, { align: 'right' });
  y += 6.5;

  if (transactions.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No sales recorded for this period.', margin + 3, y + 5.5);
    y += 10;
  } else {
    transactions.slice(0, 60).forEach((tx) => {
      checkPageBreak(6.2);
      const rY = y + 4.3;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(tx.receiptNumber.slice(0, 18), margin + 3, rY);

      doc.setTextColor(71, 85, 105);
      doc.text(fmtDateTimeShort(tx.createdAt), margin + 38, rY);
      doc.text((tx.customerName || 'Walk-in').slice(0, 18), margin + 72, rY);
      doc.text(tx.paymentMethod || 'CASH', margin + 104, rY);

      doc.setTextColor(15, 23, 42);
      doc.text(fmtMoney(tx.totalAmount), margin + 136, rY, { align: 'right' });
      doc.text(fmtMoney(tx.costAmount), margin + 158, rY, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        tx.profitAmount >= 0 ? 5 : 220,
        tx.profitAmount >= 0 ? 150 : 38,
        tx.profitAmount >= 0 ? 105 : 38,
      );
      doc.text(fmtMoney(tx.profitAmount), pageWidth - margin - 3, rY, {
        align: 'right',
      });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);
      y += 6;
    });

    // Total Row at bottom of Sales Receipts
    checkPageBreak(7);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6.5, 'FD');
    const tfY = y + 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text('Total', margin + 3, tfY);
    doc.text(fmtMoney(totalRevenue), margin + 136, tfY, { align: 'right' });
    doc.text(fmtMoney(totalCost), margin + 158, tfY, { align: 'right' });
    doc.setTextColor(
      totalProfit >= 0 ? 5 : 220,
      totalProfit >= 0 ? 150 : 38,
      totalProfit >= 0 ? 105 : 38,
    );
    doc.text(fmtMoney(totalProfit), pageWidth - margin - 3, tfY, { align: 'right' });
    y += 10;
  }

  // =========================================================================
  // 7. FOOTER ON ALL PAGES
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${storeName || 'Dispenco Pharmacy'} • Sales & Profit Report (${dateRangeDisplay})`,
      margin,
      pageHeight - 8,
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' },
    );
  }

  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '-');
  const filename =
    startDate === endDate
      ? `Sales-Profit-Report-${startDate}.pdf`
      : `Sales-Profit-Report-${safePeriod}-${startDate}-to-${endDate}.pdf`;
  return { doc, filename };
}

export function downloadSalesReportPdf(options: SalesReportPdfOptions): void {
  const { doc, filename } = generateSalesReportPdfDoc(options);
  doc.save(filename);
}

export async function shareSalesReportOnWhatsApp(
  options: SalesReportPdfOptions,
): Promise<void> {
  const { doc, filename } = generateSalesReportPdfDoc(options);
  const summary = options.reportData.summary;
  const totalRevenue = Number(summary.totalRevenue ?? 0);
  const totalCost = Number(summary.totalCost ?? 0);
  const totalProfit = Number(summary.totalProfit ?? totalRevenue - totalCost);

  const dateRangeDisplay =
    options.startDate === options.endDate
      ? fmtDateReadable(options.startDate)
      : `${fmtDateReadable(options.startDate)} to ${fmtDateReadable(options.endDate)}`;

  const lines = [
    `*${options.storeName || 'Dispenco Pharmacy'} - Sales & Profit Report*`,
    `Period: *${options.periodLabel}* (${dateRangeDisplay})`,
    `--------------------------------`,
    `Total Sales: *${fmtMoney(totalRevenue)}*`,
    `Total Cost: ${fmtMoney(totalCost)}`,
    `*Total Profit: ${fmtMoney(totalProfit)}*`,
    `Receipts: ${summary.totalTransactions} (${summary.totalItemsSold} items sold)`,
  ];

  if (summary.paymentBreakdown) {
    lines.push(
      `--------------------------------`,
      `Cash: ${fmtMoney(summary.paymentBreakdown.cash.amount)}`,
      `Online: ${fmtMoney(summary.paymentBreakdown.digital.amount)}`,
    );
    if (summary.paymentBreakdown.credit.count > 0) {
      lines.push(`Credit (Khata): ${fmtMoney(summary.paymentBreakdown.credit.amount)}`);
    }
  }

  const shareText = lines.join('\n');

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (!navigator.canShare || navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `${options.storeName} Sales & Profit Report`,
          text: shareText,
          files: [pdfFile],
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }
  }

  // Desktop fallback: download PDF and open WhatsApp Web with summary
  doc.save(filename);
  const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
