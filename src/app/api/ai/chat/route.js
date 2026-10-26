import { processAIChat } from "@/lib/ai/gemini";
import { getSessionFromRequest, jsonResponse, unauthorizedResponse } from "@/lib/apiHelper";

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return unauthorizedResponse("Authentication required to use AI Assistant.");

    const { message, chatHistory } = await request.json();
    if (!message || typeof message !== "string") {
      return jsonResponse({ error: "Message is required" }, 400);
    }

    const aiResult = await processAIChat({
      message,
      chatHistory: chatHistory || [],
      userSession: session,
    });

    return jsonResponse(aiResult);
  } catch (err) {
    console.error("AI Chat Route Error:", err);
    return jsonResponse({
      reply: "I encountered an issue processing your request. Please try again.",
      error: err.message,
    }, 500);
  }
}
