import jsPDF from 'jspdf';

interface ReceiptData {
  societyName: string;
  receiptNo?: string;
  receiptDate: string;
  residentName: string;
  houseNo: string;
  laneNo: string;
  /** Month is no longer rendered on receipts but kept for backwards compatibility */
  month?: string;
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

// Theme 2 — teal deep ocean + gold
const TEAL: [number, number, number] = [13, 71, 90];        // deep teal
const TEAL_DARK: [number, number, number] = [8, 47, 60];    // darker teal
const GOLD: [number, number, number] = [201, 162, 71];      // antique gold
const SOFT: [number, number, number] = [240, 245, 247];     // soft surface
const INK: [number, number, number] = [28, 36, 42];
const MUTED: [number, number, number] = [110, 120, 128];

const formatFY = (year: number) => `${year}-${String((year + 1) % 100).padStart(2, '0')}`;

const ensureSocietyName = (name: string) => {
  const n = (name || '').trim();
  if (!n) return 'Shri Vidhya Niwas Society';
  // Auto-prefix "Shri" if missing
  if (/^shri\s/i.test(n)) return n;
  if (/^vidhya niwas/i.test(n)) return `Shri ${n}`;
  return n;
};

export const generateReceiptPDF = (data: ReceiptData) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const society = ensureSocietyName(data.societyName);

