import { describe, it, expect } from "vitest";
import {
  getBoardedCount,
  buildBoardedCounts,
  boardingProgressFromCount,
} from "../boarding";
import type { Flight, ScanEvent, FlightStatus } from "../types";

// Hanya field yang dibaca boarding.ts yang diisi; sisanya di-cast.
function ev(o: Partial<ScanEvent>): ScanEvent {
  return o as ScanEvent;
}

const FLIGHT_ID = "flt_1";
const events: ScanEvent[] = [
  ev({ resultStatus: "VALID_FLIGHT", flightId: FLIGHT_ID, parsedPnr: "A", parsedSeatNumber: "1A", parsedTicketNumber: "100" }),
  // duplikat persis → tidak dihitung dua kali
  ev({ resultStatus: "VALID_FLIGHT", flightId: FLIGHT_ID, parsedPnr: "A", parsedSeatNumber: "1A", parsedTicketNumber: "100" }),
  ev({ resultStatus: "VALID_FLIGHT", flightId: FLIGHT_ID, parsedPnr: "B", parsedSeatNumber: "1B", parsedTicketNumber: "101" }),
  // status bukan VALID_FLIGHT → diabaikan
  ev({ resultStatus: "DUPLICATE_SCAN", flightId: FLIGHT_ID, parsedPnr: "C", parsedSeatNumber: "1C", parsedTicketNumber: "102" }),
  // flight lain → tidak dihitung untuk FLIGHT_ID
  ev({ resultStatus: "VALID_FLIGHT", flightId: "flt_2", parsedPnr: "D", parsedSeatNumber: "1D", parsedTicketNumber: "103" }),
];

describe("getBoardedCount", () => {
  it("dedup penumpang & hormati status + flightId", () => {
    expect(getBoardedCount(FLIGHT_ID, events)).toBe(2); // A & B unik
    expect(getBoardedCount("flt_2", events)).toBe(1); // D
    expect(getBoardedCount("flt_X", events)).toBe(0);
  });
});

describe("buildBoardedCounts", () => {
  it("index per flight konsisten dengan getBoardedCount", () => {
    const counts = buildBoardedCounts(events);
    expect(counts.get(FLIGHT_ID)).toBe(2);
    expect(counts.get("flt_2")).toBe(1);
  });
});

describe("boardingProgressFromCount", () => {
  const flight = (expectedPax?: number): Flight =>
    ({
      id: FLIGHT_ID,
      expectedPax,
      status: "OPEN" as FlightStatus,
    }) as Flight;

  it("expectedPax null → tone neutral, percent null", () => {
    const p = boardingProgressFromCount(flight(undefined), 5);
    expect(p.expected).toBeNull();
    expect(p.percent).toBeNull();
    expect(p.tone).toBe("neutral");
  });

  it("hitung remaining & percent", () => {
    const p = boardingProgressFromCount(flight(100), 45);
    expect(p.remaining).toBe(55);
    expect(p.percent).toBe(45);
    expect(p.tone).toBe("neutral"); // <50
  });

  it("tone berubah sesuai ambang (info/warning/success)", () => {
    expect(boardingProgressFromCount(flight(100), 60).tone).toBe("info"); // ≥50
    expect(boardingProgressFromCount(flight(100), 95).tone).toBe("warning"); // ≥90
    expect(boardingProgressFromCount(flight(100), 100).tone).toBe("success"); // ≥100
  });

  it("percent di-cap 100 & remaining tak negatif", () => {
    const p = boardingProgressFromCount(flight(100), 120);
    expect(p.percent).toBe(100);
    expect(p.remaining).toBe(0);
  });
});
