const apiKey = "AIzaSyBIhgShnll7ms0u_QT6whpgfoEcqobV_3E";
const adminEmail = "attarib352@gmail.com";
const adminPassword = "bilal145@@";

async function testSignUp() {
  console.log("Attempting signUp for", adminEmail);
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      returnSecureToken: true
    })
  });
  const data = await signUpRes.json();
  console.log("Status:", signUpRes.status);
  console.log("Response:", data);
}

testSignUp();
