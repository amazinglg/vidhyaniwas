import jsPDF from 'jspdf';

interface ReceiptData {
  societyName: string;
  receiptNo: string;
  receiptDate: string;
  residentName: string;
  houseNo: string;
  laneNo: string;
  month: string;
  year: number;
  totalMaintenance: number;
  amountPaid: number;
  dueAmount: number;
  paymentMode: string;
  notes: string;
  customFields?: Record<string, string>;
  // Due clearance fields
  previousPaid?: number;
  originalDue?: number;
  currentPayment?: number;
  remainingDue?: number;
  isDueClearance?: boolean;
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
};

export const generateReceiptPDF = (data: ReceiptData) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Header background
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 36, 'F');

  // Society name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.societyName, pageW / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.isDueClearance ? 'Due Clearance Payment Receipt' : 'Maintenance Payment Receipt', pageW / 2, y, { align: 'center' });
  y += 7;

  // Receipt no & date row
  doc.setFontSize(8);
  doc.text(`Receipt No: ${data.receiptNo || 'N/A'}`, margin, y);
  doc.text(`Date: ${data.receiptDate}`, pageW - margin, y, { align: 'right' });
  y += 10;

  // Divider
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Resident info
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Received From:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.residentName, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`House No: ${data.houseNo}  |  Lane: ${data.laneNo}`, margin, y);
  y += 5;
  doc.text(`Period: ${data.month} ${data.year}`, margin, y);
  y += 10;

  // Payment details table
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 247, 250);
  const tableX = margin;
  const tableW = pageW - 2 * margin;
  const rowH = 9;
  const labelX = tableX + 4;
  const valX = tableX + tableW - 4;

  const rows: [string, string, string?][] = [];

  if (data.isDueClearance) {
    // Due clearance receipt - show full breakdown
    rows.push(['Total Maintenance Amount', `₹ ${data.totalMaintenance.toLocaleString('en-IN')}`]);
    rows.push(['Previously Paid', `₹ ${(data.previousPaid ?? 0).toLocaleString('en-IN')}`, 'normal']);
    rows.push(['Due Amount (Before)', `₹ ${(data.originalDue ?? 0).toLocaleString('en-IN')}`, 'due']);
    rows.push(['Current Payment', `₹ ${(data.currentPayment ?? data.amountPaid).toLocaleString('en-IN')}`, 'paid']);
    rows.push(['Remaining Due', `₹ ${(data.remainingDue ?? data.dueAmount).toLocaleString('en-IN')}`, data.remainingDue && data.remainingDue > 0 ? 'due' : 'normal']);
    rows.push(['Payment Mode', PAYMENT_MODE_LABELS[data.paymentMode] || data.paymentMode || 'N/A']);
  } else {
    // Standard receipt
    rows.push(['Total Maintenance', `₹ ${data.totalMaintenance.toLocaleString('en-IN')}`]);
    rows.push(['Amount Paid', `₹ ${data.amountPaid.toLocaleString('en-IN')}`, 'paid']);
    rows.push(['Remaining Due', `₹ ${data.dueAmount.toLocaleString('en-IN')}`, data.dueAmount > 0 ? 'due' : 'normal']);
    rows.push(['Payment Mode', PAYMENT_MODE_LABELS[data.paymentMode] || data.paymentMode || 'N/A']);
  }

  // Custom fields
  if (data.customFields) {
    Object.entries(data.customFields).forEach(([key, val]) => {
      if (val) rows.push([key, val]);
    });
  }

  rows.forEach((row, i) => {
    const ry = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(tableX, ry - 5, tableW, rowH, 'F');
    }
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], labelX, ry);

    // Color based on type
    const colorHint = row[2];
    if (colorHint === 'paid') doc.setTextColor(22, 163, 74);
    else if (colorHint === 'due') doc.setTextColor(220, 38, 38);
    else doc.setTextColor(30, 30, 30);

    doc.setFont('helvetica', 'bold');
    doc.text(row[1], valX, ry, { align: 'right' });
  });

  y += rows.length * rowH + 6;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Status badge
  const finalDue = data.isDueClearance ? (data.remainingDue ?? data.dueAmount) : data.dueAmount;
  const status = finalDue <= 0 ? 'PAID' : 'PARTIALLY PAID';
  const badgeColor = finalDue <= 0 ? [22, 163, 74] : [234, 88, 12];
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  const badgeW = doc.getTextWidth(status) + 12;
  doc.roundedRect(pageW / 2 - badgeW / 2, y - 4, badgeW, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(status, pageW / 2, y + 1, { align: 'center' });
  y += 14;

  // Footer note
  doc.setTextColor(130, 130, 130);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  const noteLines = doc.splitTextToSize(data.notes, tableW);
  doc.text(noteLines, pageW / 2, y, { align: 'center' });

  // Bottom decorative line
  doc.setFillColor(30, 58, 95);
  doc.rect(0, doc.internal.pageSize.getHeight() - 4, pageW, 4, 'F');

  return doc;
};

export const downloadReceipt = (data: ReceiptData) => {
  const doc = generateReceiptPDF(data);
  const suffix = data.isDueClearance ? '_due_clearance' : '';
  doc.save(`receipt_${data.residentName.replace(/\s+/g, '_')}_${data.month}_${data.year}${suffix}.pdf`);
};
