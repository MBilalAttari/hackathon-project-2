import fs from "fs";
import path from "path";
import { DEFAULT_ORG_SETTINGS, AUDIT_ACTIONS, ROLES, LEAVE_STATUS, ATTENDANCE_STATUS } from "../constants.js";
import { rtdb } from "../firebase/rtdb.js";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "hcm_store.json");

function getInitialStore() {
  return {
    organization: { ...DEFAULT_ORG_SETTINGS, isSetupComplete: false },
    users: [],
    employees: [],
    attendance: [],
    attendance_corrections: [],
    leave_requests: [],
    payroll_runs: [],
    announcements: [],
    notifications: [],
    audit_logs: [],
  };
}

let memoryStore = null;

function readLocalStore() {
  if (memoryStore) return memoryStore;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, "utf-8");
      memoryStore = JSON.parse(content);
      return memoryStore;
    }
  } catch (err) {
    console.error("Error reading store file:", err);
  }
  memoryStore = getInitialStore();
  writeLocalStore(memoryStore);
  return memoryStore;
}

function writeLocalStore(data) {
  memoryStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing store file:", err);
  }
}

function sanitizeKey(str) {
  return String(str || "").replace(/[.@#$\[\]\/]/g, "_");
}

// ==================== ORGANIZATION ====================
export async function getOrganizationSettings() {
  if (rtdb.isConfigured) {
    try {
      const data = await rtdb.get("hcm/organization");
      if (data && typeof data === "object") {
        return { ...DEFAULT_ORG_SETTINGS, ...data };
      }
    } catch (err) {
      console.warn("RTDB getOrganizationSettings fallback:", err.message);
    }
  }
  const store = readLocalStore();
  return store.organization || { ...DEFAULT_ORG_SETTINGS, isSetupComplete: false };
}

export async function updateOrganizationSettings(settings, actor = null) {
  const current = await getOrganizationSettings();
  const updated = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set("hcm/organization", updated);
    } catch (err) {
      console.warn("RTDB updateOrganizationSettings error:", err.message);
    }
  }

  const store = readLocalStore();
  store.organization = updated;
  writeLocalStore(store);

  if (actor) {
    await createAuditLog({
      action: AUDIT_ACTIONS.ORG_SETUP,
      actor,
      details: `Organization profile updated. Setup marked complete: ${Boolean(updated.isSetupComplete)}`,
      targetId: "organization",
    });
  }

  return updated;
}

// ==================== USERS & AUTH ====================
export async function getUsers() {
  if (rtdb.isConfigured) {
    try {
      const list = await rtdb.getList("hcm/users");
      if (list && list.length > 0) return list;
    } catch (err) {
      console.warn("RTDB getUsers fallback:", err.message);
    }
  }
  const store = readLocalStore();
  return store.users || [];
}

export async function getUserById(id) {
  if (!id) return null;
  if (rtdb.isConfigured) {
    try {
      const safeKey = sanitizeKey(id);
      const data = await rtdb.get(`hcm/users/${safeKey}`);
      if (data) return { id, ...data };
    } catch (err) {
      console.warn("RTDB getUserById fallback:", err.message);
    }
  }
  const store = readLocalStore();
  return store.users.find(u => u.id === id || sanitizeKey(u.email) === sanitizeKey(id)) || null;
}

export async function getUserByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  const safeKey = sanitizeKey(normalized);

  if (rtdb.isConfigured) {
    try {
      const data = await rtdb.get(`hcm/users/${safeKey}`);
      if (data) return { id: data.id || safeKey, ...data };
      const all = await rtdb.getList("hcm/users");
      const found = all.find(u => u.email?.toLowerCase() === normalized);
      if (found) return found;
    } catch (err) {
      console.warn("RTDB getUserByEmail fallback:", err.message);
    }
  }

  const store = readLocalStore();
  return store.users.find(u => u.email?.toLowerCase() === normalized) || null;
}

