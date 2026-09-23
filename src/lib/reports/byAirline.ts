/**
 * Agregasi rekap penumpang per maskapai (murni, dapat di-unit-test).
 * Lihat docs/RANCANGAN-PAX-PER-MASKAPAI.md.
 *
 * Input di-desain agnostik sumber: caller menyuplai daftar Flight + peta
 * jumlah pax per flightId (bisa dari manifest lokal / boarded count / server),
 * sehingga fungsi ini tak bergantung localStorage maupun backend.
 */

import type { Flight } from "../types";

export interface AirlineRollupFlight {
  flightId: string;
  flightNumber: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  airlineCode: string;
  passengers: number;
}

export interface AirlineRollup {
  airlineCode: string;
  passengers: number;
  flights: number;
  flightsDetail: AirlineRollupFlight[];
}

export interface ByAirlineReport {
  range: { from: string; to: string };
  totals: { passengers: number; flights: number; airlines: number };
  airlines: AirlineRollup[];
}

/** Cocok bila tanggal flight (YYYY-MM-DD) berada dalam [from, to] inklusif. */
function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/**
 * Bangun rekap per maskapai untuk rentang tanggal [from, to] inklusif.
 * `paxCounts` = Map flightId → jumlah pax boarded. Flight tanpa entri = 0 pax.
 * Maskapai yang punya ≥1 penerbangan di rentang akan muncul (pax bisa 0),
 * diurut jumlah pax menurun lalu kode maskapai.
 */
export function buildByAirlineReport(
  flights: Flight[],
  paxCounts: Map<string, number>,
  from: string,
  to: string,
): ByAirlineReport {
  const byAirline = new Map<string, AirlineRollup>();
  let totalPassengers = 0;
  let totalFlights = 0;

  for (const f of flights) {
    if (!inRange(f.departureDate, from, to)) continue;
    const code = (f.airlineCode || "??").toUpperCase();
    const pax = paxCounts.get(f.id) ?? 0;

    let group = byAirline.get(code);
    if (!group) {
      group = { airlineCode: code, passengers: 0, flights: 0, flightsDetail: [] };
      byAirline.set(code, group);
    }
    group.passengers += pax;
    group.flights += 1;
    group.flightsDetail.push({
      flightId: f.id,
      flightNumber: f.flightNumber,
      departureDate: f.departureDate,
      departureTime: f.departureTime,
      airlineCode: code,
      passengers: pax,
    });

    totalPassengers += pax;
    totalFlights += 1;
  }

  const airlines = Array.from(byAirline.values()).sort(
    (a, b) =>
      b.passengers - a.passengers || a.airlineCode.localeCompare(b.airlineCode),
  );
  // Urut penerbangan tiap maskapai: tanggal lalu jam.
  for (const a of airlines) {
    a.flightsDetail.sort(
      (x, y) =>
        x.departureDate.localeCompare(y.departureDate) ||
        x.departureTime.localeCompare(y.departureTime),
    );
  }

  return {
    range: { from, to },
    totals: {
      passengers: totalPassengers,
      flights: totalFlights,
      airlines: airlines.length,
    },
    airlines,
  };
}
