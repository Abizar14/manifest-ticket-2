"use client";

import {
  Flight,
  ParsedBarcode,
  ScanEvent,
  ScanResultStatus,
} from "./types";
import {
  addScanEvent,
  getFlights,
  getScanEvents,
  updateScanEvent,
} from "./storage";
import { todayDateString, uid } from "./utils";
import { getSettings } from "./settings";
import { getEffectiveFlightStatus } from "./flightStatus";
import { facePhotoStore } from "./facePhotoStore";

/**
 * Mendukung dua format barcode:
 * 1. IATA BCBP (Bar Coded Boarding Pass) — standar boarding pass asli
 *    contoh: "M1YUSUF/AJIE MUH      EUHXURZ AAPBEJIW 1484 153Y001C0035 100"
 * 2. Format MVP pipe-separated:
 *    "FLIGHT|PNR|TICKET|SEAT"             contoh: "GA123|AB12CD|990001|12A"
 *    "FLIGHT|PNR|TICKET|SEAT|NAME"        contoh: "GA123|AB12CD|990001|12A|BUDI SANTOSO"
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
function parseIataBcbp(raw: string): ParsedBarcode | null {
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

export interface ValidationOutcome {
  status: ScanResultStatus;
  message: string;
  flight: Flight | null;
  parsed: ParsedBarcode | null;
}

export function validateBarcode(raw: string): ValidationOutcome {
  const cleaned = (raw ?? "").trim();
  if (!cleaned) {
    return {
      status: "INVALID_BARCODE",
      message: "Barcode kosong. Silakan scan ulang.",
      flight: null,
      parsed: null,
    };
  }

  const parsed = parseBarcode(cleaned);
  if (!parsed) {
    return {
      status: "INVALID_BARCODE",
      message:
        "Format barcode tidak valid. Format harus: FLIGHT|PNR|TICKET|SEAT.",
      flight: null,
      parsed: null,
    };
  }

  const today = todayDateString();
  const flights = getFlights();

  const flight = flights.find(
    (f) => f.flightNumber.toUpperCase() === parsed.flightNumber.toUpperCase(),
  );

  if (!flight) {
    return {
      status: "UNKNOWN_FLIGHT",
      message: `Flight ${parsed.flightNumber} tidak terdaftar.`,
      flight: null,
      parsed,
    };
  }

  if (flight.departureDate !== today) {
    return {
      status: "FLIGHT_NOT_TODAY",
      message: `Flight ${flight.flightNumber} bukan untuk hari ini (jadwal: ${flight.departureDate}).`,
      flight,
      parsed,
    };
  }

  const effective = getEffectiveFlightStatus(flight, new Date(), getSettings());
  if (effective.status !== "OPEN" && effective.status !== "ACTIVE") {
    return {
      status: "FLIGHT_NOT_ACTIVE",
      message: `Flight ${flight.flightNumber}: ${effective.description}`,
      flight,
      parsed,
    };
  }

  // Duplicate check: same raw barcode scanned today AGAINST THE CURRENT flight.
  // Match on flight.id supaya flight yang dihapus lalu dibuat ulang
  // (id berbeda) tidak ikut menghitung scan lama sebagai duplicate.
  const events = getScanEvents();
  const dup = events.find(
    (e) =>
      e.rawBarcode === cleaned &&
      e.resultStatus === "VALID_FLIGHT" &&
      e.flightId === flight.id &&
      e.scannedAt.slice(0, 10) === today,
  );
  if (dup) {
    return {
      status: "DUPLICATE_SCAN",
      message: `Barcode sudah pernah di-scan pada ${new Date(
        dup.scannedAt,
      ).toLocaleTimeString("id-ID")}.`,
      flight,
      parsed,
    };
  }

  return {
    status: "VALID_FLIGHT",
    message: `Boarding pass valid untuk ${flight.flightNumber} → ${flight.destinationAirport}.`,
    flight,
    parsed,
  };
}

export function processScan(
  raw: string,
  scannedBy: string,
): { outcome: ValidationOutcome; event: ScanEvent } {
  const outcome = validateBarcode(raw);
  const event: ScanEvent = {
    id: uid("scn"),
    rawBarcode: (raw ?? "").trim(),
    parsedFlightNumber: outcome.parsed?.flightNumber ?? null,
    parsedPnr: outcome.parsed?.pnr ?? null,
    parsedTicketNumber: outcome.parsed?.ticketNumber ?? null,
    parsedSeatNumber: outcome.parsed?.seatNumber ?? null,
    parsedPassengerName: outcome.parsed?.passengerName ?? null,
    resultStatus: outcome.status,
    message: outcome.message,
    flightId: outcome.flight?.id ?? null,
    scannedBy,
    scannedAt: new Date().toISOString(),
  };
  addScanEvent(event);
  return { outcome, event };
}

/**
 * Sama dengan processScan, plus attach foto wajah dari callback getFaceBlob.
 * Capture berjalan paralel & punya timeout pendek — jika gagal, ScanEvent
 * tetap tersimpan tanpa foto (capture tidak boleh memblok validasi scan).
 */
export async function processScanWithFace(
  raw: string,
  scannedBy: string,
  getFaceBlob: () => Promise<Blob | null>,
  options?: { timeoutMs?: number },
): Promise<{ outcome: ValidationOutcome; event: ScanEvent }> {
  const timeoutMs = options?.timeoutMs ?? 300;
  const { outcome, event } = processScan(raw, scannedBy);
  try {
    const blob = await Promise.race([
      getFaceBlob(),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    if (blob) {
      await facePhotoStore.save(event.id, blob);
      updateScanEvent(event.id, { faceCaptureId: event.id });
      event.faceCaptureId = event.id;
    }
  } catch {
    /* capture gagal — scan tetap valid */
  }
  return { outcome, event };
}

/* Web Audio feedback */
export function playFeedbackSound(status: ScanResultStatus) {
  if (typeof window === "undefined") return;
  try {
    // Lazy import keeps this module SSR-safe and avoids a circular dep.
    const { getSettings } = require("./settings") as typeof import("./settings");
    if (!getSettings().soundOn) return;
  } catch {
    /* fallback: allow sound if settings unavailable */
  }
  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    let freq = 880;
    let duration = 0.18;
    if (status === "VALID_FLIGHT") {
      freq = 1100;
      duration = 0.18;
    } else if (status === "DUPLICATE_SCAN") {
      freq = 660;
      duration = 0.25;
    } else {
      freq = 220;
      duration = 0.35;
    }
    osc.frequency.value = freq;
    osc.type = status === "VALID_FLIGHT" ? "sine" : "square";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + duration,
    );
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close().catch(() => {}), duration * 1000 + 100);
  } catch {
    /* ignore */
  }
}

/* Haptic feedback (mobile) — gated by user settings */
export function playFeedbackHaptic(status: ScanResultStatus) {
  if (typeof window === "undefined") return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    const { getSettings } = require("./settings") as typeof import("./settings");
    if (!getSettings().hapticOn) return;
  } catch {
    /* allow vibrate if settings unavailable */
  }
  try {
    if (status === "VALID_FLIGHT") navigator.vibrate(40);
    else if (status === "DUPLICATE_SCAN") navigator.vibrate([30, 60, 30]);
    else navigator.vibrate([80, 40, 80]);
  } catch {
    /* ignore */
  }
}
