// Firebase Admin verification helper using Identity Toolkit REST API
// Works without requiring a serviceAccountKey.json file!

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  "AIzaSyBIhgShnll7ms0u_QT6whpgfoEcqobV_3E";

export const isFirebaseAdminConfigured = false;
export const adminFirestore = null;
export const adminAuth = null;

/**
 * Verify a client-provided Firebase ID token via Identity Toolkit REST API
 * Returns { uid, email, name } on success, or null on failure.
 */
export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    if (!user) return null;
    return {
      uid: user.localId,
      email: user.email,
      name: user.displayName || user.email?.split("@")[0] || null,
    };
  } catch (err) {
    console.warn("verifyFirebaseIdToken error:", err.message);
    return null;
  }
}

export default {
  isFirebaseAdminConfigured,
  adminFirestore,
  adminAuth,
  verifyFirebaseIdToken,
};
