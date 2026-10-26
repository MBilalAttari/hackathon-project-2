import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { updateUserRole, getUserById, getUserByEmail } from "@/lib/db/store";
import { ROLES } from "@/lib/constants";

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  "attarib352@gmail.com"
).toLowerCase().trim();

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    // STRICT CHECK: Only Admin can update user roles
    if (session.role !== ROLES.ADMIN) {
      return forbiddenResponse("Only administrators can assign or update user roles.");
    }

    const { userId, newRole } = await request.json();
    if (!userId || !newRole) {
      return jsonResponse({ error: "userId and newRole are required" }, 400);
    }

    if (![ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE].includes(newRole)) {
      return jsonResponse({ error: "Invalid role specified" }, 400);
    }

    const targetUser = (await getUserById(userId)) || (await getUserByEmail(userId));
    if (!targetUser) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    // Protect primary admin from being changed
    if (targetUser.email?.toLowerCase() === ADMIN_EMAIL && newRole !== ROLES.ADMIN) {
      return forbiddenResponse("The primary system administrator role cannot be altered.");
    }

    await updateUserRole(targetUser.id, newRole, session);

    return jsonResponse({
      success: true,
      message: `Role for ${targetUser.email} updated to ${newRole}`,
    });
  } catch (err) {
    console.error("Role update error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
}
