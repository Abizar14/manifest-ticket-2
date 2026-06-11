"use client";

import { Flight } from "./types";
import { dateStringFromOffset, todayDateString, uid } from "./utils";

/**
 * Snapshot jadwal flight saat ini sebagai "default baru" yang dipakai
 * tiap kali reset / seed. Tanggal disimpan sebagai offset hari (relatif terhadap
 * hari snapshot), supaya saat di-restore di hari berbeda, jadwal otomatis roll
 * ke hari yang sesuai.
 */

const KEY = "afvs.seedFlights.custom";

interface SeedFlightSnapshot {
  flightNumber: string;
  airlineCode: string;
  originAirport: string;
  destinationAirport: string;
  /** Offset hari dari hari snapshot dibuat (0 = hari snapshot, 1 = besok, dst). */
  dayOffset: number;
  departureTime: string;
  gateOrCheckpoint: string;
  status: Flight["status"];
  expectedPax?: number;
  cancellationReason?: string;
}

interface SnapshotEnvelope {
  createdAt: string;
  baseDate: string;
  flights: SeedFlightSnapshot[];
}

function isBrowser() {
  return typeof window !== "undefined";
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split("-").map((p) => parseInt(p, 10));
  const [ty, tm, td] = toYmd.split("-").map((p) => parseInt(p, 10));
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / 86400000);
}

export function hasCustomSeed(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(KEY) !== null;
}

export function readCustomSeed(): SnapshotEnvelope | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SnapshotEnvelope;
  } catch {
    return null;
  }
}

export function saveCustomSeed(flights: Flight[]): SnapshotEnvelope {
  const base = todayDateString();
  const snap: SnapshotEnvelope = {
    createdAt: new Date().toISOString(),
    baseDate: base,
    flights: flights.map((f) => ({
      flightNumber: f.flightNumber,
      airlineCode: f.airlineCode,
      originAirport: f.originAirport,
      destinationAirport: f.destinationAirport,
      dayOffset: daysBetween(base, f.departureDate),
      departureTime: f.departureTime,
      gateOrCheckpoint: f.gateOrCheckpoint,
      status: f.status,
      expectedPax: f.expectedPax,
      cancellationReason: f.cancellationReason,
    })),
  };
  if (isBrowser()) {
    window.localStorage.setItem(KEY, JSON.stringify(snap));
  }
  return snap;
}

export function clearCustomSeed(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
}

export function buildFlightsFromCustomSeed(): Flight[] | null {
  const snap = readCustomSeed();
  if (!snap || !snap.flights.length) return null;
  const now = new Date().toISOString();
  return snap.flights.map((f) => ({
    id: uid("flt"),
    flightNumber: f.flightNumber,
    airlineCode: f.airlineCode,
    originAirport: f.originAirport,
    destinationAirport: f.destinationAirport,
    departureDate: dateStringFromOffset(f.dayOffset),
    departureTime: f.departureTime,
    gateOrCheckpoint: f.gateOrCheckpoint,
    status: f.status,
    expectedPax: f.expectedPax,
    cancellationReason: f.cancellationReason,
    createdAt: now,
    updatedAt: now,
  }));
}
