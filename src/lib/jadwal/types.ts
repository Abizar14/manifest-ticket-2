/**
 * Tipe NORMALISASI jadwal FIDS — bentuk bersih yang dikirim Route Handler ke
 * klien & dipakai UI. Murni (tanpa "use client"), bisa diimpor server maupun
 * browser, dan aman untuk unit test.
 */

/** Kode bandara home (APT Pranoto, Samarinda) — origin keberangkatan & tujuan kedatangan. */
export const HOME_IATA = "AAP";

export interface JadwalKeberangkatan {
  id: string; // "fids-kb-<id>"
  tanggal: string; // "YYYY-MM-DD"
  jam: string; // "HH:mm"
  flightNumber: string; // "IU641" (ternormalisasi)
  airlineCode: string; // IATA "IU"
  airlineName: string; // dari API ("Super Air Jet")
  destinationIata: string; // "SUB"
  destinationName: string; // "JUANDA"
  destinationCity: string; // "SURABAYA / JAWA TIMUR"
  gate: string | null; // "A2"
  counter: number | null; // nomor konter check-in (null bila 0)
  remark: string | null; // status FIDS ("Scheduled")
  aircraftType: string | null; // jenis pesawat ("Boeing"/"Airbus"/"ATR")
  capacity: number | null; // kapasitas dari FIDS (null bila 0/tak ada)
  isExtra: boolean;
  keterangan: string | null;
  reason: string | null;
}

export interface JadwalKedatangan {
  id: string; // "fids-kd-<id>"
  tanggal: string;
  jam: string;
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  originIata: string; // "SUB"
  originName: string; // "JUANDA"
  originCity: string;
  conveyor: number | null; // nomor conveyor bagasi (null bila 0)
  remark: string | null;
  isExtra: boolean;
  keterangan: string | null;
  reason: string | null;
}

/** Envelope hasil proxy /api/jadwal/*. */
export interface JadwalResponse<T> {
  ok: boolean;
  items: T[];
  total: number;
  pages: number;
  fetchedAt: string; // ISO
  error?: string;
}

// ─────────────────────────── Helper murni ───────────────────────────

/**
 * "IU-641" / "iu 641" → "IU641". Hapus pemisah & uppercase agar cocok dengan
 * output parser BCBP (mis. "IW1484") di scanService.
 */
export function normalizeFlightNumber(kode: string): string {
  return (kode ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

/**
 * Ambil kode maskapai IATA dari kode penerbangan: "IU-641" → "IU".
 * Fallback: 2 karakter alfabet pertama dari hasil normalisasi.
 */
export function airlineCodeFromKode(kode: string): string {
  const head = (kode ?? "").split(/[-\s]/)[0]?.trim().toUpperCase();
  if (head && /^[A-Z0-9]{2,3}$/.test(head)) return head;
  const norm = normalizeFlightNumber(kode);
  const m = norm.match(/^[A-Z]{2,3}/);
  return m ? m[0] : norm.slice(0, 2);
}

/**
 * Estimasi jumlah penumpang default untuk flight FIDS (kapasitas tak selalu
 * dikirim API). Pakai kapasitas asli bila ada, selain itu tebak dari jenis
 * pesawat: ATR ≈ 72, Boeing/Airbus ≈ 180, lainnya 150.
 */
export function expectedPaxFor(
  capacity: number | null,
  aircraftType: string | null,
): number {
  if (capacity && capacity > 0) return capacity;
  const t = (aircraftType ?? "").toLowerCase();
  if (t.includes("atr")) return 72;
  if (t.includes("boeing") || t.includes("airbus")) return 180;
  return 150;
}
