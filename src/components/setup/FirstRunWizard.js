"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_ORG_SETTINGS } from "@/lib/constants";
import { Card, Button } from "../common/UI";
import { Building2, Clock, CalendarDays, CheckCircle2, Sparkles, Database } from "lucide-react";

export function FirstRunWizard({ onCompleted }) {
  const { completeSetup, fetchWithAuth, refreshOrg } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [formData, setFormData] = useState({
    companyName: DEFAULT_ORG_SETTINGS.companyName,
    companyCode: DEFAULT_ORG_SETTINGS.companyCode,
    currency: DEFAULT_ORG_SETTINGS.currency,
    workStartTime: DEFAULT_ORG_SETTINGS.workStartTime,
    workEndTime: DEFAULT_ORG_SETTINGS.workEndTime,
    gracePeriodMinutes: DEFAULT_ORG_SETTINGS.gracePeriodMinutes,
    halfDayWorkHours: DEFAULT_ORG_SETTINGS.halfDayWorkHours,
    standardDailyHours: DEFAULT_ORG_SETTINGS.standardDailyHours,
    annualQuota: DEFAULT_ORG_SETTINGS.defaultLeaveQuotas.annual,
    casualQuota: DEFAULT_ORG_SETTINGS.defaultLeaveQuotas.casual,
    sickQuota: DEFAULT_ORG_SETTINGS.defaultLeaveQuotas.sick,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFinish = async (shouldSeed = false) => {
    setLoading(true);
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

      if (shouldSeed) {
        setSeeding(true);
        await fetchWithAuth("/api/seed", { method: "POST" });
      }

      await refreshOrg();
      if (onCompleted) onCompleted();
    } catch (err) {
      alert("Setup error: " + err.message);
    } finally {
      setLoading(false);
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">First-Run Organization Setup</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Configure your company policies, work hours, leave quotas & tax slabs.
              </p>
            </div>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20 text-xs">
            {[
              { num: 1, title: "Company Profile" },
              { num: 2, title: "Attendance Rules" },
              { num: 3, title: "Leaves & Taxes" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-2 ${
                  step === s.num
                    ? "font-bold text-white"
                    : step > s.num
                    ? "text-blue-200"
                    : "text-blue-300/60"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === s.num
                      ? "bg-white text-blue-600 font-bold"
                      : step > s.num
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </span>
                <span>{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Company Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Code / Prefix
                  </label>
                  <input
                    type="text"
                    name="companyCode"
                    value={formData.companyCode}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="PKR">PKR (Pakistani Rupee)</option>
                    <option value="USD">USD ($)</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Working Hours & Attendance Parameters</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    name="workStartTime"
                    value={formData.workStartTime}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    name="workEndTime"
                    value={formData.workEndTime}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Arrivals after {formData.workStartTime} + {formData.gracePeriodMinutes}m will be marked &quot;Late&quot;.
                  </p>
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
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>Annual Leave Quotas & Progressive Tax Slabs</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Annual Leaves (Days)
                  </label>
                  <input
                    type="number"
                    name="annualQuota"
                    value={formData.annualQuota}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Casual Leaves (Days)
                  </label>
                  <input
                    type="number"
                    name="casualQuota"
                    value={formData.casualQuota}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sick Leaves (Days)
                  </label>
                  <input
                    type="number"
                    name="sickQuota"
                    value={formData.sickQuota}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Tax Slabs Information Preview */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Standard Progressive Tax Slabs Enabled:
                </p>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] list-disc list-inside">
                  <li>Up to PKR 600,000 / year: 0% Tax</li>
                  <li>PKR 600,001 - 1,200,000: 2.5% of excess</li>
                  <li>PKR 1,200,001 - 2,400,000: PKR 15,000 + 12.5% of excess</li>
                  <li>PKR 2,400,001 - 3,600,000: PKR 165,000 + 22.5% of excess</li>
                  <li>Above PKR 3,600,000: PKR 435,000 + 35% of excess</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                Back
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              {step < 3 ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    icon={Database}
                    loading={seeding}
                    disabled={loading}
                    onClick={() => handleFinish(true)}
                    title="Configures setup AND seeds 5 active employees + attendance for immediate 5-minute hackathon evaluation"
                  >
                    Seed Demo Dataset & Launch
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={CheckCircle2}
                    loading={loading && !seeding}
                    disabled={seeding}
                    onClick={() => handleFinish(false)}
                  >
                    Launch with Clean Empty DB
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
