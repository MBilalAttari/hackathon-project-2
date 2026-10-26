"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/components/common/Toast";
import { ROLES, ATTENDANCE_STATUS } from "@/lib/constants";
import {
  Bell,
  Sun,
  Moon,
  Sparkles,
  Menu,
  Shield,
  UserCheck,
  User,
  LogOut,
  Building2,
  Check,
  Clock,
  LogIn,
  LogOut as PunchOutIcon,
} from "lucide-react";

export function Header({ onToggleSidebar, onToggleAI, activeTab }) {
  const { user, role, organization, logout, switchRole, fetchWithAuth } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);

  const loadHeaderData = async () => {
    if (!user) return;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [notifRes, attRes] = await Promise.all([
        fetchWithAuth("/api/notifications"),
        fetchWithAuth(`/api/attendance?date=${todayStr}`),
      ]);

      if (notifRes.ok) setNotifications(await notifRes.json());
      if (attRes.ok) {
        const attData = await attRes.json();
        const myAtt = attData.find((a) => a.employeeId === user.employeeId);
        setTodayAttendance(myAtt || null);
      }
    } catch (err) {
      console.warn("Header data load error:", err);
    }
  };

  useEffect(() => {
    loadHeaderData();
    const interval = setInterval(loadHeaderData, 30000);
    return () => clearInterval(interval);
  }, [user, fetchWithAuth]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await fetchWithAuth("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.warn("Mark read error:", err);
    }
  };

  // Header Quick Punch Action
  const handleQuickPunch = async () => {
    setPunchLoading(true);
    const action = !todayAttendance ? "check_in" : "check_out";
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
          ? `Successfully checked in at ${data.record.checkInTime} (${data.record.status})`
          : `Successfully checked out at ${data.record.checkOutTime}. Logged ${data.record.workHours} hrs.`,
        "success"
      );
      await loadHeaderData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setPunchLoading(false);
    }
  };

  const roleColors = {
    [ROLES.ADMIN]:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    [ROLES.HR]:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    [ROLES.EMPLOYEE]:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  };

  const currentDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Organization info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                  {organization?.companyName || "HCM Lite"}
                </h1>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {organization?.companyCode || "CORP"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 capitalize hidden sm:block">
                {currentDateStr} • {activeTab}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Biometric Status Pill (Visible on md+) */}
        <div className="hidden lg:flex items-center gap-2">
          {todayAttendance?.checkInTime ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                In: <strong>{todayAttendance.checkInTime}</strong>
                {todayAttendance.checkOutTime ? ` • Out: ${todayAttendance.checkOutTime}` : ""}
              </span>
              {!todayAttendance.checkOutTime && (
                <button
                  onClick={handleQuickPunch}
                  disabled={punchLoading}
                  className="ml-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Punch Out
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleQuickPunch}
              disabled={punchLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Punch In Now</span>
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Role Switcher (For Evaluation & Demo Convenience) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border shadow-2xs transition-all cursor-pointer ${
                roleColors[role] || roleColors[ROLES.EMPLOYEE]
              }`}
              title="Click to switch role preview for evaluation"
            >
              {role === ROLES.ADMIN ? (
                <Shield className="w-3.5 h-3.5" />
              ) : role === ROLES.HR ? (
                <UserCheck className="w-3.5 h-3.5" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
              <span>{role}</span>
              <span className="text-[9px] opacity-60 ml-0.5">▼</span>
            </button>

            {showRoleSwitcher && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs animate-in zoom-in-95 duration-150"
                onClick={() => setShowRoleSwitcher(false)}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Role
                </div>
                {[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchRole(r);
                      showToast(`Switched active view to ${r} role`, "info");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      role === r
                        ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    }`}
                  >
                    <span>{r} Portal</span>
                    {role === r && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Copilot Button */}
          <button
            onClick={onToggleAI}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold shadow-xs hover:shadow-md hover:scale-102 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin-slow" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    Notifications
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {unreadCount} unread
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3.5 cursor-pointer transition-colors ${
                          n.isRead
                            ? "opacity-75 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            : "bg-blue-50/60 dark:bg-blue-950/25 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shadow-2xs">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <button
              onClick={() => {
                logout();
                showToast("Signed out", "info");
              }}
              title="Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
