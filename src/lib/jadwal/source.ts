/**
 * Tipe respons MENTAH dari FIDS bandara (Laravel) di 103.210.122.2 + helper
 * pengambilan semua halaman (pagination). Modul ini SERVER-ONLY — hanya dipakai
 * oleh Route Handler (`src/app/api/jadwal/[jenis]/route.ts`), tidak dari browser
 * (API memakai http:// & tanpa CORS, jadi wajib di-proxy dari server).
 */

import {
  JadwalKeberangkatan,
  JadwalKedatangan,
  airlineCodeFromKode,
  normalizeFlightNumber,
} from "./types";

// ─────────────────────────── Tipe mentah ───────────────────────────

export interface RawMaskapai {
  id: number;
  nama: string;
  logo: string | null;
  kode_warna: string | null;
}

export interface RawPesawat {
  id: number;
  maskapai_id: number;
  kode_penerbangan: string; // mis. "IU-641"
  jenis: string | null; // "Boeing" | "Airbus" | "ATR" ...
  tipe: string | null;
  kapasitas: number | null;
}

export interface RawGate {
  id: number;
  nama: string; // "A2"
  urutan: number;
}

export interface RawRemark {
  id: number;
  status: string; // "Scheduled" | "Estimate" | ...
  jenis: string;
  is_aktif: string;
}

export interface RawBandara {
  id: number;
  nama: string; // "JUANDA"
  iata: string; // "SUB"
  kota_provinsi: string; // "SURABAYA / JAWA TIMUR"
}

export interface RawReason {
  id: number;
  deskripsi: string; // "---"
}

/** Item keberangkatan: ada gate + konter, tujuan = bandara_tujuan. */
export interface RawKeberangkatan {
  id: number;
  tanggal: string; // "2026-06-23"
  jam: string; // "09:25"
  konter: number;
  konter2: number;
  konter3: number;
  gate_id: number;
  is_extra: number;
  is_force: number;
  keterangan: string | null;
  maskapai: RawMaskapai;
  pesawat: RawPesawat;
  gate: RawGate | null;
  remark: RawRemark | null;
  bandara_tujuan: RawBandara | null;
  reason: RawReason | null;
}

/** Item kedatangan: ada conveyor (tanpa gate), asal = bandara_asal. */
export interface RawKedatangan {
  id: number;
  tanggal: string;
  jam: string;
  conveyor: number;
  is_extra: number;
  is_force: number;
  keterangan: string | null;
  maskapai: RawMaskapai;
  pesawat: RawPesawat;
  remark: RawRemark | null;
  bandara_asal: RawBandara | null;
  reason: RawReason | null;
}

/** Bentuk pagination Laravel di `data.result`. */
export interface RawPaginated<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
  next_page_url: string | null;
}

/** Envelope penuh: `{ data: { sukses, pesan, result } }`. */
export interface RawEnvelope<T> {
  data: {
    sukses: boolean;
    pesan: string;
    result: RawPaginated<T>;
  };
}

export type Jenis = "keberangkatan" | "kedatangan";

export function isJenis(v: string): v is Jenis {
  return v === "keberangkatan" || v === "kedatangan";
}

// ─────────────────────────── Normalisasi ───────────────────────────

const cleanReason = (r: RawReason | null): string | null => {
  const d = r?.deskripsi?.trim();
  return d && d !== "---" ? d : null;
};

const counterOrNull = (n: number | null | undefined): number | null =>
  n && n > 0 ? n : null;

