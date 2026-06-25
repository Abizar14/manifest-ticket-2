// Inisialisasi Sentry sisi browser. Env-gated: tanpa NEXT_PUBLIC_SENTRY_DSN,
// SDK nonaktif (no-op) sehingga aman di dev/lokal.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  // Fokus error reporting — tracing & replay dimatikan agar ringan.
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
