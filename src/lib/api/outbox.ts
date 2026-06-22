"use client";

/**
 * Outbox push scan-event ke backend AFVS. Pola sama dengan sikerenOutbox:
 * enqueue lokal dulu (offline-safe), flush sekuensial, idempotent by eventId.
 * Foto wajah diambil lazy dari IndexedDB saat flush (key = faceCaptureId).
 */

import { facePhotoStore } from "../facePhotoStore";
import { getSettings } from "../settings";
import type { ScanEvent } from "../types";
import {
  ScanPushFields,
  apiPushScan,
  getApiUser,
  getToken,
} from "./client";

interface ApiOutboxItem {
  id: string; // = eventId
  fields: ScanPushFields;
  faceCaptureId: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  enqueuedAt: string;
  status: "pending" | "syncing" | "failed";
}

interface ApiOutboxMeta {
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface ApiOutboxSummary {
  pending: number;
  failed: number;
  total: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  online: boolean;
}

const QUEUE_KEY = "afvs.api.outbox";
const META_KEY = "afvs.api.outboxMeta";

function isBrowser() {
  return typeof window !== "undefined";
}

function readQueue(): ApiOutboxItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as ApiOutboxItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: ApiOutboxItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  notify();
}

function readMeta(): ApiOutboxMeta {
  if (!isBrowser()) return { lastSyncedAt: null, lastError: null };
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw
      ? (JSON.parse(raw) as ApiOutboxMeta)
      : { lastSyncedAt: null, lastError: null };
  } catch {
    return { lastSyncedAt: null, lastError: null };
  }
}

function writeMeta(meta: ApiOutboxMeta) {
  if (!isBrowser()) return;
  window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  notify();
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("afvs:api-outbox"));
}

export function getApiOutboxSummary(): ApiOutboxSummary {
  const queue = readQueue();
  const meta = readMeta();
  const online = !isBrowser() ? true : navigator.onLine !== false;
  return {
    pending: queue.filter((q) => q.status === "pending" || q.status === "syncing")
      .length,
    failed: queue.filter((q) => q.status === "failed").length,
    total: queue.length,
    lastSyncedAt: meta.lastSyncedAt,
    lastError: meta.lastError,
    online,
  };
}

export function subscribeApiOutbox(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("afvs:api-outbox", handler);
  window.addEventListener("afvs:api-auth", handler);
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  return () => {
    window.removeEventListener("afvs:api-outbox", handler);
    window.removeEventListener("afvs:api-auth", handler);
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}

function resolveStation(): string {
  const user = getApiUser();
  if (user?.station) return user.station;
  const s = getSettings();
  return s.sikerenStation || "UNKNOWN";
}

/**
 * Enqueue scan event ke outbox backend. Gate oleh setting `apiSyncEnabled`.
 * Dipanggil dari scanService setiap scan tercatat. Tidak melempar error.
 */
export function enqueueScanPush(event: ScanEvent): void {
  if (!isBrowser()) return;
  if (!getSettings().apiSyncEnabled) return;

  const fields: ScanPushFields = {
    eventId: event.id,
    rawBarcode: event.rawBarcode,
    flightNumber: event.parsedFlightNumber,
    pnr: event.parsedPnr,
    ticketNumber: event.parsedTicketNumber,
    seat: event.parsedSeatNumber,
    passengerName: event.parsedPassengerName,
    resultStatus: event.resultStatus,
    message: event.message,
    scannedAt: event.scannedAt,
    station: resolveStation(),
    ktpStatus: event.ktpVerification?.status ?? null,
    ktpName: event.ktpVerification?.ocrName ?? null,
    ktpSimilarity: event.ktpVerification?.similarity ?? null,
    ktpCapturedAt: event.ktpVerification?.capturedAt ?? null,
  };

  const item: ApiOutboxItem = {
    id: event.id,
    fields,
    faceCaptureId: event.faceCaptureId ?? null,
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    enqueuedAt: new Date().toISOString(),
    status: "pending",
  };

  const queue = readQueue().filter((q) => q.id !== item.id);
  queue.push(item);
  writeQueue(queue);
}

/**
 * Lengkapi faceCaptureId pada item yang sudah ter-enqueue (dipanggil setelah
 * foto wajah tersimpan di IndexedDB, mis. dari processScanWithFace).
 */
export function attachFaceToQueued(eventId: string, faceCaptureId: string): void {
  const queue = readQueue();
  let changed = false;
  const next = queue.map((q) => {
    if (q.id === eventId && q.faceCaptureId !== faceCaptureId) {
      changed = true;
      return { ...q, faceCaptureId };
    }
    return q;
  });
  if (changed) writeQueue(next);
}

export function retryAllApiFailed(): void {
  const queue = readQueue().map((q) =>
    q.status === "failed" ? { ...q, status: "pending" as const } : q,
  );
  writeQueue(queue);
}

export function clearApiOutbox(): void {
  writeQueue([]);
  writeMeta({ lastSyncedAt: null, lastError: null });
}

let flushing = false;

export async function flushApiOutbox(opts?: {
  maxItems?: number;
}): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!isBrowser()) return { sent: 0, failed: 0, skipped: 0 };
  if (flushing) return { sent: 0, failed: 0, skipped: 0 };
  if (!getSettings().apiSyncEnabled) return { sent: 0, failed: 0, skipped: 0 };
  if (!getToken()) return { sent: 0, failed: 0, skipped: 0 };
  if (navigator.onLine === false) return { sent: 0, failed: 0, skipped: 0 };

  flushing = true;
  const max = opts?.maxItems ?? 25;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    let queue = readQueue();
    const targets = queue.filter((q) => q.status === "pending").slice(0, max);

    for (const item of targets) {
      queue = readQueue().map((q) =>
        q.id === item.id ? { ...q, status: "syncing" as const } : q,
      );
      writeQueue(queue);

      const faceBlob = item.faceCaptureId
        ? await facePhotoStore.get(item.faceCaptureId)
        : null;
      const result = await apiPushScan(item.fields, faceBlob);

      queue = readQueue();
      if (result.ok) {
        writeQueue(queue.filter((q) => q.id !== item.id));
        writeMeta({ lastSyncedAt: new Date().toISOString(), lastError: null });
        sent += 1;
      } else {
        const attempts = item.attempts + 1;
        const nextStatus: ApiOutboxItem["status"] =
          attempts >= 5 ? "failed" : "pending";
        writeQueue(
          queue.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  attempts,
                  lastAttemptAt: new Date().toISOString(),
                  lastError: result.error ?? "Unknown error",
                  status: nextStatus,
                }
              : q,
          ),
        );
        writeMeta({
          lastSyncedAt: readMeta().lastSyncedAt,
          lastError: result.error ?? "Unknown error",
        });
        if (nextStatus === "failed") failed += 1;
        else skipped += 1;
        // Stop kalau error network — biar tidak banjir.
        const err = (result.error ?? "").toLowerCase();
        if (
          err.includes("terhubung") ||
          err.includes("timeout") ||
          err.includes("offline") ||
          result.status === 401
        ) {
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed, skipped };
}

let autoFlushStarted = false;
export function startApiAutoFlush(): () => void {
  if (!isBrowser()) return () => {};
  if (autoFlushStarted) return () => {};
  autoFlushStarted = true;

  const kick = () => {
    flushApiOutbox().catch(() => {});
  };
  kick();
  const interval = window.setInterval(kick, 20_000);
  window.addEventListener("online", kick);
  window.addEventListener("afvs:api-auth", kick);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("online", kick);
    window.removeEventListener("afvs:api-auth", kick);
    autoFlushStarted = false;
  };
}
