import { parseBarcode } from "./barcode";
import type { Flight, ParsedBarcode } from "./types";

/**
 * Alat bantu TESTING: bentuk PENERBANGAN UJI dari boarding pass (asli/BCBP atau
 * format pipe) supaya boarding pass itu — apa adanya, tanpa diubah — bisa
 * di-scan VALID hari ini. Flight uji (`isTest`) membuat validasi mengabaikan
 * tanggal di barcode & jendela boarding (lihat scanService.validateBarcode).
 * Modul murni — tanpa storage, supaya bisa di-unit-test.
 *
 * Pengaman (flight uji melonggarkan validasi, jadi dibatasi ketat):
 *  - fitur hanya aktif bila testFlightsEnabled() — default MATI di produksi;
 *  - flight TERJADWAL (bukan uji) tidak pernah dijadikan uji, dan bila flight
 *    terjadwal bernomor sama ada hari ini, flight uji diabaikan saat validasi
 *    (boarding pass lama penerbangan riil tak boleh ikut lolos);
 *  - scan pada flight uji tidak dikirim ke backend AFVS maupun Sikeren.
 */

/** Penanda gate untuk flight uji (mudah dikenali & dibersihkan di daftar). */
export const DUMMY_GATE = "TEST";

/** Bandara home — dipakai sebagai asal bila barcode tak memuat rute (format pipe). */
const HOME_AIRPORT = "AAP";

function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Fitur penerbangan uji aktif? NEXT_PUBLIC_ENABLE_TEST_FLIGHTS="true"/"false"
 * memaksa nyala/mati; bila tidak diset: nyala di dev, MATI di build produksi.
 * (Diakses literal agar Next meng-inline nilainya di bundle klien.)
 */
export function testFlightsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_TEST_FLIGHTS;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/**
 * Flight uji yang BERLAKU untuk nomor flight ini hari ini, atau null.
 * null bila fitur mati, tak ada flight uji hari ini, atau ada flight
 * terjadwal (bukan uji) bernomor sama hari ini — flight riil selalu menang.
 */
export function activeTestFlight(
  flights: Flight[],
  flightNumber: string,
  today: string,
): Flight | null {
  if (!testFlightsEnabled()) return null;
  const fn = flightNumber.toUpperCase();
  const sameToday = flights.filter(
    (f) => f.flightNumber.toUpperCase() === fn && f.departureDate === today,
  );
  if (sameToday.some((f) => !f.isTest)) return null;
  return sameToday.find((f) => f.isTest) ?? null;
}

/** Jam keberangkatan dummy = sekarang + 45 menit, dibatasi 23:59 agar tetap
 *  hari ini (flight uji mengabaikan jendela boarding — jam hanya informatif). */
export function departureTimeSoon(now: Date): string {
  const t = new Date(now.getTime() + 45 * 60000);
  if (t.getDate() !== now.getDate()) return "23:59";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getHours())}:${p(t.getMinutes())}`;
}

/** Kode maskapai: dari BCBP bila ada, else 2 karakter awal nomor flight. */
export function airlineCodeOf(parsed: ParsedBarcode): string {
  const fn = parsed.flightNumber.toUpperCase();
  return parsed.airlineCode ?? fn.match(/^[A-Z0-9]{2}/)?.[0] ?? "";
}

/**
 * Tentukan perubahan pada daftar flight agar barcode ini VALID hari ini:
 *  - sudah ada flight TERJADWAL bernomor sama hari ini → `conflict` (ditolak:
 *    flight riil tidak boleh dijadikan uji);
 *  - sudah ada flight UJI hari ini → `reopen` (buka lagi bila tak aktif);
 *  - belum ada → flight uji baru (hari ini, jam +45 menit, OPEN, gate TEST).
 * null bila barcode tak dikenali.
 */
export function planTestFlight(
  raw: string,
  flights: Flight[],
  now: Date,
  id: string,
):
  | { kind: "create"; flight: Flight }
  | { kind: "reopen"; flight: Flight; patch: Partial<Flight> }
  | { kind: "conflict"; flight: Flight }
  | null {
  const parsed = parseBarcode(raw);
  if (!parsed) return null;
  const fn = parsed.flightNumber.toUpperCase();
  const today = dateKey(now);

  const sameToday = flights.filter(
    (f) => f.flightNumber.toUpperCase() === fn && f.departureDate === today,
  );
  const scheduled = sameToday.find((f) => !f.isTest);
  if (scheduled) return { kind: "conflict", flight: scheduled };

  const existingTest = sameToday.find((f) => f.isTest);
  if (existingTest) {
    const patch: Partial<Flight> =
      existingTest.status === "OPEN" || existingTest.status === "ACTIVE"
        ? {}
        : { status: "OPEN" };
    return { kind: "reopen", flight: { ...existingTest, ...patch }, patch };
  }

  const iso = now.toISOString();
  return {
    kind: "create",
    flight: {
      id,
      flightNumber: fn,
      airlineCode: airlineCodeOf(parsed),
      originAirport: parsed.originAirport ?? HOME_AIRPORT,
      destinationAirport: parsed.destinationAirport ?? "XXX",
      departureDate: today,
      departureTime: departureTimeSoon(now),
      gateOrCheckpoint: DUMMY_GATE,
      status: "OPEN",
      isTest: true,
      createdAt: iso,
      updatedAt: iso,
    },
  };
}
