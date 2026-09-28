"use client";

import { planTestFlight, testFlightsEnabled } from "./dummyFlight";
import { addFlight, getFlights, updateFlight } from "./storage";
import type { Flight } from "./types";
import { uid } from "./utils";

export type ApplyTestFlightResult =
  | { ok: true; flight: Flight; created: boolean }
  | { ok: false; reason: "disabled" | "unrecognized" }
  | { ok: false; reason: "conflict"; flight: Flight };

/**
 * Siapkan PENERBANGAN UJI untuk barcode ini (buat baru, atau buka lagi flight
 * uji hari ini yang bernomor sama) sehingga boarding pass aslinya di-scan
 * VALID. Ditolak bila fitur mati, barcode tak dikenali, atau nomor flight itu
 * TERJADWAL (riil) hari ini — flight riil tidak boleh dijadikan uji.
 */
export function applyTestFlightForBarcode(raw: string): ApplyTestFlightResult {
  if (!testFlightsEnabled()) return { ok: false, reason: "disabled" };
  const plan = planTestFlight(raw, getFlights(), new Date(), uid("flt"));
  if (!plan) return { ok: false, reason: "unrecognized" };
  if (plan.kind === "conflict") {
    return { ok: false, reason: "conflict", flight: plan.flight };
  }
  if (plan.kind === "create") {
    addFlight(plan.flight);
    return { ok: true, flight: plan.flight, created: true };
  }
  if (Object.keys(plan.patch).length > 0) {
    updateFlight(plan.flight.id, plan.patch);
  }
  return { ok: true, flight: plan.flight, created: false };
}
