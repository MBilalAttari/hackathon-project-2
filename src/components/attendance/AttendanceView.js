"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/common/Toast";
import { ROLES, ATTENDANCE_STATUS } from "@/lib/constants";
import { Card, Button, Badge, Modal, EmptyState, SkeletonLoader } from "../common/UI";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileEdit,
  History,
  Filter,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function AttendanceView() {
  const { user, role, organization, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modals & Action States
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    proposedCheckIn: "09:00",
    proposedCheckOut: "18:00",
    reason: "",
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState({});

  // Digital clock interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const queryParams = new URLSearchParams();
      if (selectedMonth) queryParams.set("month", selectedMonth);
      if (filterEmployeeId) queryParams.set("employeeId", filterEmployeeId);

      const [todayRes, logsRes, corRes, empRes] = await Promise.all([
        fetchWithAuth(`/api/attendance?date=${todayStr}`),
        fetchWithAuth(`/api/attendance?${queryParams.toString()}`),
        fetchWithAuth("/api/attendance/corrections"),
        role !== ROLES.EMPLOYEE ? fetchWithAuth("/api/employees") : Promise.resolve(null),
      ]);

      if (todayRes.ok) {
        const todayData = await todayRes.json();
        const myToday = todayData.find((a) => a.employeeId === user?.employeeId);
        setTodayRecord(myToday || null);
      }

      if (logsRes.ok) {
        setAttendanceLogs(await logsRes.json());
      }

      if (corRes.ok) {
        setCorrections(await corRes.json());
      }

      if (empRes && empRes.ok) {
        setEmployees(await empRes.json());
      }
    } catch (err) {
      console.error("Attendance load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, filterEmployeeId, fetchWithAuth]);

  // Check In / Check Out Handler
  const handleCheckAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      showToast(
        action === "check_in"
          ? `Punch confirmed at ${data.record.checkInTime} (${data.record.status})`
          : `Punch out confirmed at ${data.record.checkOutTime}. Work duration: ${data.record.workHours} hrs`,
        "success"
      );
      await loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Correction Request
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetchWithAuth("/api/attendance/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(correctionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit correction request");

      showToast("Attendance correction request submitted to HR", "success");
      setIsCorrectionModalOpen(false);
      setCorrectionForm({
        date: new Date().toISOString().slice(0, 10),
        proposedCheckIn: "09:00",
        proposedCheckOut: "18:00",
        reason: "",
      });
      await loadData();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Review Correction (Approve / Reject)
  const handleReviewCorrection = async (correctionId, status) => {
    setActionLoading(true);
    try {
      const notes = reviewerNotes[correctionId] || "";
      const res = await fetchWithAuth("/api/attendance/corrections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctionId,
          status,
          reviewerNotes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review action failed");

      showToast(`Correction request ${status.toLowerCase()}`, "success");
      await loadData();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCorrections = corrections.filter((c) => c.status === "Pending");

  // Filter logs by status
  const filteredLogs = statusFilter
    ? attendanceLogs.filter((l) => l.status === statusFilter)
    : attendanceLogs;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Attendance & Shift Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Biometric punch simulations, grace period monitoring, and attendance corrections
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={FileEdit}
          onClick={() => setIsCorrectionModalOpen(true)}
        >
          Request Correction
        </Button>
      </div>

      {/* Clock & Check In/Out Terminal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Shift Terminal
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                Live Clock
              </span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 font-mono">
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              {currentTime.toLocaleDateString([], {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 text-xs space-y-1.5 text-blue-100">
            <div className="flex justify-between">
              <span>Standard Shift:</span>
              <span className="font-bold">
                {organization?.workStartTime || "09:00"} - {organization?.workEndTime || "18:00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Grace Cutoff:</span>
              <span className="font-bold">
                {organization?.workStartTime || "09:00"} + {organization?.gracePeriodMinutes || 15}m
              </span>
            </div>
          </div>
        </div>

        {/* Punch Status Widget */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Daily Biometric Status
                </h4>
                <p className="text-xs text-slate-500">
                  Staff: <strong className="text-slate-700 dark:text-slate-300">{user?.name}</strong>
                </p>
              </div>

              {todayRecord ? (
                <Badge
                  variant={
                    todayRecord.status === "Present"
                      ? "success"
                      : todayRecord.status === "Late"
                      ? "warning"
                      : "primary"
                  }
                  size="md"
                >
                  {todayRecord.status}
                </Badge>
              ) : (
                <Badge variant="default" size="md">
                  Not Checked In
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[11px] font-medium">Check-In Time</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1 block font-mono">
                  {todayRecord?.checkInTime || "--:--"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[11px] font-medium">Check-Out Time</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1 block font-mono">
                  {todayRecord?.checkOutTime || "--:--"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[11px] font-medium">Work Duration</span>
                <span className="font-black text-blue-600 dark:text-blue-400 text-base mt-1 block font-mono">
                  {todayRecord?.workHours ? `${todayRecord.workHours} hrs` : "0.0 hrs"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            {!todayRecord ? (
              <Button
                variant="primary"
                size="md"
                icon={LogIn}
                loading={actionLoading}
                onClick={() => handleCheckAction("check_in")}
                className="w-full sm:w-auto font-bold"
              >
                Punch In Now
              </Button>
            ) : !todayRecord.checkOutTime ? (
              <Button
                variant="danger"
                size="md"
                icon={LogOut}
                loading={actionLoading}
                onClick={() => handleCheckAction("check_out")}
                className="w-full sm:w-auto font-bold"
              >
                Punch Out Now
              </Button>
            ) : (
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Shift punch record complete for today.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pending Attendance Correction Approvals (HR & Admin) */}
      {role !== ROLES.EMPLOYEE && pendingCorrections.length > 0 && (
        <Card
          title={`Pending Attendance Corrections (${pendingCorrections.length})`}
          subtitle="Review and approve employee punch correction requests"
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingCorrections.map((cor) => (
              <div
                key={cor.id}
                className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {cor.employeeName}
                    </span>
                    <Badge variant="warning" size="sm">
                      Pending Review
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 mt-1">
                    <span>Date: <strong>{cor.date}</strong></span>
                    <span>•</span>
                    <span className="line-through text-slate-400">
                      {cor.originalCheckIn} - {cor.originalCheckOut}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {cor.proposedCheckIn} - {cor.proposedCheckOut || "--:--"}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 italic mt-1">
                    Reason: &quot;{cor.reason}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Remarks..."
                    value={reviewerNotes[cor.id] || ""}
                    onChange={(e) =>
                      setReviewerNotes({ ...reviewerNotes, [cor.id]: e.target.value })
                    }
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <Button
                    size="sm"
                    variant="success"
                    loading={actionLoading}
                    onClick={() => handleReviewCorrection(cor.id, "Approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={actionLoading}
                    onClick={() => handleReviewCorrection(cor.id, "Rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attendance Log Table */}
      <Card
        title="Attendance Ledger"
        subtitle="Complete record of biometric punches and verified hours"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half-day">Half-day</option>
              <option value="Absent">Absent</option>
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />

            {role !== ROLES.EMPLOYEE && employees.length > 0 && (
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Personnel</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
      >
        {loading ? (
          <SkeletonLoader rows={5} />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Attendance Logs Found"
            description="No biometric punch records found for this period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {log.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {log.employeeName}
                    </td>
                    <td className="py-3 px-4 font-mono">{log.checkInTime || "--:--"}</td>
                    <td className="py-3 px-4 font-mono">{log.checkOutTime || "--:--"}</td>
                    <td className="py-3 px-4 font-black text-blue-600 dark:text-blue-400 font-mono">
                      {log.workHours || 0} hrs
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          log.status === "Present"
                            ? "success"
                            : log.status === "Late"
                            ? "warning"
                            : "danger"
                        }
                        size="sm"
                      >
                        {log.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {log.notes || (log.isCorrected ? "Verified via request" : "Standard biometric punch")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Attendance Correction Modal */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Request Attendance Correction"
        subtitle="Submit missed punch or timing adjustment for HR approval"
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={correctionForm.date}
              onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Proposed Check-In *
              </label>
              <input
                type="time"
                required
                value={correctionForm.proposedCheckIn}
                onChange={(e) =>
                  setCorrectionForm({ ...correctionForm, proposedCheckIn: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Proposed Check-Out
              </label>
              <input
                type="time"
                value={correctionForm.proposedCheckOut}
                onChange={(e) =>
                  setCorrectionForm({ ...correctionForm, proposedCheckOut: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Adjustment *
            </label>
            <textarea
              required
              rows={3}
              value={correctionForm.reason}
              onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
              placeholder="e.g. Offsite client meeting, missed punch due to terminal offline..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setIsCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={actionLoading}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
