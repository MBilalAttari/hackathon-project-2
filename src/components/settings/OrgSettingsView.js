"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, Button, Badge } from "../common/UI";
import { Settings, Building2, Clock, CalendarDays, ShieldCheck, Database, CheckCircle2 } from "lucide-react";

export function OrgSettingsView() {
  const { organization, completeSetup, fetchWithAuth, refreshOrg } = useAuth();
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [formData, setFormData] = useState({
    companyName: organization?.companyName || "HCM Lite Technologies",
    companyCode: organization?.companyCode || "HCML",
    currency: organization?.currency || "PKR",
    workStartTime: organization?.workStartTime || "09:00",
    workEndTime: organization?.workEndTime || "18:00",
    gracePeriodMinutes: organization?.gracePeriodMinutes || 15,
    halfDayWorkHours: organization?.halfDayWorkHours || 4.5,
    standardDailyHours: organization?.standardDailyHours || 8.0,
    annualQuota: organization?.defaultLeaveQuotas?.annual || 14,
    casualQuota: organization?.defaultLeaveQuotas?.casual || 10,
    sickQuota: organization?.defaultLeaveQuotas?.sick || 8,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);
    try {
      const payload = {
        companyName: formData.companyName,
        companyCode: formData.companyCode,
        currency: formData.currency,
        workStartTime: formData.workStartTime,
        workEndTime: formData.workEndTime,
        gracePeriodMinutes: Number(formData.gracePeriodMinutes),
        halfDayWorkHours: Number(formData.halfDayWorkHours),
        standardDailyHours: Number(formData.standardDailyHours),
        defaultLeaveQuotas: {
          annual: Number(formData.annualQuota),
          casual: Number(formData.casualQuota),
          sick: Number(formData.sickQuota),
          unpaid: 0,
        },
      };

      await completeSetup(payload);
      await refreshOrg();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Error saving settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm("Seed starter evaluation dataset? This will add 5 diverse active employees, attendance records, and announcements for testing.")) return;
    setSeeding(true);
    try {
      const res = await fetchWithAuth("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seed failed");
      alert(`Successfully seeded ${data.count} employees with attendance logs!`);
      await refreshOrg();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Organization Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administer company parameters, attendance cutoffs, leave policies and evaluation tools
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={Database}
          loading={seeding}
          onClick={handleSeedData}
          title="Seed sample data for hackathon evaluation"
        >
          Seed Demo Dataset
        </Button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-4 h-4" />
          <span>Organization settings saved and synchronized successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile */}
        <Card title="Company Profile" subtitle="General corporate information and currency">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Code
              </label>
              <input
                type="text"
                name="companyCode"
                value={formData.companyCode}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Base Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="PKR">PKR (Pakistani Rupee)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Working Hours & Shift Rules */}
        <Card title="Shift Hours & Grace Period" subtitle="Parameters governing daily attendance status calculations">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Work Start Time
              </label>
              <input
                type="time"
                name="workStartTime"
                value={formData.workStartTime}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Work End Time
              </label>
              <input
                type="time"
                name="workEndTime"
                value={formData.workEndTime}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Grace Period (Minutes)
              </label>
              <input
                type="number"
                name="gracePeriodMinutes"
                value={formData.gracePeriodMinutes}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Half-Day Minimum Hours
              </label>
              <input
                type="number"
                step="0.5"
                name="halfDayWorkHours"
                value={formData.halfDayWorkHours}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Standard Daily Hours
              </label>
              <input
                type="number"
                step="0.5"
                name="standardDailyHours"
                value={formData.standardDailyHours}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </Card>

        {/* Annual Leave Quotas */}
        <Card title="Default Leave Quotas" subtitle="Annual entitlement credited to employees">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Annual Leave (Days)
              </label>
              <input
                type="number"
                name="annualQuota"
                value={formData.annualQuota}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Casual Leave (Days)
              </label>
              <input
                type="number"
                name="casualQuota"
                value={formData.casualQuota}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sick Leave (Days)
              </label>
              <input
                type="number"
                name="sickQuota"
                value={formData.sickQuota}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" size="lg" type="submit" loading={loading}>
            Save All Configurations
          </Button>
        </div>
      </form>
    </div>
  );
}
