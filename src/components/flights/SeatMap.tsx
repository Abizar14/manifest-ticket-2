"use client";

import { useMemo, useState } from "react";
import {
  Plane,
  DoorOpen,
  User,
  ChevronRight,
  Plus,
  Minus,
  Maximize2,
  ShieldCheck,
  X,
  Clock,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { PassengerRecord } from "@/lib/types";

interface Props {
  passengers: PassengerRecord[];
  expectedPax?: number | null;
  onSeatClick?: (passenger: PassengerRecord) => void;
}

const COLS_LEFT = ["A", "B", "C"] as const;
const COLS_RIGHT = ["D", "E", "F"] as const;
const BUSINESS_ROWS = 3;

function parseSeat(seat: string): { row: number; col: string } | null {
  const m = /^(\d+)\s*([A-Z])$/i.exec(seat.trim());
  if (!m) return null;
  return { row: parseInt(m[1], 10), col: m[2].toUpperCase() };
}

export function SeatMap({ passengers, expectedPax, onSeatClick }: Props) {
  const [mobileHalf, setMobileHalf] = useState<"front" | "back">("front");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const { rows, bySeat } = useMemo(() => {
    const map = new Map<string, PassengerRecord>();
    let maxRow = 18;
    for (const p of passengers) {
      const parsed = parseSeat(p.seatNumber);
      if (!parsed) continue;
      const key = `${parsed.row}${parsed.col}`;
      map.set(key, p);
      if (parsed.row > maxRow) maxRow = parsed.row;
    }
    const targetRows =
      expectedPax && expectedPax > 0 ? Math.ceil(expectedPax / 6) : maxRow;
    const finalRows = Math.max(maxRow, Math.min(34, targetRows));
    const rows = Array.from({ length: finalRows }, (_, i) => i + 1);
    return { rows, bySeat: map };
  }, [passengers, expectedPax]);

  const boardedCount = passengers.length;
  const totalSeats = rows.length * 6;
  const half = Math.ceil(rows.length / 2);
  const front = rows.slice(0, half);
  const back = rows.slice(half);
  const wingRow = Math.floor(rows.length * 0.4);
  const wingRowBack = Math.floor(rows.length * 0.8);

  // Stats per kelas
  const ecoTotal = (rows.length - BUSINESS_ROWS) * 6;
  const bizTotal = BUSINESS_ROWS * 6;
  let ecoBoarded = 0;
  let bizBoarded = 0;
  for (const p of passengers) {
    const parsed = parseSeat(p.seatNumber);
    if (!parsed) continue;
    if (parsed.row <= BUSINESS_ROWS) bizBoarded++;
    else ecoBoarded++;
  }

  const selectedPassenger = selectedKey ? bySeat.get(selectedKey) ?? null : null;
  const selectedParsed = selectedKey ? parseSeat(selectedKey) : null;
  const selectedIsBiz = selectedParsed
    ? selectedParsed.row <= BUSINESS_ROWS
    : false;

  function handleSeatClick(key: string) {
    const p = bySeat.get(key);
    if (!p) return;
    setSelectedKey(key);
  }

  function openFullDetail() {
    if (selectedPassenger) onSeatClick?.(selectedPassenger);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 text-white shadow-lg ring-2 ring-white">
            <Plane className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-slate-800">
              Denah Kabin
            </p>
            <p className="text-[10.5px] font-medium text-slate-500">
              Klik kursi hijau untuk lihat detail penumpang
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-emerald-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          {boardedCount} onboarded
        </span>
      </div>

      {/* === 2 column layout: left panel + diagram === */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* ===== LEFT PANEL ===== */}
        <div className="space-y-3">
          {/* Legend grid */}
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
            <p className="mb-2 text-[9.5px] font-bold uppercase tracking-widest text-slate-500">
              Legend
            </p>
            <div className="grid grid-cols-2 gap-2">
              <LegendItem swatch="bg-gradient-to-br from-emerald-400 to-emerald-600" label="Sudah scan" />
              <LegendItem swatch="bg-gradient-to-br from-amber-300 to-amber-500" label="Multi-scan" />
              <LegendItem swatch="bg-gradient-to-br from-indigo-100 to-violet-200 ring-1 ring-indigo-200" label="Business" />
              <LegendItem swatch="bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-slate-300" label="Belum scan" />
            </div>
          </div>

          {/* Kelas Ekonomi */}
          <FillCard
            label="Kelas Ekonomi"
            current={ecoBoarded}
            total={ecoTotal}
            color="from-emerald-400 to-emerald-600"
          />
          {/* Kelas Bisnis */}
          <FillCard
            label="Kelas Bisnis"
            current={bizBoarded}
            total={bizTotal}
            color="from-indigo-400 to-violet-600"
          />

          {/* Kursi Dipilih */}
          <SelectedSeatCard
            selectedKey={selectedKey}
            passenger={selectedPassenger}
            isBusiness={selectedIsBiz}
            onClear={() => setSelectedKey(null)}
            onOpenDetail={openFullDetail}
          />

          {/* Info card */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Data tersinkron otomatis
              </p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-emerald-700/80">
                Setiap kali boarding pass berhasil di-scan, denah kabin
                diperbarui realtime.
              </p>
            </div>
          </div>
        </div>

        {/* ===== RIGHT: DIAGRAM ===== */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-sky-50/70 via-white to-cyan-50/40 p-4 shadow-inner sm:p-5">
          {/* Atmosphere blobs */}
          <div className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-2xl" />
          {/* Faded plane watermark */}
          <Plane className="pointer-events-none absolute right-6 top-6 h-32 w-32 rotate-[24deg] text-slate-100/80" />

          {/* Zoom toolbar */}
          <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-md backdrop-blur">
            <ZoomBtn icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} label="Zoom in" />
            <ZoomBtn icon={<Minus className="h-3.5 w-3.5" />} onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))} label="Zoom out" />
            <ZoomBtn icon={<Maximize2 className="h-3.5 w-3.5" />} onClick={() => setZoom(1)} label="Reset" />
          </div>

          {/* Mobile toggle */}
          <div className="relative mb-3 inline-flex rounded-full bg-white p-0.5 ring-1 ring-slate-200 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileHalf("front")}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold transition",
                mobileHalf === "front"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500",
              )}
            >
              Depan
            </button>
            <button
              type="button"
              onClick={() => setMobileHalf("back")}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold transition",
                mobileHalf === "back"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500",
              )}
            >
              Belakang
            </button>
          </div>

          {/* DEPAN badge */}
          <div className="relative mb-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white shadow-md">
              <Plane className="h-3 w-3 -rotate-90" />
              Depan
            </span>
          </div>

          {/* Scalable diagram inner */}
          <div
            className="relative origin-top transition-transform duration-300"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Top lavatory band */}
            <div className="relative mx-auto grid max-w-3xl grid-cols-2 gap-4 px-2 pr-12 sm:pr-14">
              <LavBand />
              <LavBand />
            </div>

            {/* Seat grids */}
            <div className="relative mx-auto mt-2 grid max-w-3xl grid-cols-1 gap-6 pr-12 sm:grid-cols-2 sm:pr-14">
              <div className={cn(mobileHalf === "front" ? "" : "hidden", "sm:block")}>
                <CabinSection
                  rows={front}
                  bySeat={bySeat}
                  selectedKey={selectedKey}
                  onSeatClick={handleSeatClick}
                  wingRow={wingRow}
                />
              </div>
              <div className={cn(mobileHalf === "back" ? "" : "hidden", "sm:block")}>
                <CabinSection
                  rows={back}
                  bySeat={bySeat}
                  selectedKey={selectedKey}
                  onSeatClick={handleSeatClick}
                  wingRow={wingRowBack}
                />
              </div>
            </div>

            {/* Bottom lavatory band */}
            <div className="relative mx-auto mt-2 grid max-w-3xl grid-cols-2 gap-4 px-2 pr-12 sm:pr-14">
              <LavBand />
              <LavBand />
            </div>
          </div>

          {/* BELAKANG badge */}
          <div className="relative mt-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white shadow-md">
              Belakang
              <Plane className="h-3 w-3 rotate-90" />
            </span>
          </div>

          {/* Bottom inline legend */}
          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
            <BottomLegendPill icon={<DoorOpen className="h-3 w-3 text-rose-500" />} label="Pintu Darurat" />
            <BottomLegendPill
              icon={<span className="grid h-3.5 w-4 place-items-center rounded bg-slate-700 text-[7px] font-black text-white">WC</span>}
              label="Toilet"
            />
            <BottomLegendPill
              icon={<span className="grid h-3.5 w-4 place-items-center rounded bg-amber-500 text-[7px] font-black text-white">G</span>}
              label="Galley"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CabinSection({
  rows,
  bySeat,
  selectedKey,
  onSeatClick,
  wingRow,
}: {
  rows: number[];
  bySeat: Map<string, PassengerRecord>;
  selectedKey: string | null;
  onSeatClick: (key: string) => void;
  wingRow: number;
}) {
  return (
    <div className="relative">
      {/* Column header */}
      <div className="mb-2 grid grid-cols-[1.25rem_repeat(3,minmax(0,1fr))_0.75rem_repeat(3,minmax(0,1fr))_1.25rem] items-center gap-x-1">
        <span aria-hidden />
        {COLS_LEFT.map((c) => (
          <span
            key={c}
            className="text-center text-[9.5px] font-bold uppercase tracking-widest text-slate-400"
          >
            {c}
          </span>
        ))}
        <span aria-hidden />
        {COLS_RIGHT.map((c) => (
          <span
            key={c}
            className="text-center text-[9.5px] font-bold uppercase tracking-widest text-slate-400"
          >
            {c}
          </span>
        ))}
        <span aria-hidden />
      </div>

      {/* Rows */}
      <div className="space-y-[5px]">
        {rows.map((r) => (
          <SeatRow
            key={r}
            row={r}
            bySeat={bySeat}
            selectedKey={selectedKey}
            onSeatClick={onSeatClick}
            isBusiness={r <= BUSINESS_ROWS}
            isExitRow={r === wingRow || r === wingRow + 1}
          />
        ))}
      </div>
    </div>
  );
}

