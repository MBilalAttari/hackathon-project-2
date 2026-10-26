import { getAuditLogs } from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN && session.role !== ROLES.HR) {
      return forbiddenResponse("Only Admin and HR have access to audit logs.");
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const actorRole = searchParams.get("actorRole");
    const search = searchParams.get("search");

    const logs = await getAuditLogs({ action, actorRole, search });
    return jsonResponse(logs);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