export async function saveUser(userData, actor = null) {
  const normalizedEmail = (userData.email || "").toLowerCase().trim();
  const safeKey = sanitizeKey(normalizedEmail);
  const id = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record = {
    ...userData,
    id,
    email: normalizedEmail,
    role: userData.role || ROLES.EMPLOYEE,
    createdAt: userData.createdAt || now,
    updatedAt: now,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/users/${safeKey}`, record);
    } catch (err) {
      console.warn("RTDB saveUser error:", err.message);
    }
  }

  const store = readLocalStore();
  const idx = store.users.findIndex(u => u.id === id || u.email?.toLowerCase() === normalizedEmail);
  if (idx >= 0) {
    store.users[idx] = { ...store.users[idx], ...record };
  } else {
    store.users.push(record);
  }
  writeLocalStore(store);

  if (actor) {
    await createAuditLog({
      action: AUDIT_ACTIONS.USER_REGISTER,
      actor,
      details: `User registered: ${record.email} with role: ${record.role}`,
      targetId: id,
    });
  }

  return record;
}

export async function updateUserRole(userId, newRole, actor) {
  const user = (await getUserById(userId)) || (await getUserByEmail(userId));
  if (!user) throw new Error("User not found");

  const safeKey = sanitizeKey(user.email || userId);
  const now = new Date().toISOString();
  const updated = { ...user, role: newRole, updatedAt: now };

  if (rtdb.isConfigured) {
    try {
      await rtdb.update(`hcm/users/${safeKey}`, { role: newRole, updatedAt: now });
    } catch (err) {
      console.warn("RTDB updateUserRole error:", err.message);
    }
  }

  const store = readLocalStore();
  const idx = store.users.findIndex(u => u.id === userId || u.email === user.email);
  if (idx >= 0) {
    store.users[idx].role = newRole;
    store.users[idx].updatedAt = now;
    writeLocalStore(store);
  }

  await createAuditLog({
    action: AUDIT_ACTIONS.UPDATE_ROLE,
    actor,
    details: `Role updated to ${newRole} for user ${user.email}`,
    targetId: userId,
  });

  return { success: true };
}

// ==================== EMPLOYEES ====================
export async function getEmployees(filters = {}) {
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/employees");
    } catch (err) {
      console.warn("RTDB getEmployees fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = [...store.employees];
  }

  if (filters.department) list = list.filter(e => e.department === filters.department);
  if (filters.status) list = list.filter(e => e.status === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(q))
    );
  }
  return list;
}

export async function getEmployeeById(id) {
  if (!id) return null;
  const safeId = sanitizeKey(id);

  if (rtdb.isConfigured) {
    try {
      const data = await rtdb.get(`hcm/employees/${safeId}`);
      if (data) return { id, ...data };
    } catch (err) {
      console.warn("RTDB getEmployeeById fallback:", err.message);
    }
  }

  const store = readLocalStore();
  return store.employees.find(e => e.id === id) || null;
}

export async function getEmployeeByUserId(userId) {
  if (!userId) return null;
  const employees = await getEmployees();
  return employees.find(e => e.userId === userId || e.id === userId) || null;
}

export async function getEmployeeByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  const employees = await getEmployees();
  return employees.find(e => e.email?.toLowerCase() === normalized) || null;
}

export async function saveEmployee(data, actor = null) {
  const org = await getOrganizationSettings();
  const existingByEmail = data.email ? await getEmployeeByEmail(data.email) : null;
  const id = data.id || existingByEmail?.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const safeId = sanitizeKey(id);
  const now = new Date().toISOString();

  const grossSalary = Number(data.grossSalary) || 0;
  const baseSalary = Number(data.baseSalary) || Math.round(grossSalary * 0.6);
  const houseRentAllowance = Number(data.houseRentAllowance) || Math.round(grossSalary * 0.2);
  const medicalAllowance = Number(data.medicalAllowance) || Math.round(grossSalary * 0.1);
  const otherAllowance = Math.max(0, grossSalary - (baseSalary + houseRentAllowance + medicalAllowance));

  const initialQuotas = org.defaultLeaveQuotas || { annual: 14, casual: 10, sick: 8, unpaid: 0 };

  const record = {
    id,
    employeeCode: data.employeeCode || `EMP-${String(id).slice(-4).toUpperCase()}`,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    phone: data.phone || "",
    address: data.address || "",
    department: data.department || "Engineering",
    designation: data.designation || "Software Engineer",
    joiningDate: data.joiningDate || now.slice(0, 10),
    role: data.role || ROLES.EMPLOYEE,
    status: data.status || "Active",
    userId: data.userId || null,
    baseSalary,
    houseRentAllowance,
    medicalAllowance,
    otherAllowance,
    grossSalary,
    bankDetails: data.bankDetails || {
      bankName: "Meezan Bank",
      accountNumber: "0101-1234567890",
      iban: "PK36MEZN0001011234567890",
    },
    leaveBalances: data.leaveBalances || existingByEmail?.leaveBalances || {
      annual: initialQuotas.annual,
      casual: initialQuotas.casual,
      sick: initialQuotas.sick,
      unpaid: initialQuotas.unpaid || 0,
    },
    managerId: data.managerId || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/employees/${safeId}`, record);
    } catch (err) {
      console.warn("RTDB saveEmployee error:", err.message);
    }
  }

  const store = readLocalStore();
  const idx = store.employees.findIndex(e => e.id === id);
  if (idx >= 0) {
    store.employees[idx] = { ...store.employees[idx], ...record };
  } else {
    store.employees.push(record);
  }
  writeLocalStore(store);

  if (actor) {
    await createAuditLog({
      action: data.id ? AUDIT_ACTIONS.UPDATE_EMPLOYEE : AUDIT_ACTIONS.CREATE_EMPLOYEE,
      actor,
      details: `${data.id ? "Updated" : "Created"} employee: ${record.name} (${record.email}) in ${record.department}`,
      targetId: id,
    });
  }

  return record;
}

