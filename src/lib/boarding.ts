import { BoardingProgress, Flight, ScanEvent } from "./types";

/**
 * Hitung jumlah penumpang boarded untuk satu flight.
 * Boarded = unique (pnr+seat+ticket) yang punya minimal 1 scan VALID_FLIGHT
 * dengan flightId yang cocok. Pakai dedup yang sama dengan halaman detail
 * supaya konsisten.
 */
export function getBoardedCount(
  flightId: string,
  events: ScanEvent[],
): number {
  const keys = new Set<string>();
  for (const e of events) {
    if (e.resultStatus !== "VALID_FLIGHT") continue;
    if (e.flightId !== flightId) continue;
    const key = `${e.parsedPnr ?? ""}-${e.parsedSeatNumber ?? ""}-${e.parsedTicketNumber ?? ""}`;
    keys.add(key);
  }
  return keys.size;
}

export function getBoardingProgress(
  flight: Flight,
  events: ScanEvent[],
): BoardingProgress {
  const boarded = getBoardedCount(flight.id, events);
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
