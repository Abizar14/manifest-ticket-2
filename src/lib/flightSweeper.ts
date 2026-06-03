"use client";

import { getFlights, getSession, updateFlight } from "./storage";
import { getSettings } from "./settings";
import { recordAudit } from "./audit";
import { todayDateString } from "./utils";

const LAST_RUN_KEY = "afvs.sweeper.lastRunDay";

/**
 * Sweep past-day flights still stuck in OPEN/ACTIVE and force them to CLOSED.
 * Idempotent — guarded by a per-day key so it only runs once per local day.
 * Manual statuses (DRAFT/CLOSED/CANCELLED) are never touched.
 */
export function sweepPastDayFlights(): { closed: number; skipped: boolean } {
  if (typeof window === "undefined") return { closed: 0, skipped: true };
  if (!getSettings().autoClosePastDayFlights) {
    return { closed: 0, skipped: true };
  }

  const today = todayDateString();
  const lastRun = window.localStorage.getItem(LAST_RUN_KEY);
  if (lastRun === today) return { closed: 0, skipped: true };

  const session = getSession();
  let closed = 0;
  for (const f of getFlights()) {
    if (f.departureDate >= today) continue;
    if (f.status !== "OPEN" && f.status !== "ACTIVE") continue;
    updateFlight(f.id, { status: "CLOSED" });
    recordAudit({
      flightId: f.id,
      flightNumber: f.flightNumber,
      action: "CLOSE_BOARDING",
      fromStatus: f.status,
      toStatus: "CLOSED",
      session,
      note: "Auto-close: tanggal keberangkatan sudah lewat.",
    });
    closed += 1;
  }

  window.localStorage.setItem(LAST_RUN_KEY, today);
  return { closed, skipped: false };
}
