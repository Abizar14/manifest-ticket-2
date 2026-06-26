const { withSentryConfig } = require("@sentry/nextjs");

const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Tree-shake impor ikon lucide-react (banyak halaman impor belasan ikon).
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Aktifkan hook instrumentation.ts (Sentry server/edge) di Next 14.
    instrumentationHook: true,
  },

  // Format gambar modern untuk next/image (dipakai mulai langkah P-01).
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Buang console.* di production (kecuali error & warn) agar bundle lebih ramping.
  // Hanya disetel di production: Turbopack (next dev --turbo) belum mendukung
  // compiler.removeConsole, jadi di dev key ini sengaja tidak ada.
  ...(isProd
    ? {
        compiler: {
          removeConsole: { exclude: ["error", "warn"] },
        },
      }
    : {}),
};

// Bungkus dengan Sentry. Tanpa SENTRY_AUTH_TOKEN, upload source map dilewati
// (build tetap sukses). silent → tidak berisik di log build.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  widenClientFileUpload: true,
});
