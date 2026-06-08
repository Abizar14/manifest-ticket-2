"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { FlightStatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { Flight, FlightStatus } from "@/lib/types";

interface FlightRowProps {
  flight: Flight;
  effectiveStatus?: FlightStatus;
  effectiveAuto?: boolean;
  progress?: {
    boarded: number;
    expected: number | null;
    percent: number | null;
    tone: "neutral" | "info" | "warning" | "success" | "danger";
  };
  href?: string;
  className?: string;
}

const PROGRESS_BAR: Record<
  "neutral" | "info" | "warning" | "success" | "danger",
  string
> = {
  neutral: "bg-slate-400",
  info: "bg-blue-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
};

/**
 * iOS-style flight row, designed to live inside a <ListSection>.
 * - Leading airline logo (md)
 * - Two-line content: flight# + route, time-meta below
 * - Trailing: status badge + chevron
 * - Inline mini progress bar
 */
export function FlightRow({
  flight,
  effectiveStatus,
  effectiveAuto,
  progress,
  href,
  className,
}: FlightRowProps) {
  const target = href ?? `/flights/${flight.id}`;
  const status = effectiveStatus ?? flight.status;

  return (
    <Link
      href={target}
      className={cn(
        "flex items-center gap-3 px-3.5 py-3 transition active:bg-surface-2",
        className,
      )}
    >
      <AirlineLogo code={flight.airlineCode} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-bold text-ink">
            {flight.flightNumber}
          </span>
          <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink-muted">
            {flight.departureTime}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <span className="font-semibold text-ink/85">
            {flight.originAirport}
          </span>
          <span className="text-ink-subtle">→</span>
          <span className="font-semibold text-ink/85">
            {flight.destinationAirport}
          </span>
          <span className="text-ink-subtle">·</span>
          <span className="rounded-md bg-blue-50 px-1.5 py-px text-[11px] font-bold text-blue-700 dark:bg-sky-500/15 dark:text-sky-300">
            {flight.gateOrCheckpoint}
          </span>
        </div>
        {progress && progress.expected !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline/70">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  PROGRESS_BAR[progress.tone],
                )}
                style={{ width: `${progress.percent ?? 0}%` }}
              />
            </div>
            <span className="text-[10.5px] font-semibold tabular-nums text-ink-muted">
              {progress.boarded}/{progress.expected}
            </span>
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1.5">
          <FlightStatusBadge status={status} />
          {effectiveAuto && (
            <span className="rounded-full bg-surface-2 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-ink-subtle ring-1 ring-hairline">
              auto
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
    </Link>
  );
}
