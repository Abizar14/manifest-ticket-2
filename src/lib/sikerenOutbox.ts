"use client";

import {
  buildSikerenPayload,
  postSikeren,
  type SikerenPayload,
} from "./sikerenClient";
import { getSettings } from "./settings";
import type { Flight, ParsedBarcode, ScanEvent } from "./types";

export interface OutboxItem {
  id: string;
  payload: SikerenPayload;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  enqueuedAt: string;
  status: "pending" | "syncing" | "failed";
}

export interface OutboxSummary {
  pending: number;
  failed: number;
  total: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  online: boolean;
}

const QUEUE_KEY = "afvs.sikeren.outbox";
const META_KEY = "afvs.sikeren.meta";

interface OutboxMeta {
  lastSyncedAt: string | null;
  lastError: string | null;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readQueue(): OutboxItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OutboxItem[];
  } catch {
    return [];
  }
}

function writeQueue(items: OutboxItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  notify();
}

function readMeta(): OutboxMeta {
  if (!isBrowser()) return { lastSyncedAt: null, lastError: null };
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return { lastSyncedAt: null, lastError: null };
    return JSON.parse(raw) as OutboxMeta;
  } catch {
    return { lastSyncedAt: null, lastError: null };
  }
}

function writeMeta(meta: OutboxMeta) {
  if (!isBrowser()) return;
  window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  notify();
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("afvs:sikeren-outbox"));
}

export function getOutboxSummary(): OutboxSummary {
  const queue = readQueue();
  const meta = readMeta();
  const online = !isBrowser() ? true : navigator.onLine !== false;
  return {
    pending: queue.filter((q) => q.status === "pending" || q.status === "syncing").length,
    failed: queue.filter((q) => q.status === "failed").length,
    total: queue.length,
    lastSyncedAt: meta.lastSyncedAt,
    lastError: meta.lastError,
    online,
  };
}

export function getOutboxItems(): OutboxItem[] {
  return readQueue();
}

export function subscribeOutbox(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("afvs:sikeren-outbox", handler);
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  return () => {
    window.removeEventListener("afvs:sikeren-outbox", handler);
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}

/**
 * Enqueue VALID scan to outbox. Selalu push ke queue lokal walaupun offline.
 * Tidak melempar error.
 */
export function enqueueValidScan(
  event: ScanEvent,
  flight: Flight,
  parsed: ParsedBarcode,
): void {
  const s = getSettings();
  if (!s.sikerenEnabled) return;
  const payload = buildSikerenPayload(event, flight, parsed);
  const item: OutboxItem = {
    id: event.id,
    payload,
    attempts: 0,
    lastAttemptAt: null,
    lastError: null,
    enqueuedAt: new Date().toISOString(),
    status: "pending",
  };
  const queue = readQueue();
  // Dedup by scan event id
  const filtered = queue.filter((q) => q.id !== item.id);
  filtered.push(item);
  writeQueue(filtered);
}

export function removeFromOutbox(id: string): void {
  const queue = readQueue();
  writeQueue(queue.filter((q) => q.id !== id));
}

export function clearOutbox(): void {
  writeQueue([]);
  writeMeta({ lastSyncedAt: null, lastError: null });
}

export function retryAllFailed(): void {
  const queue = readQueue().map((q) =>
    q.status === "failed" ? { ...q, status: "pending" as const } : q,
  );
  writeQueue(queue);
}

let flushing = false;

/**
 * Flush pending items satu per satu (sequential supaya tidak banjir backend).
 * Best-effort: kalau offline atau Sikeren disabled, langsung return.
 */
export async function flushOutbox(opts?: {
  maxItems?: number;
}): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!isBrowser()) return { sent: 0, failed: 0, skipped: 0 };
  if (flushing) return { sent: 0, failed: 0, skipped: 0 };
  const s = getSettings();
  if (!s.sikerenEnabled) return { sent: 0, failed: 0, skipped: 0 };
  if (!s.sikerenEndpoint.trim()) return { sent: 0, failed: 0, skipped: 0 };
  if (navigator.onLine === false) return { sent: 0, failed: 0, skipped: 0 };

  flushing = true;
  const max = opts?.maxItems ?? 25;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    let queue = readQueue();
    // Process pending first (failed items wait for manual retry)
    const targets = queue
      .filter((q) => q.status === "pending")
      .slice(0, max);

    for (const item of targets) {
      // Mark syncing
      queue = readQueue().map((q) =>
        q.id === item.id ? { ...q, status: "syncing" as const } : q,
      );
      writeQueue(queue);

      const result = await postSikeren(item.payload);
      queue = readQueue();
      if (result.ok) {
        queue = queue.filter((q) => q.id !== item.id);
        writeQueue(queue);
        writeMeta({
          lastSyncedAt: new Date().toISOString(),
          lastError: null,
        });
        sent += 1;
      } else {
        const attempts = item.attempts + 1;
        const nextStatus: OutboxItem["status"] =
          attempts >= 5 ? "failed" : "pending";
        queue = queue.map((q) =>
          q.id === item.id
            ? {
                ...q,
                attempts,
                lastAttemptAt: new Date().toISOString(),
                lastError: result.error ?? "Unknown error",
                status: nextStatus,
              }
            : q,
        );
        writeQueue(queue);
        writeMeta({
          lastSyncedAt: readMeta().lastSyncedAt,
          lastError: result.error ?? "Unknown error",
        });
        if (nextStatus === "failed") failed += 1;
        else skipped += 1;
        // Stop further attempts kalau error mungkin network — biar tidak banjir
        if (
          result.error?.toLowerCase().includes("offline") ||
          result.error?.toLowerCase().includes("timeout") ||
          result.error?.toLowerCase().includes("failed to fetch")
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

/**
 * Start auto-flush loop. Coba flush ketika:
 * - Saat aplikasi load
 * - Setiap 30 detik
 * - Setiap event "online" (network kembali)
 */
let autoFlushStarted = false;
export function startAutoFlush(): () => void {
  if (!isBrowser()) return () => {};
  if (autoFlushStarted) return () => {};
  autoFlushStarted = true;

  const kick = () => {
    flushOutbox().catch(() => {});
  };

  // initial
  kick();
  const interval = window.setInterval(kick, 30_000);
  window.addEventListener("online", kick);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("online", kick);
    autoFlushStarted = false;
  };
}