export function normalizeKeberangkatan(
  raw: RawKeberangkatan,
): JadwalKeberangkatan {
  const kode = raw.pesawat?.kode_penerbangan ?? "";
  return {
    id: `fids-kb-${raw.id}`,
    tanggal: raw.tanggal,
    jam: raw.jam,
    flightNumber: normalizeFlightNumber(kode),
    airlineCode: airlineCodeFromKode(kode),
    airlineName: raw.maskapai?.nama ?? "",
    destinationIata: raw.bandara_tujuan?.iata ?? "",
    destinationName: raw.bandara_tujuan?.nama ?? "",
    destinationCity: raw.bandara_tujuan?.kota_provinsi ?? "",
    gate: raw.gate?.nama ?? null,
    counter: counterOrNull(raw.konter),
    remark: raw.remark?.status ?? null,
    aircraftType: raw.pesawat?.jenis ?? null,
    capacity: counterOrNull(raw.pesawat?.kapasitas),
    isExtra: raw.is_extra === 1,
    keterangan: raw.keterangan?.trim() || null,
    reason: cleanReason(raw.reason),
  };
}

export function normalizeKedatangan(raw: RawKedatangan): JadwalKedatangan {
  const kode = raw.pesawat?.kode_penerbangan ?? "";
  return {
    id: `fids-kd-${raw.id}`,
    tanggal: raw.tanggal,
    jam: raw.jam,
    flightNumber: normalizeFlightNumber(kode),
    airlineCode: airlineCodeFromKode(kode),
    airlineName: raw.maskapai?.nama ?? "",
    originIata: raw.bandara_asal?.iata ?? "",
    originName: raw.bandara_asal?.nama ?? "",
    originCity: raw.bandara_asal?.kota_provinsi ?? "",
    conveyor: counterOrNull(raw.conveyor),
    remark: raw.remark?.status ?? null,
    isExtra: raw.is_extra === 1,
    keterangan: raw.keterangan?.trim() || null,
    reason: cleanReason(raw.reason),
  };
}

// ─────────────────────────── Fetch helper ───────────────────────────

const PER_REQUEST_TIMEOUT_MS = 12000;
const MAX_PAGES = 50; // backstop anti-loop
const FETCH_CONCURRENCY = 6; // P-04: halaman ditarik paralel (bukan 1-per-1)

/** Ambil satu halaman, lempar Error bila gagal / bentuk tak terduga. */
async function fetchPage<T>(
  baseUrl: string,
  jenis: Jenis,
  page: number,
): Promise<RawPaginated<T>> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/transaksi/${jenis}?page=${page}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`FIDS HTTP ${res.status} (${jenis} hal. ${page})`);
    }
    const body = (await res.json()) as RawEnvelope<T>;
    const result = body?.data?.result;
    if (!result || !Array.isArray(result.data)) {
      throw new Error(`Respons FIDS tidak terduga (${jenis} hal. ${page})`);
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export interface FetchAllResult<T> {
  items: T[];
  total: number;
  pages: number;
}

/**
 * Ambil SEMUA halaman (per_page biasanya 5) lalu gabungkan. Halaman pertama
 * dipakai untuk membaca `last_page`, sisanya ditarik berurutan. Aman dari loop
 * tak hingga lewat MAX_PAGES.
 */
export async function fetchAllPages<T>(
  baseUrl: string,
  jenis: Jenis,
): Promise<FetchAllResult<T>> {
  const first = await fetchPage<T>(baseUrl, jenis, 1);
  const items = [...first.data];
  const lastPage = Math.min(first.last_page || 1, MAX_PAGES);
  if (lastPage <= 1) {
    return { items, total: first.total ?? items.length, pages: lastPage };
  }

  // P-04: tarik halaman 2..lastPage PARALEL dengan batas konkurensi, bukan
  // berurutan (sebelumnya ≤49 round-trip serial). Urutan hasil tetap dijaga
  // lewat index supaya gabungan items konsisten dengan paginasi.
  const restPages: number[] = [];
  for (let p = 2; p <= lastPage; p++) restPages.push(p);
  const chunks: T[][] = new Array(restPages.length);
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= restPages.length) return;
      const res = await fetchPage<T>(baseUrl, jenis, restPages[i]);
      chunks[i] = res.data;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, restPages.length) }, worker),
  );
  for (const chunk of chunks) if (chunk) items.push(...chunk);

  return { items, total: first.total ?? items.length, pages: lastPage };
}
