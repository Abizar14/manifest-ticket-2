/**
 * Hook instrumentasi Next.js — memuat konfigurasi Sentry server/edge sesuai
 * runtime. Sisi browser dimuat lewat sentry.client.config.ts (oleh plugin
 * @sentry/nextjs). Semuanya env-gated.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
