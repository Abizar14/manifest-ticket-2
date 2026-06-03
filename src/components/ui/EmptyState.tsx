"use client";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "info" | "warning" | "success";
  className?: string;
}

const TONES: Record<
  NonNullable<EmptyStateProps["tone"]>,
  { iconBg: string; iconRing: string; iconText: string; blob: string }
> = {
  neutral: {
    iconBg: "bg-slate-100",
    iconRing: "ring-slate-200",
    iconText: "text-slate-500",
    blob: "bg-slate-200",
  },
  info: {
    iconBg: "bg-blue-100",
    iconRing: "ring-blue-200",
    iconText: "text-blue-600",
    blob: "bg-blue-200",
  },
  warning: {
    iconBg: "bg-amber-100",
    iconRing: "ring-amber-200",
    iconText: "text-amber-600",
    blob: "bg-amber-200",
  },
  success: {
    iconBg: "bg-emerald-100",
    iconRing: "ring-emerald-200",
    iconText: "text-emerald-600",
    blob: "bg-emerald-200",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden px-6 py-12 text-center animate-fade-up",
        className,
      )}
    >
      <div
        className={cn(
          "deco-blob left-1/2 top-2 h-32 w-32 -translate-x-1/2 opacity-30",
          t.blob,
        )}
      />
      <div className="relative z-[1] mx-auto flex max-w-md flex-col items-center">
        {icon && (
          <div
            className={cn(
              "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 shadow-sm",
              t.iconBg,
              t.iconRing,
              t.iconText,
            )}
          >
            {icon}
          </div>
        )}
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
