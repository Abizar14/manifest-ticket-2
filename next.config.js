/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Tree-shake impor ikon lucide-react (banyak halaman impor belasan ikon).
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Format gambar modern untuk next/image (dipakai mulai langkah P-01).
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Buang console.* di production (kecuali error & warn) agar bundle lebih ramping.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

module.exports = nextConfig;
