import { DEFAULT_ORG_SETTINGS } from "../constants";

/**
 * Calculates annual income tax based on progressive tax slabs
 * @param {number} annualIncome 
 * @param {Array} taxSlabs 
 * @returns {number} annualTax
 */
export function calculateAnnualTax(annualIncome, taxSlabs = DEFAULT_ORG_SETTINGS.taxSlabs) {
  if (!annualIncome || annualIncome <= 0) return 0;

  for (const slab of taxSlabs) {
    if (slab.max === null || (annualIncome > slab.min && annualIncome <= slab.max)) {
      const taxableExcess = annualIncome - slab.min;
      const taxOnExcess = taxableExcess * slab.rate;
      return Math.round(slab.fixed + taxOnExcess);
    }
  }
  return 0;
}

/**
 * Calculates monthly tax deduction from monthly gross salary
 * @param {number} monthlyGross 
 * @param {Array} taxSlabs 
 * @returns {number} monthlyTax
 */
export function calculateMonthlyTax(monthlyGross, taxSlabs = DEFAULT_ORG_SETTINGS.taxSlabs) {
  if (!monthlyGross || monthlyGross <= 0) return 0;
  const annualIncome = monthlyGross * 12;
  const annualTax = calculateAnnualTax(annualIncome, taxSlabs);
  return Math.round(annualTax / 12);
}

/**
 * Calculates per-day deduction rate and total unpaid leave deduction
 * @param {number} monthlyGross 
 * @param {number} unpaidDays 
 * @param {number} totalDaysInMonth (defaults to 30)
 * @returns {number} deductionAmount
 */
export function calculateUnpaidDeduction(monthlyGross, unpaidDays = 0, totalDaysInMonth = 30) {
  if (!monthlyGross || !unpaidDays || unpaidDays <= 0) return 0;
  const dailyRate = monthlyGross / (totalDaysInMonth || 30);
  return Math.round(dailyRate * unpaidDays);
}

/**
 * Computes full payroll item for an employee in a given month
 */
export function computeEmployeePayrollItem({
  employee,
  month = new Date().toISOString().slice(0, 7), // 'YYYY-MM'
  absentDays = 0,
  unpaidLeaveDays = 0,
  customBonus = 0,
  customDeductions = 0,
  taxSlabs = DEFAULT_ORG_SETTINGS.taxSlabs,
  daysInMonth = 30,
}) {
  const grossSalary = Number(employee.grossSalary) || 0;
  const basicSalary = Number(employee.baseSalary) || Math.round(grossSalary * 0.6);
  const houseRent = Number(employee.houseRentAllowance) || Math.round(grossSalary * 0.2);
  const medical = Number(employee.medicalAllowance) || Math.round(grossSalary * 0.1);
  const otherAllowance = Number(employee.otherAllowance) || (grossSalary - (basicSalary + houseRent + medical));

  const totalGrossWithBonus = grossSalary + Number(customBonus || 0);

  // Compute Tax
  const monthlyTax = calculateMonthlyTax(totalGrossWithBonus, taxSlabs);

  // Compute Unpaid / Absent Deductions
  const totalUnpaidDays = Number(absentDays || 0) + Number(unpaidLeaveDays || 0);
  const unpaidDeduction = calculateUnpaidDeduction(grossSalary, totalUnpaidDays, daysInMonth);

  // Total Deductions
  const totalDeductions = monthlyTax + unpaidDeduction + Number(customDeductions || 0);

  // Net Salary
  const netSalary = Math.max(0, totalGrossWithBonus - totalDeductions);

  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode || `EMP-${employee.id.slice(-4)}`,
    employeeName: employee.name,
    email: employee.email,
    department: employee.department || "General",
    designation: employee.designation || "Staff",
    month,
    baseSalary: basicSalary,
    houseRentAllowance: houseRent,
    medicalAllowance: medical,
    otherAllowance: Math.max(0, otherAllowance),
    customBonus: Number(customBonus || 0),
    grossSalary: totalGrossWithBonus,
    taxDeduction: monthlyTax,
    absentDays: Number(absentDays || 0),
    unpaidLeaveDays: Number(unpaidLeaveDays || 0),
    unpaidDeduction,
    customDeductions: Number(customDeductions || 0),
    totalDeductions,
    netSalary,
    bankDetails: employee.bankDetails || {},
  };
}