function SeatRow({
  row,
  bySeat,
  selectedKey,
  onSeatClick,
  isBusiness,
  isExitRow,
}: {
  row: number;
  bySeat: Map<string, PassengerRecord>;
  selectedKey: string | null;
  onSeatClick: (key: string) => void;
  isBusiness: boolean;
  isExitRow: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid items-center gap-x-1 rounded-md px-0.5 py-0.5",
        "grid-cols-[1.25rem_repeat(3,minmax(0,1fr))_0.75rem_repeat(3,minmax(0,1fr))_1.25rem]",
        isBusiness && "bg-indigo-50/60",
        isExitRow && "bg-rose-50/70",
      )}
    >
      {/* Left row marker */}
      <div className="flex items-center justify-end pr-0.5">
        {isExitRow ? (
          <DoorOpen className="h-3.5 w-3.5 text-rose-500" />
        ) : (
          <span className="text-[9.5px] font-bold tabular-nums text-slate-400">
            {row}
          </span>
        )}
      </div>

      {/* Left seats A B C */}
      {COLS_LEFT.map((c) => {
        const key = `${row}${c}`;
        return (
          <Seat
            key={c}
            row={row}
            col={c}
            passenger={bySeat.get(key) ?? null}
            isBusiness={isBusiness}
            isSelected={selectedKey === key}
            onClick={() => onSeatClick(key)}
          />
        );
      })}

      {/* Aisle */}
      <div className="flex h-full items-center justify-center">
        <span className="h-4 w-px bg-slate-200" aria-hidden />
      </div>

      {/* Right seats D E F */}
      {COLS_RIGHT.map((c) => {
        const key = `${row}${c}`;
        return (
          <Seat
            key={c}
            row={row}
            col={c}
            passenger={bySeat.get(key) ?? null}
            isBusiness={isBusiness}
            isSelected={selectedKey === key}
            onClick={() => onSeatClick(key)}
          />
        );
      })}

      {/* Right row marker */}
      <div className="flex items-center justify-start pl-0.5">
        {isExitRow ? (
          <DoorOpen className="h-3.5 w-3.5 -scale-x-100 text-rose-500" />
        ) : (
          <span className="text-[9.5px] font-bold tabular-nums text-slate-400">
            {row}
          </span>
        )}
      </div>
    </div>
  );
}

