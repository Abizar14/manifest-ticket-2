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
import { enqueueValidScan, flushOutbox } from "./sikerenOutbox";
import {
  attachFaceToQueued,
  enqueueScanPush,
  flushApiOutbox,
} from "./api/outbox";

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

const PREVIOUS_SCAN_STATUS_LABEL: Record<ScanResultStatus, string> = {
  VALID_FLIGHT: "valid",
  DUPLICATE_SCAN: "duplicate",
  FLIGHT_NOT_TODAY: "ditolak karena bukan hari ini",
  FLIGHT_NOT_ACTIVE: "ditolak karena flight tidak aktif",
  UNKNOWN_FLIGHT: "ditolak karena flight tidak dikenal",
  INVALID_BARCODE: "ditolak karena barcode invalid",
  KTP_MISMATCH: "ditolak karena KTP tidak cocok",
};

function previousScanNote(rawBarcode: string, events: ScanEvent[]): string {
  const previous = events.find((e) => e.rawBarcode === rawBarcode);
  if (!previous) return "";

  const scannedAt = new Date(previous.scannedAt);
  const date = scannedAt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = scannedAt.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return ` Barcode ini juga pernah di-scan (${PREVIOUS_SCAN_STATUS_LABEL[previous.resultStatus]}) pada ${date} pukul ${time}.`;
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
    const previousNote = previousScanNote(cleaned, getScanEvents());
    return {
      status: "INVALID_BARCODE",
      message:
        `Ditolak: format barcode tidak valid. Format harus: FLIGHT|PNR|TICKET|SEAT.${previousNote}`,
      flight: null,
      parsed: null,
    };
  }

  const today = todayDateString();
  const flights = getFlights();
  const events = getScanEvents();
  const previousNote = previousScanNote(cleaned, events);

  const matches = flights.filter(
    (f) => f.flightNumber.toUpperCase() === parsed.flightNumber.toUpperCase(),
  );

  if (matches.length === 0) {
    return {
      status: "UNKNOWN_FLIGHT",
      message: `Ditolak: flight ${parsed.flightNumber} tidak terdaftar.${previousNote}`,
      flight: null,
      parsed,
    };
  }

  // Kalau ada beberapa flight dengan nomor sama (mis. jadwal beda tanggal atau
  // data seed lama dari hari sebelumnya), utamakan yang JADWALNYA HARI INI &
  // boardable — supaya scan tidak nyangkut ke record basi lalu salah menolak
  // "BUKAN HARI INI". Fallback ke record pertama hanya untuk pesan error.
  const flight =
    matches.find(
      (f) => f.departureDate === today && (f.status === "OPEN" || f.status === "ACTIVE"),
    ) ??
    matches.find((f) => f.departureDate === today) ??
    matches[0];

  if (flight.departureDate !== today) {
    return {
      status: "FLIGHT_NOT_TODAY",
      message: `Ditolak: flight ${flight.flightNumber} bukan penerbangan hari ini (jadwal: ${flight.departureDate}).${previousNote}`,
      flight,
      parsed,
    };
  }

  const effective = getEffectiveFlightStatus(flight, new Date(), getSettings());
  if (effective.status !== "OPEN" && effective.status !== "ACTIVE") {
    return {
      status: "FLIGHT_NOT_ACTIVE",
      message: `Ditolak: flight ${flight.flightNumber} belum bisa divalidasi. ${effective.description}.${previousNote}`,
      flight,
      parsed,
    };
  }

  // Duplicate check: same raw barcode scanned today AGAINST THE CURRENT flight.
  // Match on flight.id supaya flight yang dihapus lalu dibuat ulang
  // (id berbeda) tidak ikut menghitung scan lama sebagai duplicate.
  const dup = events.find(
    (e) =>
      e.rawBarcode === cleaned &&
      e.resultStatus === "VALID_FLIGHT" &&
      e.flightId === flight.id &&
      e.scannedAt.slice(0, 10) === today,
  );
  if (dup) {
    const scannedAt = new Date(dup.scannedAt).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return {
      status: "DUPLICATE_SCAN",
      message: `Duplicate scan: boarding pass ini valid untuk flight ${flight.flightNumber} hari ini (${flight.originAirport} -> ${flight.destinationAirport}, ${flight.gateOrCheckpoint}, seat ${parsed.seatNumber}), tetapi sudah pernah di-scan pukul ${scannedAt}.`,
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
  opts?: { enqueueApiPush?: boolean },
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

  // Sikeren integration: enqueue only on VALID outcome (billable scan).
  if (
    outcome.status === "VALID_FLIGHT" &&
    outcome.flight &&
    outcome.parsed
  ) {
    try {
      enqueueValidScan(event, outcome.flight, outcome.parsed);
      const s = getSettings();
      if (s.sikerenEnabled && s.sikerenSyncMode === "auto") {
        // fire-and-forget: jangan blok hasil scan
        flushOutbox().catch(() => {});
      }
    } catch {
      /* tidak boleh mengganggu hasil scan */
    }
  }

  // Backend AFVS: enqueue semua scan tercatat (audit log) ke outbox.
  // Saat dipanggil dari processScanWithFace, enqueue ditunda sampai foto siap.
  if (opts?.enqueueApiPush !== false) {
    try {
      enqueueScanPush(event);
      flushApiOutbox().catch(() => {});
    } catch {
      /* sync backend tidak boleh mengganggu hasil scan */
    }
  }

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
  // Tunda enqueue backend sampai foto wajah tersimpan (agar foto ikut ter-push).
  const { outcome, event } = processScan(raw, scannedBy, {
    enqueueApiPush: false,
  });
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
  // Sekarang foto (kalau ada) sudah siap → enqueue ke backend & flush.
  try {
    enqueueScanPush(event);
    if (event.faceCaptureId) attachFaceToQueued(event.id, event.faceCaptureId);
    flushApiOutbox().catch(() => {});
  } catch {
    /* sync backend tidak boleh mengganggu hasil scan */
  }
  return { outcome, event };
}

/* Text-to-speech — suara manusia mengucapkan hasil scan (Bahasa Indonesia). */
export function speakFeedback(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel(); // hentikan ucapan sebelumnya agar tidak menumpuk
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "id-ID";
    utter.rate = 1.05;
    utter.pitch = 1.05;
    utter.volume = 1;
    // Pilih voice Bahasa Indonesia bila tersedia di perangkat.
    const voices = synth.getVoices();
    const idVoice =
      voices.find((v) => v.lang?.toLowerCase().startsWith("id")) ?? null;
    if (idVoice) utter.voice = idVoice;
    synth.speak(utter);
  } catch {
    /* ignore */
  }
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

  // Suara manusia untuk hasil scan (di atas nada/beep).
  if (status === "VALID_FLIGHT") speakFeedback("Berhasil");
  else if (status === "DUPLICATE_SCAN") speakFeedback("Tiket sudah dipakai");
  else speakFeedback("Gagal");

  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    /** Mainkan satu nada pada offset waktu tertentu. */
    const note = (
      freq: number,
      start: number,
      dur: number,
      type: OscillatorType = "sine",
      peak = 0.25,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };

    let total = 0.4;
    if (status === "VALID_FLIGHT") {
      // "Ding" pendek sebagai pembuka sebelum suara "Berhasil".
      note(880, 0.0, 0.1, "sine", 0.18);
      note(1318.5, 0.08, 0.14, "sine", 0.18);
      total = 0.25;
    } else if (status === "DUPLICATE_SCAN") {
      // Dua nada datar — peringatan duplikat.
      note(660, 0.0, 0.16, "square", 0.2);
      note(660, 0.2, 0.2, "square", 0.2);
      total = 0.45;
    } else {
      // Buzz turun — gagal / ditolak.
      note(320, 0.0, 0.18, "square", 0.22);
      note(180, 0.16, 0.34, "square", 0.22);
      total = 0.55;
    }
    setTimeout(() => ctx.close().catch(() => {}), total * 1000 + 150);
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
