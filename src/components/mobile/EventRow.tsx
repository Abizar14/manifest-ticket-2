"use client";

import * as React from "react";
import {
  CheckCircle2,
  CopyCheck,
  AlertTriangle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanEvent, ScanResultStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface EventRowProps {
  event: ScanEvent;
  className?: string;
}

interface ResultStyle {
  icon: LucideIcon;
  iconBg: string;
  badge: string;
  label: string;
}

const STYLES: Record<ScanResultStatus, ResultStyle> = {
  VALID_FLIGHT: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Valid",
  },
  DUPLICATE_SCAN: {
    icon: CopyCheck,
    iconBg: "bg-amber-100 text-amber-700",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Duplicate",
  },
  FLIGHT_NOT_TODAY: {
    icon: AlertTriangle,
    iconBg: "bg-rose-100 text-rose-700",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "Bukan hari ini",
  },
  FLIGHT_NOT_ACTIVE: {
    icon: AlertTriangle,
    iconBg: "bg-rose-100 text-rose-700",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "Tidak aktif",
  },
  UNKNOWN_FLIGHT: {
    icon: XCircle,
    iconBg: "bg-rose-100 text-rose-700",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "Unknown",
  },
  INVALID_BARCODE: {
    icon: XCircle,
    iconBg: "bg-rose-100 text-rose-700",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "Invalid",
  },
  KTP_MISMATCH: {
    icon: XCircle,
    iconBg: "bg-rose-100 text-rose-700",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "KTP tidak cocok",
  },
};

/**
 * iOS-style scan event row. Sits inside <ListSection>.
 */
export function EventRow({ event, className }: EventRowProps) {
  const s = STYLES[event.resultStatus];
  const Icon = s.icon;
  const passenger = event.parsedPassengerName ?? null;
  const detailParts: string[] = [];
  if (event.parsedSeatNumber) detailParts.push(`seat ${event.parsedSeatNumber}`);
  if (event.parsedPnr) detailParts.push(`PNR ${event.parsedPnr}`);

  return (
    <div className={cn("flex items-start gap-3 px-3.5 py-3", className)}>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          s.iconBg,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[14px] font-bold text-ink">
            {event.parsedFlightNumber ?? "—"}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
              s.badge,
            )}
          >
            {s.label}
          </span>
        </div>
        {passenger && (
          <p className="mt-0.5 truncate text-[12.5px] font-medium text-ink/85">
            {passenger}
          </p>
        )}
        {detailParts.length > 0 && (
          <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
            {detailParts.join(" · ")}
          </p>
        )}
        {event.message && (
          <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-muted">
            {event.message}
          </p>
        )}
        <p className="mt-1 text-[10.5px] text-ink-subtle">
          {formatDateTime(event.scannedAt)} · {event.scannedBy}
        </p>
      </div>
    </div>
  );
}
