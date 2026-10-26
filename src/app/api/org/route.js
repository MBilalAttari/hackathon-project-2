import { getOrganizationSettings, updateOrganizationSettings } from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, forbiddenResponse, unauthorizedResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

export async function GET(request) {
  try {
    const org = await getOrganizationSettings();
    return jsonResponse(org);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const org = await getOrganizationSettings();

    // If setup was already completed, require Admin role
    if (org.isSetupComplete) {
      if (!session) return unauthorizedResponse();
      if (session.role !== ROLES.ADMIN) return forbiddenResponse("Only Admins can update organization settings.");
    }

    const payload = await request.json();
    const updated = await updateOrganizationSettings(payload, session || { name: "Setup Wizard", role: ROLES.ADMIN });

    return jsonResponse({
      success: true,
      organization: updated,
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function PUT(request) {
  return POST(request);
}
