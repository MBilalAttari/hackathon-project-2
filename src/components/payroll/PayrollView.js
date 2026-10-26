"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES, PAYROLL_STATUS } from "@/lib/constants";
import { Card, Button, Badge, EmptyState, SkeletonLoader } from "../common/UI";
import { generatePayslipPdf } from "@/lib/payroll/payslipPdf";
import {
  Banknote,
  Lock,
  Download,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileCheck,
} from "lucide-react";

export function PayrollView() {
  const { user, role, organization, fetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollRun, setPayrollRun] = useState(null);
  const [allRuns, setAllRuns] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      if (role === ROLES.EMPLOYEE) {
        // Employee gets finalized runs where they have a payslip
        const res = await fetchWithAuth("/api/payroll");
        if (res.ok) {
          const list = await res.json();
          setAllRuns(list);
        }
      } else {
        // HR / Admin gets current month's run and run history
        const [monthRes, allRes] = await Promise.all([
          fetchWithAuth(`/api/payroll?month=${selectedMonth}`),
          fetchWithAuth("/api/payroll"),
        ]);

        if (monthRes.ok) {
          setPayrollRun(await monthRes.json());
        } else {
          setPayrollRun(null);
        }

        if (allRes.ok) {
          setAllRuns(await allRes.json());
        }
      }
    } catch (err) {
      console.error("Failed to load payroll:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth, role, fetchWithAuth]);

  // Generate / Compute Payroll Draft
  const handleGeneratePayroll = async () => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate payroll");

      await loadPayroll();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize & Lock Payroll Run (Admin only)
  const handleFinalizePayroll = async () => {
    if (!confirm(`Are you sure you want to finalize and lock the payroll for ${selectedMonth}? Once locked, records are immutable and payslips will be published to employees.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetchWithAuth("/api/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize payroll");

      await loadPayroll();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isFinalized = payrollRun?.status === PAYROLL_STATUS.FINALIZED;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-blue-600" />
            <span>Monthly Payroll & Payslips</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Progressive tax calculation, attendance deductions, immutable finalized runs & PDF payslips
          </p>
        </div>

        {role !== ROLES.EMPLOYEE && (
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />

            {!isFinalized && (
              <Button
                variant="primary"
                size="sm"
                icon={Calculator}
                loading={actionLoading}
                onClick={handleGeneratePayroll}
              >
                {payrollRun ? "Recalculate Run" : "Generate Run"}
              </Button>
            )}

            {payrollRun && !isFinalized && role === ROLES.ADMIN && (
              <Button
                variant="danger"
                size="sm"
                icon={Lock}
                loading={actionLoading}
                onClick={handleFinalizePayroll}
              >
                Finalize & Lock
              </Button>
            )}
          </div>
        )}
      </div>

      {/* EMPLOYEE VIEW: Only Finalized Payslips */}
      {role === ROLES.EMPLOYEE ? (
        <Card title="My Published Payslips" subtitle="Download and inspect your monthly salary slips">
          {allRuns.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No Payslips Published Yet"
              description="Monthly payslips will appear here once finalized by the finance & HR administration."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allRuns.map((item) => (
                <div
                  key={item.month}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Salary Slip for {item.month}
                      </h4>
                      <Badge variant="success" size="sm">
                        Finalized
                      </Badge>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Gross: {organization?.currency} {Number(item.record?.grossSalary || 0).toLocaleString()} • Tax: {organization?.currency} {Number(item.record?.taxDeduction || 0).toLocaleString()} • Net: <strong className="text-blue-600 dark:text-blue-400 font-bold">{organization?.currency} {Number(item.record?.netSalary || 0).toLocaleString()}</strong>
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    icon={Download}
                    onClick={() => generatePayslipPdf(item.record, organization)}
                  >
                    Download PDF Payslip
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        /* HR & ADMIN VIEW */
        <div className="space-y-6">
          {/* Summary KPIs of Selected Month */}
          {payrollRun ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Gross Payout
                </span>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {organization?.currency} {Number(payrollRun.totalGross || 0).toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">{payrollRun.employeeCount} Active Staff</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Progressive Tax Deducted
                </span>
                <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {organization?.currency} {Number(payrollRun.totalTax || 0).toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">Federal / standard tax brackets</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Deductions
                </span>
                <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {organization?.currency} {Number(payrollRun.totalDeductions || 0).toLocaleString()}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">Taxes + Unpaid / Absent leaves</p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Net Salary Payable
                </span>
                <h4 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {organization?.currency} {Number(payrollRun.totalNet || 0).toLocaleString()}
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant={isFinalized ? "success" : "warning"} size="sm">
                    {payrollRun.status}
                  </Badge>
                  {isFinalized && <Lock className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Calculator}
              title={`No Payroll Run Generated for ${selectedMonth}`}
              description="Click the button below to compute salaries, attendance deductions, and progressive taxes for all active staff."
              action={
                <Button
                  variant="primary"
                  size="md"
                  icon={Calculator}
                  loading={actionLoading}
                  onClick={handleGeneratePayroll}
                >
                  Generate Payroll Run for {selectedMonth}
                </Button>
              }
            />
          )}

          {/* Payroll Run Table */}
          {payrollRun && (
            <Card
              title={`Salary Register for ${payrollRun.month}`}
              subtitle={
                isFinalized
                  ? `Finalized and locked on ${payrollRun.finalizedAt?.slice(0, 10)} by ${payrollRun.finalizedBy}`
                  : "Draft mode - Review and verify before finalizing"
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Basic</th>
                      <th className="py-3 px-4">Allowances</th>
                      <th className="py-3 px-4">Gross</th>
                      <th className="py-3 px-4">Absent / Unpaid</th>
                      <th className="py-3 px-4">Income Tax</th>
                      <th className="py-3 px-4">Net Salary</th>
                      <th className="py-3 px-4 text-right">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payrollRun.records?.map((rec) => (
                      <tr key={rec.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {rec.employeeName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {rec.department} • {rec.employeeCode}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {Number(rec.baseSalary).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {Number(
                            (rec.houseRentAllowance || 0) +
                              (rec.medicalAllowance || 0) +
                              (rec.otherAllowance || 0)
                          ).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {Number(rec.grossSalary).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-rose-600 font-medium">
                          {rec.unpaidDeduction > 0 ? (
                            <span>-{Number(rec.unpaidDeduction).toLocaleString()} ({rec.absentDays + rec.unpaidLeaveDays}d)</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-amber-600 font-medium">
                          -{Number(rec.taxDeduction).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                          {organization?.currency} {Number(rec.netSalary).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Download}
                            onClick={() => generatePayslipPdf(rec, organization)}
                          >
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
