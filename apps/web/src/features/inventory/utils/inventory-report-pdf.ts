import { jsPDF } from 'jspdf';
import { formatCategory, formatUnitPlural } from '../components/product-list';

export interface InventoryStockReportPdfOptions {
  storeName: string;
  storeAddress?: string | null;
  reportScope: 'all' | 'in-stock' | 'low-stock' | 'expiring';
  generatedBy?: string;
  summary: {
    totalCatalogItems: number;
    stockedCount?: number;
    unstockedCount?: number;
    lowStockCount: number;
    expiringSoonCount: number;
    priorityCount: number;
  };
  products: Array<{
    id: string;
    name: string;
    genericName: string | null;
    category: string;
    unit: string;
    barcode: string | null;
    lowStockThreshold: number;
    totalStock: number;
    batchCount: number;
    earliestBatchNumber: string | null;
    earliestExpiryDate: string | null;
    daysUntilEarliestExpiry: number | null;
    isOutofStock: boolean;
    isLowStock: boolean;
    isExpiringSoon: boolean;
    isPriority: boolean;
    vendorName?: string | null;
    manufacturer?: string | null;
  }>;
}

function fmtDateReadable(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
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

export function generateInventoryStockPdfDoc(options: InventoryStockReportPdfOptions): {
  doc: jsPDF;
  filename: string;
} {
  const {
    storeName,
    storeAddress,
    reportScope,
    generatedBy = 'Pharmacy Staff',
    summary,
    products,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182
  let y = 16;

  const primaryColor = [15, 118, 110]; // #0f766e Teal
  const darkColor = [15, 23, 42]; // #0f172a Slate 900
  const mutedColor = [100, 116, 139]; // Slate 500
  const borderColor = [226, 232, 240]; // Slate 200

  const scopeLabels = {
    all: 'Complete Stock & Batches Audit (Entire Inventory)',
    'in-stock': 'Active In-Stock Inventory (Stock > 0)',
    'low-stock': 'Low Stock & Depleted Restock Sheet',
    expiring: 'Expiring Soon & Vulnerable Batches (< 180 Days)',
  };

  const currentScopeTitle = scopeLabels[reportScope] || 'Inventory Stock Report';

  // 1. Top Decorative Brand Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 1.5, 'F');
  y += 7;

  // 2. Pharmacy Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text((storeName || 'Dispenco Pharmacy').toUpperCase(), margin, y);

  doc.setFontSize(11);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('INVENTORY STOCK AUDIT', pageWidth - margin, y, { align: 'right' });
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(storeAddress || 'Main Pharmacy Facility • Healthcare Dispensary', margin, y);

  const nowStr = new Date().toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  doc.text(`Generated: ${nowStr}`, pageWidth - margin, y, { align: 'right' });
  y += 4.5;

  doc.setFontSize(8);
  doc.text(`Scope: ${currentScopeTitle}`, margin, y);
  doc.text(`Auditor: ${generatedBy}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  // Header Divider Line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // 3. Executive KPI Metric Cards
  const kpiCards = [
    {
      label: 'TOTAL CATALOG',
      value: String(summary.totalCatalogItems),
      sub: `${products.length} listed in scope`,
    },
    {
      label: 'IN-STOCK ITEMS',
      value: String(summary.stockedCount ?? 0),
      sub: `${Math.round(((summary.stockedCount ?? 0) / Math.max(1, summary.totalCatalogItems)) * 100)}% branch coverage`,
    },
    {
      label: 'LOW STOCK ALERTS',
      value: String(summary.lowStockCount),
      sub: summary.lowStockCount > 0 ? 'Requires reorder' : 'Levels healthy',
      isWarning: summary.lowStockCount > 0,
    },
    {
      label: 'EXPIRING SOON',
      value: String(summary.expiringSoonCount),
      sub: '< 180 days to expiry',
      isCritical: summary.expiringSoonCount > 0,
    },
  ];

  const cardGap = 3.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 18;

  kpiCards.forEach((c, idx) => {
    const cx = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(c.label, cx + 3, y + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    if (c.isCritical) {
      doc.setTextColor(220, 38, 38);
    } else if (c.isWarning) {
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    }
    doc.text(c.value, cx + 3, y + 11.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, cx + 3, y + 15.5);
  });

  y += cardHeight + 7;

  // 4. Products Inventory Table
  const colW = {
    idx: 7,
    medicine: 58,
    category: 27,
    stock: 23,
    batches: 20,
    expiry: 25,
    status: 22,
  };

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 6.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);

    const hy = y + 4.6;
    let cx = margin + 2;

    doc.text('#', cx, hy);
    cx += colW.idx;

    doc.text('Medicine / Generic Formula', cx, hy);
    cx += colW.medicine;

    doc.text('Category', cx, hy);
    cx += colW.category;

    doc.text('Available Stock', cx + colW.stock - 2, hy, { align: 'right' });
    cx += colW.stock;

    doc.text('Batches', cx + 1, hy);
    cx += colW.batches;

    doc.text('Nearest Expiry', cx, hy);
    cx += colW.expiry;

    doc.text('Status', cx + colW.status - 2, hy, { align: 'right' });

    y += 6.8;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
      // Draw top brand bar on subsequent pages
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, y, contentWidth, 1.2, 'F');
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`${(storeName || 'Dispenco').toUpperCase()} • Inventory Stock Audit (Cont.)`, margin, y);
      y += 5;

      drawTableHeader();
    }
  };

  drawTableHeader();

  products.forEach((prod, idx) => {
    const rowHeight = prod.genericName ? 8.2 : 6.8;
    checkPageBreak(rowHeight);

    const ry = y + 4.3;
    let cx = margin + 2;

    // Row zebra background
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    // Index
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(String(idx + 1), cx, ry);
    cx += colW.idx;

    // Medicine Name + Generic
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const cleanName = (prod.name || 'Unknown').slice(0, 36);
    doc.text(cleanName, cx, ry);

    if (prod.genericName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      const cleanGeneric = prod.genericName.slice(0, 42);
      doc.text(cleanGeneric, cx, ry + 3.2);
    }
    cx += colW.medicine;

    // Category
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(formatCategory(prod.category).slice(0, 18), cx, ry);
    cx += colW.category;

    // Available Stock
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    if (prod.isOutofStock) {
      doc.setTextColor(220, 38, 38);
    } else if (prod.isLowStock) {
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    }
    doc.text(formatUnitPlural(prod.unit, prod.totalStock), cx + colW.stock - 2, ry, { align: 'right' });
    cx += colW.stock;

    // Batches
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    const batchText = prod.batchCount > 0 ? `${prod.batchCount} batch${prod.batchCount === 1 ? '' : 'es'}` : 'None';
    doc.text(batchText, cx + 1, ry);
    cx += colW.batches;

    // Nearest Expiry
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    if (prod.isExpiringSoon) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    }
    doc.text(fmtDateReadable(prod.earliestExpiryDate), cx, ry);
    cx += colW.expiry;

    // Status Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (prod.isOutofStock) {
      doc.setTextColor(220, 38, 38);
      doc.text('OUT OF STOCK', cx + colW.status - 2, ry, { align: 'right' });
    } else if (prod.isExpiringSoon) {
      doc.setTextColor(225, 29, 72);
      doc.text('EXPIRING SOON', cx + colW.status - 2, ry, { align: 'right' });
    } else if (prod.isLowStock) {
      doc.setTextColor(217, 119, 6);
      doc.text('LOW STOCK', cx + colW.status - 2, ry, { align: 'right' });
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text('IN STOCK', cx + colW.status - 2, ry, { align: 'right' });
    }

    // Row subtle divider
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    y += rowHeight;
  });

  // 5. Multi-page Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(
      'Dispenco Pharmacy Management Suite • Official Stock Audit Dossier',
      margin,
      pageHeight - 7.5,
    );

    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7.5, {
      align: 'right',
    });
  }

  const safeStoreStr = (storeName || 'Inventory')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 24);
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `Stock-Report-${safeStoreStr}-${reportScope}-${dateSlug}.pdf`;

  return { doc, filename };
}

