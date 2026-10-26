import { NextResponse } from "next/server";
import { getUserById, getUserByEmail, getEmployeeByUserId, getEmployeeByEmail } from "./db/store";
import { verifyFirebaseIdToken } from "./firebase/admin";
import { ROLES } from "./constants";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "attarib352@gmail.com").toLowerCase().trim();

/**
 * Extracts and verifies user session from Authorization header or custom session header
 */
export async function getSessionFromRequest(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const sessionHeader = request.headers.get("x-hcm-session") || "";

    // 1. Try Firebase Bearer Token
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const decoded = await verifyFirebaseIdToken(token);
      if (decoded && decoded.email) {
        const normalizedEmail = decoded.email.toLowerCase().trim();
        const user = await getUserByEmail(normalizedEmail);
        const emp = await getEmployeeByEmail(normalizedEmail);
        const isAdmin = normalizedEmail === ADMIN_EMAIL;
        const role = isAdmin ? ROLES.ADMIN : (user?.role || emp?.role || ROLES.EMPLOYEE);

        return {
          id: user?.id || decoded.uid,
          uid: decoded.uid,
          email: normalizedEmail,
          name: decoded.name || user?.name || emp?.name || normalizedEmail.split("@")[0],
          role,
          employeeId: emp?.id || user?.employeeId || decoded.uid,
        };
      }
    }

    // 2. Client Session header (JSON object or token)
    if (sessionHeader) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(sessionHeader));
        if (sessionData && sessionData.email) {
          const normalizedEmail = sessionData.email.toLowerCase().trim();
          const user = await getUserByEmail(normalizedEmail);
          const emp = await getEmployeeByEmail(normalizedEmail);
          const isAdmin = normalizedEmail === ADMIN_EMAIL;
          const role = isAdmin ? ROLES.ADMIN : (user?.role || sessionData.role || ROLES.EMPLOYEE);

          return {
            id: user?.id || sessionData.id,
            email: normalizedEmail,
            name: sessionData.name || user?.name || emp?.name || normalizedEmail.split("@")[0],
            role,
            employeeId: emp?.id || user?.employeeId || sessionData.id,
          };
        }
      } catch (err) {
        console.warn("Session header decode error:", err);
      }
    }

    return null;
  } catch (error) {
    console.error("Error verifying request session:", error);
    return null;
  }
}

/**
 * Standard API JSON error responder
 */
export function jsonResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function unauthorizedResponse(message = "Unauthorized. Please log in.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden. Insufficient permissions.") {
  return NextResponse.json({ error: message }, { status: 403 });
}
