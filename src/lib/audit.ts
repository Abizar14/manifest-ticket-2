"use client";

import { AuditAction, FlightAuditEvent, FlightStatus, SessionUser } from "./types";
import { uid } from "./utils";

const KEY = "afvs.flightAuditEvents";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAuditEvents(): FlightAuditEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FlightAuditEvent[];
  } catch {
    return [];
  }
}

function saveAll(list: FlightAuditEvent[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function recordAudit(input: {
  flightId: string;
  flightNumber: string;
  action: AuditAction;
  fromStatus: FlightStatus | null;
  toStatus: FlightStatus | null;
  session: SessionUser | null;
  note?: string;
}) {
  const ev: FlightAuditEvent = {
    id: uid("aud"),
    flightId: input.flightId,
    flightNumber: input.flightNumber,
    action: input.action,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    userId: input.session?.id ?? "—",
    userName: input.session?.name ?? input.session?.email ?? "—",
    at: new Date().toISOString(),
    note: input.note,
  };
  const list = getAuditEvents();
  list.unshift(ev);
  saveAll(list);
  return ev;
}

export function getAuditForFlight(flightId: string): FlightAuditEvent[] {
  return getAuditEvents().filter((a) => a.flightId === flightId);
}
