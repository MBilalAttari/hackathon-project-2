"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/constants";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Banknote,
  Megaphone,
  ScrollText,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { role } = useAuth();

  const getNavItems = () => {
    // Base items for Employee
    if (role === ROLES.EMPLOYEE) {
      return [
        { id: "dashboard", label: "My Dashboard", icon: LayoutDashboard },
        { id: "attendance", label: "Attendance & Corrections", icon: Clock },
        { id: "leaves", label: "Leave Requests", icon: CalendarDays },
        { id: "payroll", label: "My Payslips", icon: Banknote },
        { id: "announcements", label: "Announcements", icon: Megaphone },
      ];
    }

    // HR items
    if (role === ROLES.HR) {
      return [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "employees", label: "Employee Directory", icon: Users },
        { id: "attendance", label: "Attendance Logs", icon: Clock },
        { id: "leaves", label: "Leave Approvals", icon: CalendarDays },
        { id: "payroll", label: "Payroll Runs", icon: Banknote },
        { id: "announcements", label: "Announcements", icon: Megaphone },
        { id: "audit", label: "Audit Logs", icon: ScrollText },
      ];
    }

    // Admin items (Full Access)
    return [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "attendance", label: "Attendance Logs", icon: Clock },
      { id: "leaves", label: "Leave Approvals", icon: CalendarDays },
      { id: "payroll", label: "Payroll Engine", icon: Banknote },
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "audit", label: "Audit Trail", icon: ScrollText },
      { id: "settings", label: "Org Settings", icon: Settings },
    ];
  };

  const navItems = getNavItems();

  const handleSelect = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header in drawer */}
        <div className="flex md:hidden items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
            <span>HCM Lite Navigation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {role} Portal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Assistant Banner at bottom of sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-100/80 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>AI Copilot Ready</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              Ask policy rules, draft leaves, or analyze payroll anytime.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