export async function deleteEmployee(id, actor = null) {
  const safeId = sanitizeKey(id);
  if (rtdb.isConfigured) {
    try {
      await rtdb.delete(`hcm/employees/${safeId}`);
    } catch (err) {
      console.warn("RTDB deleteEmployee error:", err.message);
    }
  }

  const store = readLocalStore();
  store.employees = store.employees.filter(e => e.id !== id);
  writeLocalStore(store);

  if (actor) {
    await createAuditLog({
      action: AUDIT_ACTIONS.DELETE_EMPLOYEE,
      actor,
      details: `Deleted employee ID: ${id}`,
      targetId: id,
    });
  }

  return { success: true };
}

// ==================== ATTENDANCE ====================
export async function getAttendance(filters = {}) {
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/attendance");
    } catch (err) {
      console.warn("RTDB getAttendance fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = [...store.attendance];
  }

  if (filters.employeeId) list = list.filter(a => a.employeeId === filters.employeeId);
  if (filters.date) list = list.filter(a => a.date === filters.date);
  if (filters.month) list = list.filter(a => a.date?.startsWith(filters.month));

  return list.sort((a, b) => (b.date > a.date ? 1 : -1));
}

export async function recordAttendance(data, actor = null) {
  const id = data.id || `att_${data.employeeId}_${data.date}`;
  const safeId = sanitizeKey(id);
  const now = new Date().toISOString();

  const record = {
    ...data,
    id,
    updatedAt: now,
    createdAt: data.createdAt || now,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/attendance/${safeId}`, record);
    } catch (err) {
      console.warn("RTDB recordAttendance error:", err.message);
    }
  }

  const store = readLocalStore();
  const idx = store.attendance.findIndex(a => a.id === id);
  if (idx >= 0) {
    store.attendance[idx] = { ...store.attendance[idx], ...record };
  } else {
    store.attendance.push(record);
  }
  writeLocalStore(store);

  if (actor) {
    const action = record.checkOutTime ? AUDIT_ACTIONS.CHECK_OUT : AUDIT_ACTIONS.CHECK_IN;
    await createAuditLog({
      action,
      actor,
      details: `${action} for ${record.employeeName || record.employeeId} on ${record.date}. Status: ${record.status}`,
      targetId: id,
    });
  }

  return record;
}

// ==================== ATTENDANCE CORRECTIONS ====================
export async function getAttendanceCorrections(filters = {}) {
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/attendance_corrections");
    } catch (err) {
      console.warn("RTDB getAttendanceCorrections fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = [...store.attendance_corrections];
  }

  if (filters.employeeId) list = list.filter(c => c.employeeId === filters.employeeId);
  if (filters.status) list = list.filter(c => c.status === filters.status);

  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function submitAttendanceCorrection(data, actor = null) {
  const id = `cor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const safeId = sanitizeKey(id);
  const now = new Date().toISOString();

  const record = {
    id,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    date: data.date,
    originalCheckIn: data.originalCheckIn || "--:--",
    originalCheckOut: data.originalCheckOut || "--:--",
    proposedCheckIn: data.proposedCheckIn,
    proposedCheckOut: data.proposedCheckOut,
    reason: data.reason,
    status: "Pending",
    reviewerNotes: "",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/attendance_corrections/${safeId}`, record);
    } catch (err) {
      console.warn("RTDB submitAttendanceCorrection error:", err.message);
    }
  }

  const store = readLocalStore();
  store.attendance_corrections.push(record);
  writeLocalStore(store);

  if (actor) {
    await createAuditLog({
      action: AUDIT_ACTIONS.SUBMIT_ATTENDANCE_CORRECTION,
      actor,
      details: `Correction requested by ${record.employeeName} for ${record.date}`,
      targetId: id,
    });
  }

  return record;
}

export async function reviewAttendanceCorrection({ correctionId, status, reviewerNotes, actor }) {
  const safeId = sanitizeKey(correctionId);
  let correction = null;
  const now = new Date().toISOString();

  const store = readLocalStore();
  correction = store.attendance_corrections.find(c => c.id === correctionId);

  if (!correction && rtdb.isConfigured) {
    try {
      correction = await rtdb.get(`hcm/attendance_corrections/${safeId}`);
    } catch (err) {
      console.warn("RTDB reviewAttendanceCorrection fallback:", err.message);
    }
  }

  if (!correction) throw new Error("Correction request not found");

  correction.status = status;
  correction.reviewerNotes = reviewerNotes || "";
  correction.reviewedBy = actor.name || actor.email;
  correction.reviewedAt = now;

  if (rtdb.isConfigured) {
    try {
      await rtdb.update(`hcm/attendance_corrections/${safeId}`, {
        status,
        reviewerNotes: reviewerNotes || "",
        reviewedBy: actor.name || actor.email,
        reviewedAt: now,
      });
    } catch (err) {
      console.warn("RTDB update correction error:", err.message);
    }
  }

  writeLocalStore(store);

  if (status === "Approved") {
    const org = await getOrganizationSettings();
    const workStartTime = org.workStartTime || "09:00";
    const graceMinutes = org.gracePeriodMinutes || 15;
    const [startH, startM] = workStartTime.split(":").map(Number);
    const graceCutoffMinutes = startH * 60 + startM + graceMinutes;

    const [inH, inM] = correction.proposedCheckIn.split(":").map(Number);
    const checkInMinutes = inH * 60 + inM;

    let attStatus = ATTENDANCE_STATUS.PRESENT;
    if (checkInMinutes > graceCutoffMinutes) {
      attStatus = ATTENDANCE_STATUS.LATE;
    }

    let workHours = 0;
    if (correction.proposedCheckOut) {
      const [outH, outM] = correction.proposedCheckOut.split(":").map(Number);
      workHours = Number(Math.max(0, (outH * 60 + outM - checkInMinutes) / 60).toFixed(2));
      if (workHours < (org.halfDayWorkHours || 4.5)) {
        attStatus = ATTENDANCE_STATUS.HALF_DAY;
      }
    }

    await recordAttendance(
      {
        employeeId: correction.employeeId,
        employeeName: correction.employeeName,
        date: correction.date,
        checkInTime: correction.proposedCheckIn,
        checkOutTime: correction.proposedCheckOut,
        workHours,
        status: attStatus,
        notes: `Corrected via request ${correctionId}`,
        isCorrected: true,
      },
      actor
    );
  }

  await createNotification({
    userId: correction.employeeId,
    title: `Attendance Correction ${status}`,
    message: `Your correction for ${correction.date} was ${status.toLowerCase()} by ${actor.name || "HR"}.`,
    type: "attendance",
  });

  await createAuditLog({
    action: status === "Approved" ? AUDIT_ACTIONS.APPROVE_ATTENDANCE_CORRECTION : AUDIT_ACTIONS.REJECT_ATTENDANCE_CORRECTION,
    actor,
    details: `${status} attendance correction for ${correction.employeeName} on ${correction.date}. Remarks: ${reviewerNotes || "None"}`,
    targetId: correctionId,
  });

  return { success: true, status };
}

// ==================== LEAVE REQUESTS ====================
export async function getLeaveRequests(filters = {}) {
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/leave_requests");
    } catch (err) {
      console.warn("RTDB getLeaveRequests fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = [...store.leave_requests];
  }

  if (filters.employeeId) list = list.filter(l => l.employeeId === filters.employeeId);
  if (filters.status) list = list.filter(l => l.status === filters.status);

  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function submitLeaveRequest(data, actor = null) {
  const emp = await getEmployeeById(data.employeeId);
  if (!emp) throw new Error("Employee not found");

  const id = `lev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const safeId = sanitizeKey(id);
  const now = new Date().toISOString();

  const leaveType = data.leaveType;
  const days = Number(data.days) || 1;
  const currentBalance = emp.leaveBalances?.[leaveType] ?? 0;

  if (leaveType !== "unpaid" && currentBalance < days) {
    throw new Error(`Insufficient ${leaveType} leave balance. Available: ${currentBalance}, Requested: ${days}`);
  }

  const record = {
    id,
    employeeId: data.employeeId,
    employeeName: emp.name,
    department: emp.department,
    leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    days,
    reason: data.reason,
    status: LEAVE_STATUS.PENDING,
    reviewerNotes: "",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/leave_requests/${safeId}`, record);
    } catch (err) {
      console.warn("RTDB submitLeaveRequest error:", err.message);
    }
  }

  const store = readLocalStore();
  store.leave_requests.push(record);
  writeLocalStore(store);

  if (actor) {
    await createAuditLog({
      action: AUDIT_ACTIONS.APPLY_LEAVE,
      actor,
      details: `${emp.name} applied for ${days} day(s) of ${leaveType} leave (${data.startDate} to ${data.endDate})`,
      targetId: id,
    });
  }

  return record;
}

export async function reviewLeaveRequest({ leaveId, status, reviewerNotes, actor }) {
  const safeId = sanitizeKey(leaveId);
  const now = new Date().toISOString();

  const store = readLocalStore();
  let leave = store.leave_requests.find(l => l.id === leaveId);

  if (!leave && rtdb.isConfigured) {
    try {
      leave = await rtdb.get(`hcm/leave_requests/${safeId}`);
    } catch (err) {
      console.warn("RTDB reviewLeaveRequest fallback:", err.message);
    }
  }

  if (!leave) throw new Error("Leave request not found");

  leave.status = status;
  leave.reviewerNotes = reviewerNotes || "";
  leave.reviewedBy = actor.name || actor.email;
  leave.reviewedAt = now;

  if (rtdb.isConfigured) {
    try {
      await rtdb.update(`hcm/leave_requests/${safeId}`, {
        status,
        reviewerNotes: reviewerNotes || "",
        reviewedBy: actor.name || actor.email,
        reviewedAt: now,
      });
    } catch (err) {
      console.warn("RTDB reviewLeaveRequest update error:", err.message);
    }
  }

  writeLocalStore(store);

  if (status === LEAVE_STATUS.APPROVED) {
    const emp = await getEmployeeById(leave.employeeId);
    if (emp && leave.leaveType !== "unpaid") {
      const current = emp.leaveBalances?.[leave.leaveType] || 0;
      emp.leaveBalances[leave.leaveType] = Math.max(0, current - leave.days);
      await saveEmployee(emp);
    }
  }

  await createNotification({
    userId: leave.employeeId,
    title: `Leave Request ${status}`,
    message: `Your ${leave.leaveType} leave request for ${leave.startDate} has been ${status.toLowerCase()} by ${actor.name || "HR"}.`,
    type: "leave",
  });

  await createAuditLog({
    action: status === LEAVE_STATUS.APPROVED ? AUDIT_ACTIONS.APPROVE_LEAVE : AUDIT_ACTIONS.REJECT_LEAVE,
    actor,
    details: `${status} leave for ${leave.employeeName} (${leave.days} days ${leave.leaveType}). Remarks: ${reviewerNotes || "None"}`,
    targetId: leaveId,
  });

  return { success: true, status };
}

// ==================== PAYROLL RUNS ====================
export async function getPayrollRuns() {
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/payroll_runs");
    } catch (err) {
      console.warn("RTDB getPayrollRuns fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = store.payroll_runs || [];
  }
  return list;
}

export async function getPayrollRunByMonth(month) {
  if (!month) return null;
  const safeId = sanitizeKey(month);

  if (rtdb.isConfigured) {
    try {
      const data = await rtdb.get(`hcm/payroll_runs/${safeId}`);
      if (data) return { id: month, ...data };
    } catch (err) {
      console.warn("RTDB getPayrollRunByMonth fallback:", err.message);
    }
  }

  const store = readLocalStore();
  return store.payroll_runs.find(p => p.month === month) || null;
}

export async function savePayrollRun(data, actor = null) {
  const month = data.month;
  const safeId = sanitizeKey(month);
  const now = new Date().toISOString();
  const record = {
    ...data,
    id: month,
    updatedAt: now,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/payroll_runs/${safeId}`, record);
    } catch (err) {
      console.warn("RTDB savePayrollRun error:", err.message);
    }
  }

  const store = readLocalStore();
  const idx = store.payroll_runs.findIndex(p => p.month === month);
  if (idx >= 0) {
    store.payroll_runs[idx] = { ...store.payroll_runs[idx], ...record };
  } else {
    store.payroll_runs.push(record);
  }
  writeLocalStore(store);

  if (actor) {
    await createAuditLog({
      action: AUDIT_ACTIONS.CREATE_PAYROLL_RUN,
      actor,
      details: `Saved draft payroll run for ${month}. Total Gross: ${record.totalGross}, Net: ${record.totalNet}`,
      targetId: month,
    });
  }

  return record;
}

