// Comprehensive RBAC & Authentication Test Suite for HCM Lite
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let adminSession = null;
let hrSession = null;
let empSession = null;
let secondEmpSession = null;

async function api(path, options = {}, session = null) {
  const headers = new Headers(options.headers || {});
  if (session) {
    headers.set("x-hcm-session", encodeURIComponent(JSON.stringify(session)));
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

async function runRbacTests() {
  console.log("=================================================");
  console.log("🔒 STARTING ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• ${name}... `);
    try {
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Admin Login & Public Signup Blocking
  await test("Scenario 3: Admin logs in securely, public signup as Admin is strictly blocked", async () => {
    // Attempt signup as Admin -> must return 403
    const blockedSignup = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Intruder",
        email: "attarib352@gmail.com",
        password: "password123",
        role: "Admin",
      }),
    });
    if (blockedSignup.status !== 403) {
      throw new Error(`Expected 403 when signing up as Admin, got ${blockedSignup.status}`);
    }

    // Attempt signup with another email specifying role: Admin -> must return 403
    const blockedRole = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fake Admin",
        email: "fakeadmin@company.com",
        password: "password123",
        role: "Admin",
      }),
    });
    if (blockedRole.status !== 403) {
      throw new Error(`Expected 403 when specifying Admin role, got ${blockedRole.status}`);
    }

    // Master Admin Login with provisioned credentials
    const adminLogin = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "attarib352@gmail.com",
        password: "bilal145@@",
      }),
    });
    if (!adminLogin.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.json)}`);
    adminSession = adminLogin.json.user;
    if (adminSession.role !== "Admin") throw new Error(`Expected role Admin, got: ${adminSession.role}`);
  });

  // 2. HR Signup & Login
  await test("Scenario 2: HR Specialist can sign up, log in, and view employee records", async () => {
    const hrEmail = `hr.test.${Date.now()}@company.com`;
    const signupRes = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Zainab HR",
        email: hrEmail,
        password: "password123",
        role: "HR",
      }),
    });
    if (!signupRes.ok) throw new Error(`HR signup failed: ${JSON.stringify(signupRes.json)}`);
    hrSession = signupRes.json.user;
    if (hrSession.role !== "HR") throw new Error(`Expected role HR, got: ${hrSession.role}`);

    // Verify HR can view employee directory
    const empListRes = await api("/api/employees", {}, hrSession);
    if (!empListRes.ok) throw new Error("HR could not fetch employee directory");
    if (!Array.isArray(empListRes.json)) throw new Error("Expected array of employees");
  });

  // 3. Employee Signup, Login & Privacy
  await test("Scenario 1: Employee signs up, logs in, and can view only their own records", async () => {
    const empEmail = `emp.test.${Date.now()}@company.com`;
    const signupRes = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Usman Employee",
        email: empEmail,
        password: "password123",
        role: "Employee",
      }),
    });
    if (!signupRes.ok) throw new Error(`Employee signup failed: ${JSON.stringify(signupRes.json)}`);
    empSession = signupRes.json.user;
    if (empSession.role !== "Employee") throw new Error(`Expected role Employee, got: ${empSession.role}`);

    // Employee views own profile
    const ownProfile = await api(`/api/employees/${empSession.employeeId}`, {}, empSession);
    if (!ownProfile.ok) throw new Error(`Employee failed to fetch own profile: ${JSON.stringify(ownProfile.json)}`);
    if (ownProfile.json.employee.email !== empEmail) throw new Error("Data mismatch on own profile");

    // Create a 2nd employee to test peer data isolation
    const emp2Email = `emp2.test.${Date.now()}@company.com`;
    const signup2Res = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Farhan Employee",
        email: emp2Email,
        password: "password123",
        role: "Employee",
      }),
    });
    secondEmpSession = signup2Res.json.user;
  });

  // 4. Employee Cannot Access Another Employee's Records (URL / ID Tampering)
  await test("Scenario 6: Changing URL/UID/key to another employee's ID is blocked (403)", async () => {
    // Usman tries to fetch Farhan's 360 profile
    const tamperedRes = await api(`/api/employees/${secondEmpSession.employeeId}`, {}, empSession);
    if (tamperedRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden when accessing peer record, got: ${tamperedRes.status}`);
    }

    // Usman tries to query attendance passing peer's employeeId
    const tamperedAtt = await api(`/api/attendance?employeeId=${secondEmpSession.employeeId}`, {}, empSession);
    if (tamperedAtt.ok && Array.isArray(tamperedAtt.json)) {
      // The server automatically forces employeeId = session.employeeId
      for (const rec of tamperedAtt.json) {
        if (rec.employeeId === secondEmpSession.employeeId) {
          throw new Error("Data leak: Employee attendance query returned peer's records!");
        }
      }
    }
  });

  // 5. Employee Cannot Access HR or Admin Operations
  await test("Scenario 4: Employee cannot access HR or Admin backend management endpoints", async () => {
    // Employee tries to create an employee
    const createRes = await api(
      "/api/employees",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Rogue", email: "rogue@test.com" }),
      },
      empSession
    );
    if (createRes.status !== 403) throw new Error(`Expected 403 on employee creating employee, got ${createRes.status}`);

    // Employee tries to update org settings
    const orgRes = await api(
      "/api/org",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: "Hacked Corp" }),
      },
      empSession
    );
    if (orgRes.status !== 403) throw new Error(`Expected 403 on employee modifying org settings, got ${orgRes.status}`);

    // Employee tries to generate payroll
    const payRes = await api(
      "/api/payroll",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: "2026-11" }),
      },
      empSession
    );
    if (payRes.status !== 403) throw new Error(`Expected 403 on employee running payroll, got ${payRes.status}`);
  });

  // 6. HR Cannot Access Admin-Only Controls or Self-Promote
  await test("Scenario 5: HR user cannot access Admin-only routes or promote self to Admin", async () => {
    // HR tries to update org settings
    const orgRes = await api(
      "/api/org",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: "HR Takeover" }),
      },
      hrSession
    );
    if (orgRes.status !== 403) throw new Error(`Expected 403 on HR altering org settings, got ${orgRes.status}`);

    // HR tries to finalize/lock payroll
    const finRes = await api(
      "/api/payroll",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: "2026-10" }),
      },
      hrSession
    );
    if (finRes.status !== 403) throw new Error(`Expected 403 on HR locking payroll, got ${finRes.status}`);

    // HR tries to promote self to Admin via /api/auth/role
    const promoteRes = await api(
      "/api/auth/role",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: hrSession.id, newRole: "Admin" }),
      },
      hrSession
    );
    if (promoteRes.status !== 403) throw new Error(`Expected 403 on HR self-promotion, got ${promoteRes.status}`);
  });

  // 7. Logged-out Users Cannot Access Protected APIs
  await test("Scenario 7: Unauthenticated (logged-out) requests are rejected with 401 Unauthorized", async () => {
    const res1 = await api("/api/employees");
    if (res1.status !== 401) throw new Error(`Expected 401 on unauthenticated employees GET, got ${res1.status}`);

    const res2 = await api("/api/attendance");
    if (res2.status !== 401) throw new Error(`Expected 401 on unauthenticated attendance GET, got ${res2.status}`);

    const res3 = await api("/api/leaves");
    if (res3.status !== 401) throw new Error(`Expected 401 on unauthenticated leaves GET, got ${res3.status}`);

    const res4 = await api("/api/payroll");
    if (res4.status !== 401) throw new Error(`Expected 401 on unauthenticated payroll GET, got ${res4.status}`);

    const res5 = await api("/api/auth/me");
    if (res5.status !== 401) throw new Error(`Expected 401 on unauthenticated /api/auth/me, got ${res5.status}`);
  });

  // 8. Session Re-Verification & Refresh
  await test("Scenario 8: Rechecking authorization via /api/auth/me preserves authenticated role", async () => {
    const meRes = await api("/api/auth/me", {}, adminSession);
    if (!meRes.ok) throw new Error("Failed to re-verify admin session");
    if (meRes.json.user.role !== "Admin") throw new Error(`Expected Admin, got ${meRes.json.user.role}`);

    const hrMeRes = await api("/api/auth/me", {}, hrSession);
    if (!hrMeRes.ok) throw new Error("Failed to re-verify HR session");
    if (hrMeRes.json.user.role !== "HR") throw new Error(`Expected HR, got ${hrMeRes.json.user.role}`);
  });

  // 9. Admin Role Assignment & Password Reset Flow
  await test("Scenario 9: Only Admin can update user roles & password reset flow works", async () => {
    // Admin assigns HR role to employee
    const assignRes = await api(
      "/api/auth/role",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: empSession.id, newRole: "HR" }),
      },
      adminSession
    );
    if (!assignRes.ok) throw new Error(`Admin role update failed: ${JSON.stringify(assignRes.json)}`);

    // Forgot password endpoint test
    const forgotRes = await api("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminSession.email }),
    });
    if (!forgotRes.ok) throw new Error("Forgot password endpoint failed");
  });

  console.log("\n=================================================");
  console.log(`🏁 RBAC TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) process.exit(1);
}

runRbacTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