function Seat({
  row,
  col,
  passenger,
  isBusiness,
  isSelected,
  onClick,
}: {
  row: number;
  col: string;
  passenger: PassengerRecord | null;
  isBusiness: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const occupied = !!passenger;
  const multi = occupied && (passenger?.scanCount ?? 0) > 1;
  const key = `${row}${col}`;
  return (
    <div className="group relative">
      <button
        type="button"
        disabled={!occupied}
        onClick={onClick}
        title={
          occupied
            ? `${row}${col} · ${passenger?.passengerName ?? "(tanpa nama)"}`
            : `${row}${col} kosong`
        }
        className={cn(
          "relative grid aspect-square w-full place-items-center rounded-[7px] text-[8px] font-bold transition-all duration-200",
          occupied
            ? multi
              ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md ring-1 ring-amber-600/40 hover:scale-110 hover:ring-2 hover:ring-sky-400"
              : "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/40 hover:scale-110 hover:shadow-emerald-500/30 hover:ring-2 hover:ring-sky-400"
            : isBusiness
              ? "bg-gradient-to-br from-indigo-50 to-violet-100 ring-1 ring-indigo-200/80 text-indigo-300 cursor-default"
              : "bg-gradient-to-br from-white to-slate-100 ring-1 ring-slate-200 text-slate-300 cursor-default",
          isSelected && "z-10 scale-125 shadow-xl ring-2 ring-sky-500 ring-offset-2 ring-offset-white",
        )}
      >
        {/* Selected pulse halo */}
        {isSelected && (
          <span className="pointer-events-none absolute inset-0 -m-1 rounded-[9px] bg-sky-400/30 animate-ping" />
        )}
        {/* Backrest hint */}
        <span
          className={cn(
            "pointer-events-none absolute inset-x-1 top-0.5 h-1 rounded-[3px]",
            occupied ? "bg-white/35" : isBusiness ? "bg-indigo-200/70" : "bg-slate-200/80",
          )}
          aria-hidden
        />
        <User className="relative h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.5} />
      </button>

      {/* Hover callout — only for occupied seats */}
      {occupied && (
        <HoverCallout
          seatKey={key}
          col={col}
          passenger={passenger}
          onOpenDetail={onClick}
        />
      )}
    </div>
  );
}

function HoverCallout({
  seatKey,
  col,
  passenger,
  onOpenDetail,
}: {
  seatKey: string;
  col: string;
  passenger: PassengerRecord | null;
  onOpenDetail: () => void;
}) {
  if (!passenger) return null;
  // Kalau seat di kolom kiri (A/B/C) → card muncul di kanan
  // Kalau seat di kolom kanan (D/E/F) → card muncul di kiri
  const placeRight = ["A", "B", "C"].includes(col);

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 z-40 w-52 -translate-y-1/2 opacity-0 transition-all duration-200",
        placeRight ? "left-full ml-12" : "right-full mr-12",
        "group-hover:pointer-events-auto group-hover:opacity-100",
        placeRight ? "group-hover:ml-14" : "group-hover:mr-14",
      )}
    >
      <div className="relative rounded-2xl border border-sky-200 bg-white p-3 shadow-xl ring-1 ring-sky-100">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-extrabold tracking-tight text-slate-900">
            Kursi {seatKey}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sudah scan
          </span>
        </div>

        {/* Name */}
        <p className="mt-1.5 truncate text-[11px] font-bold uppercase tracking-wide text-slate-800">
          {passenger.passengerName ?? "(nama tidak ada di barcode)"}
        </p>

        {/* Meta */}
        <p className="mt-0.5 text-[10px] font-medium text-slate-500">
          <span className="font-mono font-bold tracking-wider text-slate-700">
            {passenger.pnr}
          </span>
          {"  ·  "}
          {formatDateTime(passenger.lastScannedAt)}
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
          className="mt-2 inline-flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-900 hover:text-white"
        >
          Lihat detail penumpang
          <ChevronRight className="h-3 w-3" />
        </button>

        {/* Curved dashed connector — SVG */}
        <svg
          className={cn(
            "pointer-events-none absolute top-1/2 h-20 w-14 -translate-y-1/2 overflow-visible",
            placeRight ? "right-full -translate-x-1" : "left-full translate-x-1",
          )}
          viewBox="0 0 56 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          {placeRight ? (
            // Card kanan → garis dari seat (kiri SVG) curve ke card (kanan SVG)
            <path
              d="M 4 40 C 22 40 22 38 56 38"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            // Card kiri → garis dari card (kiri SVG) curve ke seat (kanan SVG)
            <path
              d="M 0 38 C 34 38 34 40 52 40"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