export async function finalizePayrollRun(month, actor) {
  const run = await getPayrollRunByMonth(month);
  if (!run) throw new Error("Payroll run not found for " + month);
  if (run.status === "Finalized") throw new Error("Payroll run is already finalized and locked");

  const safeId = sanitizeKey(month);
  const now = new Date().toISOString();
  run.status = "Finalized";
  run.finalizedBy = actor.name || actor.email;
  run.finalizedAt = now;

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/payroll_runs/${safeId}`, run);
    } catch (err) {
      console.warn("RTDB finalizePayrollRun error:", err.message);
    }
  }

  const store = readLocalStore();
  const idx = store.payroll_runs.findIndex(p => p.month === month);
  if (idx >= 0) store.payroll_runs[idx] = run;
  writeLocalStore(store);

  if (Array.isArray(run.records)) {
    for (const rec of run.records) {
      await createNotification({
        userId: rec.employeeId,
        title: `Payslip Available for ${month}`,
        message: `Your payslip for ${month} has been finalized. Net Salary: PKR ${Number(rec.netSalary).toLocaleString()}`,
        type: "payroll",
      });
    }
  }

  await createAuditLog({
    action: AUDIT_ACTIONS.FINALIZE_PAYROLL_RUN,
    actor,
    details: `Finalized and locked payroll run for ${month}. Total payout: PKR ${Number(run.totalNet).toLocaleString()}`,
    targetId: month,
  });

  return run;
}

// ==================== ANNOUNCEMENTS ====================
export async function getAnnouncements() {
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/announcements");
    } catch (err) {
      console.warn("RTDB getAnnouncements fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = store.announcements || [];
  }

  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createAnnouncement(data, actor) {
  const id = `anc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const safeId = sanitizeKey(id);
  const now = new Date().toISOString();

  const record = {
    id,
    title: data.title,
    content: data.content,
    priority: data.priority || "Normal",
    targetAudience: data.targetAudience || "All",
    createdByName: actor.name || actor.email,
    createdByRole: actor.role || "HR",
    createdAt: now,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/announcements/${safeId}`, record);
    } catch (err) {
      console.warn("RTDB createAnnouncement error:", err.message);
    }
  }

  const store = readLocalStore();
  store.announcements.unshift(record);
  writeLocalStore(store);

  await createAuditLog({
    action: AUDIT_ACTIONS.POST_ANNOUNCEMENT,
    actor,
    details: `Posted announcement: "${record.title}" (${record.priority})`,
    targetId: id,
  });

  return record;
}

// ==================== NOTIFICATIONS ====================
export async function getNotifications(userId) {
  if (!userId) return [];
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/notifications");
    } catch (err) {
      console.warn("RTDB getNotifications fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = store.notifications || [];
  }

  return list
    .filter(n => n.userId === userId || n.userId === "all")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createNotification(data) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const safeId = sanitizeKey(id);
  const record = {
    id,
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type || "system",
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/notifications/${safeId}`, record);
    } catch (err) {
      console.warn("RTDB createNotification error:", err.message);
    }
  }

  const store = readLocalStore();
  store.notifications.unshift(record);
  writeLocalStore(store);

  return record;
}