  // ---------- Header band ----------
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageW, 30, 'F');
  // Gold accent strip
  doc.setFillColor(...GOLD);
  doc.rect(0, 30, pageW, 1.2, 'F');
  // Subtle dark sheen on right
  doc.setFillColor(...TEAL_DARK);
  doc.rect(pageW - 28, 0, 28, 30, 'F');

  // Monogram circle
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 6, 15, 6, 'F');
  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SVN', margin + 6, 17, { align: 'center' });

  // Society name (no "Society" suffix duplication)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(society, margin + 16, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 230, 234);
  doc.text(data.isDueClearance ? 'Due Clearance Receipt' : 'Maintenance Payment Receipt', margin + 16, 20);

  // Date in header (right) — receipt number intentionally removed
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Receipt Date', pageW - margin, 13, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.receiptDate, pageW - margin, 19, { align: 'right' });

  let y = 42;

  // ---------- Resident block ----------
  doc.setFillColor(...SOFT);
  doc.roundedRect(margin, y - 4, pageW - 2 * margin, 22, 2, 2, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(margin + 3, y - 4, margin + 3, y + 18);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('RECEIVED FROM', margin + 6, y);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.residentName, margin + 6, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`House ${data.houseNo}  •  Lane ${data.laneNo}`, margin + 6, y + 11);

  // Period chip on the right
  const fy = formatFY(data.year);
  const chipW = 34;
  const chipX = pageW - margin - chipW - 2;
  doc.setFillColor(...TEAL);
  doc.roundedRect(chipX, y - 1, chipW, 14, 2, 2, 'F');
  doc.setTextColor(220, 230, 234);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('FINANCIAL YEAR', chipX + chipW / 2, y + 3, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(fy, chipX + chipW / 2, y + 10, { align: 'center' });

  y += 28;

  // ---------- Payment table ----------
  const tableX = margin;
  const tableW = pageW - 2 * margin;
  const rowH = 8.5;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(tableX, y - 4, tableX + tableW, y - 4);

  doc.setTextColor(...TEAL_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PAYMENT DETAILS', tableX, y);
  y += 8;

  type Row = [string, string, ('paid' | 'due' | 'normal')?];
  const rows: Row[] = [];

  if (data.isDueClearance) {
    rows.push(['Total Maintenance', `INR ${data.totalMaintenance.toLocaleString('en-IN')}`]);
    rows.push(['Previously Paid', `INR ${(data.previousPaid ?? 0).toLocaleString('en-IN')}`]);
    rows.push(['Due (Before)', `INR ${(data.originalDue ?? 0).toLocaleString('en-IN')}`, 'due']);
    rows.push(['Current Payment', `INR ${(data.currentPayment ?? data.amountPaid).toLocaleString('en-IN')}`, 'paid']);
    rows.push(['Remaining Due', `INR ${(data.remainingDue ?? data.dueAmount).toLocaleString('en-IN')}`,
      (data.remainingDue ?? data.dueAmount) > 0 ? 'due' : 'normal']);
    rows.push(['Payment Mode', PAYMENT_MODE_LABELS[data.paymentMode] || data.paymentMode || 'N/A']);
  } else {
    rows.push(['Total Maintenance', `INR ${data.totalMaintenance.toLocaleString('en-IN')}`]);
    rows.push(['Amount Paid', `INR ${data.amountPaid.toLocaleString('en-IN')}`, 'paid']);
    rows.push(['Remaining Due', `INR ${data.dueAmount.toLocaleString('en-IN')}`, data.dueAmount > 0 ? 'due' : 'normal']);
    rows.push(['Payment Mode', PAYMENT_MODE_LABELS[data.paymentMode] || data.paymentMode || 'N/A']);
  }

  if (data.customFields) {
    Object.entries(data.customFields).forEach(([k, v]) => { if (v) rows.push([k, v]); });
  }

  rows.forEach((row, i) => {
    const ry = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(...SOFT);
      doc.rect(tableX, ry - 5.5, tableW, rowH, 'F');
    }
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(row[0], tableX + 3, ry);

    const hint = row[2];
    if (hint === 'paid') doc.setTextColor(22, 120, 70);
    else if (hint === 'due') doc.setTextColor(180, 50, 40);
    else doc.setTextColor(...INK);

    doc.setFont('helvetica', 'bold');
    doc.text(row[1], tableX + tableW - 3, ry, { align: 'right' });
  });

  y += rows.length * rowH + 4;

  // ---------- Status seal ----------
  const finalDue = data.isDueClearance ? (data.remainingDue ?? data.dueAmount) : data.dueAmount;
  const paid = finalDue <= 0;
  const status = paid ? 'PAID IN FULL' : 'PARTIALLY PAID';
  const sealColor: [number, number, number] = paid ? [22, 120, 70] : [200, 110, 30];

  doc.setDrawColor(...sealColor);
  doc.setLineWidth(0.6);
  const sealW = doc.getTextWidth(status) + 14;
  const sealX = pageW / 2 - sealW / 2;
  doc.roundedRect(sealX, y, sealW, 9, 1.5, 1.5);
  doc.setTextColor(...sealColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(status, pageW / 2, y + 6, { align: 'center' });

  y += 16;

  // ---------- Notes ----------
  if (data.notes) {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    const noteLines = doc.splitTextToSize(data.notes, tableW);
    doc.text(noteLines, pageW / 2, y, { align: 'center' });
  }

  // ---------- Footer ----------
  const footY = pageH - 12;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(margin, footY - 4, pageW - margin, footY - 4);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('This is a computer-generated receipt and does not require a signature.', pageW / 2, footY, { align: 'center' });
  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.text(society, pageW / 2, footY + 4, { align: 'center' });

  // Bottom band
  doc.setFillColor(...TEAL);
  doc.rect(0, pageH - 3, pageW, 3, 'F');

  return doc;
};

export const downloadReceipt = (data: ReceiptData) => {
  const doc = generateReceiptPDF(data);
  const suffix = data.isDueClearance ? '_due_clearance' : '';
  const safeName = data.residentName.replace(/\s+/g, '_');
  doc.save(`receipt_${safeName}_FY${data.year}${suffix}.pdf`);
};

interface StatementChild {
  date: string;
  amountPaid: number;
  dueAfter: number;
  paymentMode?: string;
}

interface StatementData {
  societyName: string;
  residentName: string;
  houseNo: string;
  laneNo: string;
  year: number;
  totalMaintenance: number;
  totalPaid: number;
  totalDue: number;
  children: StatementChild[];
}

export const downloadStatement = (data: StatementData) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const society = ensureSocietyName(data.societyName);
  const fy = formatFY(data.year);

  // Header band
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(society, pageW / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Annual Maintenance Statement  •  FY ${fy}`, pageW / 2, 19, { align: 'center' });

  // Resident block
  let y = 36;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.residentName, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`House ${data.houseNo}${data.laneNo ? `  •  Lane ${data.laneNo}` : ''}`, margin, y + 5);

  // Summary chips (right side)
  const sumX = pageW - margin - 70;
  doc.setFillColor(...SOFT);
  doc.roundedRect(sumX, y - 5, 70, 18, 2, 2, 'F');
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Total: INR ${data.totalMaintenance.toLocaleString('en-IN')}`, sumX + 3, y);
  doc.setTextColor(0, 120, 60);
  doc.text(`Paid: INR ${data.totalPaid.toLocaleString('en-IN')}`, sumX + 3, y + 5);
  doc.setTextColor(180, 40, 40);
  doc.text(`Due: INR ${data.totalDue.toLocaleString('en-IN')}`, sumX + 3, y + 10);

  // Table header
  y += 18;
  doc.setFillColor(...TEAL);
  doc.rect(margin, y, pageW - margin * 2, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Date', margin + 3, y + 5.5);
  doc.text('Mode', margin + 50, y + 5.5);
  doc.text('Amount Paid', margin + 95, y + 5.5);
  doc.text('Balance Due', margin + 140, y + 5.5);
  y += 8;

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (data.children.length === 0) {
    y += 8;
    doc.setTextColor(...MUTED);
    doc.text('No payments recorded yet.', pageW / 2, y, { align: 'center' });
  } else {
    data.children.forEach((c, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 251);
        doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      }
      doc.text(c.date || '-', margin + 3, y + 5);
      doc.text((c.paymentMode || '-').replace(/_/g, ' '), margin + 50, y + 5);
      doc.text(`INR ${c.amountPaid.toLocaleString('en-IN')}`, margin + 95, y + 5);
      doc.text(`INR ${c.dueAfter.toLocaleString('en-IN')}`, margin + 140, y + 5);
      y += 7;
    });
  }

  // Totals row
  y += 4;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Totals', margin + 3, y);
  doc.text(`INR ${data.totalPaid.toLocaleString('en-IN')}`, margin + 95, y);
  doc.text(`INR ${data.totalDue.toLocaleString('en-IN')}`, margin + 140, y);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.setFontSize(7.5);
  doc.text('This is a computer-generated statement and does not require a signature.', pageW / 2, 285, { align: 'center' });
  doc.setFillColor(...TEAL);
  doc.rect(0, 294, pageW, 3, 'F');

  const safeName = data.residentName.replace(/\s+/g, '_');
  doc.save(`statement_${safeName}_FY${data.year}.pdf`);
};

