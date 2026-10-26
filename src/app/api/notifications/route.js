import { getNotifications, markNotificationAsRead } from "@/lib/db/store";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse } from "@/lib/apiHelper";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const notifications = await getNotifications(session.employeeId || session.id);
    return jsonResponse(notifications);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export async function PUT(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse();

    const { id } = await request.json();
    if (!id) return jsonResponse({ error: "Notification ID is required" }, 400);

    await markNotificationAsRead(id);
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