export async function markNotificationAsRead(id) {
  const safeId = sanitizeKey(id);
  if (rtdb.isConfigured) {
    try {
      await rtdb.update(`hcm/notifications/${safeId}`, { isRead: true });
    } catch (err) {
      console.warn("RTDB markNotificationAsRead error:", err.message);
    }
  }

  const store = readLocalStore();
  const item = store.notifications.find(n => n.id === id);
  if (item) {
    item.isRead = true;
    writeLocalStore(store);
  }
  return { success: true };
}

// ==================== AUDIT LOGS ====================
export async function getAuditLogs(filters = {}) {
  let list = [];
  if (rtdb.isConfigured) {
    try {
      list = await rtdb.getList("hcm/audit_logs");
    } catch (err) {
      console.warn("RTDB getAuditLogs fallback:", err.message);
    }
  }

  if (!list || list.length === 0) {
    const store = readLocalStore();
    list = [...store.audit_logs];
  }

  if (filters.action) list = list.filter(l => l.action === filters.action);
  if (filters.actorRole) list = list.filter(l => l.actorRole === filters.actorRole);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(l =>
      l.details?.toLowerCase().includes(q) ||
      l.actorName?.toLowerCase().includes(q)
    );
  }

  return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function createAuditLog({ action, actor, details, targetId = "", ipAddress = "127.0.0.1" }) {
  const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const safeId = sanitizeKey(id);
  const record = {
    id,
    timestamp: new Date().toISOString(),
    action,
    actorId: actor?.id || actor?.uid || "system",
    actorName: actor?.name || actor?.email || "System",
    actorRole: actor?.role || "System",
    details,
    targetId,
    ipAddress,
  };

  if (rtdb.isConfigured) {
    try {
      await rtdb.set(`hcm/audit_logs/${safeId}`, record);
    } catch (err) {
      console.warn("Audit log write error:", err.message);
    }
  }

  const store = readLocalStore();
  store.audit_logs.unshift(record);
  if (store.audit_logs.length > 500) {
    store.audit_logs.pop();
  }
  writeLocalStore(store);

  return record;
}

