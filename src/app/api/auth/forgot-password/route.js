import { jsonResponse } from "@/lib/apiHelper";
import { getUserByEmail } from "@/lib/db/store";

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  "AIzaSyBIhgShnll7ms0u_QT6whpgfoEcqobV_3E";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return jsonResponse({ error: "Email address is required" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in database
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      // Don't leak user existence in public endpoint, return standard success message
      return jsonResponse({
        success: true,
        message: "If an account with this email exists, a password reset link has been sent.",
      });
    }

    // Call Firebase Auth REST API to send password reset email
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email: normalizedEmail,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.warn("Firebase password reset warning:", data.error?.message);
    }

    return jsonResponse({
      success: true,
      message: "If an account with this email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
}
