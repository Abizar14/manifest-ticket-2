"use client";

type TesseractWorker = {
  recognize: (image: Blob | string | HTMLCanvasElement) => Promise<{
    data: { text: string };
  }>;
  setParameters?: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<void>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const mod = await import("tesseract.js");
    const createWorker = (mod as unknown as { createWorker: (lang: string) => Promise<TesseractWorker> }).createWorker;
    const worker = await createWorker("ind");
    try {
      // PSM 6 = anggap satu blok teks seragam (cocok untuk crop area nama
      // yang berisi beberapa baris: label NIK/Nama + nilainya).
      await worker.setParameters?.({
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
      });
    } catch {
      /* setParameters tidak tersedia — pakai default */
    }
    return worker;
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
    let s = raw
      .replace(/[^A-Za-z.\s'-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    // Buang label field yang kadang ikut terbaca ("NAMA PRAYUDA…" → "PRAYUDA…").
    s = s.replace(/^(NAMA|NAME|NIK)\b[\s:.'-]*/g, "").trim();
    // Buang token sampah di ujung (mis. "AA PRAYUDA ELFANDRO J" → "PRAYUDA
    // ELFANDRO"): potongan label/garis yang nyangkut biasanya 1-2 huruf.
    // Hanya trim bila masih ada >=2 token "berbobot" (>=3 huruf) supaya nama
    // pendek sah seperti "ST FATIMAH" tidak ikut terpotong.
    const tokens = s.split(" ").filter(Boolean);
    const longCount = tokens.filter((t) => t.length >= 3).length;
    if (longCount >= 2) {
      while (tokens.length > 2 && tokens[tokens.length - 1].length <= 2) tokens.pop();
      while (tokens.length > 2 && tokens[0].length <= 2) tokens.shift();
    }
    return tokens.join(" ");
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
    const name = cleanName(line);
    if (name.length >= 3) return name;
  }
  return null;
}

export interface KtpOcrResult {
  rawText: string;
  name: string | null;
}

/** Region crop relatif (0..1) terhadap gambar penuh. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

async function preprocessForOcr(
  blob: Blob,
  cropRect?: CropRect,
): Promise<HTMLCanvasElement | Blob> {
  try {
    const url = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const fullW = img.naturalWidth;
    const fullH = img.naturalHeight;
    // Crop ke area nama bila diberikan — supaya OCR HANYA membaca bagian nama,
    // bukan NIK/alamat/field lain di KTP.
    const sx = cropRect ? Math.max(0, Math.round(cropRect.x * fullW)) : 0;
    const sy = cropRect ? Math.max(0, Math.round(cropRect.y * fullH)) : 0;
    const sw = cropRect
      ? Math.min(fullW - sx, Math.round(cropRect.w * fullW))
      : fullW;
    const sh = cropRect
      ? Math.min(fullH - sy, Math.round(cropRect.h * fullH))
      : fullH;
    // Upscale crop kecil supaya teks nama cukup besar untuk OCR (Tesseract
    // optimal di teks ~tinggi 30-40px). Crop sempit → perbesar 2x.
    const scale = sw < 1200 ? 2 : 1;
    const outW = sw * scale;
    const outH = sh * scale;
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return blob;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    const data = ctx.getImageData(0, 0, outW, outH);
    const px = data.data;
    const n = outW * outH;

    // 1) grayscale + histogram
    const gray = new Uint8Array(n);
    const hist = new Array(256).fill(0);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const g = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) | 0;
      gray[j] = g;
      hist[g]++;
    }

    // 2) Otsu threshold — pisahkan teks (gelap) dari latar (terang) secara
    //    otomatis; jauh lebih tahan variasi cahaya daripada contrast linear.
    let total = 0;
    for (let t = 0; t < 256; t++) total += t * hist[t];
    let sumB = 0;
    let wB = 0;
    let maxVar = -1;
    let thr = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = n - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (total - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maxVar) {
        maxVar = between;
        thr = t;
      }
    }

    // 3) binarisasi (hitam/putih)
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const v = gray[j] > thr ? 255 : 0;
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(data, 0, 0);
    URL.revokeObjectURL(url);
    return canvas;
  } catch {
    return blob;
  }
}

export async function recognizeKtp(
  image: Blob,
  opts?: { cropRect?: CropRect },
): Promise<KtpOcrResult> {
  const worker = await getWorker();
  const processed = await preprocessForOcr(image, opts?.cropRect);
  const result = await worker.recognize(processed);
  const rawText = result.data.text ?? "";
  return { rawText, name: parseKtpName(rawText) };
}
