import { getAnnouncements, createAnnouncement } from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/apiHelper";
import { ROLES } from "@/lib/constants";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const announcements = await getAnnouncements();
    return jsonResponse(announcements);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.role !== ROLES.ADMIN && session.role !== ROLES.HR) {
      return forbiddenResponse("Only HR and Admin can post announcements.");
    }

    const payload = await request.json();
    if (!payload.title || !payload.content) {
      return jsonResponse({ error: "Title and content are required" }, 400);
    }

    const item = await createAnnouncement(payload, session);
    return jsonResponse({ success: true, announcement: item });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