function LavBand() {
  return (
    <div className="relative flex items-center justify-between rounded-md border border-dashed border-slate-200 bg-white/70 px-2 py-1 backdrop-blur-sm">
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        <span className="grid h-3 w-4 place-items-center rounded-sm bg-slate-700 text-[7px] font-black text-white">
          WC
        </span>
        Lav
      </span>
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        Galley
        <span className="grid h-3 w-4 place-items-center rounded-sm bg-amber-500 text-[7px] font-black text-white">
          G
        </span>
      </span>
    </div>
  );
}

function FillCard({
  label,
  current,
  total,
  color,
}: {
  label: string;
  current: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {current}
        </span>
        <span className="text-xs font-semibold text-slate-400 tabular-nums">
          / {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full bg-gradient-to-r transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SelectedSeatCard({
  selectedKey,
  passenger,
  isBusiness,
  onClear,
  onOpenDetail,
}: {
  selectedKey: string | null;
  passenger: PassengerRecord | null;
  isBusiness: boolean;
  onClear: () => void;
  onOpenDetail: () => void;
}) {
  if (!selectedKey) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-3 text-center">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">
          Kursi Dipilih
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Klik kursi hijau di denah
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-3 shadow-md">
      {/* Dotted indicator */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1 border-r-2 border-dotted border-sky-300" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-extrabold text-white shadow-md ring-2 ring-white">
            {selectedKey}
          </span>
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400">
              Kursi {selectedKey}
            </p>
            <span
              className={cn(
                "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                passenger
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  passenger ? "bg-emerald-500" : "bg-slate-400",
                )}
              />
              {passenger ? "Sudah scan" : "Belum scan"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {passenger ? (
        <>
          <p className="mt-2 truncate text-sm font-bold text-slate-900">
            {passenger.passengerName ?? "(nama tidak ada di barcode)"}
          </p>
          <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
            <Mini label="PNR" value={passenger.pnr} />
            <Mini label="Tiket" value={passenger.ticketNumber} />
            <Mini label="Class" value={isBusiness ? "Business" : "Economy"} />
            <Mini label="Scan" value={`${passenger.scanCount}×`} />
          </div>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <Clock className="h-3 w-3" />
            {formatDateTime(passenger.lastScannedAt)}
          </p>
          <button
            type="button"
            onClick={onOpenDetail}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            Lihat detail penumpang
            <ChevronRight className="h-3 w-3" />
          </button>
        </>
      ) : (
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          Kursi ini belum di-scan oleh petugas. Belum ada data penumpang
          terkait.
        </p>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1 ring-1 ring-slate-100">
      <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="truncate text-[10.5px] font-bold text-slate-800">{value}</p>
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-slate-600">
      <span className={cn("h-3 w-3 rounded-[4px]", swatch)} />
      {label}
    </span>
  );
}

function BottomLegendPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 shadow-sm backdrop-blur">
      {icon}
      {label}
    </span>
  );
}

function ZoomBtn({
  icon,
  onClick,
  label,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {icon}
    </button>
  );
}
