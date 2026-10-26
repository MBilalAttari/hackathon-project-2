import {
  getPayrollRuns,
  getPayrollRunByMonth,
  savePayrollRun,
  finalizePayrollRun,
  getEmployees,
  getAttendance,
  getLeaveRequests,
  getOrganizationSettings,
} from "@/lib/db/store";
import { computeEmployeePayrollItem } from "@/lib/payroll/taxCalculator";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES, PAYROLL_STATUS, LEAVE_STATUS } from "@/lib/constants";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (month) {
      const run = await getPayrollRunByMonth(month);
      if (!run) return jsonResponse({ error: "No payroll run found for " + month }, 404);

      if (session.role === ROLES.EMPLOYEE) {
        // Only return if finalized and only the employee's own record
        if (run.status !== PAYROLL_STATUS.FINALIZED) {
          return forbiddenResponse("Payroll for this month is still in draft.");
        }
        const record = run.records?.find(r => r.employeeId === session.employeeId);
        return jsonResponse({ month: run.month, status: run.status, record });
      }

      return jsonResponse(run);
    }

    const allRuns = await getPayrollRuns();

    // Employee sees only finalized runs where they have a payslip
    if (session.role === ROLES.EMPLOYEE) {
      const myRuns = allRuns
        .filter(r => r.status === PAYROLL_STATUS.FINALIZED)
        .map(r => ({
          month: r.month,
          status: r.status,
          finalizedAt: r.finalizedAt,
          record: r.records?.find(rec => rec.employeeId === session.employeeId),
        }))
        .filter(r => r.record);
      return jsonResponse(myRuns);
    }

    return jsonResponse(allRuns);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN && session.role !== ROLES.HR) {
      return forbiddenResponse("Only HR and Admin can generate monthly payroll runs.");
    }

    const { month, customAdjustments = {} } = await request.json();
    if (!month) return jsonResponse({ error: "Month (YYYY-MM) is required" }, 400);

    const existingRun = await getPayrollRunByMonth(month);
    if (existingRun && existingRun.status === PAYROLL_STATUS.FINALIZED) {
      return jsonResponse({ error: `Payroll run for ${month} is already finalized and locked.` }, 400);
    }

    const org = await getOrganizationSettings();
    const employees = await getEmployees({ status: "Active" });
    const attendanceRecords = await getAttendance({ month });
    const leaveRequests = await getLeaveRequests({ status: LEAVE_STATUS.APPROVED });

    const records = [];
    let totalGross = 0;
    let totalTax = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const emp of employees) {
      // Find unexcused absent days from attendance
      const empAttendance = attendanceRecords.filter(a => a.employeeId === emp.id);
      const absentDays = empAttendance.filter(a => a.status === "Absent").length;

      // Find approved unpaid leaves in this month
      const empUnpaidLeaves = leaveRequests.filter(
        l => l.employeeId === emp.id && l.leaveType === "unpaid" && l.startDate.startsWith(month)
      );
      const unpaidLeaveDays = empUnpaidLeaves.reduce((acc, l) => acc + (Number(l.days) || 0), 0);

      // Custom adjustments
      const adj = customAdjustments[emp.id] || {};
      const bonus = Number(adj.bonus || 0);
      const deductions = Number(adj.deductions || 0);

      const payrollItem = computeEmployeePayrollItem({
        employee: emp,
        month,
        absentDays,
        unpaidLeaveDays,
        customBonus: bonus,
        customDeductions: deductions,
        taxSlabs: org.taxSlabs,
        daysInMonth: 30,
      });

      records.push(payrollItem);
      totalGross += payrollItem.grossSalary;
      totalTax += payrollItem.taxDeduction;
      totalDeductions += payrollItem.totalDeductions;
      totalNet += payrollItem.netSalary;
    }

    const payrollRun = {
      month,
      status: PAYROLL_STATUS.DRAFT,
      employeeCount: records.length,
      totalGross,
      totalTax,
      totalDeductions,
      totalNet,
      records,
      createdBy: session.name || session.email,
    };

    const saved = await savePayrollRun(payrollRun, session);
    return jsonResponse({ success: true, payrollRun: saved });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function PUT(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN) {
      return forbiddenResponse("Only Admin can lock and finalize payroll runs.");
    }

    const { month } = await request.json();
    if (!month) return jsonResponse({ error: "Month is required" }, 400);

    const finalized = await finalizePayrollRun(month, session);
    return jsonResponse({ success: true, payrollRun: finalized });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
