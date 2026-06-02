"use client";

import { Flight, ScanEvent, SessionUser, User } from "./types";
import { DUMMY_USERS, buildSeedFlights } from "./mockData";

const KEYS = {
  users: "afvs.users",
  flights: "afvs.flights",
  scanEvents: "afvs.scanEvents",
  session: "afvs.session",
  seeded: "afvs.seeded",
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
  write<Flight[]>(KEYS.flights, buildSeedFlights());
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
  return read<User[]>(KEYS.users, DUMMY_USERS);
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
