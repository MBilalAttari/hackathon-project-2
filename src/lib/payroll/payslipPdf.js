import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates and triggers download of a professional PDF payslip
 * @param {Object} payrollRecord 
 * @param {Object} orgSettings 
 */
export function generatePayslipPdf(payrollRecord, orgSettings = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const companyName = orgSettings.companyName || "HCM Lite Technologies";
  const currency = orgSettings.currency || "PKR";

  // Colors
  const primaryColor = [37, 99, 235]; // #2563eb
  const textColor = [30, 41, 59];
  const mutedColor = [100, 116, 139];

  // Header background banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Company Title & Payslip Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName.toUpperCase(), 14, 15);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`CONFIDENTIAL SALARY PAYSLIP - ${payrollRecord.month || ""}`, 14, 23);

  // Issue date on right
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.setFontSize(9);
  doc.text(`Generated: ${today}`, pageWidth - 14, 23, { align: "right" });

  // Employee Information Box
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE DETAILS", 14, 38);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 42, pageWidth - 28, 30, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);

  // Column 1
  doc.text("Employee Name:", 18, 49);
  doc.text("Employee ID:", 18, 56);
  doc.text("Designation:", 18, 63);

  // Column 1 Values
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.text(payrollRecord.employeeName || "N/A", 50, 49);
  doc.text(payrollRecord.employeeCode || "N/A", 50, 56);
  doc.text(payrollRecord.designation || "N/A", 50, 63);

  // Column 2
  doc.setTextColor(...mutedColor);
  doc.setFont("helvetica", "normal");
  doc.text("Department:", 110, 49);
  doc.text("Bank Name:", 110, 56);
  doc.text("Account / IBAN:", 110, 63);

  // Column 2 Values
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.text(payrollRecord.department || "General", 140, 49);
  doc.text(payrollRecord.bankDetails?.bankName || "Corporate Payroll Bank", 140, 56);
  doc.text(payrollRecord.bankDetails?.accountNumber || payrollRecord.bankDetails?.iban || "On Record", 140, 63);

  // Attendance Metrics Row
  const attY = 78;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text(
    `Attendance Summary: Absent Days: ${payrollRecord.absentDays || 0} | Unpaid Leave Days: ${payrollRecord.unpaidLeaveDays || 0} | Total Unpaid Days: ${(payrollRecord.absentDays || 0) + (payrollRecord.unpaidLeaveDays || 0)}`,
    14,
    attY
  );

  // Earnings & Deductions Tables (Side by Side or Sequenced)
  const earningsData = [
    ["Basic Salary (60%)", `${currency} ${Number(payrollRecord.baseSalary || 0).toLocaleString()}`],
    ["House Rent Allowance (20%)", `${currency} ${Number(payrollRecord.houseRentAllowance || 0).toLocaleString()}`],
    ["Medical Allowance (10%)", `${currency} ${Number(payrollRecord.medicalAllowance || 0).toLocaleString()}`],
    ["Other Allowances", `${currency} ${Number(payrollRecord.otherAllowance || 0).toLocaleString()}`],
  ];

  if (payrollRecord.customBonus) {
    earningsData.push(["Performance Bonus", `${currency} ${Number(payrollRecord.customBonus).toLocaleString()}`]);
  }

  earningsData.push([
    "Total Gross Salary",
    `${currency} ${Number(payrollRecord.grossSalary || 0).toLocaleString()}`,
  ]);

  const deductionsData = [
    ["Income Tax (Progressive Slab)", `${currency} ${Number(payrollRecord.taxDeduction || 0).toLocaleString()}`],
    ["Unpaid / Absent Deductions", `${currency} ${Number(payrollRecord.unpaidDeduction || 0).toLocaleString()}`],
  ];

  if (payrollRecord.customDeductions) {
    deductionsData.push(["Other Custom Deductions", `${currency} ${Number(payrollRecord.customDeductions).toLocaleString()}`]);
  }

  deductionsData.push([
    "Total Deductions",
    `${currency} ${Number(payrollRecord.totalDeductions || 0).toLocaleString()}`,
  ]);

  // Earnings Table
  autoTable(doc, {
    startY: 84,
    head: [["Earnings Description", "Amount"]],
    body: earningsData,
    theme: "striped",
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: "auto", halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  const nextY = doc.lastAutoTable.finalY + 6;

  // Deductions Table
  autoTable(doc, {
    startY: nextY,
    head: [["Deductions Description", "Amount"]],
    body: deductionsData,
    theme: "striped",
    headStyles: {
      fillColor: [254, 242, 242],
      textColor: [153, 27, 27],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: "auto", halign: "right", fontStyle: "bold", textColor: [185, 28, 28] },
    },
    margin: { left: 14, right: 14 },
  });

  const netY = doc.lastAutoTable.finalY + 8;

  // Net Payable Card
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(14, netY, pageWidth - 28, 20, 2, 2, "FD");

  doc.setTextColor(30, 27, 75);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("NET SALARY PAYABLE", 20, netY + 13);

  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(
    `${currency} ${Number(payrollRecord.netSalary || 0).toLocaleString()}`,
    pageWidth - 20,
    netY + 13,
    { align: "right" }
  );

  // Signatures
  const signY = netY + 40;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, signY, 70, signY);
  doc.line(pageWidth - 70, signY, pageWidth - 20, signY);

  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text("Authorized HR Signatory", 30, signY + 6);
  doc.text("Employee Signature", pageWidth - 55, signY + 6);

  // Bottom Notice
  doc.setFontSize(7.5);
  doc.text(
    "This is a system generated salary slip from HCM Lite. All salary components are confidential.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  // Trigger download
  const filename = `Payslip_${payrollRecord.employeeCode || "EMP"}_${payrollRecord.month}.pdf`;
  doc.save(filename);
}
