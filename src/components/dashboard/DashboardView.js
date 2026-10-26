"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/common/Toast";
import { ROLES, ATTENDANCE_STATUS } from "@/lib/constants";
import { Card, StatCard, Button, Badge, EmptyState, SkeletonLoader } from "../common/UI";
import {
  Users,
  Clock,
  CalendarDays,
  Banknote,
  CheckCircle,
  AlertTriangle,
  Megaphone,
  Sparkles,
  ArrowRight,
  TrendingUp,
  LogIn,
  LogOut,
  Calendar,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export function DashboardView({ onNavigate, onOpenAI }) {
  const { user, role, organization, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [punchLoading, setPunchLoading] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [empRes, attRes, levRes, payRes, ancRes] = await Promise.all([
        fetchWithAuth("/api/employees"),
        fetchWithAuth(`/api/attendance?date=${todayStr}`),
        fetchWithAuth("/api/leaves"),
        fetchWithAuth("/api/payroll"),
        fetchWithAuth("/api/announcements"),
      ]);

      if (empRes.ok) setEmployees(await empRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
      if (levRes.ok) setLeaves(await levRes.json());
      if (payRes.ok) setPayrollRuns(await payRes.json());
      if (ancRes.ok) setAnnouncements(await ancRes.json());
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [fetchWithAuth]);

  // Quick punch from dashboard hero
  const handlePunch = async (action) => {
    setPunchLoading(true);
    try {
      const res = await fetchWithAuth("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Punch failed");

      showToast(
        action === "check_in"
          ? `Checked in at ${data.record.checkInTime} (${data.record.status})`
          : `Checked out at ${data.record.checkOutTime}. Logged ${data.record.workHours} hrs.`,
        "success"
      );
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setPunchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader rows={4} />
      </div>
    );
  }

  // Server-calculated metrics
  const activeEmployees = employees.filter((e) => e.status === "Active");
  const todayPresent = attendance.filter(
    (a) => a.status === ATTENDANCE_STATUS.PRESENT || a.status === ATTENDANCE_STATUS.LATE
  );
  const attendanceRate =
    activeEmployees.length > 0
      ? Math.round((todayPresent.length / activeEmployees.length) * 100)
      : 0;

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");
  const latestPayroll = payrollRuns.length > 0 ? payrollRuns[payrollRuns.length - 1] : null;
  const totalPayrollCost =
    latestPayroll?.totalNet ||
    employees.reduce((acc, e) => acc + (Number(e.grossSalary) || 0), 0);

  // Employee's personal record & today punch
  const myEmployeeRecord = employees.find((e) => e.id === user?.employeeId) || {};
  const myTodayAttendance = attendance.find((a) => a.employeeId === user?.employeeId);
  const myBalances = myEmployeeRecord.leaveBalances || { annual: 14, casual: 10, sick: 8 };

  // Recharts Data 1: Attendance Distribution
  const attDistributionData = [
    {
      name: "Present",
      count: attendance.filter((a) => a.status === ATTENDANCE_STATUS.PRESENT).length,
      fill: "#10b981",
    },
    {
      name: "Late Arrival",
      count: attendance.filter((a) => a.status === ATTENDANCE_STATUS.LATE).length,
      fill: "#f59e0b",
    },
    {
      name: "Half-day",
      count: attendance.filter((a) => a.status === ATTENDANCE_STATUS.HALF_DAY).length,
      fill: "#6366f1",
    },
    {
      name: "Absent / Pending",
      count: Math.max(0, activeEmployees.length - attendance.length),
      fill: "#f43f5e",
    },
  ];

  // Recharts Data 2: Department Headcount
  const deptMap = {};
  employees.forEach((e) => {
    const d = e.department || "General";
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const deptData = Object.keys(deptMap).map((dept) => ({
    department: dept,
    headcount: deptMap[dept],
  }));

  // Recharts Data 3: Salary Components & Allowances
  const salaryBreakdownData = [
    {
      category: "Basic Salary (60%)",
      amount: employees.reduce((acc, e) => acc + (Number(e.baseSalary) || 0), 0),
    },
    {
      category: "House Rent (20%)",
      amount: employees.reduce((acc, e) => acc + (Number(e.houseRentAllowance) || 0), 0),
    },
    {
      category: "Medical & Utility (10%)",
      amount: employees.reduce((acc, e) => acc + (Number(e.medicalAllowance) || 0), 0),
    },
    {
      category: "Other Allowances",
      amount: employees.reduce((acc, e) => acc + (Number(e.otherAllowance) || 0), 0),
    },
  ];

  // Dynamic greeting based on current hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Hero Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider text-blue-100">
                {role} Workspace
              </span>
              <span className="text-xs text-blue-200">
                Shift: {organization?.workStartTime || "09:00"} - {organization?.workEndTime || "18:00"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {greeting}, {user?.name || "Team Member"}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Welcome to HCM Lite. All corporate systems, biometric punches, leave workflows, and progressive tax calculations are operational.
            </p>
          </div>

          {/* Quick Punch Button inside Hero */}
          <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-center gap-2 text-center min-w-[200px]">
            <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
              {myTodayAttendance?.checkInTime ? "Status: Checked In" : "Status: Not In Yet"}
            </span>

            {!myTodayAttendance ? (
              <Button
                variant="primary"
                size="md"
                icon={LogIn}
                loading={punchLoading}
                onClick={() => handlePunch("check_in")}
                className="w-full bg-white text-blue-700 hover:bg-blue-50 shadow-md font-bold"
              >
                Clock In Now
              </Button>
            ) : !myTodayAttendance.checkOutTime ? (
              <Button
                variant="danger"
                size="md"
                icon={LogOut}
                loading={punchLoading}
                onClick={() => handlePunch("check_out")}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white shadow-md font-bold"
              >
                Clock Out
              </Button>
            ) : (
              <div className="text-xs font-bold text-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>Shift Completed</span>
              </div>
            )}

            <span className="text-[10px] text-blue-200">
              Grace cutoff: {organization?.workStartTime || "09:00"} + {organization?.gracePeriodMinutes || 15}m
            </span>
          </div>
        </div>
      </div>

      {/* Announcements Banner (if any) */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  {announcements[0].title}
                </h4>
                <Badge
                  variant={
                    announcements[0].priority === "Urgent"
                      ? "danger"
                      : announcements[0].priority === "Important"
                      ? "warning"
                      : "primary"
                  }
                  size="sm"
                >
                  {announcements[0].priority}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                {announcements[0].content}
              </p>
            </div>
            <button
              onClick={() => onNavigate("announcements")}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              View Feed →
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: Dynamic per Role */}
      {role === ROLES.EMPLOYEE ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Punch Status"
            value={myTodayAttendance ? myTodayAttendance.status : "Not Checked In"}
            icon={Clock}
            color={
              myTodayAttendance?.status === "Present"
                ? "green"
                : myTodayAttendance?.status === "Late"
                ? "amber"
                : "red"
            }
            subtitle={
              myTodayAttendance
                ? `In: ${myTodayAttendance.checkInTime} ${
                    myTodayAttendance.checkOutTime ? `| Out: ${myTodayAttendance.checkOutTime}` : ""
                  }`
                : "Shift starts at " + (organization?.workStartTime || "09:00")
            }
          />
          <StatCard
            title="Annual Leave Balance"
            value={`${myBalances.annual} Days`}
            icon={CalendarDays}
            color="blue"
            subtitle="Full year paid quota"
          />
          <StatCard
            title="Casual Leave Balance"
            value={`${myBalances.casual} Days`}
            icon={CalendarDays}
            color="amber"
            subtitle="Short-notice personal days"
          />
          <StatCard
            title="Sick Leave Balance"
            value={`${myBalances.sick} Days`}
            icon={CalendarDays}
            color="purple"
            subtitle="Medical allowance"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Headcount"
            value={employees.length}
            icon={Users}
            color="blue"
            subtitle={`${activeEmployees.length} Active Staff`}
            change="+100% server verified"
            trend="up"
          />
          <StatCard
            title="Today's Attendance Rate"
            value={`${attendanceRate}%`}
            icon={Clock}
            color="green"
            subtitle={`${todayPresent.length} of ${activeEmployees.length} active checked in`}
            change="Real-time biometric logs"
            trend="up"
          />
          <StatCard
            title="Pending Leave Queue"
            value={pendingLeaves.length}
            icon={CalendarDays}
            color="amber"
            subtitle={
              pendingLeaves.length > 0 ? "Awaiting review & approval" : "Queue all cleared"
            }
            change={pendingLeaves.length > 0 ? "Action required" : "Up to date"}
            trend={pendingLeaves.length > 0 ? "down" : "up"}
          />
          <StatCard
            title="Monthly Payroll Expense"
            value={`${organization?.currency || "PKR"} ${(totalPayrollCost / 1000).toFixed(0)}k`}
            icon={Banknote}
            color="purple"
            subtitle={
              latestPayroll
                ? `Run: ${latestPayroll.month} (${latestPayroll.status})`
                : "Estimated active gross"
            }
            change="Pakistani tax slab applied"
            trend="up"
          />
        </div>
      )}

      {/* Quick Interactive Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate("attendance")}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Attendance & Punch
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Punch in/out, log history & corrections
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>

        <div
          onClick={() => onNavigate("leaves")}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Leave Management
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apply leave with balance validation
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </div>

        <div
          onClick={onOpenAI}
          className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:scale-101 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-white/20 text-yellow-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Ask AI Copilot</h4>
              <p className="text-xs text-blue-100">
                Policy questions, smart leave draft cards
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* Recharts Analytics Grid */}
      {employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Employees Registered Yet"
          description="Your database is clean and empty. Create employees or import CSV to generate dynamic real-time charts."
          action={
            role !== ROLES.EMPLOYEE && (
              <Button variant="primary" size="md" onClick={() => onNavigate("employees")}>
                Go to Employee Directory
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Today's Attendance Distribution */}
          <Card
            title="Today's Attendance Status Breakdown"
            subtitle="Verified check-ins vs late arrivals and pending staff"
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={attDistributionData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(51, 65, 85, 0.5)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {attDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 2: Department Headcount */}
          <Card
            title="Department Staff Headcount"
            subtitle="Active personnel distribution across business units"
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <YAxis
                    dataKey="department"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={11}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(51, 65, 85, 0.5)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="headcount" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 3: Salary Breakdown (Visible to HR/Admin) */}
          {role !== ROLES.EMPLOYEE && (
            <Card
              className="lg:col-span-2"
              title="Monthly Salary Structure Allocation"
              subtitle="Aggregated basic salary vs standard allowances (60% Basic, 20% House Rent, 10% Medical & Utility)"
            >
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salaryBreakdownData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorAmountGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v) => [
                        `${organization?.currency || "PKR"} ${Number(v).toLocaleString()}`,
                        "Total Allocation",
                      ]}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(51, 65, 85, 0.5)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAmountGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
