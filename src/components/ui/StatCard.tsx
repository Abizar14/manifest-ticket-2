"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type Tone =
  | "brand"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "sky"
  | "slate";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  helper?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const tones: Record<
  Tone,
  {
    border: string;
    gradient: string;
    iconBg: string;
    iconRing: string;
    iconText: string;
    valueText: string;
    glow: string;
    label: string;
  }
> = {
  brand: {
    border: "border-blue-200/80",
    gradient: "from-blue-50 via-white to-sky-100",
    iconBg: "bg-blue-100",
    iconRing: "ring-blue-200",
    iconText: "text-blue-700",
    valueText: "text-blue-900",
    glow: "bg-blue-300",
    label: "text-blue-700/80",
  },
  sky: {
    border: "border-cyan-200/80",
    gradient: "from-cyan-50 via-white to-sky-100",
    iconBg: "bg-cyan-100",
    iconRing: "ring-cyan-200",
    iconText: "text-cyan-700",
    valueText: "text-cyan-900",
    glow: "bg-cyan-300",
    label: "text-cyan-700/80",
  },
  emerald: {
    border: "border-emerald-200/80",
    gradient: "from-emerald-50 via-white to-green-100",
    iconBg: "bg-emerald-100",
    iconRing: "ring-emerald-200",
    iconText: "text-emerald-700",
    valueText: "text-emerald-900",
    glow: "bg-emerald-300",
    label: "text-emerald-700/80",
  },
  amber: {
    border: "border-amber-200/80",
    gradient: "from-amber-50 via-white to-yellow-100",
    iconBg: "bg-amber-100",
    iconRing: "ring-amber-200",
    iconText: "text-amber-700",
    valueText: "text-amber-900",
    glow: "bg-amber-300",
    label: "text-amber-700/80",
  },
  rose: {
    border: "border-rose-200/80",
    gradient: "from-rose-50 via-white to-pink-100",
    iconBg: "bg-rose-100",
    iconRing: "ring-rose-200",
    iconText: "text-rose-700",
    valueText: "text-rose-900",
    glow: "bg-rose-300",
    label: "text-rose-700/80",
  },
  violet: {
    border: "border-violet-200/80",
    gradient: "from-violet-50 via-white to-fuchsia-100",
    iconBg: "bg-violet-100",
    iconRing: "ring-violet-200",
    iconText: "text-violet-700",
    valueText: "text-violet-900",
    glow: "bg-violet-300",
    label: "text-violet-700/80",
  },
  slate: {
    border: "border-slate-200",
    gradient: "from-slate-50 via-white to-slate-100",
    iconBg: "bg-slate-100",
    iconRing: "ring-slate-200",
    iconText: "text-slate-700",
    valueText: "text-slate-900",
    glow: "bg-slate-300",
    label: "text-slate-600",
  },
};

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "brand",
  className,
}: StatCardProps) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-card backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
        t.border,
        t.gradient,
        className,
      )}
    >
      <div
        className={cn(
          "deco-blob -right-6 -top-6 h-24 w-24 opacity-50 transition-opacity duration-300 group-hover:opacity-80",
          t.glow,
        )}
      />
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wider",
              t.label,
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-3xl font-bold tracking-tight",
              t.valueText,
            )}
          >
            {value}
          </p>
          {helper && (
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset shadow-sm",
            t.iconBg,
            t.iconRing,
            t.iconText,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
