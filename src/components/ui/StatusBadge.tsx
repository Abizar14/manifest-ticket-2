"use client";

import { FlightStatus, ScanResultStatus } from "@/lib/types";
import { Badge } from "./Badge";

type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "slate"
  | "brand";

export function FlightStatusBadge({ status }: { status: FlightStatus }) {
  const map: Record<
    FlightStatus,
    { tone: BadgeTone; label: string; dot: string }
  > = {
    DRAFT: { tone: "slate", label: "Draft", dot: "bg-slate-400" },
    OPEN: { tone: "info", label: "Open", dot: "bg-cyan-500" },
    ACTIVE: { tone: "success", label: "Active", dot: "bg-emerald-500 animate-pulse" },
    CLOSED: { tone: "neutral", label: "Closed", dot: "bg-slate-400" },
    CANCELLED: { tone: "danger", label: "Cancelled", dot: "bg-rose-500" },
  };
  const v = map[status];
  return (
    <Badge tone={v.tone}>
      <span className={`mr-1 h-1.5 w-1.5 rounded-full ${v.dot}`} />
      {v.label}
    </Badge>
  );
}

export function ScanStatusBadge({ status }: { status: ScanResultStatus }) {
  const map: Record<
    ScanResultStatus,
    { tone: BadgeTone; label: string; dot: string }
  > = {
    VALID_FLIGHT: { tone: "success", label: "Valid", dot: "bg-emerald-500" },
    DUPLICATE_SCAN: { tone: "warning", label: "Duplicate", dot: "bg-amber-500" },
    FLIGHT_NOT_TODAY: { tone: "danger", label: "Not Today", dot: "bg-rose-500" },
    FLIGHT_NOT_ACTIVE: { tone: "danger", label: "Not Active", dot: "bg-rose-500" },
    UNKNOWN_FLIGHT: { tone: "danger", label: "Unknown Flight", dot: "bg-rose-500" },
    INVALID_BARCODE: { tone: "danger", label: "Invalid Barcode", dot: "bg-rose-500" },
  };
  const v = map[status];
  return (
    <Badge tone={v.tone}>
      <span className={`mr-1 h-1.5 w-1.5 rounded-full ${v.dot}`} />
      {v.label}
    </Badge>
  );
}
