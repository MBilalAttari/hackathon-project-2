import {
  getLeaveRequests,
  submitLeaveRequest,
  reviewLeaveRequest,
  getEmployeeById,
} from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES, LEAVE_STATUS } from "@/lib/constants";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    let employeeId = searchParams.get("employeeId");

    if (session.role === ROLES.EMPLOYEE) {
      employeeId = session.employeeId;
    }

    const leaves = await getLeaveRequests({ employeeId, status });
    return jsonResponse(leaves);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const payload = await request.json();
    const targetEmployeeId = session.role === ROLES.EMPLOYEE ? session.employeeId : (payload.employeeId || session.employeeId);

    if (!payload.leaveType || !payload.startDate || !payload.endDate || !payload.reason) {
      return jsonResponse({ error: "Leave type, start date, end date, and reason are required" }, 400);
    }

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (end < start) {
      return jsonResponse({ error: "End date cannot be earlier than start date" }, 400);
    }

    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await submitLeaveRequest(
      {
        employeeId: targetEmployeeId,
        leaveType: payload.leaveType,
        startDate: payload.startDate,
        endDate: payload.endDate,
        days: payload.days || diffDays,
        reason: payload.reason,
      },
      session
    );

    return jsonResponse({ success: true, leave });
  } catch (err) {
    return jsonResponse({ error: err.message }, 400);
  }
}

export async function PUT(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN && session.role !== ROLES.HR) {
      return forbiddenResponse("Only HR and Admin can approve or reject leaves.");
    }

    const { leaveId, status, reviewerNotes } = await request.json();
    if (!leaveId || !status) {
      return jsonResponse({ error: "Leave ID and status are required" }, 400);
    }

    const result = await reviewLeaveRequest({
      leaveId,
      status,
      reviewerNotes,
      actor: session,
    });

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
