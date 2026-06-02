"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "slate"
  | "brand";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
  brand: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
