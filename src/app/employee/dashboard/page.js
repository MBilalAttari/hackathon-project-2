"use client";

import React from "react";
import { RoleDashboardShell } from "@/components/layout/RoleDashboardShell";
import { ROLES } from "@/lib/constants";

export default function EmployeeDashboardPage() {
  return <RoleDashboardShell allowedRoles={[ROLES.EMPLOYEE, ROLES.HR, ROLES.ADMIN]} />;
}
