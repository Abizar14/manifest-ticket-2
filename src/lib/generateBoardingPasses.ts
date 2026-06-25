/**
 * Generator boarding pass dari jadwal penerbangan yang tersedia (getFlights()).
 * Untuk TIAP flight dibuat N boarding pass (default 10) dengan data penumpang
 * deterministik — hasil sama tiap render (QR stabil), tidak acak per refresh.
 *
 * Payload barcode mengikuti format yang dipahami scanService:
 *   FLIGHT|PNR|TICKET|SEAT|NAME
 * sehingga boarding pass hasil generate bisa langsung di-scan dari layar.
 */

import type { SeedBoardingPass } from "./seedBoardingPasses";
import type { Flight } from "./types";

const FIRST_NAMES = [
  "Budi", "Siti", "Andi", "Rina", "Hendra", "Dewi", "Ahmad", "Putri",
  "Bayu", "Maya", "Rizky", "Indah", "Galih", "Joko", "Nadia", "Reza",
  "Fitri", "Eko", "Tono", "Sari", "Bambang", "Citra", "Ardi", "Yusuf",
  "Lestari", "Agus", "Wulan", "Dimas", "Ayu", "Fajar", "Ningsih", "Surya",
];

const LAST_NAMES = [
  "Santoso", "Aminah", "Wijaya", "Kusuma", "Saputra", "Maharani", "Fauzi",
  "Lestari", "Pratama", "Hidayat", "Permata", "Nugraha", "Susilo", "Mahendra",
  "Cahaya", "Prasetyo", "Hartono", "Riyadi", "Anggraini", "Pranata", "Halim",
  "Setiawan", "Rahmawati", "Gunawan", "Utami", "Firmansyah", "Puspita",
];

/** Peta IATA → kota (kosmetik untuk tampilan). Fallback ke kode IATA. */
const IATA_CITY: Record<string, string> = {
  AAP: "Samarinda", CGK: "Jakarta", HLP: "Jakarta", DPS: "Denpasar",
  SUB: "Surabaya", KNO: "Medan", UPG: "Makassar", BPN: "Balikpapan",
  SIN: "Singapura", JOG: "Yogyakarta", YIA: "Yogyakarta", SRG: "Semarang",
  BDO: "Bandung", PLM: "Palembang", PKU: "Pekanbaru", PDG: "Padang",
  BTH: "Batam", SOC: "Solo", MLG: "Malang", LOP: "Lombok", KOE: "Kupang",
  AMQ: "Ambon", DJJ: "Jayapura", MDC: "Manado", PNK: "Pontianak",
  BDJ: "Banjarmasin", TRK: "Tarakan", BEJ: "Berau", PKY: "Palangkaraya",
  TJQ: "Tanjung Pandan", LBJ: "Labuan Bajo", BWX: "Banyuwangi",
};

const SEAT_LETTERS = "ABCDEF";

/** Hash string deterministik (djb-ish) → unsigned 32-bit. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function cityOf(iata: string): string {
  const key = (iata || "").toUpperCase();
  return IATA_CITY[key] ?? key ?? "—";
}

/** "HH:mm" dikurangi N menit (untuk boarding time). Aman bila format aneh. */
function minusMinutes(hhmm: string, mins: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || "").trim());
  if (!m) return hhmm || "—";
  let total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) - mins;
  total = ((total % 1440) + 1440) % 1440; // wrap 24 jam
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${h}:${mm}`;
}

/** PNR 6 karakter alfanumerik deterministik dari seed. */
function makePnr(seed: number): string {
  const raw =
    (seed.toString(36) + (seed * 2654435761).toString(36)).toUpperCase();
  const clean = raw.replace(/[^A-Z0-9]/g, "");
  return (clean + "ABCDEF").slice(0, 6);
}

/**
 * Bangun N boarding pass per flight. Hanya flight yang TIDAK dibatalkan yang
 * dipakai (CANCELLED dilewati — tak ada penumpang boarding).
 */
export function buildBoardingPassesFromFlights(
  flights: Flight[],
  perFlight = 10,
): SeedBoardingPass[] {
  const out: SeedBoardingPass[] = [];
  for (const f of flights) {
    if (f.status === "CANCELLED") continue;
    const gate = (f.gateOrCheckpoint || "—").replace(/^Gate\s+/i, "");
    for (let i = 0; i < perFlight; i++) {
      const h = hashStr(`${f.flightNumber}|${f.departureDate}|${i}`);
      const first = FIRST_NAMES[h % FIRST_NAMES.length];
      const last = LAST_NAMES[(h >>> 5) % LAST_NAMES.length];
      const row = Math.floor(i / SEAT_LETTERS.length) + 1;
      const seat = `${row}${SEAT_LETTERS[i % SEAT_LETTERS.length]}`;
      out.push({
        id: `${f.id}-bp-${String(i + 1).padStart(2, "0")}`,
        airlineCode: f.airlineCode,
        flightNumber: f.flightNumber,
        origin: f.originAirport,
        originCity: cityOf(f.originAirport),
        destination: f.destinationAirport,
        destinationCity: cityOf(f.destinationAirport),
        passengerName: `${first} ${last}`,
        seat,
        pnr: makePnr(h),
        ticket: String(100000 + (h % 900000)),
        cabinClass: i < 2 ? "Business" : "Economy",
        gate,
        boardingTime: minusMinutes(f.departureTime, 30),
        departureDate: f.departureDate,
      });
    }
  }
  return out;
}
