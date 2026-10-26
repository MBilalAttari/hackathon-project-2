import {
  getAttendance,
  recordAttendance,
  getOrganizationSettings,
  getEmployeeById,
} from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse } from "@/lib/apiHelper";
import { ATTENDANCE_STATUS, ROLES } from "@/lib/constants";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    let employeeId = searchParams.get("employeeId");

    // Enforce role restriction
    if (session.role === ROLES.EMPLOYEE) {
      employeeId = session.employeeId;
    }

    const records = await getAttendance({ employeeId, date, month });
    return jsonResponse(records);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const actionType = body.action || "check_in"; // "check_in" or "check_out"
    const targetEmployeeId = session.role === ROLES.EMPLOYEE ? session.employeeId : (body.employeeId || session.employeeId);

    const employee = await getEmployeeById(targetEmployeeId);
    if (!employee) return jsonResponse({ error: "Employee record not found" }, 404);

    const org = await getOrganizationSettings();
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Look for existing attendance today
    const todayRecords = await getAttendance({ employeeId: targetEmployeeId, date: todayStr });
    let existingRecord = todayRecords.length > 0 ? todayRecords[0] : null;

    if (actionType === "check_in") {
      if (existingRecord && existingRecord.checkInTime) {
        return jsonResponse({ error: "You have already checked in today at " + existingRecord.checkInTime }, 400);
      }

      // Calculate status based on work start time and grace period
      const workStartTime = org.workStartTime || "09:00";
      const graceMinutes = Number(org.gracePeriodMinutes || 15);
      const [startH, startM] = workStartTime.split(":").map(Number);
      const graceCutoffMinutes = startH * 60 + startM + graceMinutes;

      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      let status = ATTENDANCE_STATUS.PRESENT;
      if (currentMinutes > graceCutoffMinutes) {
        status = ATTENDANCE_STATUS.LATE;
      }

      const newRecord = await recordAttendance(
        {
          id: existingRecord ? existingRecord.id : `att_${targetEmployeeId}_${todayStr}`,
          employeeId: targetEmployeeId,
          employeeName: employee.name,
          date: todayStr,
          checkInTime: currentTimeStr,
          checkOutTime: null,
          workHours: 0,
          status,
          notes: body.notes || "",
        },
        session
      );

      return jsonResponse({ success: true, record: newRecord });
    } else if (actionType === "check_out") {
      if (!existingRecord || !existingRecord.checkInTime) {
        return jsonResponse({ error: "No check-in record found for today. Please check in first." }, 400);
      }

      // Calculate work hours
      const [inH, inM] = existingRecord.checkInTime.split(":").map(Number);
      const inMinutes = inH * 60 + inM;
      const outMinutes = now.getHours() * 60 + now.getMinutes();
      const workHours = Math.max(0, Number(((outMinutes - inMinutes) / 60).toFixed(2)));

      let status = existingRecord.status;
      if (workHours < (org.halfDayWorkHours || 4.5)) {
        status = ATTENDANCE_STATUS.HALF_DAY;
      }

      const standardHours = org.standardDailyHours || 8.0;
      const overtimeHours = workHours > standardHours ? Number((workHours - standardHours).toFixed(2)) : 0;

      const updatedRecord = await recordAttendance(
        {
          ...existingRecord,
          checkOutTime: currentTimeStr,
          workHours,
          overtimeHours,
          status,
        },
        session
      );

      return jsonResponse({ success: true, record: updatedRecord });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
