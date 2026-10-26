export const ROLES = {
  ADMIN: "Admin",
  HR: "HR",
  EMPLOYEE: "Employee",
};

export const LEAVE_TYPES = {
  ANNUAL: "annual",
  CASUAL: "casual",
  SICK: "sick",
  UNPAID: "unpaid",
};

export const LEAVE_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ATTENDANCE_STATUS = {
  PRESENT: "Present",
  LATE: "Late",
  HALF_DAY: "Half-day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
};

export const CORRECTION_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const PAYROLL_STATUS = {
  DRAFT: "Draft",
  FINALIZED: "Finalized",
  PAID: "Paid",
};

export const AUDIT_ACTIONS = {
  ORG_SETUP: "ORG_SETUP",
  USER_REGISTER: "USER_REGISTER",
  USER_LOGIN: "USER_LOGIN",
  CREATE_EMPLOYEE: "CREATE_EMPLOYEE",
  UPDATE_EMPLOYEE: "UPDATE_EMPLOYEE",
  DELETE_EMPLOYEE: "DELETE_EMPLOYEE",
  UPDATE_ROLE: "UPDATE_ROLE",
  CSV_IMPORT: "CSV_IMPORT",
  CHECK_IN: "CHECK_IN",
  CHECK_OUT: "CHECK_OUT",
  SUBMIT_ATTENDANCE_CORRECTION: "SUBMIT_ATTENDANCE_CORRECTION",
  APPROVE_ATTENDANCE_CORRECTION: "APPROVE_ATTENDANCE_CORRECTION",
  REJECT_ATTENDANCE_CORRECTION: "REJECT_ATTENDANCE_CORRECTION",
  APPLY_LEAVE: "APPLY_LEAVE",
  APPROVE_LEAVE: "APPROVE_LEAVE",
  REJECT_LEAVE: "REJECT_LEAVE",
  CREATE_PAYROLL_RUN: "CREATE_PAYROLL_RUN",
  FINALIZE_PAYROLL_RUN: "FINALIZE_PAYROLL_RUN",
  POST_ANNOUNCEMENT: "POST_ANNOUNCEMENT",
};

// Default organization configuration applied during first-run setup
export const DEFAULT_ORG_SETTINGS = {
  companyName: "HCM Lite Technologies",
  companyCode: "HCML",
  currency: "PKR",
  workStartTime: "09:00",
  workEndTime: "18:00",
  gracePeriodMinutes: 15,
  halfDayWorkHours: 4.5,
  standardDailyHours: 8.0,
  departments: [
    "Engineering",
    "Product & Design",
    "Human Resources",
    "Finance & Accounts",
    "Sales & Marketing",
    "Operations",
  ],
  defaultLeaveQuotas: {
    annual: 14,
    casual: 10,
    sick: 8,
    unpaid: 0,
  },
  // Pakistan / Standard Progressive Tax Slabs (Annual)
  taxSlabs: [
    { min: 0, max: 600000, rate: 0, fixed: 0 },
    { min: 600000, max: 1200000, rate: 0.025, fixed: 0 },
    { min: 1200000, max: 2400000, rate: 0.125, fixed: 15000 },
    { min: 2400000, max: 3600000, rate: 0.225, fixed: 165000 },
    { min: 3600000, max: null, rate: 0.35, fixed: 435000 },
  ],
  isSetupComplete: false,
};
