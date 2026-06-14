"use client";

type TesseractWorker = {
  recognize: (image: Blob | string | HTMLCanvasElement) => Promise<{
    data: { text: string };
  }>;
  terminate: () => Promise<void>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const mod = await import("tesseract.js");
    const createWorker = (mod as unknown as { createWorker: (lang: string) => Promise<TesseractWorker> }).createWorker;
    return createWorker("ind");
  })();
  return workerPromise;
}

export async function initKtpOcr(): Promise<void> {
  await getWorker();
}

export async function terminateKtpOcr(): Promise<void> {
  if (!workerPromise) return;
  try {
    const w = await workerPromise;
    await w.terminate();
  } catch {
    /* ignore */
  }
  workerPromise = null;
}

/**
 * Kata header KTP yang harus diabaikan saat mencari nama.
 * Termasuk juga label field di kolom kiri (tempat/tgl lahir, jenis kelamin, dll).
 */
const KTP_HEADER_KEYWORDS = [
  "PROVINSI",
  "KABUPATEN",
  "KOTA",
  "REPUBLIK",
  "INDONESIA",
  "NIK",
  "NAMA",
  "TEMPAT",
  "TGL",
  "LAHIR",
  "JENIS",
  "KELAMIN",
  "GOL",
  "DARAH",
  "ALAMAT",
  "RT",
  "RW",
  "KEL",
  "DESA",
  "KECAMATAN",
  "AGAMA",
  "STATUS",
  "PERKAWINAN",
  "PEKERJAAN",
  "KEWARGANEGARAAN",
  "WNI",
  "WNA",
  "BERLAKU",
  "HINGGA",
  "SEUMUR",
  "HIDUP",
  "ISLAM",
  "KRISTEN",
  "KATOLIK",
  "HINDU",
  "BUDHA",
  "KONGHUCU",
  "LAKI",
  "PEREMPUAN",
  "BELUM",
  "KAWIN",
  "CERAI",
  "PELAJAR",
  "MAHASISWA",
  "KARYAWAN",
  "PEDAGANG",
];

function isHeaderOrLabel(line: string): boolean {
  const upper = line.toUpperCase();
  // semua kata di baris harus jadi header keyword? terlalu strict.
  // Cukup: baris hanya berisi >= 1 keyword & total <= 3 kata → label/header.
  const tokens = upper.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hits = tokens.filter((t) => KTP_HEADER_KEYWORDS.includes(t)).length;
  if (hits === tokens.length) return true; // semua kata = header
  if (tokens.length <= 3 && hits >= 1) return true; // label pendek
  return false;
}

/**
 * Parser nama dari raw OCR text KTP.
 * Strategi (urut prioritas):
 *  1. Baris "Nama : ..." eksplisit.
 *  2. Baris persis setelah NIK (layout standar KTP).
 *  3. Baris uppercase panjang yang BUKAN header/label/kota/provinsi.
 */
function parseKtpName(rawText: string): string | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanName = (raw: string): string => {
    return raw
      .replace(/[^A-Za-z.\s'-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  };

  // 1. Cari label "Nama" eksplisit (OCR kadang baca "Narna", "Nema", dll).
  for (const line of lines) {
    const m = line.match(/^\s*n[a-z]{2,3}\s*[:\-]\s*(.+)$/i);
    if (m) {
      const name = cleanName(m[1]);
      if (name.length >= 3 && !isHeaderOrLabel(name)) return name;
    }
  }

  // 2. Baris setelah NIK (16 digit). Layout KTP: NIK → Nama.
  for (let i = 0; i < lines.length - 1; i++) {
    if (/nik|\d{10,}/i.test(lines[i])) {
      // skip baris kosong / berisi label saja
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
        const candidate = lines[j];
        if (isHeaderOrLabel(candidate)) continue;
        const name = cleanName(candidate.replace(/^[^A-Za-z]*/, ""));
        if (name.length >= 3 && !isHeaderOrLabel(name) && /^[A-Z]/.test(name)) {
          return name;
        }
      }
    }
  }

  // 3. Fallback: cari baris uppercase yang bukan header/label.
  for (const line of lines) {
    if (!/^[A-Z][A-Z\s'.-]{4,}$/.test(line)) continue;
    if (isHeaderOrLabel(line)) continue;
    return line.replace(/\s+/g, " ").trim();
  }
  return null;
}

export interface KtpOcrResult {
  rawText: string;
  name: string | null;
}

async function preprocessForOcr(blob: Blob): Promise<HTMLCanvasElement | Blob> {
  try {
    const url = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return blob;
    }
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    // grayscale + contrast boost (CLAHE-ish simple stretch)
    const contrast = 1.4;
    const intercept = 128 - contrast * 128;
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const v = Math.max(0, Math.min(255, contrast * g + intercept));
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(data, 0, 0);
    URL.revokeObjectURL(url);
    return canvas;
  } catch {
    return blob;
  }
}

export async function recognizeKtp(image: Blob): Promise<KtpOcrResult> {
  const worker = await getWorker();
  const processed = await preprocessForOcr(image);
  const result = await worker.recognize(processed);
  const rawText = result.data.text ?? "";
  return { rawText, name: parseKtpName(rawText) };
}
