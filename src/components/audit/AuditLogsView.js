"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, Button, Badge, SkeletonLoader, EmptyState } from "../common/UI";
import { ScrollText, Search, Shield, Filter, RefreshCw } from "lucide-react";

export function AuditLogsView() {
  const { fetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (roleFilter) params.set("actorRole", roleFilter);
      if (search) params.set("search", search);

      const res = await fetchWithAuth(`/api/audit?${params.toString()}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, roleFilter, fetchWithAuth]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadgeVariant = (action) => {
    if (action.includes("FINALIZE") || action.includes("DELETE") || action.includes("REJECT")) {
      return "danger";
    }
    if (action.includes("APPROVE") || action.includes("CREATE")) {
      return "success";
    }
    if (action.includes("UPDATE") || action.includes("APPLY") || action.includes("CHECK")) {
      return "primary";
    }
    return "default";
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-600" />
            <span>System Audit Trail & Compliance</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of role changes, payroll finalization, leave decisions and biometric events
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={loadLogs}
        >
          Refresh Log
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit details or actor name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </form>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          <option value="">All Action Types</option>
          <option value="USER_LOGIN">User Login</option>
          <option value="CREATE_EMPLOYEE">Create Employee</option>
          <option value="UPDATE_EMPLOYEE">Update Employee</option>
          <option value="CHECK_IN">Check In</option>
          <option value="CHECK_OUT">Check Out</option>
          <option value="APPROVE_LEAVE">Approve Leave</option>
          <option value="REJECT_LEAVE">Reject Leave</option>
          <option value="FINALIZE_PAYROLL_RUN">Finalize Payroll</option>
          <option value="POST_ANNOUNCEMENT">Announcement</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-36 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          <option value="">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="HR">HR</option>
          <option value="Employee">Employee</option>
        </select>
      </div>

      {/* Logs Table */}
      <Card title="Activity Ledger" subtitle={`Showing ${logs.length} logged audit events`}>
        {loading ? (
          <SkeletonLoader rows={6} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No Audit Records Found"
            description="Audit events are automatically recorded as users interact with the system."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {log.actorName} <span className="text-[10px] text-slate-400">({log.actorRole})</span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                      {log.details}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {log.targetId || "--"}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-400 text-[11px] font-mono">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
