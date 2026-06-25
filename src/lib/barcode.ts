import { ParsedBarcode } from "./types";

/**
 * Parser barcode boarding pass (modul MURNI — tanpa dependensi browser/storage,
 * supaya bisa di-unit-test). Mendukung dua format:
 *
 * 1. IATA BCBP (Bar Coded Boarding Pass) — standar boarding pass asli,
 *    contoh: "M1YUSUF/AJIE MUH      EUHXURZ AAPBEJIW 1484 153Y001C0035 100"
 * 2. Format MVP pipe-separated:
 *    "FLIGHT|PNR|TICKET|SEAT"        contoh: "GA123|AB12CD|990001|12A"
 *    "FLIGHT|PNR|TICKET|SEAT|NAME"   contoh: "GA123|AB12CD|990001|12A|BUDI SANTOSO"
 */
export function parseBarcode(raw: string): ParsedBarcode | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;

  const bcbp = parseIataBcbp(trimmed);
  if (bcbp) return bcbp;

  const parts = trimmed.split("|");
  if (parts.length === 4 || parts.length === 5) {
    const [flightNumber, pnr, ticketNumber, seatNumber, passengerName] =
      parts.map((p) => p.trim());
    if (flightNumber && pnr && ticketNumber && seatNumber) {
      return {
        flightNumber,
        pnr,
        ticketNumber,
        seatNumber,
        passengerName:
          passengerName && passengerName.length > 0 ? passengerName : null,
      };
    }
  }

  return null;
}

function formatBcbpName(raw: string): string | null {
  const clean = raw.trim();
  if (!clean) return null;
  // BCBP convention: LASTNAME/FIRSTNAME(MIDDLE)
  const [last, first] = clean.split("/");
  if (last && first) {
    return `${first.trim()} ${last.trim()}`.replace(/\s+/g, " ").trim();
  }
  return clean;
}

/**
 * Parser IATA Resolution 792 Mandatory Items (kira-kira 60 karakter pertama).
 *   pos 0      : 'M'
 *   pos 1      : jumlah leg (1-9)
 *   pos 2-21   : nama penumpang (20 char)
 *   pos 22     : 'E' / ' '
 *   pos 23-29  : PNR / booking code (7 char)
 *   pos 30-32  : origin (3 char)
 *   pos 33-35  : destination (3 char)
 *   pos 36-38  : kode maskapai (3 char, space-padded)
 *   pos 39-43  : nomor flight (5 char, zero-padded)
 *   pos 44-46  : Julian date (day-of-year, 3 char)
 *   pos 47     : compartment / class
 *   pos 48-51  : nomor seat (4 char, contoh "001C")
 *   pos 52-56  : sequence number (5 char)
 *   pos 57     : status
 */
export function parseIataBcbp(raw: string): ParsedBarcode | null {
  if (!/^M\d/.test(raw)) return null;
  if (raw.length < 58) return null;

  const nameRaw = raw.substring(2, 22);
  const pnr = raw.substring(23, 30).trim();
  const airline = raw.substring(36, 39).trim();
  const flightNumRaw = raw.substring(39, 44).trim();
  const flightNum = flightNumRaw.replace(/^0+/, "") || flightNumRaw;
  const seatRaw = raw.substring(48, 52).trim();
  const seat = seatRaw.replace(/^0+/, "") || seatRaw;
  const seq = raw.substring(52, 57).trim().replace(/^0+/, "") || "0";

  if (!airline || !flightNum) return null;

  return {
    flightNumber: `${airline}${flightNum}`.toUpperCase(),
    pnr: pnr || "—",
    ticketNumber: seq || "—",
    seatNumber: seat || "—",
    passengerName: formatBcbpName(nameRaw),
  };
}
