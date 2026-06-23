import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoPdf from '../assets/logo-pdf.svg';

// Brand colors
const PURPLE = [124, 92, 252];      // #7C5CFC (Violet/Purple)
const PURPLE_DARK = [124, 92, 252]; // #7C5CFC (Matching background)
const LIGHT_GRAY = [248, 249, 250];
const MED_GRAY = [108, 117, 125];
const DARK = [30, 30, 30];
const WHITE = [255, 255, 255];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];

const rupee = (val) => `Rs. ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const loadSvgAsPngBase64 = (svgUrl, width, height) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = svgUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 4; // High resolution rendering scale
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(err);
    });
};

export const generatePayslip = async (payroll) => {
    try {
        if (!payroll) throw new Error('Payroll data is missing');

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        const emp = payroll.userId || {};
        const monthName = months[(payroll.month || 1) - 1];
        const year = payroll.year || new Date().getFullYear();

        // Load logo image dynamically
        let logoData = null;
        try {
            // Aspect ratio width: ~39.6mm, height: 12mm
            logoData = await loadSvgAsPngBase64(logoPdf, 150, 45);
        } catch (e) {
            console.error('Failed to load logo image:', e);
        }

        // ── HEADER BAND ──────────────────────────────────────────────
        doc.setFillColor(...PURPLE_DARK);
        doc.rect(0, 0, pageW, 32, 'F');

        // Draw Logo or Fallback Text
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 7, 39.6, 12);
        } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(...WHITE);
            doc.text('Learnlike', 14, 14);
        }

        // Tagline
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(220, 210, 255);
        doc.text('Attendance & Payroll Management System', 14, 24);

        // PAYSLIP label (right side)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...WHITE);
        doc.text('PAYSLIP', pageW - 14, 14, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(220, 210, 255);
        doc.text(`${monthName} ${year}`, pageW - 14, 21, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(220, 210, 255);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - 14, 28, { align: 'right' });

        // ── ACCENT LINE ──────────────────────────────────────────────
        doc.setFillColor(...PURPLE);
        doc.rect(0, 32, pageW, 3, 'F');

        // ── EMPLOYEE DETAILS BOX ─────────────────────────────────────
        const boxY = 42;
        doc.setFillColor(...LIGHT_GRAY);
        doc.roundedRect(14, boxY, pageW - 28, 44, 3, 3, 'F');
        doc.setDrawColor(...PURPLE);
        doc.setLineWidth(0.4);
        doc.roundedRect(14, boxY, pageW - 28, 44, 3, 3, 'D');

        // Left column — employee info
        const lx = 20, rx = pageW / 2 + 6;
        let ey = boxY + 9;

        const field = (label, value, x, y) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...MED_GRAY);
            doc.text(label, x, y);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...DARK);
            doc.text(value || 'N/A', x, y + 5);
        };

        field('Employee Name', emp.name, lx, ey);
        field('Employee ID', emp.employeeId, rx, ey);
        ey += 14;
        field('Designation', emp.position, lx, ey);
        field('Department', emp.department, rx, ey);
        ey += 14;
        field('Pay Period', `${monthName} ${year}`, lx, ey);
        field('Payment Status', payroll.status === 'Paid' ? 'PAID' : payroll.status, rx, ey);

        // ── EARNINGS & DEDUCTIONS ─────────────────────────────────────
        const tableY = boxY + 52;

        const earnings = [
            ['Basic Salary', rupee(payroll.baseSalary)],
            ['HRA (House Rent Allowance)', rupee(payroll.allowances?.hra)],
            ['Transport Allowance', rupee(payroll.allowances?.transport)],
            ['Other Allowances', rupee(payroll.allowances?.other)],
        ];

        const deductions = [
            ['Provident Fund (PF)', rupee(payroll.deductions?.pf)],
            ['Income Tax (TDS)', rupee(payroll.deductions?.tax)],
            ['Loss of Pay (LOP)', rupee(payroll.deductions?.lop)],
        ];

        const totalEarnings = (payroll.baseSalary || 0)
            + (payroll.allowances?.hra || 0)
            + (payroll.allowances?.transport || 0)
            + (payroll.allowances?.other || 0);

        const totalDeductions = (payroll.deductions?.pf || 0)
            + (payroll.deductions?.tax || 0)
            + (payroll.deductions?.lop || 0);

        // Section header
        const sectionHeader = (text, x, y, w) => {
            doc.setFillColor(...PURPLE);
            doc.rect(x, y, w, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...WHITE);
            doc.text(text, x + 3, y + 5);
        };

        const halfW = (pageW - 28) / 2 - 3;

        // Earnings table
        sectionHeader('EARNINGS', 14, tableY, halfW);
        autoTable(doc, {
            startY: tableY + 7,
            margin: { left: 14, right: pageW / 2 + 3 },
            head: [['Component', 'Amount']],
            body: earnings,
            foot: [['Total Earnings', rupee(totalEarnings)]],
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: DARK },
            headStyles: { fillColor: [230, 230, 250], textColor: PURPLE_DARK, fontStyle: 'bold', fontSize: 8 },
            footStyles: { fillColor: [220, 230, 255], textColor: PURPLE_DARK, fontStyle: 'bold', fontSize: 9 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', fontStyle: 'bold' } },
            alternateRowStyles: { fillColor: [250, 250, 255] },
            tableLineColor: [200, 200, 230],
            tableLineWidth: 0.2,
        });

        const earningsEndY = doc.lastAutoTable.finalY;

        // Deductions table
        sectionHeader('DEDUCTIONS', pageW / 2 + 3, tableY, halfW);
        autoTable(doc, {
            startY: tableY + 7,
            margin: { left: pageW / 2 + 3, right: 14 },
            head: [['Component', 'Amount']],
            body: deductions,
            foot: [['Total Deductions', rupee(totalDeductions)]],
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: DARK },
            headStyles: { fillColor: [255, 235, 235], textColor: RED, fontStyle: 'bold', fontSize: 8 },
            footStyles: { fillColor: [255, 220, 220], textColor: RED, fontStyle: 'bold', fontSize: 9 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', fontStyle: 'bold' } },
            alternateRowStyles: { fillColor: [255, 248, 248] },
            tableLineColor: [255, 200, 200],
            tableLineWidth: 0.2,
        });

        const deductionsEndY = doc.lastAutoTable.finalY;
        const netBoxY = Math.max(earningsEndY, deductionsEndY) + 8;

        // ── NET SALARY BOX ─────────────────────────────────────────────
        doc.setFillColor(...PURPLE_DARK);
        doc.roundedRect(14, netBoxY, pageW - 28, 20, 3, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...WHITE);
        doc.text('NET SALARY (Take Home)', 20, netBoxY + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(180, 255, 180);
        doc.text(rupee(payroll.netSalary), pageW - 18, netBoxY + 10, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(200, 220, 255);
        const netWords = `${rupee(totalEarnings)} Gross  –  ${rupee(totalDeductions)} Deductions  =  ${rupee(payroll.netSalary)} Net`;
        doc.text(netWords, 20, netBoxY + 16);

        // ── DIVIDER ────────────────────────────────────────────────────
        const divY = netBoxY + 28;
        doc.setDrawColor(...PURPLE);
        doc.setLineWidth(0.3);
        doc.line(14, divY, pageW - 14, divY);

        // ── NOTES ──────────────────────────────────────────────────────
        if (payroll.paidAt) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...MED_GRAY);
            doc.text(`Payment Date: ${new Date(payroll.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, divY + 8);
        }

        // ── FOOTER ─────────────────────────────────────────────────────
        doc.setFillColor(...PURPLE_DARK);
        doc.rect(0, pageH - 14, pageW, 14, 'F');

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(200, 200, 255);
        doc.text('This is a system-generated payslip and does not require a physical signature.', pageW / 2, pageH - 7, { align: 'center' });

        doc.setTextColor(150, 150, 200);
        doc.text('Learnlike AMS  |  Confidential', pageW / 2, pageH - 3, { align: 'center' });

        // ── SAVE ───────────────────────────────────────────────────────
        const empName = (emp.name || 'Employee').replace(/\s+/g, '_');
        const fileName = `Payslip_${empName}_${monthName}_${year}.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Failed to generate payslip PDF. Please try again.');
    }
};
