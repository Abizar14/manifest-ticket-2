"use client";

/**
 * Tarik jadwal KEBERANGKATAN dari FIDS bandara lalu merge ke localStorage
 * sebagai tipe `Flight`, supaya validasi boarding pass (scanService) mengecek
 * jadwal nyata. Pola merge identik dengan api/flightSync.ts: cocok by
 * flightNumber + tanggal, id lokal dipertahankan agar referensi tak putus.
 *
 * Kedatangan TIDAK ikut di-sync (model Flight berorientasi keberangkatan) —
 * hanya tampil di papan FIDS.
 */

import { getFlights, saveFlights } from "../storage";
import type { Flight, FlightStatus } from "../types";
import { fetchKeberangkatan } from "./client";
import { HOME_IATA, JadwalKeberangkatan, expectedPaxFor } from "./types";

/**
 * remark FIDS → FlightStatus (mode pos pendataan / "hybrid").
 *
 *  - Cancelled/Batal           → CANCELLED (final)
 *  - Departured/Closed/Tutup   → CLOSED (pesawat sudah berangkat / gate tutup)
 *  - selain itu (Check In Open, Estimate, Boarding, Delay, Scheduled, …)
 *    → OPEN, supaya boarding pass bisa di-scan di pos pemeriksaan SELAMA flight
 *      masih hidup di papan FIDS. Penutupan mengikuti FIDS ("Departured"),
 *      dengan pengaman waktu STD+closeAfter di getEffectiveFlightStatus bila
 *      FIDS belum sempat melapor.
 */
function mapRemarkStatus(remark: string | null): FlightStatus {
  const s = (remark ?? "").toLowerCase();
  if (s.includes("cancel") || s.includes("batal")) return "CANCELLED";
  if (
    s.includes("depart") ||
    s.includes("berangkat") ||
    s.includes("closed") ||
    s.includes("tutup")
  )
    return "CLOSED";
  return "OPEN";
}

/**
 * Gabungkan status lokal dengan status hasil pemetaan FIDS saat merge.
 *
 * Aturan (mendahulukan keselamatan & menghormati keputusan manual supervisor):
 *  - CANCELLED lokal itu final — tak bisa dibuka lagi oleh FIDS.
 *  - FIDS terminal (CANCELLED / CLOSED=Departured) SELALU menutup — inilah inti
 *    "tutup ikut FIDS": flight yang sudah OPEN pun ikut CLOSED saat berangkat.
 *  - CLOSED manual oleh supervisor tetap tertutup (FIDS aktif tak membukanya).
 *  - ACTIVE (final call manual) dipertahankan.
 *  - selain itu (DRAFT/OPEN + FIDS aktif) → OPEN.
 */
function nextStatus(
  existing: FlightStatus,
  incoming: FlightStatus,
): FlightStatus {
  if (existing === "CANCELLED") return "CANCELLED";
  if (incoming === "CANCELLED") return "CANCELLED";
  if (incoming === "CLOSED") return "CLOSED";
  if (existing === "CLOSED") return "CLOSED";
  if (existing === "ACTIVE") return "ACTIVE";
  return "OPEN";
}

export function keberangkatanToFlight(j: JadwalKeberangkatan): Flight {
  const now = new Date().toISOString();
  const checkpoint =
    j.gate || (j.counter != null ? `Konter ${j.counter}` : "—");
  return {
    id: j.id, // "fids-kb-<id>"
    flightNumber: j.flightNumber,
    airlineCode: j.airlineCode,
    originAirport: HOME_IATA,
    destinationAirport: j.destinationIata,
    departureDate: j.tanggal,
    departureTime: j.jam,
    gateOrCheckpoint: checkpoint,
    status: mapRemarkStatus(j.remark),
    expectedPax: expectedPaxFor(j.capacity, j.aircraftType),
    createdAt: now,
    updatedAt: now,
  };
}

function keyOf(f: Flight) {
  return `${f.flightNumber.toUpperCase()}__${f.departureDate}`;
}

export interface FidsPullResult {
  ok: boolean;
  added: number;
  updated: number;
  total: number;
  error?: string;
}

/** Tarik keberangkatan (opsional filter tanggal) lalu merge ke localStorage. */
export async function pullFidsKeberangkatan(
  tanggal?: string,
): Promise<FidsPullResult> {
  const res = await fetchKeberangkatan(tanggal);
  if (!res.ok) {
    return { ok: false, added: 0, updated: 0, total: 0, error: res.error };
  }

  const incoming = res.items.map(keberangkatanToFlight);
  const byKey = new Map(getFlights().map((f) => [keyOf(f), f]));

  let added = 0;
  let updated = 0;
  for (const inc of incoming) {
    const k = keyOf(inc);
    const existing = byKey.get(k);
    if (existing) {
      byKey.set(k, {
        ...existing,
        ...inc,
        id: existing.id, // pertahankan id lokal
        // Status mengikuti FIDS dengan aturan aman (lihat nextStatus): FIDS
        // boleh MENUTUP (Departured/Cancelled) walau lokal sudah OPEN, tapi
        // tak boleh membuka kembali yang sudah CLOSED/CANCELLED manual.
        status: nextStatus(existing.status, inc.status),
        // Pertahankan pax yang sudah diisi; default FIDS hanya mengisi yang kosong.
        expectedPax:
          existing.expectedPax && existing.expectedPax > 0
            ? existing.expectedPax
            : inc.expectedPax,
        updatedAt: new Date().toISOString(),
      });
      updated += 1;
    } else {
      byKey.set(k, inc);
      added += 1;
    }
  }

  saveFlights(Array.from(byKey.values()));
  // Beritahu UI lain (mis. halaman Jadwal Penerbangan) agar refresh daftar.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("afvs:flights-updated"));
  }
  return { ok: true, added, updated, total: incoming.length };
}
