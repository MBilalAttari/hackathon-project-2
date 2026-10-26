const apiKey = "AIzaSyBIhgShnll7ms0u_QT6whpgfoEcqobV_3E";
const databaseURL = "https://hackthon-project-e419c-default-rtdb.firebaseio.com";
const dbSecret = "Ngp7JKNhSkHoLtxlDvwrUX7uMTzcZS7inPADcslU";

const adminEmail = "attarib352@gmail.com";
const adminPassword = "bilal145@@";

async function verify() {
  console.log("1. Testing Firebase Realtime Database REST access...");
  try {
    const res = await fetch(`${databaseURL}/test_connection.json?auth=${dbSecret}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connected: true, timestamp: new Date().toISOString() })
    });
    console.log("RTDB Test Status:", res.status);
    const data = await res.json();
    console.log("RTDB Test Response:", data);
  } catch (err) {
    console.error("RTDB Error:", err);
  }

  console.log("\n2. Testing Firebase Auth (Identity Toolkit REST API)...");
  // Try sign in
  try {
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        returnSecureToken: true
      })
    });
    const signInData = await signInRes.json();
    if (signInRes.ok) {
      console.log("✅ Admin sign-in SUCCESS! UID:", signInData.localId);
    } else {
      console.log("Sign-in response:", signInData.error?.message);
      if (signInData.error?.message === "EMAIL_NOT_FOUND" || signInData.error?.message?.includes("NOT_FOUND")) {
        console.log("Admin account not yet created in Firebase Auth. Attempting signUp...");
        const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            returnSecureToken: true
          })
        });
        const signUpData = await signUpRes.json();
        if (signUpRes.ok) {
          console.log("✅ Admin user created in Firebase Auth! UID:", signUpData.localId);
        } else {
          console.log("SignUp response:", signUpData);
        }
      }
    }
  } catch (err) {
    console.error("Auth Error:", err);
  }
}

verify();
