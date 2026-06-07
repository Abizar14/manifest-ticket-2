"use client";

import * as React from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";

interface LargeTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  /**
   * "branded" (default) wraps the title in a soft gradient panel with a
   * ghost plane silhouette — gives every mobile page a consistent
   * airport-brand feel without overpowering iOS typography.
   *
   * "plain" reverts to the original flush header (no chrome).
   */
  variant?: "branded" | "plain";
}

export function LargeTitle({
  title,
  subtitle,
  eyebrow,
  trailing,
  className,
  variant = "branded",
}: LargeTitleProps) {
  if (variant === "plain") {
    return (
      <header
        className={cn(
          "flex items-end justify-between gap-3 px-1 pb-2 pt-1",
          className,
        )}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate text-[28px] font-extrabold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>
          )}
        </div>
        {trailing && <div className="shrink-0 pb-1">{trailing}</div>}
      </header>
    );
  }

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-3xl px-4 pb-4 pt-4 shadow-card ring-1 ring-hairline",
        "bg-gradient-to-br from-white via-blue-50/70 to-cyan-50/60",
        "dark:from-surface dark:via-surface-2 dark:to-surface",
        className,
      )}
    >
      {/* Soft brand blob */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-300/25 blur-2xl dark:bg-blue-500/20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl dark:bg-cyan-500/10"
      />
      {/* Ghost plane silhouette */}
      <Plane
        aria-hidden
        strokeWidth={1.2}
        className="pointer-events-none absolute -right-2 top-1 h-24 w-24 rotate-12 text-blue-300/25 dark:text-blue-400/15"
      />
      {/* Top accent line */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent dark:via-blue-300/30"
      />

      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 ring-1 ring-blue-200/70 backdrop-blur dark:bg-surface-2 dark:text-blue-300 dark:ring-hairline">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
              {eyebrow}
            </p>
          )}
          <h1 className="truncate text-[28px] font-extrabold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>
          )}
        </div>
        {trailing && <div className="shrink-0 self-end pb-0.5">{trailing}</div>}
      </div>
    </header>
  );
}
