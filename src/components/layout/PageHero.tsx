"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type HeroTone =
  | "blue"
  | "cyan"
  | "violet"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

interface HeroToneConfig {
  bg: string; // main gradient
  blob1: string;
  blob2: string;
  ghostIcon: string; // tint of background ghost icon
  badgeBg: string;
}

const TONES: Record<HeroTone, HeroToneConfig> = {
  blue: {
    bg: "from-blue-600 via-blue-500 to-cyan-500",
    blob1: "bg-white/30",
    blob2: "bg-cyan-300/40",
    ghostIcon: "text-white/10",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
  cyan: {
    bg: "from-cyan-600 via-sky-500 to-blue-500",
    blob1: "bg-white/30",
    blob2: "bg-blue-300/40",
    ghostIcon: "text-white/10",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
  violet: {
    bg: "from-violet-600 via-purple-500 to-fuchsia-500",
    blob1: "bg-white/30",
    blob2: "bg-fuchsia-300/40",
    ghostIcon: "text-white/10",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
  indigo: {
    bg: "from-indigo-600 via-blue-600 to-violet-600",
    blob1: "bg-white/25",
    blob2: "bg-violet-300/40",
    ghostIcon: "text-white/10",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
  emerald: {
    bg: "from-emerald-600 via-teal-500 to-cyan-500",
    blob1: "bg-white/30",
    blob2: "bg-cyan-300/40",
    ghostIcon: "text-white/10",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
  amber: {
    bg: "from-amber-500 via-orange-500 to-rose-500",
    blob1: "bg-white/30",
    blob2: "bg-rose-300/40",
    ghostIcon: "text-white/10",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
  rose: {
    bg: "from-rose-600 via-pink-500 to-fuchsia-500",
    blob1: "bg-white/30",
    blob2: "bg-fuchsia-300/40",
    ghostIcon: "text-white/10",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
  slate: {
    bg: "from-slate-800 via-slate-700 to-blue-800",
    blob1: "bg-blue-400/30",
    blob2: "bg-cyan-300/30",
    ghostIcon: "text-white/8",
    badgeBg: "bg-white/15 ring-white/25 text-white/95",
  },
};

export interface PageHeroProps {
  tone?: HeroTone;
  eyebrow: string;
  eyebrowIcon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  ghostIcon?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function PageHero({
  tone = "blue",
  eyebrow,
  eyebrowIcon,
  title,
  description,
  ghostIcon,
  actions,
  meta,
  className,
}: PageHeroProps) {
  const t = TONES[tone];
  return (
    <section
      className={cn(
        "relative animate-fade-up overflow-hidden rounded-2xl border border-white/30 px-4 py-4 text-white shadow-lift sm:rounded-3xl sm:px-7 sm:py-6",
        "bg-gradient-to-br",
        t.bg,
        className,
      )}
    >
      <div className={cn("deco-blob -right-10 -top-10 h-44 w-44", t.blob1)} />
      <div className={cn("deco-blob -bottom-12 -left-12 h-56 w-56", t.blob2)} />
      {/* aviation ornament — subtle plane silhouette + concentric rings */}
      <div aria-hidden className="aviation-ornament" />
      {/* subtle diagonal sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_70%)]"
      />
      {ghostIcon && (
        <div
          className={cn(
            "absolute -right-6 -top-6 h-32 w-32 rotate-12",
            t.ghostIcon,
          )}
        >
          {ghostIcon}
        </div>
      )}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 backdrop-blur",
              t.badgeBg,
            )}
          >
            {eyebrowIcon}
            {eyebrow}
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight drop-shadow-sm sm:mt-3 sm:text-[28px]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-2xl text-[13px] text-white/85 sm:text-sm">
              {description}
            </p>
          )}
          {meta && (
            <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

export function HeroChip({
  icon,
  label,
  value,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white/95 ring-1 ring-white/25 backdrop-blur",
        className,
      )}
    >
      {icon}
      <span className="text-white/70">{label}</span>
      {value !== undefined && (
        <span className="font-bold text-white">{value}</span>
      )}
    </span>
  );
}
