import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Tes unit menargetkan modul MURNI (tanpa DOM). Komponen/DOM bisa
    // ditambahkan nanti dengan environment "jsdom".
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
