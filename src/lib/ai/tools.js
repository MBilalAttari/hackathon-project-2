import {
  getOrganizationSettings,
  getEmployeeById,
  getEmployees,
  getAttendance,
  getLeaveRequests,
  getPayrollRuns,
} from "../db/store";
import { ROLES, LEAVE_TYPES } from "../constants";

/**
 * Tool definitions presented to the LLM
 */
export const AI_TOOL_DEFINITIONS = [
  {
    name: "get_company_policy",
    description: "Returns official company policies including work hours, grace periods, leave entitlements, payroll cycles, and tax slabs.",
    parameters: {
      type: "OBJECT",
      properties: {
        topic: {
          type: "STRING",
          description: "Optional specific topic: 'timing', 'leaves', 'tax', 'payroll', or 'all'",
        },
      },
    },
  },
  {
    name: "get_my_leave_balances",
    description: "Fetches current leave balances (annual, casual, sick, unpaid) for the authenticated employee.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "draft_leave_request",
    description: "Prepares a formal leave application draft for the user to review and confirm before submitting. Never executes without confirmation.",
    parameters: {
      type: "OBJECT",
      properties: {
        leaveType: {
          type: "STRING",
          description: "Type of leave: 'annual', 'casual', 'sick', or 'unpaid'",
        },
        startDate: {
          type: "STRING",
          description: "Leave start date in YYYY-MM-DD format",
        },
        endDate: {
          type: "STRING",
          description: "Leave end date in YYYY-MM-DD format",
        },
        reason: {
          type: "STRING",
          description: "Reason for taking leave",
        },
      },
      required: ["leaveType", "startDate", "endDate", "reason"],
    },
  },
  {
    name: "get_my_attendance_summary",
    description: "Returns summary of attendance (present, late, absent, hours) for the current month for the employee.",
    parameters: {
      type: "OBJECT",
      properties: {
        month: {
          type: "STRING",
          description: "Month in YYYY-MM format, defaults to current month",
        },
      },
    },
  },
  {
    name: "get_org_summary",
    description: "Returns high-level organization stats (headcount, today attendance %, pending leaves). REQUIRES HR or Admin role.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "explain_tax_and_salary",
    description: "Explains tax slabs, allowances (Basic 60%, House Rent 20%, Medical 10%), and how net salary is calculated.",
    parameters: {
      type: "OBJECT",
      properties: {
        monthlyGross: {
          type: "NUMBER",
          description: "Monthly gross salary to simulate calculation for",
        },
      },
    },
  },
];

/**
 * Secure Server-Side Tool Executor enforcing Role & Record-level Authorization
 */
