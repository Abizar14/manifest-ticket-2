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
  /** Optional small trend indicator shown next to value */
  trend?: { dir: "up" | "down" | "flat"; text: string };
  /** Optional accent shown bottom-right (e.g. small airline logo URL or node) */
  accent?: React.ReactNode;
}

const tones: Record<
  Tone,
  {
    bg: string;
    blob1: string;
    blob2: string;
    iconBg: string;
    iconRing: string;
    sheen: string;
  }
> = {
  brand: {
    bg: "from-blue-700 via-blue-600 to-cyan-500",
    blob1: "bg-white/25",
    blob2: "bg-cyan-300/40",
    iconBg: "bg-white/15",
    iconRing: "ring-white/30",
    sheen: "from-white/0 via-white/15 to-white/0",
  },
  sky: {
    bg: "from-cyan-600 via-sky-500 to-blue-600",
    blob1: "bg-white/25",
    blob2: "bg-blue-300/40",
    iconBg: "bg-white/15",
    iconRing: "ring-white/30",
    sheen: "from-white/0 via-white/15 to-white/0",
  },
  emerald: {
    bg: "from-emerald-600 via-teal-500 to-cyan-500",
    blob1: "bg-white/25",
    blob2: "bg-cyan-300/40",
    iconBg: "bg-white/15",
    iconRing: "ring-white/30",
    sheen: "from-white/0 via-white/15 to-white/0",
  },
  amber: {
    bg: "from-amber-500 via-orange-500 to-rose-500",
    blob1: "bg-white/25",
    blob2: "bg-rose-300/40",
    iconBg: "bg-white/15",
    iconRing: "ring-white/30",
    sheen: "from-white/0 via-white/15 to-white/0",
  },
  rose: {
    bg: "from-rose-600 via-pink-500 to-fuchsia-500",
    blob1: "bg-white/25",
    blob2: "bg-fuchsia-300/40",
    iconBg: "bg-white/15",
    iconRing: "ring-white/30",
    sheen: "from-white/0 via-white/15 to-white/0",
  },
  violet: {
    bg: "from-violet-600 via-purple-500 to-fuchsia-500",
    blob1: "bg-white/25",
    blob2: "bg-fuchsia-300/40",
    iconBg: "bg-white/15",
    iconRing: "ring-white/30",
    sheen: "from-white/0 via-white/15 to-white/0",
  },
  slate: {
    bg: "from-slate-800 via-slate-700 to-blue-800",
    blob1: "bg-blue-400/30",
    blob2: "bg-cyan-300/30",
    iconBg: "bg-white/15",
    iconRing: "ring-white/25",
    sheen: "from-white/0 via-white/10 to-white/0",
  },
};

function TrendBadge({ trend }: { trend: NonNullable<StatCardProps["trend"]> }) {
  const arrow =
    trend.dir === "up" ? "↑" : trend.dir === "down" ? "↓" : "→";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/25 backdrop-blur">
      <span aria-hidden>{arrow}</span>
      {trend.text}
    </span>
  );
}

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "brand",
  className,
  trend,
  accent,
}: StatCardProps) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        "group relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br p-4 text-white shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-glow",
        t.bg,
        className,
      )}
    >
      {/* decorative blobs */}
      <div
        className={cn(
          "deco-blob -right-8 -top-10 h-32 w-32 animate-drift",
          t.blob1,
        )}
      />
      <div
        className={cn(
          "deco-blob -bottom-12 -left-8 h-32 w-32 animate-drift",
          t.blob2,
        )}
        style={{ animationDelay: "1.2s" }}
      />

      {/* diagonal sheen */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-tr opacity-60",
          t.sheen,
        )}
      />

      {/* plane silhouette watermark */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 rotate-12 fill-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
      >
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" />
      </svg>

      <div className="relative z-[1] flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
            {label}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight drop-shadow-sm">
              {value}
            </p>
            {trend && <TrendBadge trend={trend} />}
          </div>
          {helper && (
            <p className="mt-1 text-xs text-white/75">{helper}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-inner ring-1 backdrop-blur",
              t.iconBg,
              t.iconRing,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* accent (e.g. airline logo) bottom-right */}
      {accent && (
        <div className="absolute bottom-2 right-2 z-[1] opacity-90">
          {accent}
        </div>
      )}

      {/* shimmer bar on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"
      />
    </div>
  );
}
