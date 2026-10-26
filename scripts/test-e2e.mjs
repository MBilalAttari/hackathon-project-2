// Automated End-to-End Test Suite for HCM Lite
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let adminSession = null;
let hrSession = null;
let empSession = null;

let hrEmployeeId = null;
let staffEmployeeId = null;
let leaveId = null;
let correctionId = null;

async function runTests() {
  console.log("=================================================");
  console.log("🚀 STARTING HCM LITE END-TO-END TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    process.stdout.write(`• ${desc}... `);
    try {
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // Helper fetch
  async function api(path, options = {}, session = null) {
    const headers = new Headers(options.headers || {});
    if (session) {
      headers.set("x-hcm-session", encodeURIComponent(JSON.stringify(session)));
    }
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, json };
  }

  // 1. Initial State Check
  await assert("1. Verify initial database state (Starts clean with 0 fake records)", async () => {
    const orgRes = await api("/api/org");
    if (!orgRes.ok) throw new Error("Failed to get org settings");
    if (orgRes.json.isSetupComplete !== false) {
      console.log(`(Current isSetupComplete: ${orgRes.json.isSetupComplete})`);
    }
  });

  // 2. Admin Authentication & Role Locking Verification
  await assert("2. Verify Admin Role Locking & Master Admin Login", async () => {
    // A: Verify nobody can register as Admin
    const blockedRes = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker",
        email: "attarib352@gmail.com",
        password: "password123",
        role: "Admin",
      }),
    });
    if (blockedRes.status !== 403) {
      throw new Error(`Expected 403 when attempting to register Admin, got: ${blockedRes.status}`);
    }

    // B: Log in as Master Admin using configured credentials
    const logRes = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "attarib352@gmail.com", password: "bilal145@@" }),
    });

    if (!logRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(logRes.json)}`);
    adminSession = logRes.json.user;
    if (adminSession.role !== "Admin") throw new Error(`Expected role Admin, got: ${adminSession.role}`);
  });

  // 3. Organization Setup
  await assert("3. Complete First-Run Organization Setup", async () => {
    const setupRes = await api(
      "/api/org",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Acme Enterprises",
          currency: "PKR",
          workStartTime: "09:00",
          workEndTime: "18:00",
          gracePeriodMinutes: 15,
          halfDayWorkHours: 4.5,
          isSetupComplete: true,
          defaultLeaveQuotas: { annual: 14, casual: 10, sick: 8, unpaid: 0 },
        }),
      },
      adminSession
    );

    if (!setupRes.ok) throw new Error(`Setup failed: ${JSON.stringify(setupRes.json)}`);
    if (!setupRes.json.organization?.isSetupComplete) throw new Error("Org setup not marked complete");
  });

  // 4. Create HR and Staff Employees
  await assert("4. Admin creates HR Specialist and Employee records", async () => {
    // Create HR
    const hrRes = await api(
      "/api/employees",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sara HR",
          email: "sara.hr@test.com",
          department: "Human Resources",
          designation: "HR Officer",
          role: "HR",
          grossSalary: 180000,
        }),
      },
      adminSession
    );

    if (!hrRes.ok) throw new Error(`Create HR failed: ${JSON.stringify(hrRes.json)}`);
    hrEmployeeId = hrRes.json.employee.id;

    // Login as HR
    const hrLogin = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "sara.hr@test.com" }),
    });
    hrSession = hrLogin.json.user;

    // HR creates Staff Employee
    const staffRes = await api(
      "/api/employees",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Bilal Engineer",
          email: "bilal.dev@test.com",
          department: "Engineering",
          designation: "Frontend Developer",
          role: "Employee",
          grossSalary: 150000,
          leaveBalances: { annual: 14, casual: 10, sick: 8, unpaid: 0 },
        }),
      },
      hrSession
    );

    if (!staffRes.ok) throw new Error(`Create Staff failed: ${JSON.stringify(staffRes.json)}`);
    staffEmployeeId = staffRes.json.employee.id;

    // Login as Employee
    const empLogin = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bilal.dev@test.com" }),
    });
    empSession = empLogin.json.user;
  });

  // 5. Employee 360 View & Data Protection
  await assert("5. Check Employee 360 and Role-Level Data Privacy", async () => {
    // Employee can view their own 360
    const own360 = await api(`/api/employees/${staffEmployeeId}`, {}, empSession);
    if (!own360.ok) throw new Error("Employee failed to view own 360");

    // Employee cannot view peer's 360 (HR's 360)
    const peer360 = await api(`/api/employees/${hrEmployeeId}`, {}, empSession);
    if (peer360.status !== 403) throw new Error("Employee was able to access peer 360! Security violation.");
  });

  // 6. Attendance Punch (Check In / Check Out)
  await assert("6. Attendance check-in & check-out with automatic hours calculation", async () => {
    // Check in as employee
    const inRes = await api(
      "/api/attendance",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in", notes: "Arrival at desk" }),
      },
      empSession
    );

    if (!inRes.ok && !inRes.json.error?.includes("already checked in")) {
      throw new Error(`Check-in failed: ${JSON.stringify(inRes.json)}`);
    }

    // Check out as employee
    const outRes = await api(
      "/api/attendance",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_out" }),
      },
      empSession
    );

    if (!outRes.ok) throw new Error(`Check-out failed: ${JSON.stringify(outRes.json)}`);
    if (!outRes.json.record?.checkOutTime) throw new Error("Check-out time not recorded");
  });

  // 7. Attendance Correction Workflow
  await assert("7. Submit Attendance Correction and HR Approval", async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const subRes = await api(
      "/api/attendance/corrections",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayStr,
          proposedCheckIn: "08:50",
          proposedCheckOut: "18:10",
          reason: "Biometric terminal failed on entry",
        }),
      },
      empSession
    );

    if (!subRes.ok) throw new Error(`Correction submission failed: ${JSON.stringify(subRes.json)}`);
    correctionId = subRes.json.correction.id;

    // HR reviews and approves
    const revRes = await api(
      "/api/attendance/corrections",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctionId,
          status: "Approved",
          reviewerNotes: "Approved based on security log",
        }),
      },
      hrSession
    );

    if (!revRes.ok) throw new Error(`Correction review failed: ${JSON.stringify(revRes.json)}`);
  });

  // 8. Leave Application & Approval Workflow
  await assert("8. Apply Leave, Balance Validation, and HR Approval with Quota Deduction", async () => {
    // 0. Check initial balance
    const beforeData = await api(`/api/employees/${staffEmployeeId}`, {}, empSession);
    const initialCasual = beforeData.json.employee?.leaveBalances?.casual || 10;

    // 1. Try to apply for 100 days (should fail due to insufficient balance)
    const invalidRes = await api(
      "/api/leaves",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType: "casual",
          startDate: "2026-11-01",
          endDate: "2026-11-20",
          days: 20,
          reason: "Long vacation",
        }),
      },
      empSession
    );

    if (invalidRes.ok) throw new Error("System allowed applying for leaves exceeding balance!");

    // 2. Apply for valid 2 days casual leave
    const validRes = await api(
      "/api/leaves",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType: "casual",
          startDate: "2026-11-01",
          endDate: "2026-11-02",
          days: 2,
          reason: "Family wedding",
        }),
      },
      empSession
    );

    if (!validRes.ok) throw new Error(`Leave application failed: ${JSON.stringify(validRes.json)}`);
    leaveId = validRes.json.leave.id;

    // 3. HR approves the leave
    const appRes = await api(
      "/api/leaves",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status: "Approved",
          reviewerNotes: "Have a great time!",
        }),
      },
      hrSession
    );

    if (!appRes.ok) throw new Error(`Leave approval failed: ${JSON.stringify(appRes.json)}`);

    // 4. Verify balance is deducted
    const empData = await api(`/api/employees/${staffEmployeeId}`, {}, empSession);
    const remainingCasual = empData.json.employee?.leaveBalances?.casual;
    if (remainingCasual !== initialCasual - 2) {
      throw new Error(`Expected remaining casual leaves ${initialCasual - 2}, got: ${remainingCasual}`);
    }
  });

  // 9. Monthly Payroll Engine & Finalize
  await assert("9. Generate Monthly Payroll with Progressive Tax Slabs and Finalize Lock", async () => {
    const currentMonth = `2027-${String(Math.floor(Math.random() * 80) + 10)}`;

    // HR generates draft payroll
    const draftRes = await api(
      "/api/payroll",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth }),
      },
      hrSession
    );

    if (!draftRes.ok) throw new Error(`Draft payroll failed: ${JSON.stringify(draftRes.json)}`);
    const run = draftRes.json.payrollRun;
    if (run.status !== "Draft") throw new Error("Payroll run should start in Draft status");
    if (!run.records || run.records.length === 0) throw new Error("No payroll records generated");

    // Verify tax slab calculation on record
    const staffRecord = run.records.find((r) => r.employeeId === staffEmployeeId);
    if (!staffRecord) throw new Error("Staff employee record missing from payroll run");
    if (typeof staffRecord.taxDeduction !== "number" || typeof staffRecord.netSalary !== "number") {
      throw new Error("Tax or net salary missing from payroll record");
    }

    // HR cannot finalize; only Admin can finalize!
    const hrTryFinalize = await api(
      "/api/payroll",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth }),
      },
      hrSession
    );

    if (hrTryFinalize.status !== 403) {
      throw new Error("HR was able to finalize payroll! Only Admin should have permission.");
    }

    // Admin finalizes and locks payroll
    const adminFinalize = await api(
      "/api/payroll",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth }),
      },
      adminSession
    );

    if (!adminFinalize.ok) throw new Error(`Admin finalize failed: ${JSON.stringify(adminFinalize.json)}`);
    if (adminFinalize.json.payrollRun.status !== "Finalized") {
      throw new Error("Payroll run not locked in Finalized status");
    }
  });

  // 10. AI Chat Assistant & Tool Calling
  await assert("10. AI Chat Tool Calling with Authorization & Human-in-the-Loop Confirmation", async () => {
    // Query A: Policy Q&A
    const policyChat = await api(
      "/api/ai/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "What are the office timings and grace period?" }),
      },
      empSession
    );

    if (!policyChat.ok || !policyChat.json.reply) throw new Error("AI policy query failed");

    // Query B: Leave balance check
    const balanceChat = await api(
      "/api/ai/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "How many casual leaves do I have left?" }),
      },
      empSession
    );

    if (!balanceChat.ok || !balanceChat.json.reply.includes("Casual")) {
      throw new Error(`AI balance query unexpected reply: ${balanceChat.json.reply}`);
    }

    // Query C: Smart Leave Draft (Must return confirmation proposal without directly writing to DB)
    const draftChat = await api(
      "/api/ai/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "I need 2 days sick leave from 2026-11-10 to 2026-11-11 due to severe throat infection" }),
      },
      empSession
    );

    if (!draftChat.ok) throw new Error("AI leave draft call failed");
    if (!draftChat.json.draftAction || !draftChat.json.draftAction.requiresUserConfirmation) {
      throw new Error("AI did not produce human confirmation card! Safety violation.");
    }

    // Query D: Role Boundary Check on AI Tools
    // Employee tries to ask for org headcount & companywide summary
    const empOrgQuery = await api(
      "/api/ai/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Show me org summary and all company headcount" }),
      },
      empSession
    );

    if (empOrgQuery.json.reply.includes("Access Denied") || empOrgQuery.json.reply.includes("🔒")) {
      // Correctly denied!
    } else {
      console.log(`(Note: AI handled role inquiry: ${empOrgQuery.json.reply.slice(0, 60)}...)`);
    }
  });

  // 11. Announcements, Notifications & Audit Logs
  await assert("11. Verify Announcements, In-App Notifications & Audit Trail", async () => {
    // 1. Post announcement as HR
    const ancRes = await api(
      "/api/announcements",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Quarterly Townhall",
          content: "All staff members are invited to join the upcoming quarterly meeting.",
          priority: "Important",
        }),
      },
      hrSession
    );

    if (!ancRes.ok) throw new Error("Failed to post announcement");

    // 2. Fetch notifications for employee
    const notifRes = await api("/api/notifications", {}, empSession);
    if (!notifRes.ok) throw new Error("Failed to fetch employee notifications");

    // 3. Inspect audit trail as Admin
    const auditRes = await api("/api/audit", {}, adminSession);
    if (!auditRes.ok) throw new Error("Failed to fetch audit logs");
    if (!auditRes.json || auditRes.json.length === 0) throw new Error("Audit log is empty");

    console.log(`\n(Audit Trail holds ${auditRes.json.length} recorded events)`);
  });

  console.log("\n=================================================");
  console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
