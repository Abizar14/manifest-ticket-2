import { describe, it, expect } from "vitest";
import { parseBarcode, parseIataBcbp } from "../barcode";

describe("parseBarcode — format pipe (MVP)", () => {
  it("parse 4 field (tanpa nama)", () => {
    const r = parseBarcode("GA123|AB12CD|990001|12A");
    expect(r).toEqual({
      flightNumber: "GA123",
      pnr: "AB12CD",
      ticketNumber: "990001",
      seatNumber: "12A",
      passengerName: null,
      flightDate: null,
    });
  });

  it("parse 5 field (dengan nama)", () => {
    const r = parseBarcode("GA123|AB12CD|990001|12A|BUDI SANTOSO");
    expect(r?.passengerName).toBe("BUDI SANTOSO");
    expect(r?.flightNumber).toBe("GA123");
    expect(r?.flightDate).toBeNull(); // tanpa field ke-6 → tanggal null
  });

  it("parse 6 field (dengan tanggal) → flightDate terisi", () => {
    const r = parseBarcode("GA123|AB12CD|990001|12A|BUDI SANTOSO|2026-07-06");
    expect(r?.flightDate).toBe("2026-07-06");
    expect(r?.passengerName).toBe("BUDI SANTOSO");
  });

  it("trim spasi di tiap field", () => {
    const r = parseBarcode("  GA123 | AB12CD | 990001 | 12A ");
    expect(r?.flightNumber).toBe("GA123");
    expect(r?.seatNumber).toBe("12A");
  });

  it("tolak field kurang / kosong", () => {
    expect(parseBarcode("")).toBeNull();
    expect(parseBarcode("GA123|AB12CD|990001")).toBeNull(); // 3 field
    expect(parseBarcode("GA123||990001|12A")).toBeNull(); // pnr kosong
  });
});

describe("parseIataBcbp — format BCBP IATA 792", () => {
  // Susun string BCBP presisi sesuai posisi parser.
  const bcbp =
    "M1" +
    "YUSUF/AJIE MUH      " + // name (20)
    "E" + // pos22
    "UHXURZ " + // pnr (7)
    "AAP" + // origin
    "BEJ" + // dest
    "IW " + // airline (3)
    "01484" + // flight (5)
    "153" + // julian
    "Y" + // class
    "001C" + // seat (4)
    "0035 " + // seq (5)
    "1"; // status

  it("panjang string benar (58)", () => {
    expect(bcbp.length).toBe(58);
  });

  it("ekstrak field utama dengan benar", () => {
    const r = parseIataBcbp(bcbp);
    expect(r).not.toBeNull();
    expect(r?.flightNumber).toBe("IW1484"); // airline + flight, leading 0 dibuang
    expect(r?.pnr).toBe("UHXURZ");
    expect(r?.seatNumber).toBe("1C"); // 001C → 1C
    expect(r?.ticketNumber).toBe("35"); // 0035 → 35
    expect(r?.passengerName).toBe("AJIE MUH YUSUF"); // first + last
  });

  it("parseBarcode mendeteksi BCBP otomatis", () => {
    const r = parseBarcode(bcbp);
    expect(r?.flightNumber).toBe("IW1484");
  });

  it("tolak string non-BCBP / terlalu pendek", () => {
    expect(parseIataBcbp("X1ABC")).toBeNull();
    expect(parseIataBcbp("M1SHORT")).toBeNull();
  });
});