// ==================== SEED HELPER FOR DEMO / EVALUATION ====================
export async function seedDemoData(actor) {
  const org = await getOrganizationSettings();
  if (!org.isSetupComplete) {
    org.isSetupComplete = true;
    await updateOrganizationSettings(org);
  }

  const demoEmployees = [
    {
      employeeCode: "EMP-1001",
      name: "Ahmed Khan",
      email: "ahmed@company.com",
      phone: "+92 300 1234567",
      department: "Engineering",
      designation: "Lead Software Architect",
      joiningDate: "2024-01-15",
      role: ROLES.ADMIN,
      status: "Active",
      grossSalary: 250000,
      baseSalary: 150000,
      houseRentAllowance: 50000,
      medicalAllowance: 25000,
      otherAllowance: 25000,
    },
    {
      employeeCode: "EMP-1002",
      name: "Fatima Noor",
      email: "fatima@company.com",
      phone: "+92 301 2345678",
      department: "Human Resources",
      designation: "HR Operations Lead",
      joiningDate: "2024-03-01",
      role: ROLES.HR,
      status: "Active",
      grossSalary: 180000,
      baseSalary: 108000,
      houseRentAllowance: 36000,
      medicalAllowance: 18000,
      otherAllowance: 18000,
    },
    {
      employeeCode: "EMP-1003",
      name: "Bilal Tariq",
      email: "bilal@company.com",
      phone: "+92 302 3456789",
      department: "Engineering",
      designation: "Frontend Engineer",
      joiningDate: "2024-06-10",
      role: ROLES.EMPLOYEE,
      status: "Active",
      grossSalary: 130000,
      baseSalary: 78000,
      houseRentAllowance: 26000,
      medicalAllowance: 13000,
      otherAllowance: 13000,
    },
    {
      employeeCode: "EMP-1004",
      name: "Ayesha Malik",
      email: "ayesha@company.com",
      phone: "+92 303 4567890",
      department: "Product & Design",
      designation: "Product Designer",
      joiningDate: "2024-08-01",
      role: ROLES.EMPLOYEE,
      status: "Active",
      grossSalary: 140000,
      baseSalary: 84000,
      houseRentAllowance: 28000,
      medicalAllowance: 14000,
      otherAllowance: 14000,
    },
    {
      employeeCode: "EMP-1005",
      name: "Zubair Siddiqui",
      email: "zubair@company.com",
      phone: "+92 304 5678901",
      department: "Finance & Accounts",
      designation: "Senior Accountant",
      joiningDate: "2024-04-15",
      role: ROLES.EMPLOYEE,
      status: "Active",
      grossSalary: 160000,
      baseSalary: 96000,
      houseRentAllowance: 32000,
      medicalAllowance: 16000,
      otherAllowance: 16000,
    },
  ];

  const savedEmps = [];
  for (const empData of demoEmployees) {
    const saved = await saveEmployee(empData, actor);
    savedEmps.push(saved);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  await recordAttendance({
    employeeId: savedEmps[0].id,
    employeeName: savedEmps[0].name,
    date: todayStr,
    checkInTime: "08:55",
    checkOutTime: "18:05",
    workHours: 9.17,
    status: ATTENDANCE_STATUS.PRESENT,
  }, actor);

  await recordAttendance({
    employeeId: savedEmps[1].id,
    employeeName: savedEmps[1].name,
    date: todayStr,
    checkInTime: "09:20",
    checkOutTime: "18:15",
    workHours: 8.92,
    status: ATTENDANCE_STATUS.LATE,
  }, actor);

  await recordAttendance({
    employeeId: savedEmps[2].id,
    employeeName: savedEmps[2].name,
    date: todayStr,
    checkInTime: "09:02",
    checkOutTime: null,
    workHours: 0,
    status: ATTENDANCE_STATUS.PRESENT,
  }, actor);

  await createAnnouncement({
    title: "Welcome to HCM Lite!",
    content: "Our unified Human Capital Management system is now live. Please review your profile, log your daily attendance, and use the AI assistant for any policy questions or leave requests.",
    priority: "Important",
    targetAudience: "All",
  }, actor);

  await createAuditLog({
    action: AUDIT_ACTIONS.CSV_IMPORT,
    actor,
    details: "Demo starter dataset loaded for evaluation",
    targetId: "demo_seed",
  });

  return { success: true, count: savedEmps.length };
}
