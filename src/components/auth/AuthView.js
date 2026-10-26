"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/constants";
import { Button } from "../common/UI";
import { Building2, Shield, User, Lock, Mail, UserPlus, LogIn, AlertCircle } from "lucide-react";

export function AuthView() {
  const { login, register, authError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "attarib352@gmail.com",
    password: "bilal145@@",
    role: ROLES.EMPLOYEE,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await register(formData);
      } else {
        await login(formData.email, formData.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminQuickFill = () => {
    setIsRegister(false);
    setFormData({
      ...formData,
      email: "attarib352@gmail.com",
      password: "bilal145@@",
    });
  };

  const handleQuickDemoLogin = async (demoEmail, demoRole) => {
    setLoading(true);
    setError("");
    try {
      await login(demoEmail, "password123");
    } catch (err) {
      try {
        await register({
          name: demoEmail.split("@")[0],
          email: demoEmail,
          password: "password123",
          role: demoRole,
        });
      } catch (regErr) {
        setError(regErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-600 text-white shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            HCM Lite
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            AI-Assisted Human Capital Management System
          </p>
        </div>

        {(error || authError) && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200 dark:border-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ahmed Khan"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Requested Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value={ROLES.EMPLOYEE}>Employee</option>
                <option value={ROLES.HR}>HR Specialist</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                * Note: Admin accounts are protected and cannot be self-registered.
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={loading}
            icon={isRegister ? UserPlus : LogIn}
          >
            {isRegister ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          {isRegister ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Register
              </button>
            </span>
          )}
        </div>

        {/* Quick Demo Credentials Panel for Hackathon Evaluator */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
            Role Fast-Login (Evaluation)
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <button
              type="button"
              onClick={handleAdminQuickFill}
              className="p-2 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-[11px] font-semibold hover:border-purple-400 transition-colors"
            >
              Admin Master
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("hr@company.com", ROLES.HR)}
              className="p-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[11px] font-semibold hover:border-blue-400 transition-colors"
            >
              HR Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("employee@company.com", ROLES.EMPLOYEE)}
              className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:border-emerald-400 transition-colors"
            >
              Employee Demo
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400">
            Admin: <span className="font-mono text-slate-600 dark:text-slate-300">attarib352@gmail.com</span> / <span className="font-mono text-slate-600 dark:text-slate-300">bilal145@@</span>
          </p>
        </div>
      </div>
    </div>
  );
}
