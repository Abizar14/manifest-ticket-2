import { describe, it, expect } from "vitest";
import { manifestDedupKey, normalizeIdent } from "../manifest";
import { getBoardedCount } from "../boarding";
import type { ScanEvent } from "../types";

function ev(o: Partial<ScanEvent>): ScanEvent {
  return o as ScanEvent;
}

describe("manifestDedupKey (tiket → PNR)", () => {
  it("pakai nomor tiket bila ada, ternormalisasi", () => {
    expect(manifestDedupKey("tik-001", "ABC12")).toBe("TIK001");
    expect(manifestDedupKey(" TIK 001 ", "ABC12")).toBe("TIK001");
  });

  it("fallback ke PNR bila tiket kosong", () => {
    expect(manifestDedupKey(null, "abc12")).toBe("ABC12");
    expect(manifestDedupKey("", "abc-12")).toBe("ABC12");
  });

  it("null bila tiket & PNR sama-sama kosong", () => {
    expect(manifestDedupKey(null, null)).toBeNull();
    expect(manifestDedupKey("", "  ")).toBeNull();
  });

  it("normalizeIdent: trim + uppercase + hapus spasi/strip", () => {
    expect(normalizeIdent(" iu-641 ")).toBe("IU641");
  });
});

describe("dedup tiket→PNR konsisten di boarding count", () => {
  const FID = "flt_1";

  it("tiket sama tapi kursi berubah → tetap 1 penumpang", () => {
    const events = [
      ev({ resultStatus: "VALID_FLIGHT", flightId: FID, parsedPnr: "A", parsedSeatNumber: "12A", parsedTicketNumber: "TIK001" }),
      // check-in ulang, kursi pindah 12A→14C, tiket sama → BUKAN pax baru
      ev({ resultStatus: "VALID_FLIGHT", flightId: FID, parsedPnr: "A", parsedSeatNumber: "14C", parsedTicketNumber: "TIK001" }),
    ];
    expect(getBoardedCount(FID, events)).toBe(1);
  });

  it("tiket beda → 2 penumpang", () => {
    const events = [
      ev({ resultStatus: "VALID_FLIGHT", flightId: FID, parsedPnr: "A", parsedSeatNumber: "12A", parsedTicketNumber: "TIK001" }),
      ev({ resultStatus: "VALID_FLIGHT", flightId: FID, parsedPnr: "A", parsedSeatNumber: "12B", parsedTicketNumber: "TIK002" }),
    ];
    expect(getBoardedCount(FID, events)).toBe(2);
  });

  it("tanpa tiket, pakai PNR sebagai kunci", () => {
    const events = [
      ev({ resultStatus: "VALID_FLIGHT", flightId: FID, parsedPnr: "PNR9", parsedSeatNumber: "1A", parsedTicketNumber: null }),
      ev({ resultStatus: "VALID_FLIGHT", flightId: FID, parsedPnr: "PNR9", parsedSeatNumber: "1B", parsedTicketNumber: null }),
    ];
    expect(getBoardedCount(FID, events)).toBe(1);
  });
});
