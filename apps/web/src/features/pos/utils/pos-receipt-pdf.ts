import { SaleResponse } from '@/features/sales/services/sales-api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { toast } from 'sonner';

export async function downloadThermalReceiptPdf(sale: SaleResponse, storeName?: string) {
  try {
    const { jsPDF } = await import('jspdf');

    const items = sale.items || [];
    const itemRowsCount = items.length;
    const pdfHeight = Math.max(160, 90 + itemRowsCount * 10);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, pdfHeight],
    });

    // Store Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(storeName || 'Pharmacy Store', 40, 12, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    let currentY = 17;
    pdf.text(`Receipt #: ${sale.receiptNumber}`, 40, currentY, { align: 'center' });
    currentY += 5;

    // Divider Line
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    // Metadata
    pdf.setFontSize(8);
    pdf.text(`Date & Time: ${formatDateTime(sale.createdAt)}`, 5, currentY);
    currentY += 4;
    pdf.text(`Cashier: ${sale.cashierName || 'Pharmacy Staff'}`, 5, currentY);
    currentY += 4;
    if (sale.customerName) {
      pdf.text(`Customer: ${sale.customerName}`, 5, currentY);
      currentY += 4;
    }

    // Divider Line
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    // Table Header
    pdf.setFont('helvetica', 'bold');
    pdf.text('ITEM', 5, currentY);
    pdf.text('QTY x PRICE', 42, currentY);
    pdf.text('TOTAL', 75, currentY, { align: 'right' });
    currentY += 2;
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    // Table Line Items
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
        pdf.text(`Batch: ${item.batchNumber}`, 5, currentY);
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        currentY += 4;
      }
    });

    currentY += 2;
    pdf.line(5, currentY, 75, currentY);
    currentY += 6;

    // Financial Totals
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('GRAND TOTAL:', 5, currentY);
    pdf.text(formatCurrency(sale.totalAmount), 75, currentY, { align: 'right' });
    currentY += 7;

    // Payment Details
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Payment Method: ${sale.paymentMethod || 'CASH'} (PAID)`, 5, currentY);
    currentY += 8;

    // Footer
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(5, currentY, 75, currentY);
    currentY += 5;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    const footerLines = pdf.splitTextToSize(
      'Thank you for choosing us! Please retain receipt for returns within 7 days.',
      70,
    );
    pdf.text(footerLines, 40, currentY, { align: 'center' });

    pdf.save(`Receipt-${sale.receiptNumber}.pdf`);
    toast.success('Thermal Receipt PDF downloaded successfully!');
  } catch (err) {
    console.error('PDF download error:', err);
    toast.error('Failed to generate PDF receipt.');
  }
}
