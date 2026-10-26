import {
  getAttendanceCorrections,
  submitAttendanceCorrection,
  reviewAttendanceCorrection,
} from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

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

    const corrections = await getAttendanceCorrections({ employeeId, status });
    return jsonResponse(corrections);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const payload = await request.json();
    if (!payload.date || !payload.proposedCheckIn || !payload.reason) {
      return jsonResponse({ error: "Date, proposed check-in time, and reason are required" }, 400);
    }

    const newCorrection = await submitAttendanceCorrection(
      {
        employeeId: session.employeeId,
        employeeName: session.name,
        date: payload.date,
        originalCheckIn: payload.originalCheckIn || "--:--",
        originalCheckOut: payload.originalCheckOut || "--:--",
        proposedCheckIn: payload.proposedCheckIn,
        proposedCheckOut: payload.proposedCheckOut || "",
        reason: payload.reason,
      },
      session
    );

    return jsonResponse({ success: true, correction: newCorrection });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function PUT(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN && session.role !== ROLES.HR) {
      return forbiddenResponse("Only HR and Admin can review attendance corrections.");
    }

    const { correctionId, status, reviewerNotes } = await request.json();
    if (!correctionId || !status) {
      return jsonResponse({ error: "Correction ID and status are required" }, 400);
    }

    const result = await reviewAttendanceCorrection({
      correctionId,
      status,
      reviewerNotes,
      actor: session,
    });

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
