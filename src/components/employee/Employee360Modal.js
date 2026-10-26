"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Modal, Badge, Button, StatCard, SkeletonLoader } from "../common/UI";
import { generatePayslipPdf } from "@/lib/payroll/payslipPdf";
import {
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Clock,
  CalendarDays,
  Banknote,
  Download,
  Shield,
  FileText,
} from "lucide-react";

export function Employee360Modal({ employeeId, isOpen, onClose }) {
  const { fetchWithAuth, organization, role } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function load360() {
      if (!employeeId || !isOpen) return;
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/api/employees/${employeeId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("360 load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load360();
  }, [employeeId, isOpen, fetchWithAuth]);

  if (!isOpen) return null;

  const emp = data?.employee || {};
  const attendance = data?.attendance || [];
  const leaves = data?.leaves || [];
  const payslips = data?.payslips || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee 360 View"
      subtitle="Complete profile, compensation, attendance, leaves, and payroll records"
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <SkeletonLoader rows={5} />
      ) : (
        <div className="space-y-5 text-xs">
          {/* Header Profile Summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                {emp.name?.[0]?.toUpperCase() || "E"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {emp.name}
                  </h3>
                  <Badge variant={emp.status === "Active" ? "success" : "default"} size="sm">
                    {emp.status}
                  </Badge>
                  <Badge variant="primary" size="sm">
                    {emp.role}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  {emp.designation} • {emp.department} • ID: {emp.employeeCode}
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              <p>Joined: {emp.joiningDate || "N/A"}</p>
              <p>{emp.email}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1 overflow-x-auto">
            {[
              { id: "overview", label: "Overview & Compensation", icon: User },
              { id: "attendance", label: `Attendance (${attendance.length})`, icon: Clock },
              { id: "leaves", label: `Leaves (${leaves.length})`, icon: CalendarDays },
              { id: "payroll", label: `Payslips (${payslips.length})`, icon: Banknote },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Overview & Compensation */}
          {activeTab === "overview" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div>
                  <span className="text-slate-400 block mb-0.5">Official Email:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Phone Number:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.phone || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Department:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Residential Address:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.address || "On record"}</span>
                </div>
              </div>

              {/* Salary Breakdown (Gross, Basic 60%, Allowances) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Compensation & Salary Structure</span>
                  </h4>
                  <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                    Gross: {organization?.currency || "PKR"} {Number(emp.grossSalary || 0).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">Basic Salary (60%)</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {organization?.currency || "PKR"} {Number(emp.baseSalary || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">House Rent (20%)</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {organization?.currency || "PKR"} {Number(emp.houseRentAllowance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">Medical / Utility (10%)</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {organization?.currency || "PKR"} {Number(emp.medicalAllowance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 text-[10px] block">Other Allowances</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {organization?.currency || "PKR"} {Number(emp.otherAllowance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between text-slate-500 text-[11px]">
                  <span>Bank: <strong className="text-slate-800 dark:text-slate-200">{emp.bankDetails?.bankName || "Corporate Bank"}</strong></span>
                  <span>Account #: <strong className="text-slate-800 dark:text-slate-200">{emp.bankDetails?.accountNumber || "N/A"}</strong></span>
                  <span>IBAN: <strong className="text-slate-800 dark:text-slate-200">{emp.bankDetails?.iban || "N/A"}</strong></span>
                </div>
              </div>

              {/* Leave Balances Quick Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-center">
                  <span className="text-slate-500 text-[11px] block">Annual Leave</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {emp.leaveBalances?.annual ?? 14} Days
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-amber-100 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                  <span className="text-slate-500 text-[11px] block">Casual Leave</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {emp.leaveBalances?.casual ?? 10} Days
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 text-center">
                  <span className="text-slate-500 text-[11px] block">Sick Leave</span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {emp.leaveBalances?.sick ?? 8} Days
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Attendance History */}
          {activeTab === "attendance" && (
            <div className="space-y-3 animate-in fade-in">
              {attendance.length === 0 ? (
                <p className="text-center py-8 text-slate-400">No attendance logs found for this employee.</p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[11px]">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Check-in</th>
                        <th className="p-2.5">Check-out</th>
                        <th className="p-2.5">Hours</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {attendance.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-medium">{att.date}</td>
                          <td className="p-2.5">{att.checkInTime || "--:--"}</td>
                          <td className="p-2.5">{att.checkOutTime || "--:--"}</td>
                          <td className="p-2.5 font-semibold">{att.workHours || 0} hrs</td>
                          <td className="p-2.5">
                            <Badge
                              variant={
                                att.status === "Present"
                                  ? "success"
                                  : att.status === "Late"
                                  ? "warning"
                                  : "danger"
                              }
                              size="sm"
                            >
                              {att.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Leaves */}
          {activeTab === "leaves" && (
            <div className="space-y-3 animate-in fade-in">
              {leaves.length === 0 ? (
                <p className="text-center py-8 text-slate-400">No leave requests found.</p>
              ) : (
                <div className="space-y-2">
                  {leaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase text-slate-900 dark:text-slate-100">
                            {l.leaveType} Leave ({l.days} days)
                          </span>
                          <Badge
                            variant={
                              l.status === "Approved"
                                ? "success"
                                : l.status === "Rejected"
                                ? "danger"
                                : "warning"
                            }
                            size="sm"
                          >
                            {l.status}
                          </Badge>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {l.startDate} to {l.endDate} • Reason: &quot;{l.reason}&quot;
                        </p>
                      </div>
                      {l.reviewedBy && (
                        <span className="text-[10px] text-slate-400">Reviewed by {l.reviewedBy}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Payslips */}
          {activeTab === "payroll" && (
            <div className="space-y-3 animate-in fade-in">
              {payslips.length === 0 ? (
                <p className="text-center py-8 text-slate-400">
                  No finalized payslips available yet. Payslips appear once monthly payroll is finalized.
                </p>
              ) : (
                <div className="space-y-2">
                  {payslips.map((ps) => (
                    <div
                      key={ps.month}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                    >
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-slate-100">
                          Payslip for {ps.month}
                        </h5>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Gross: {organization?.currency} {Number(ps.grossSalary).toLocaleString()} • Tax: {organization?.currency} {Number(ps.taxDeduction).toLocaleString()} • Net: {organization?.currency} {Number(ps.netSalary).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Download}
                        onClick={() => generatePayslipPdf(ps, organization)}
                      >
                        Download PDF
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
