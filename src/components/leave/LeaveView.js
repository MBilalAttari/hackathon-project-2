"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES, LEAVE_TYPES, LEAVE_STATUS } from "@/lib/constants";
import { Card, Button, Badge, Modal, EmptyState, SkeletonLoader } from "../common/UI";
import {
  CalendarDays,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

export function LeaveView() {
  const { user, role, organization, fetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [formData, setFormData] = useState({
    leaveType: LEAVE_TYPES.CASUAL,
    startDate: tomorrow.toISOString().slice(0, 10),
    endDate: tomorrow.toISOString().slice(0, 10),
    reason: "",
  });
  const [reviewerNotes, setReviewerNotes] = useState({});

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const [leavesRes, empsRes] = await Promise.all([
        fetchWithAuth("/api/leaves"),
        fetchWithAuth("/api/employees"),
      ]);

      if (leavesRes.ok) setLeaves(await leavesRes.json());
      if (empsRes.ok) setEmployees(await empsRes.json());
    } catch (err) {
      console.error("Failed to load leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [fetchWithAuth]);

  // Current employee's leave balance
  const currentEmp = employees.find((e) => e.id === user?.employeeId) || {};
  const balances = currentEmp.leaveBalances || {
    annual: 14,
    casual: 10,
    sick: 8,
    unpaid: 0,
  };

  // Compute days difference
  const start = new Date(formData.startDate);
  const end = new Date(formData.endDate);
  const diffDays =
    !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start
      ? Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1
      : 0;

  const currentTypeBalance = balances[formData.leaveType] ?? 0;
  const isExceeded = formData.leaveType !== "unpaid" && diffDays > currentTypeBalance;

  // Submit Leave Application
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (isExceeded) {
      alert(`Insufficient balance. You have ${currentTypeBalance} days left for ${formData.leaveType} leave.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchWithAuth("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          days: diffDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit leave request");

      setIsApplyModalOpen(false);
      setFormData({
        leaveType: LEAVE_TYPES.CASUAL,
        startDate: tomorrow.toISOString().slice(0, 10),
        endDate: tomorrow.toISOString().slice(0, 10),
        reason: "",
      });
      await loadLeaves();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Review Leave Request (Approve / Reject)
  const handleReviewLeave = async (leaveId, status) => {
    setActionLoading(true);
    try {
      const notes = reviewerNotes[leaveId] || "";
      const res = await fetchWithAuth("/api/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status,
          reviewerNotes: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to review leave");

      await loadLeaves();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === LEAVE_STATUS.PENDING);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <span>Leave Management & Approvals</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Annual, casual and medical leave tracking with balance deductions
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={PlusCircle}
          onClick={() => setIsApplyModalOpen(true)}
        >
          Apply for Leave
        </Button>
      </div>

      {/* Quota Balances Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Annual Leave
          </span>
          <h4 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {balances.annual ?? 14} <span className="text-xs font-normal text-slate-500">Days Left</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Quota: {organization?.defaultLeaveQuotas?.annual || 14} days/yr</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Casual Leave
          </span>
          <h4 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {balances.casual ?? 10} <span className="text-xs font-normal text-slate-500">Days Left</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Quota: {organization?.defaultLeaveQuotas?.casual || 10} days/yr</p>
        </div>

        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Sick Leave
          </span>
          <h4 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {balances.sick ?? 8} <span className="text-xs font-normal text-slate-500">Days Left</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Quota: {organization?.defaultLeaveQuotas?.sick || 8} days/yr</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Unpaid Leave Taken
          </span>
          <h4 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
            {balances.unpaid ?? 0} <span className="text-xs font-normal text-slate-500">Days</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Subject to salary deduction</p>
        </div>
      </div>

      {/* Pending Approvals (Visible to HR & Admin) */}
      {role !== ROLES.EMPLOYEE && (
        <Card
          title={`Pending Leave Applications (${pendingLeaves.length})`}
          subtitle="Review employee leave requests and approve/reject with remarks"
        >
          {pendingLeaves.length === 0 ? (
            <p className="text-center py-6 text-slate-400 text-xs">
              No leave requests currently pending review.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingLeaves.map((l) => (
                <div
                  key={l.id}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {l.employeeName}
                      </span>
                      <Badge variant="primary" size="sm">
                        {l.leaveType.toUpperCase()}
                      </Badge>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {l.days} Day(s)
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Duration: <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong> • Department: {l.department}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      Reason: &quot;{l.reason}&quot;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Remarks..."
                      value={reviewerNotes[l.id] || ""}
                      onChange={(e) =>
                        setReviewerNotes({ ...reviewerNotes, [l.id]: e.target.value })
                      }
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <Button
                      size="sm"
                      variant="success"
                      loading={actionLoading}
                      onClick={() => handleReviewLeave(l.id, LEAVE_STATUS.APPROVED)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={actionLoading}
                      onClick={() => handleReviewLeave(l.id, LEAVE_STATUS.REJECTED)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Leave History Table */}
      <Card title="Leave Application History" subtitle="Full historical ledger of leave requests and review decisions">
        {loading ? (
          <SkeletonLoader rows={4} />
        ) : leaves.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No Leave History"
            description="No leave applications have been submitted yet."
            action={
              <Button variant="primary" size="sm" onClick={() => setIsApplyModalOpen(true)}>
                Apply for Leave
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {l.employeeName}
                    </td>
                    <td className="py-3 px-4 uppercase font-bold text-slate-600 dark:text-slate-300">
                      {l.leaveType}
                    </td>
                    <td className="py-3 px-4">
                      {l.startDate} to {l.endDate}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600">{l.days} d</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {l.reason}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          l.status === LEAVE_STATUS.APPROVED
                            ? "success"
                            : l.status === LEAVE_STATUS.REJECTED
                            ? "danger"
                            : "warning"
                        }
                        size="sm"
                      >
                        {l.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {l.reviewedBy ? `${l.reviewedBy} (${l.reviewerNotes || "Approved"})` : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave"
        subtitle="Submit request with real-time balance validation"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Leave Type *
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value={LEAVE_TYPES.ANNUAL}>Annual Leave ({balances.annual} days left)</option>
              <option value={LEAVE_TYPES.CASUAL}>Casual Leave ({balances.casual} days left)</option>
              <option value={LEAVE_TYPES.SICK}>Sick Leave ({balances.sick} days left)</option>
              <option value={LEAVE_TYPES.UNPAID}>Unpaid Leave (Salary deducted)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-500">Requested Duration:</span>
            <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{diffDays} Day(s)</span>
          </div>

          {isExceeded && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-[11px] border border-rose-200 dark:border-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                You requested {diffDays} days, but only have {currentTypeBalance} days available. Please adjust dates or switch to Unpaid Leave.
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Absence *
            </label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Provide a clear description for HR/Admin approval..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isExceeded || diffDays <= 0}
              loading={actionLoading}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
