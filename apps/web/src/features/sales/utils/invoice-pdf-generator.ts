import { SaleDetailResponse, SaleResponse } from '../services/sales-api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { toast } from 'sonner';

export interface PharmacyBrandingOptions {
  storeName?: string;
  tenantName?: string;
  address?: string;
  phone?: string;
  email?: string;
  ntn?: string;
  dslNumber?: string;
  receiptFooter?: string;
  logoUrl?: string;
}

/**
 * Generates and downloads a formal, branded A4 Tax Invoice PDF (Standard Invoice format)
 * Suitable for insurance, tax filing, hospitals, corporate and retail customers.
 */
export async function downloadA4TaxInvoicePdf(
  sale: SaleDetailResponse | SaleResponse,
  branding?: PharmacyBrandingOptions,
) {
  try {
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // 210 x 297 mm
    });

    const primaryColor = [15, 76, 129]; // Refined navy brand color
    const darkColor = [30, 41, 59];
    const mutedColor = [100, 116, 139];
    const lightBg = [248, 250, 252];
    const borderColor = [226, 232, 240];

    const storeTitle =
      branding?.storeName ||
      (sale as any).store?.name ||
      'Dispenco Pharmacy Dispensary';
    const storeAddress =
      branding?.address ||
      (sale as any).store?.address ||
      'Main Commercial Area, Healthcare District';
    const dslNo = branding?.dslNumber || 'DSL-PH-09281-R';
    const ntnNo = branding?.ntn || 'NTN: 8291044-7';
    const currency = (sale as any).store?.currency || 'PKR';
    const isVoided = sale.status === 'VOIDED';

    let currentY = 18;

    // Header Top Banner
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(14, currentY, 182, 1.5, 'F');
    currentY += 8;

    // Store Branding & Document Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text(storeTitle, 14, currentY);

    pdf.setFontSize(16);
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    pdf.text('TAX INVOICE', 196, currentY, { align: 'right' });
    currentY += 6;

    // Subtitle & Pharmacy Drug License details
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(`${storeAddress} • Phone: ${branding?.phone || '+92 300 0000000'}`, 14, currentY);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`ORIGINAL FOR RECIPIENT`, 196, currentY, { align: 'right' });
    currentY += 4.5;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Licence No: ${dslNo} | ${ntnNo}`, 14, currentY);

    if (isVoided) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(220, 38, 38);
      pdf.text('VOIDED INVOICE', 196, currentY, { align: 'right' });
    }
    currentY += 8;

    // Divider
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(0.4);
    pdf.line(14, currentY, 196, currentY);
    currentY += 6;

    // 2-Column Info Cards: Customer / Billed To & Invoice Metadata
    const colWidth = 88;
    const infoBoxHeight = 28;

    // Left Box: Billed To (Customer)
    pdf.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    pdf.roundedRect(14, currentY, colWidth, infoBoxHeight, 2, 2, 'F');
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.roundedRect(14, currentY, colWidth, infoBoxHeight, 2, 2, 'D');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text('BILLED TO (CUSTOMER)', 18, currentY + 5);

    const rawSale = sale as any;
    const custName =
      rawSale.customer?.name ||
      rawSale.customerName ||
      'Walk-in Retail Customer';
    const custPhone =
      rawSale.customer?.phone || rawSale.customerPhone || 'N/A';
    const custAddr = rawSale.customer?.address || 'Counter Walk-in';

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    pdf.text(custName.slice(0, 35), 18, currentY + 11);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(`Phone: ${custPhone}`, 18, currentY + 17);
    pdf.text(`Address: ${custAddr.slice(0, 42)}`, 18, currentY + 22);

    // Right Box: Invoice Metadata
    const rightBoxX = 108;
    pdf.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    pdf.roundedRect(rightBoxX, currentY, colWidth, infoBoxHeight, 2, 2, 'F');
    pdf.roundedRect(rightBoxX, currentY, colWidth, infoBoxHeight, 2, 2, 'D');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text('INVOICE DETAILS', rightBoxX + 4, currentY + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

    pdf.text(`Invoice No:`, rightBoxX + 4, currentY + 11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`#${sale.receiptNumber}`, rightBoxX + colWidth - 4, currentY + 11, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date & Time:`, rightBoxX + 4, currentY + 16.5);
    pdf.text(formatDateTime(sale.createdAt), rightBoxX + colWidth - 4, currentY + 16.5, { align: 'right' });

    const paymentMode = rawSale.paymentMethod || rawSale.payment?.method || 'CASH';
    pdf.text(`Payment Mode:`, rightBoxX + 4, currentY + 22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      `${paymentMode} (${isVoided ? 'VOIDED' : 'PAID'})`,
      rightBoxX + colWidth - 4,
      currentY + 22,
      { align: 'right' },
    );

    currentY += infoBoxHeight + 8;

    // Table Header
    const tableHeaderY = currentY;
    const tableHeaderHeight = 8;
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.roundedRect(14, tableHeaderY, 182, tableHeaderHeight, 1.5, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);

    pdf.text('#', 17, tableHeaderY + 5.5);
    pdf.text('Medicine / Product Description', 25, tableHeaderY + 5.5);
    pdf.text('Batch', 98, tableHeaderY + 5.5);
    pdf.text('Expiry', 120, tableHeaderY + 5.5);
    pdf.text('Qty', 140, tableHeaderY + 5.5, { align: 'center' });
    pdf.text('Price', 160, tableHeaderY + 5.5, { align: 'right' });
    pdf.text('Total', 192, tableHeaderY + 5.5, { align: 'right' });

    currentY += tableHeaderHeight + 2;

    // Line Items
    const items = sale.items || [];
    pdf.setFontSize(8);

    items.forEach((item, index) => {
      const isAltRow = index % 2 === 1;
      if (isAltRow) {
        pdf.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        pdf.rect(14, currentY - 1, 182, 8, 'F');
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text(String(index + 1), 17, currentY + 4);

      // Medicine Name & Generic subtext
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      const prodName = item.productName || 'Medicine Item';
      pdf.text(prodName.slice(0, 36), 25, currentY + 4);

      // Batch & Expiry
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text(item.batchNumber ? String(item.batchNumber).slice(0, 10) : '-', 98, currentY + 4);

      const expStr = item.expiryDate ? item.expiryDate.slice(0, 7) : '-';
      pdf.text(expStr, 120, currentY + 4);

      // Qty, Unit Price, Line Total
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.text(String(item.quantity), 140, currentY + 4, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.text(Number(item.unitPrice).toFixed(2), 160, currentY + 4, { align: 'right' });

      pdf.setFont('helvetica', 'bold');
      pdf.text(Number(item.lineTotal).toFixed(2), 192, currentY + 4, { align: 'right' });

      currentY += 7.5;

      // Handle page overflow if order has many items
      if (currentY > 245) {
        pdf.addPage();
        currentY = 20;
      }
    });

    currentY += 2;
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(0.4);
    pdf.line(14, currentY, 196, currentY);
    currentY += 6;

    // Totals & Regulatory Terms Section
    const totalsStartY = currentY;

    // Left Side: Terms, Return Policy & Official Stamp
    const termsWidth = 105;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    pdf.text('Terms & Pharmacy Regulations:', 14, totalsStartY + 3);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

    const termsLines = [
      '1. Medicines requiring refrigeration (2°C-8°C) are non-returnable once dispensed.',
      '2. Other goods may be returned/exchanged within 7 days with original intact packaging.',
      '3. Computer generated tax invoice. Valid without physical signature.',
      '4. Regulated under Drug Act 1976 and provincial healthcare authorities.',
    ];

    let termY = totalsStartY + 7.5;
    termsLines.forEach((t) => {
      pdf.text(t, 14, termY);
      termY += 4;
    });

    // Pharmacist Signature & Stamp Box
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.rect(14, termY + 3, 50, 18, 'D');
    pdf.setFontSize(6.5);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text('Authorised Dispenser / Stamp', 16, termY + 19);

    // Right Side: Financial Breakdown Box
    const totalsBoxX = 125;
    const totalsBoxWidth = 71;

    let subtotalCalc = 0;
    items.forEach((i) => {
      subtotalCalc += i.unitPrice * i.quantity;
    });

    const subtotal = subtotalCalc;
    const discount = Number(sale.discountAmount || 0);
    const tax = Number(sale.taxAmount || 0);
    const grandTotal = Number(sale.totalAmount);

    let calcY = totalsStartY + 3;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

    pdf.text('Gross Subtotal:', totalsBoxX, calcY);
    pdf.text(`${currency} ${subtotal.toFixed(2)}`, 196, calcY, { align: 'right' });
    calcY += 5.5;

    if (discount > 0) {
      pdf.setTextColor(16, 185, 129); // green
      pdf.text('Total Discount:', totalsBoxX, calcY);
      pdf.text(`-${currency} ${discount.toFixed(2)}`, 196, calcY, { align: 'right' });
      calcY += 5.5;
    }

    if (tax > 0) {
      pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      pdf.text('Sales Tax / GST:', totalsBoxX, calcY);
      pdf.text(`+${currency} ${tax.toFixed(2)}`, 196, calcY, { align: 'right' });
      calcY += 5.5;
    }

    // Grand Total Highlight Banner
    calcY += 1;
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.roundedRect(totalsBoxX - 2, calcY, totalsBoxWidth + 2, 10, 1.5, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text('NET PAYABLE:', totalsBoxX + 2, calcY + 6.5);
    pdf.text(`${currency} ${grandTotal.toFixed(2)}`, 194, calcY + 6.5, { align: 'right' });

    // Page Footer at bottom of A4
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    pdf.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    pdf.text(
      `${storeTitle} • Powered by Dispenco Pharmacy Management Suite`,
      105,
      287,
      { align: 'center' },
    );

    const filename = `Tax-Invoice-${sale.receiptNumber}.pdf`;
    pdf.save(filename);
    toast.success(`Branded Tax Invoice downloaded: ${filename}`);
  } catch (err) {
    console.error('Failed to generate A4 tax invoice:', err);
    toast.error('Failed to generate A4 Tax Invoice PDF.');
  }
}

/**
 * Enhanced 80mm High-Speed Thermal Receipt PDF Generator
 */
export async function downloadThermalReceiptPdf(
  sale: SaleResponse | SaleDetailResponse,
  storeName?: string,
) {
  try {
    const { jsPDF } = await import('jspdf');

    const items = sale.items || [];
    const itemRowsCount = items.length;
    const pdfHeight = Math.max(160, 95 + itemRowsCount * 11);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, pdfHeight],
    });

    const displayName = storeName || (sale as any).store?.name || 'Pharmacy Dispensary';
    const isVoided = sale.status === 'VOIDED';

    // Store Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(displayName, 40, 12, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    let currentY = 17;
    pdf.text(`Tax Receipt #: ${sale.receiptNumber}`, 40, currentY, { align: 'center' });
    currentY += 4.5;

    if (isVoided) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(220, 38, 38);
      pdf.text('*** VOIDED TRANSACTION ***', 40, currentY, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      currentY += 4.5;
    }

    // Divider Line
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    // Metadata
    pdf.setFontSize(8);
    pdf.text(`Date & Time: ${formatDateTime(sale.createdAt)}`, 5, currentY);
    currentY += 4;
    const rawSale = sale as any;
    pdf.text(`Cashier: ${rawSale.user?.name || rawSale.cashierName || 'Staff'}`, 5, currentY);
    currentY += 4;

    const custName = rawSale.customer?.name || rawSale.customerName;
    if (custName) {
      pdf.text(`Customer: ${custName}`, 5, currentY);
      currentY += 4;
    }

    // Divider Line
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    // Table Header
    pdf.setFont('helvetica', 'bold');
    pdf.text('MEDICINE ITEM', 5, currentY);
    pdf.text('QTY x PRICE', 42, currentY);
    pdf.text('TOTAL', 75, currentY, { align: 'right' });
    currentY += 2;
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    // Line Items
    pdf.setFont('helvetica', 'normal');
    items.forEach((item) => {
      const name = item.productName || 'Medicine';
      const truncatedName = name.length > 18 ? name.slice(0, 17) + '...' : name;
      pdf.text(truncatedName, 5, currentY);
      pdf.text(`${item.quantity} x ${Number(item.unitPrice).toFixed(0)}`, 42, currentY);
      pdf.text(formatCurrency(item.lineTotal), 75, currentY, { align: 'right' });
      currentY += 4;

      if (item.batchNumber) {
        pdf.setFontSize(6.5);
        pdf.setTextColor(100, 100, 100);
        const exp = item.expiryDate ? ` | Exp: ${item.expiryDate.slice(0, 7)}` : '';
        pdf.text(`Batch: ${item.batchNumber}${exp}`, 5, currentY);
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        currentY += 4;
      }
    });

    currentY += 2;
    pdf.line(5, currentY, 75, currentY);
    currentY += 6;

    // Grand Total
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('GRAND TOTAL:', 5, currentY);
    pdf.text(formatCurrency(sale.totalAmount), 75, currentY, { align: 'right' });
    currentY += 6.5;

    // Payment Details
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const paymentStr = rawSale.paymentMethod || rawSale.payment?.method || 'CASH';
    pdf.text(`Payment: ${paymentStr} (${isVoided ? 'VOIDED' : 'PAID'})`, 5, currentY);
    currentY += 6;

    // Footer
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    const footerLines = pdf.splitTextToSize(
      (sale as any).store?.receiptFooter ||
        'Thank you for your visit! Return/Exchange with receipt within 7 days.',
      70,
    );
    pdf.text(footerLines, 40, currentY, { align: 'center' });

    pdf.save(`Thermal-Receipt-${sale.receiptNumber}.pdf`);
    toast.success('Thermal Receipt PDF downloaded successfully!');
  } catch (err) {
    console.error('Thermal PDF download error:', err);
    toast.error('Failed to generate thermal receipt PDF.');
  }
}