export async function executeAITool(toolName, args, userSession) {
  if (!userSession) {
    return { error: "Authentication required to use AI tools." };
  }

  const role = userSession.role || ROLES.EMPLOYEE;
  const employeeId = userSession.employeeId || userSession.id;

  switch (toolName) {
    case "get_company_policy": {
      const org = await getOrganizationSettings();
      return {
        companyName: org.companyName,
        workHours: `${org.workStartTime || "09:00"} to ${org.workEndTime || "18:00"}`,
        gracePeriod: `${org.gracePeriodMinutes || 15} minutes (check-in after is marked Late)`,
        halfDayHours: `${org.halfDayWorkHours || 4.5} hours minimum`,
        annualLeaveQuota: `${org.defaultLeaveQuotas?.annual || 14} days`,
        casualLeaveQuota: `${org.defaultLeaveQuotas?.casual || 10} days`,
        sickLeaveQuota: `${org.defaultLeaveQuotas?.sick || 8} days`,
        payrollCycle: "Monthly (Finalized by last week of month)",
        taxRegime: "Progressive Pakistani / Standard Tax Brackets (0% up to 600k PKR/yr)",
      };
    }

    case "get_my_leave_balances": {
      const emp = await getEmployeeById(employeeId);
      if (!emp) {
        return { error: "Employee profile not found for this account." };
      }
      return {
        employeeName: emp.name,
        balances: emp.leaveBalances || { annual: 14, casual: 10, sick: 8, unpaid: 0 },
      };
    }

    case "draft_leave_request": {
      const emp = await getEmployeeById(employeeId);
      if (!emp) {
        return { error: "Employee profile not found to draft leave request." };
      }

      const { leaveType, startDate, endDate, reason } = args;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { error: "Invalid date format. Please use YYYY-MM-DD." };
      }
      if (end < start) {
        return { error: "End date cannot be earlier than start date." };
      }

      // Calculate days difference (inclusive)
      const diffTime = Math.abs(end - start);
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const normType = (leaveType || "casual").toLowerCase();
      const currentBalance = emp.leaveBalances?.[normType] ?? 0;
      const isSufficient = normType === "unpaid" || currentBalance >= days;

      // IMPORTANT: Notice that this tool drafts the request and does NOT commit to DB!
      // It returns structured confirmation data so the UI presents the user with a confirmation card.
      return {
        requiresUserConfirmation: true,
        action: "SUBMIT_LEAVE",
        draft: {
          employeeId: emp.id,
          employeeName: emp.name,
          leaveType: normType,
          startDate,
          endDate,
          days,
          reason,
          currentBalance,
          remainingAfterApproval: isSufficient && normType !== "unpaid" ? currentBalance - days : currentBalance,
          isSufficientBalance: isSufficient,
        },
        message: isSufficient
          ? `I have drafted your ${normType} leave request for ${days} day(s) from ${startDate} to ${endDate}. Please review the details below and click 'Confirm & Submit' to finalize.`
          : `Warning: You requested ${days} day(s) of ${normType} leave, but your current balance is ${currentBalance}. You may submit this as unpaid leave or adjust the dates.`,
      };
    }

    case "get_my_attendance_summary": {
      const currentMonth = args.month || new Date().toISOString().slice(0, 7);
      const records = await getAttendance({ employeeId, month: currentMonth });

      const present = records.filter(r => r.status === "Present").length;
      const late = records.filter(r => r.status === "Late").length;
      const halfDay = records.filter(r => r.status === "Half-day").length;
      const totalHours = records.reduce((acc, r) => acc + (Number(r.workHours) || 0), 0);

      return {
        month: currentMonth,
        totalRecords: records.length,
        presentDays: present,
        lateDays: late,
        halfDays: halfDay,
        totalHoursWorked: Math.round(totalHours * 10) / 10,
        averageHoursPerDay: records.length > 0 ? (totalHours / records.length).toFixed(1) : 0,
      };
    }

    case "get_org_summary": {
      // Role-based authorization
      if (role !== ROLES.ADMIN && role !== ROLES.HR) {
        return {
          error: "Access Denied: Organization summary is only accessible to HR and Admin roles.",
        };
      }

      const emps = await getEmployees();
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayAtt = await getAttendance({ date: todayStr });
      const pendingLeaves = await getLeaveRequests({ status: "Pending" });
      const payrolls = await getPayrollRuns();

      const activeCount = emps.filter(e => e.status === "Active").length;
      const presentCount = todayAtt.filter(a => a.status === "Present" || a.status === "Late").length;

      return {
        totalHeadcount: emps.length,
        activeEmployees: activeCount,
        todayAttendanceCount: presentCount,
        todayAttendanceRate: activeCount > 0 ? `${Math.round((presentCount / activeCount) * 100)}%` : "0%",
        pendingLeaveRequests: pendingLeaves.length,
        totalPayrollRuns: payrolls.length,
      };
    }

    case "explain_tax_and_salary": {
      const gross = Number(args.monthlyGross) || 200000;
      const annualGross = gross * 12;
      const org = await getOrganizationSettings();

      // Progressive calculation
      let annualTax = 0;
      let slabDescription = "";
      if (annualGross <= 600000) {
        annualTax = 0;
        slabDescription = "Below PKR 600,000 / year (0% Tax Rate)";
      } else if (annualGross <= 1200000) {
        annualTax = (annualGross - 600000) * 0.025;
        slabDescription = "PKR 600k - 1.2M (2.5% of excess over 600k)";
      } else if (annualGross <= 2400000) {
        annualTax = 15000 + (annualGross - 1200000) * 0.125;
        slabDescription = "PKR 1.2M - 2.4M (PKR 15,000 + 12.5% of excess over 1.2M)";
      } else if (annualGross <= 3600000) {
        annualTax = 165000 + (annualGross - 2400000) * 0.225;
        slabDescription = "PKR 2.4M - 3.6M (PKR 165,000 + 22.5% of excess over 2.4M)";
      } else {
        annualTax = 435000 + (annualGross - 3600000) * 0.35;
        slabDescription = "Above PKR 3.6M (PKR 435,000 + 35% of excess over 3.6M)";
      }

      const monthlyTax = Math.round(annualTax / 12);
      const basic = Math.round(gross * 0.6);
      const houseRent = Math.round(gross * 0.2);
      const medical = Math.round(gross * 0.1);
      const other = gross - (basic + houseRent + medical);
      const netSalary = gross - monthlyTax;

      return {
        simulatedGross: gross,
        annualIncome: annualGross,
        taxSlab: slabDescription,
        monthlyTaxDeduction: monthlyTax,
        netTakeHome: netSalary,
        salaryBreakdown: {
          basicSalary: basic,
          houseRentAllowance: houseRent,
          medicalAllowance: medical,
          otherAllowance: other,
        },
      };
    }

    default:
      return { error: `Tool ${toolName} not recognized.` };
  }
}
