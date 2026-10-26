"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function Card({ children, className = "", title, subtitle, action }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs hover:shadow-md transition-all p-5 sm:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80 gap-2">
          <div>
            {title && (
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  trend = "neutral",
  color = "blue",
  subtitle,
}) {
  const colorMap = {
    blue: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60",
      accent: "from-blue-500 to-indigo-600",
    },
    green: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60",
      accent: "from-emerald-500 to-teal-600",
    },
    amber: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60",
      accent: "from-amber-500 to-orange-600",
    },
    purple: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/60",
      accent: "from-purple-500 to-pink-600",
    },
    red: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60",
      accent: "from-rose-500 to-red-600",
    },
  };

  const selected = colorMap[color] || colorMap.blue;

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
      {/* Top subtle gradient line on hover */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${selected.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <h4 className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1.5 tracking-tight">
            {value}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${selected.bg} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {change && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center text-xs">
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "down"
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-500"
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}

export function Badge({ children, variant = "default", size = "md", withDot = true }) {
  const variants = {
    default: {
      wrap: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400",
    },
    success: {
      wrap: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80",
      dot: "bg-emerald-500 animate-pulse",
    },
    warning: {
      wrap: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80",
      dot: "bg-amber-500",
    },
    danger: {
      wrap: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80",
      dot: "bg-rose-500",
    },
    primary: {
      wrap: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80",
      dot: "bg-blue-500",
    },
    purple: {
      wrap: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80",
      dot: "bg-purple-500",
    },
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  };

  const config = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-2xs ${config.wrap} ${sizes[size]}`}
    >
      {withDot && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />}
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  className = "",
  onClick,
  type = "button",
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs focus:ring-2 focus:ring-blue-500/20",
    secondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700",
    outline:
      "border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
    ghost:
      "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2 text-xs font-semibold rounded-xl gap-2",
    lg: "px-5 py-2.5 text-sm font-bold rounded-xl gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-semibold transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = "max-w-xl" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-14 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/40 dark:bg-slate-900/30">
      {Icon && (
        <div className="inline-flex p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-3 shadow-xs">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export function SkeletonLoader({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full"
        />
      ))}
    </div>
  );
}
