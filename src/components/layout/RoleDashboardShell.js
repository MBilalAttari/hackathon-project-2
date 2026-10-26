"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/constants";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { FirstRunWizard } from "@/components/setup/FirstRunWizard";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { EmployeeDirectory } from "@/components/employee/EmployeeDirectory";
import { AttendanceView } from "@/components/attendance/AttendanceView";
import { LeaveView } from "@/components/leave/LeaveView";
import { PayrollView } from "@/components/payroll/PayrollView";
import { AnnouncementsView } from "@/components/announcements/AnnouncementsView";
import { AuditLogsView } from "@/components/audit/AuditLogsView";
import { OrgSettingsView } from "@/components/settings/OrgSettingsView";
import { AICopilotDrawer } from "@/components/ai/AICopilotDrawer";
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/common/UI";

export function RoleDashboardShell({ allowedRoles = [] }) {
  const router = useRouter();
  const { user, role, organization, loading, getDashboardPath } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Unauthenticated redirect
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">
            Verifying Role Clearance...
          </p>
        </div>
      </div>
    );
  }

  // Role clearance authorization check
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(role);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Access Restricted (403 Forbidden)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your current account role is <span className="font-bold uppercase text-slate-700 dark:text-slate-200">{role}</span>. You do not possess the necessary clearance level to view this workspace.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full font-bold"
            icon={ArrowRight}
            onClick={() => router.replace(getDashboardPath(role))}
          >
            Go to My {role} Workspace
          </Button>
        </div>
      </div>
    );
  }

  // Admin first-run setup wizard check
  if (role === ROLES.ADMIN && !organization?.isSetupComplete) {
    return <FirstRunWizard onCompleted={() => setActiveTab("dashboard")} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar navigation filtered per role */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onToggleAI={() => setIsAIOpen(!isAIOpen)}
          activeTab={activeTab}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === "dashboard" && (
            <DashboardView
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenAI={() => setIsAIOpen(true)}
            />
          )}
          {activeTab === "employees" && (role === ROLES.ADMIN || role === ROLES.HR) && <EmployeeDirectory />}
          {activeTab === "attendance" && <AttendanceView />}
          {activeTab === "leaves" && <LeaveView />}
          {activeTab === "payroll" && <PayrollView />}
          {activeTab === "announcements" && <AnnouncementsView />}
          {activeTab === "audit" && (role === ROLES.ADMIN || role === ROLES.HR) && <AuditLogsView />}
          {activeTab === "settings" && role === ROLES.ADMIN && <OrgSettingsView />}
        </main>
      </div>

      {/* Slide-out AI Assistant Drawer */}
      <AICopilotDrawer isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
