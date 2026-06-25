/**
 * Inisialisasi Sentry — HARUS di-import paling awal di main.ts (sebelum modul
 * lain) agar instrumentasi HTTP aktif. Env-gated: tanpa SENTRY_DSN, SDK tidak
 * mengirim apa pun (no-op), jadi aman di dev/lokal.
 */
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn, // undefined → SDK nonaktif
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV ?? "development",
  // Fokus error reporting; tracing dimatikan agar ringan & hemat kuota.
  tracesSampleRate: 0,
});
