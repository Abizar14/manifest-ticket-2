import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      boxShadow: {
        soft: "0 8px 24px -12px rgba(15, 23, 42, 0.12)",
        card: "0 10px 30px rgba(15, 23, 42, 0.06)",
        lift: "0 16px 40px rgba(37, 99, 235, 0.12)",
        glow: "0 0 0 6px rgba(37, 99, 235, 0.12)",
      },
      backgroundImage: {
        "app-gradient":
          "radial-gradient(circle at top left, rgba(37,99,235,0.10), transparent 30%), radial-gradient(circle at top right, rgba(6,182,212,0.08), transparent 28%), linear-gradient(135deg,#F8FAFC 0%,#EEF6FF 45%,#F0FDFF 100%)",
        "shine":
          "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "badge-pop": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "60%": { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(37,99,235,0.35)",
          },
          "50%": {
            boxShadow: "0 0 0 10px rgba(37,99,235,0)",
          },
        },
        "pulse-glow-emerald": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(16,185,129,0.45)",
          },
          "50%": {
            boxShadow: "0 0 0 12px rgba(16,185,129,0)",
          },
        },
        "pulse-glow-rose": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(244,63,94,0.40)",
          },
          "50%": {
            boxShadow: "0 0 0 12px rgba(244,63,94,0)",
          },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "badge-pop": "badge-pop 0.35s ease-out both",
        "pulse-glow": "pulse-glow 2.2s ease-in-out infinite",
        "pulse-glow-emerald": "pulse-glow-emerald 2s ease-in-out infinite",
        "pulse-glow-rose": "pulse-glow-rose 1.8s ease-in-out infinite",
        shimmer: "shimmer 2.4s ease-in-out infinite",
        float: "float 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
