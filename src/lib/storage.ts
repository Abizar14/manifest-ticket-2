"use client";

import { Flight, ScanEvent, SessionUser, User } from "./types";
import { DUMMY_USERS, buildSeedFlights } from "./mockData";
import { buildFlightsFromCustomSeed } from "./seedSnapshot";

const KEYS = {
  users: "afvs.users",
  flights: "afvs.flights",
  scanEvents: "afvs.scanEvents",
  scanEventsArchive: "afvs.scanEventsArchive",
  session: "afvs.session",
  seeded: "afvs.seeded",
  audit: "afvs.flightAuditEvents",
  settings: "afvs.settings",
  archiveAt: "afvs.lastArchiveAt",
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureSeed() {
  if (!isBrowser()) return;
  const seeded = window.localStorage.getItem(KEYS.seeded);
  if (seeded === "1") return;

  write<User[]>(KEYS.users, DUMMY_USERS);
  const customSeed = buildFlightsFromCustomSeed();
  write<Flight[]>(KEYS.flights, customSeed ?? buildSeedFlights());
  write<ScanEvent[]>(KEYS.scanEvents, []);
  window.localStorage.setItem(KEYS.seeded, "1");
}

export function resetAll() {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  ensureSeed();
}

/* Users */
export function getUsers(): User[] {
  const stored = read<User[]>(KEYS.users, DUMMY_USERS);
  const byId = new Map(stored.map((u) => [u.id, u]));
  let changed = false;

  for (const demo of DUMMY_USERS) {
    const existing = byId.get(demo.id);
    if (!existing) {
      byId.set(demo.id, demo);
      changed = true;
      continue;
    }
    if (demo.pin && !existing.pin) {
      byId.set(demo.id, { ...existing, pin: demo.pin });
      changed = true;
    }
  }

  const users = Array.from(byId.values());
  if (changed) write<User[]>(KEYS.users, users);
  return users;
}

/* Session */
export function getSession(): SessionUser | null {
  return read<SessionUser | null>(KEYS.session, null);
}

export function setSession(user: SessionUser | null) {
  if (!isBrowser()) return;
  if (user === null) {
    window.localStorage.removeItem(KEYS.session);
  } else {
    write(KEYS.session, user);
    // Tandai sesi login baru agar AI Insight hanya auto-popup sekali tepat
    // setelah login — bukan tiap refresh / pindah menu.
    try {
      window.sessionStorage.setItem("afvs.insightBubble.freshLogin", "1");
    } catch {
      /* sessionStorage tidak tersedia → toast cukup di-skip */
    }
  }
}

/* Flights */
export function getFlights(): Flight[] {
  return read<Flight[]>(KEYS.flights, []);
}

export function saveFlights(flights: Flight[]) {
  write(KEYS.flights, flights);
}

export function addFlight(flight: Flight) {
  const list = getFlights();
  list.push(flight);
  saveFlights(list);
}

export function updateFlight(id: string, patch: Partial<Flight>) {
  const list = getFlights().map((f) =>
    f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f,
  );
  saveFlights(list);
}

export function deleteFlight(id: string) {
  saveFlights(getFlights().filter((f) => f.id !== id));
}

/* Scan Events */
export function getScanEvents(): ScanEvent[] {
  return read<ScanEvent[]>(KEYS.scanEvents, []);
}

export function saveScanEvents(events: ScanEvent[]) {
  write(KEYS.scanEvents, events);
}

export function addScanEvent(event: ScanEvent) {
  const list = getScanEvents();
  list.unshift(event);
  saveScanEvents(list);
}

export function updateScanEvent(id: string, patch: Partial<ScanEvent>) {
  const list = getScanEvents().map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );
  saveScanEvents(list);
}

/* Scan Events Archive */
export function getScanEventsArchive(): ScanEvent[] {
  return read<ScanEvent[]>(KEYS.scanEventsArchive, []);
}

function saveScanEventsArchive(events: ScanEvent[]) {
  write(KEYS.scanEventsArchive, events);
}

export function purgeScanEventsArchive() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEYS.scanEventsArchive);
}

/**
 * Pindahkan scan event yang lebih lama dari `keepDays` hari ke arsip
 * (key terpisah supaya localStorage utama tidak membengkak).
 * Idempotent — aman dipanggil tiap mount AppShell; menggunakan
 * `KEYS.archiveAt` untuk menghindari re-run pada hari yang sama.
 */
export function archiveOldScanEvents(keepDays = 1): {
  moved: number;
  ranToday: boolean;
} {
  if (!isBrowser()) return { moved: 0, ranToday: false };
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastRun = window.localStorage.getItem(KEYS.archiveAt);
  if (lastRun === todayStr) return { moved: 0, ranToday: true };

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - keepDays);

  const current = getScanEvents();
  const keep: ScanEvent[] = [];
  const move: ScanEvent[] = [];
  for (const e of current) {
    const t = new Date(e.scannedAt).getTime();
    if (Number.isFinite(t) && t < cutoff.getTime()) move.push(e);
    else keep.push(e);
  }

  if (move.length > 0) {
    const archive = getScanEventsArchive();
    saveScanEventsArchive([...move, ...archive]);
    saveScanEvents(keep);
  }
  window.localStorage.setItem(KEYS.archiveAt, todayStr);
  return { moved: move.length, ranToday: false };
}

/* Bulk export of everything (for Settings → Data tab) */
export function exportAllData(): string {
  if (!isBrowser()) return "{}";
  const payload: Record<string, unknown> = {};
  for (const k of Object.values(KEYS)) {
    const raw = window.localStorage.getItem(k);
    if (raw === null) continue;
    try {
      payload[k] = JSON.parse(raw);
    } catch {
      payload[k] = raw;
    }
  }
  return JSON.stringify(payload, null, 2);
}
