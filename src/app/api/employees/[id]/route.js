import {
  getEmployeeById,
  getAttendance,
  getLeaveRequests,
  getPayrollRuns,
  getAuditLogs,
} from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

export async function GET(request, { params }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const employee = await getEmployeeById(id);
    if (!employee) {
      return jsonResponse({ error: "Employee not found" }, 404);
    }

    // Role check: Employee can only see their own 360 view
    const isOwnRecord =
      session.employeeId === id ||
      session.id === id ||
      session.email?.toLowerCase() === employee.email?.toLowerCase();

    if (session.role === ROLES.EMPLOYEE && !isOwnRecord) {
      return forbiddenResponse("You are not authorized to view another employee's 360 profile.");
    }

    // Parallel fetch employee's attendance, leaves, payroll history, and audit
    const [attendanceList, leaveList, payrollRuns, auditLogs] = await Promise.all([
      getAttendance({ employeeId: id }),
      getLeaveRequests({ employeeId: id }),
      getPayrollRuns(),
      getAuditLogs({ search: id }),
    ]);

    // Extract payslips for this employee from finalized payroll runs
    const payslips = [];
    for (const run of payrollRuns) {
      const rec = run.records?.find(r => r.employeeId === id);
      if (rec) {
        payslips.push({
          ...rec,
          month: run.month,
          status: run.status,
          finalizedAt: run.finalizedAt,
        });
      }
    }

    return jsonResponse({
      employee,
      attendance: attendanceList.slice(0, 30),
      leaves: leaveList,
      payslips,
      auditHistory: auditLogs.slice(0, 15),
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
