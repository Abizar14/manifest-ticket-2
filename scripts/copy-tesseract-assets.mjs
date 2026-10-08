// Salin aset Tesseract (worker, core WASM, data bahasa "ind") dari node_modules
// ke public/tesseract/ supaya OCR KTP jalan tanpa internet (tanpa CDN jsdelivr).
// Dijalankan otomatis via postinstall / predev / prebuild. Lihat src/lib/ktpOcr.ts.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");
const out = join(root, "public", "tesseract");

// ktpOcr memakai OEM LSTM_ONLY (default createWorker) → hanya varian "-lstm"
// yang dimuat; tesseract.js memilih satu di antaranya sesuai dukungan SIMD.
const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "core/tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "core/tesseract-core-simd-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["@tesseract.js-data/ind/4.0.0_best_int/ind.traineddata.gz", "lang/ind.traineddata.gz"],
];

let copied = 0;
for (const [from, to] of files) {
  const src = join(nm, from);
  const dst = join(out, to);
  if (!existsSync(src)) {
    console.error(`[tesseract-assets] tidak ditemukan: ${from} — jalankan npm install`);
    process.exit(1);
  }
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  copied++;
}
console.log(`[tesseract-assets] ${copied} file disalin ke public/tesseract`);
