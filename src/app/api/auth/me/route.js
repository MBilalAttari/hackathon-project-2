import { getSessionFromRequest, jsonResponse, unauthorizedResponse } from "@/lib/apiHelper";
import { getUserByEmail, getEmployeeByEmail } from "@/lib/db/store";
import { ROLES } from "@/lib/constants";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  "attarib352@gmail.com"
).toLowerCase().trim();

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.email) {
      return unauthorizedResponse("No active session");
    }

    const normalizedEmail = session.email.toLowerCase().trim();
    const user = await getUserByEmail(normalizedEmail);
    const employee = await getEmployeeByEmail(normalizedEmail);

    const isAdmin = normalizedEmail === ADMIN_EMAIL;
    const role = isAdmin
      ? ROLES.ADMIN
      : (user?.role === ROLES.ADMIN ? ROLES.EMPLOYEE : (user?.role || employee?.role || ROLES.EMPLOYEE));

    const verifiedUser = {
      id: user?.id || session.id,
      email: normalizedEmail,
      name: user?.name || employee?.name || session.name || normalizedEmail.split("@")[0],
      role,
      employeeId: employee?.id || user?.employeeId || session.employeeId,
      department: employee?.department || (isAdmin ? "Executive" : "General"),
      designation: employee?.designation || (isAdmin ? "System Administrator" : "Staff Member"),
    };

    return jsonResponse({
      authenticated: true,
      user: verifiedUser,
    });
  } catch (err) {
    console.error("Auth check error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
}
