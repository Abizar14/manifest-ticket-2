import { BoardingProgress, Flight, ScanEvent } from "./types";
import { manifestDedupKey } from "./manifest";

/**
 * Kunci dedup penumpang dari sebuah scan event: tiket→PNR (sama dengan manifest
 * & backend). Fallback ke seat+ticket+pnr bila keduanya kosong agar tetap unik.
 */
function paxKey(e: ScanEvent): string {
  return (
    manifestDedupKey(e.parsedTicketNumber, e.parsedPnr) ??
    `${e.parsedSeatNumber ?? ""}-${e.parsedTicketNumber ?? ""}-${e.parsedPnr ?? ""}`
  );
}

/**
 * Hitung jumlah penumpang boarded untuk satu flight.
 * Boarded = unique (tiket→PNR) yang punya minimal 1 scan VALID_FLIGHT dengan
 * flightId yang cocok. Pakai dedup yang sama dengan manifest supaya konsisten.
 */
export function getBoardedCount(
  flightId: string,
  events: ScanEvent[],
): number {
  const keys = new Set<string>();
  for (const e of events) {
    if (e.resultStatus !== "VALID_FLIGHT") continue;
    if (e.flightId !== flightId) continue;
    keys.add(paxKey(e));
  }
  return keys.size;
}

/**
 * Bangun index `flightId -> jumlah boarded` SEKALI dari seluruh events (O(events)).
 * Dipakai oleh halaman yang me-render banyak flight (dashboard/flights/insights)
 * agar tidak men-scan ulang semua events per-flight (hindari O(flight × events)).
 */
export function buildBoardedCounts(events: ScanEvent[]): Map<string, number> {
  const sets = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.resultStatus !== "VALID_FLIGHT") continue;
    if (!e.flightId) continue;
    const key = paxKey(e);
    let set = sets.get(e.flightId);
    if (!set) {
      set = new Set<string>();
      sets.set(e.flightId, set);
    }
    set.add(key);
  }
  const counts = new Map<string, number>();
  for (const [id, set] of sets) counts.set(id, set.size);
  return counts;
}

/**
 * Versi cepat (O(1)): hitung progress dari jumlah boarded yang sudah disiapkan
 * via buildBoardedCounts(). Logika expected/percent/tone identik dengan
 * getBoardingProgress.
 */
export function boardingProgressFromCount(
  flight: Flight,
  boarded: number,
): BoardingProgress {
  const expected =
    typeof flight.expectedPax === "number" && flight.expectedPax > 0
      ? flight.expectedPax
      : null;

  if (expected === null) {
    return {
      boarded,
      expected: null,
      remaining: null,
      percent: null,
      tone: "neutral",
    };
  }

  const remaining = Math.max(0, expected - boarded);
  const percent = Math.min(100, Math.round((boarded / expected) * 100));
  const tone: BoardingProgress["tone"] =
    percent >= 100
      ? "success"
      : percent >= 90
        ? "warning"
        : percent >= 50
          ? "info"
          : "neutral";

  return { boarded, expected, remaining, percent, tone };
}

/** Convenience single-flight (O(events)) — untuk halaman detail 1 flight. */
export function getBoardingProgress(
  flight: Flight,
  events: ScanEvent[],
): BoardingProgress {
  return boardingProgressFromCount(flight, getBoardedCount(flight.id, events));
}
