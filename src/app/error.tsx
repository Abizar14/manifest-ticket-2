"use client";

/**
 * Error boundary level-route (Next App Router). Menangkap runtime error pada
 * segmen di bawah app/ sehingga UI tidak blank — pengguna dapat mencoba ulang.
 * Tempat memasang observability (mis. Sentry.captureException(error)).
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error); // no-op bila DSN belum diisi
    console.error("[AFVS] Runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white/95 p-6 text-center shadow-card ring-1 ring-white/60 dark:border-hairline dark:bg-surface/95">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold tracking-tight text-ink">
          Terjadi kesalahan
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Maaf, ada bagian aplikasi yang gagal dimuat. Coba muat ulang halaman
          ini — data kamu aman.
        </p>
        {error?.digest && (
          <p className="mt-2 font-mono text-[11px] text-ink-subtle">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <RotateCw className="h-4 w-4" />
            Coba lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            <Home className="h-4 w-4" />
            Beranda
          </a>
        </div>
      </div>
    </div>
  );
}
