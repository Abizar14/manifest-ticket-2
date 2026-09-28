"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FlaskConical,
  ScanLine,
  X,
} from "lucide-react";
import { CameraScanner } from "@/components/scan/CameraScanner";
import { parseBarcode } from "@/lib/barcode";
import { airlineCodeOf, departureTimeSoon } from "@/lib/dummyFlight";
import { applyTestFlightForBarcode } from "@/lib/testFlights";
import { getFlights } from "@/lib/storage";
import { cn, todayDateString } from "@/lib/utils";
import type { FlightStatus } from "@/lib/types";

export interface FlightDraftFromPass {
  flightNumber: string;
  airlineCode: string;
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  departureTime: string;
  status: FlightStatus;
  /** Simpan sebagai penerbangan uji (tanggal barcode diabaikan saat scan). */
  isTest: boolean;
}

/**
 * Panel "Isi dari boarding pass" untuk form Tambah Penerbangan — alat bantu
 * pengetesan: scan/tempel boarding pass asli → form terisi PENERBANGAN UJI yang
 * cocok (hari ini, OPEN). Setelah disimpan, boarding pass aslinya — tanpa
 * diubah — di-scan VALID walau tanggal di barcode sudah lewat.
 */
export function BoardingPassImport({
  onApply,
}: {
  onApply: (draft: FlightDraftFromPass) => void;
}) {
  const [raw, setRaw] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const parsed = useMemo(() => parseBarcode(raw), [raw]);
  const today = todayDateString();
  // Flight bernomor sama hari ini: `scheduled` = riil (konflik, tak boleh
  // dijadikan uji), `existingTest` = penerbangan uji yang sudah ada.
  const { scheduled, existingTest } = useMemo(
    () => {
      const same = parsed ? sameFlightToday(parsed.flightNumber, today) : [];
      return {
        scheduled: same.find((f) => !f.isTest) ?? null,
        existingTest: same.find((f) => f.isTest) ?? null,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parsed, today, refresh],
  );

  const apply = (value: string) => {
    const p = parseBarcode(value);
    if (!p) return;
    // Sudah ada flight bernomor sama hari ini (riil → konflik; uji → cukup
    // dibuka lagi) → jangan isi form sebagai penerbangan uji baru.
    if (sameFlightToday(p.flightNumber, todayDateString()).length > 0) return;
    onApply({
      flightNumber: p.flightNumber.toUpperCase(),
      airlineCode: airlineCodeOf(p),
      originAirport: p.originAirport ?? "",
      destinationAirport: p.destinationAirport ?? "",
      departureDate: todayDateString(),
      departureTime: departureTimeSoon(new Date()),
      status: "OPEN",
      isTest: true,
    });
  };

  const handleChange = (value: string) => {
    setRaw(value);
    apply(value);
  };

  const reopenTestFlight = () => {
    applyTestFlightForBarcode(raw);
    setRefresh((n) => n + 1);
  };

  const dateShifted = parsed?.flightDate && parsed.flightDate !== today;

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-4 dark:border-sky-500/40 dark:bg-sky-500/5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ScanLine className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-ink">
            Isi dari boarding pass (untuk testing)
          </p>
          <p className="text-[11px] text-slate-500 dark:text-ink-muted">
            Scan dengan scanner, kamera, atau tempel teks barcode. Form terisi
            sebagai <b>penerbangan uji</b> hari ini — setelah disimpan, boarding
            pass ini langsung bisa di-scan VALID apa adanya.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              // Scanner USB mengetik lalu Enter — jangan sampai submit form.
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="M1NAMA/PENUMPANG EPNR    AAPSUBIU 0653 157Y018F0020 100"
            spellCheck={false}
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-8 font-mono text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-hairline dark:bg-surface dark:text-ink"
          />
          {raw && (
            <button
              type="button"
              onClick={() => handleChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Kosongkan"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-surface dark:text-ink dark:ring-hairline"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Kamera</span>
        </button>
      </div>

      {raw && !parsed && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          Barcode tidak dikenali (butuh format BCBP IATA atau
          FLIGHT|PNR|TICKET|SEAT).
        </p>
      )}

      {parsed && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-white/80 p-3 text-xs ring-1 ring-slate-200 dark:bg-surface/60 dark:ring-hairline sm:grid-cols-4">
            <Info label="Flight" value={parsed.flightNumber} mono />
            <Info
              label="Rute"
              value={
                parsed.originAirport
                  ? `${parsed.originAirport} → ${parsed.destinationAirport ?? "?"}`
                  : "—"
              }
              mono
            />
            <Info label="Penumpang" value={parsed.passengerName ?? "—"} />
            <Info
              label="Kursi / PNR"
              value={`${parsed.seatNumber} · ${parsed.pnr}`}
              mono
            />
          </div>

          {scheduled ? (
            <p className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {scheduled.flightNumber} adalah penerbangan terjadwal hari ini —
              tidak bisa dijadikan penerbangan uji (boarding pass lama
              penerbangan riil tidak boleh ikut lolos). Pakai boarding pass
              dengan nomor flight lain.
            </p>
          ) : existingTest &&
            (existingTest.status === "OPEN" ||
              existingTest.status === "ACTIVE") ? (
            <p className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Penerbangan uji {existingTest.flightNumber} hari ini sudah ada —
              boarding pass ini siap di-scan VALID di halaman Scan.
            </p>
          ) : existingTest ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
              <p className="flex min-w-0 flex-1 items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Penerbangan uji {existingTest.flightNumber} berstatus{" "}
                {existingTest.status} — scan akan ditolak. Buka lagi agar
                boarding pass ini bisa di-scan VALID.
              </p>
              <button
                type="button"
                onClick={reopenTestFlight}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Buka penerbangan uji
              </button>
            </div>
          ) : (
            <p className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Form sudah terisi sebagai penerbangan uji — simpan, lalu scan
              boarding pass ini di halaman Scan.
            </p>
          )}

          {dateShifted && (
            <p className="text-[11px] text-slate-500 dark:text-ink-muted">
              Tanggal di barcode {parsed.flightDate} bukan hari ini — pada
              penerbangan uji tanggal ini diabaikan, jadi hasil scan tetap
              VALID.
            </p>
          )}
        </div>
      )}

      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDecode={(value) => {
          setCameraOpen(false);
          handleChange(value);
        }}
      />
    </div>
  );
}

/** Flight lokal bernomor sama pada tanggal ini (riil maupun uji). */
function sameFlightToday(flightNumber: string, today: string) {
  const fn = flightNumber.toUpperCase();
  return getFlights().filter(
    (f) => f.flightNumber.toUpperCase() === fn && f.departureDate === today,
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-ink-muted">
        {label}
      </p>
      <p
        className={cn(
          "truncate font-semibold text-slate-800 dark:text-ink",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}
