"use client";

/**
 * Global error boundary — menangkap error yang terjadi di root layout itu
 * sendiri (saat error.tsx per-route tak bisa menolong). HARUS merender
 * <html>/<body> sendiri karena menggantikan root layout.
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error); // no-op bila DSN belum diisi
    console.error("[SIPANDAI] Global error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Poppins, ui-sans-serif, system-ui, sans-serif",
          background:
            "linear-gradient(135deg,#F8FAFC 0%,#EEF6FF 45%,#F0FDFF 100%)",
          color: "#0f172a",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #fecdd3",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 16px 40px rgba(37,99,235,0.14)",
          }}
        >
          <div
            style={{
              margin: "0 auto",
              height: 56,
              width: 56,
              borderRadius: 16,
              background: "#fff1f2",
              color: "#e11d48",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h2 style={{ marginTop: 16, fontSize: 18, fontWeight: 800 }}>
            Aplikasi mengalami gangguan
          </h2>
          <p style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
            Terjadi kesalahan tak terduga. Muat ulang untuk melanjutkan.
          </p>
          {error?.digest && (
            <p
              style={{
                marginTop: 8,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              Ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              border: "none",
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
