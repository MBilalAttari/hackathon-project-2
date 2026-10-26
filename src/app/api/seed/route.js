import { seedDemoData } from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    // Allow if first-run setup or Admin
    if (session && session.role !== ROLES.ADMIN) {
      return forbiddenResponse("Only Admins can seed demo evaluation data.");
    }

    const actor = session || { name: "System Demo Seeder", role: ROLES.ADMIN };
    const result = await seedDemoData(actor);

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
