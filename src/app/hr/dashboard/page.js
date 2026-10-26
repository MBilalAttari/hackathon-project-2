"use client";

import React from "react";
import { RoleDashboardShell } from "@/components/layout/RoleDashboardShell";
import { ROLES } from "@/lib/constants";

export default function HRDashboardPage() {
  return <RoleDashboardShell allowedRoles={[ROLES.HR, ROLES.ADMIN]} />;
}
