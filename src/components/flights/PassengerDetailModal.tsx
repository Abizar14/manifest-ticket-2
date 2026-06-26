"use client";

import Image from "next/image";
import { Plane, User, Crown, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Flight, PassengerRecord } from "@/lib/types";
import { getAirlineMeta } from "@/lib/airlines";
import { SEED_BOARDING_PASSES } from "@/lib/seedBoardingPasses";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  passenger: PassengerRecord | null;
  flight: Flight | null;
  onClose: () => void;
}

export function PassengerDetailModal({
  open,
  passenger,
  flight,
  onClose,
}: Props) {
  if (!passenger || !flight) return null;
  const meta = getAirlineMeta(flight.airlineCode);

  const enrich = SEED_BOARDING_PASSES.find(
    (s) => s.pnr.toUpperCase() === passenger.pnr.toUpperCase(),
  );

  const cabinClass = enrich?.cabinClass ?? "Economy";
  const originCity = (enrich?.originCity ?? flight.originAirport).toUpperCase();
  const destCity = (enrich?.destinationCity ?? flight.destinationAirport).toUpperCase();
  const rawName = passenger.passengerName ?? "(nama tidak ada di barcode)";
  const name = rawName.toUpperCase();

  const seatRow = parseInt(passenger.seatNumber, 10) || 0;
  const group =
    cabinClass === "Business" ? "1" : seatRow <= 10 ? "2" : seatRow <= 20 ? "3" : "4";
  const seq = (
    ((parseInt(passenger.ticketNumber.slice(-3), 10) || 1) % 250) + 1
  )
    .toString()
    .padStart(3, "0");

  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const dt = new Date(flight.departureDate);
  const shortDate = isNaN(dt.getTime())
    ? flight.departureDate
    : `${dt.getDate().toString().padStart(2, "0")}${months[dt.getMonth()]}`;

  // Real QR — sama payload kayak barcode scanner
  const qrPayload = `${flight.flightNumber}|${passenger.pnr}|${passenger.ticketNumber}|${passenger.seatNumber}|${name}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=6&qzone=1&format=png&data=${encodeURIComponent(qrPayload)}`;
  const qrFallback = `https://quickchart.io/qr?text=${encodeURIComponent(qrPayload)}&size=240`;

  // Real Code-128 barcode
  const barcodeData = `${passenger.pnr}${passenger.ticketNumber}${passenger.seatNumber}`.replace(/[^A-Za-z0-9]/g, "");
  const barcodeUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(barcodeData)}`;
  const barcodeFallback = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&scale=2&height=12&includetext=false&backgroundcolor=ffffff`;

  const isBusiness = cabinClass === "Business";

  // Business pakai gold/amber tone; Economy pakai warna airline
  const softBg = isBusiness ? "#fef3c7" : softTint(meta.code); // amber-100
  const accentText = isBusiness ? "#92400e" : accentTextColor(meta.code); // amber-800
  const accentGradient = isBusiness
    ? "from-amber-500 via-yellow-500 to-amber-600"
    : meta.gradient;

  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="info"
      size="xl"
      hideClose
      title={
        <span className="inline-flex items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          Boarding Pass · {flight.flightNumber}
        </span>
      }
      description={`${rawName} · Seat ${passenger.seatNumber}`}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Tutup
        </button>
      }
    >
      {/* ===== Card ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/80">
        {/* Soft top accent — gold untuk Business */}
        <div className="relative">
          <div
            className={cn(
              "h-1.5 w-full bg-gradient-to-r",
              accentGradient,
            )}
          />
          {isBusiness && (
            <div className="absolute right-4 top-1.5 z-10 inline-flex items-center gap-1 rounded-b-lg bg-gradient-to-r from-amber-500 to-yellow-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md ring-1 ring-amber-300">
              <Crown className="h-3 w-3" />
              Business · Priority
            </div>
          )}
        </div>

        {/* Body: main + stub */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_240px]">
          {/* ===== MAIN ===== */}
          <div className="relative bg-white p-6">
            {/* Soft watermark plane */}
            <Plane
              className="pointer-events-none absolute right-2 top-1/3 h-56 w-56 -translate-y-1/2 rotate-[18deg] text-slate-50"
            />

            {/* Airline header */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {meta.logoSrc ? (
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200">
                    <Image
                      src={meta.logoSrc}
                      alt={meta.name}
                      width={48}
                      height={48}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm",
                      meta.gradient,
                    )}
                  >
                    {flight.airlineCode}
                  </div>
                )}
                <div>
                  <p
                    className="text-lg font-bold tracking-tight"
                    style={{ color: accentText }}
                  >
                    {meta.name}
                  </p>
<p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{isBusiness ? "Premium Boarding Pass" : "Boarding Pass"}</p>
                </div>
              </div>
              <div
                className="rounded-xl px-3 py-1.5 text-right"
                style={{ backgroundColor: softBg }}
              >
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                  Group
                </p>
                <p
                  className="text-2xl font-bold leading-none"
                  style={{ color: accentText }}
                >
                  {group}
                </p>
              </div>
            </div>

            {/* NAME */}
            <div className="relative mt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                Name
              </p>
              <p className="mt-1 text-xl font-bold uppercase tracking-tight text-slate-900">
                {name}
              </p>
            </div>

            {/* From / To */}
            <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  From
                </p>
                <p className="mt-1 text-2xl font-bold leading-tight text-slate-900">
                  {originCity}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {flight.originAirport}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-white"
                  style={{ backgroundColor: accentText }}
                >
                  <Plane className="h-3.5 w-3.5 rotate-90" />
                </span>
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  To
                </p>
                <p className="mt-1 text-2xl font-bold leading-tight text-slate-900">
                  {destCity}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {flight.destinationAirport}
                </p>
              </div>
            </div>

            {/* PNR pill */}
            <div className="relative mt-5">
              <span
                className="inline-flex items-baseline gap-2 rounded-lg px-3 py-1.5"
                style={{ backgroundColor: softBg }}
              >
                <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                  PNR
                </span>
                <span
                  className="font-mono text-base font-bold tracking-widest"
                  style={{ color: accentText }}
                >
                  {passenger.pnr}
                </span>
              </span>
            </div>

            {/* Detail grid */}
            <div className="relative mt-5 grid grid-cols-4 gap-x-4 gap-y-4 rounded-xl bg-slate-50/70 p-4 ring-1 ring-slate-100">
              <BPCell label="Date" value={shortDate} />
              <BPCell label="Flight" value={flight.flightNumber} />
              <BPCell label="Seat" value={passenger.seatNumber} bold accent={accentText} />
              <BPCell label="Gate" value={flight.gateOrCheckpoint} bold accent={accentText} />
              <BPCell label="Boarding" value={flight.departureTime} />
              <BPCell
                label="Class"
                value={isBusiness ? "BUSINESS" : "ECONOMY"}
                accent={isBusiness ? "#92400e" : undefined}
              />
              <BPCell label="Seq" value={seq} />
              <BPCell label="Ticket" value={passenger.ticketNumber} mono />
            </div>

            {/* QR + barcode row */}
            <div className="relative mt-5 flex items-center gap-4">
              {/* Real QR */}
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-white p-1 ring-1 ring-slate-200">
                <img
                  src={qrUrl}
                  alt="QR Code"
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = qrFallback;
                  }}
                />
              </div>
              {/* Real Code-128 barcode */}
              <div className="flex-1">
                <div className="grid h-14 place-items-center rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                  <img
                    src={barcodeUrl}
                    alt="Barcode"
                    className="h-12 w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = barcodeFallback;
                    }}
                  />
                </div>
                <p className="mt-1 text-center font-mono text-[10px] tracking-widest text-slate-500">
                  {passenger.pnr} · {passenger.ticketNumber} · {passenger.seatNumber}
                </p>
              </div>
            </div>
          </div>

          {/* ===== PERFORATION ===== */}
          <div className="relative hidden md:block">
            <div className="absolute -left-2 top-0 h-4 w-4 -translate-y-1/2 rounded-full bg-slate-100" />
            <div className="absolute -left-2 bottom-0 h-4 w-4 translate-y-1/2 rounded-full bg-slate-100" />
            <div className="mx-auto h-full w-px border-l-2 border-dashed border-slate-300" />
          </div>

          {/* ===== STUB (right) — softer ===== */}
          <div
            className="relative overflow-hidden p-5"
            style={{ backgroundColor: softBg }}
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
                meta.gradient,
              )}
            />
            <Plane className="pointer-events-none absolute -right-4 bottom-4 h-32 w-32 rotate-[18deg] text-white/50" />

            {/* Header */}
            <div className="relative mt-1 flex items-center gap-2">
              {meta.logoSrc ? (
                <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-slate-200">
                  <Image
                    src={meta.logoSrc}
                    alt={meta.name}
                    width={36}
                    height={36}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white",
                    meta.gradient,
                  )}
                >
                  {flight.airlineCode}
                </div>
              )}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: accentText }}
                >
                  {meta.name}
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                  Boarding Pass
                </p>
              </div>
            </div>

            <div className="relative mt-3 border-b border-dashed border-slate-300 pb-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                Name
              </p>
              <p className="truncate text-sm font-bold uppercase text-slate-900">
                {name}
              </p>
            </div>

            <div className="relative mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
              <StubCell label="Flight" value={flight.flightNumber} />
              <StubCell label="Date" value={shortDate} />
              <StubCell label="From" value={flight.originAirport} />
              <StubCell label="To" value={flight.destinationAirport} />
              <StubCell label="Seat" value={passenger.seatNumber} accent={accentText} big />
              <StubCell label="Gate" value={flight.gateOrCheckpoint} accent={accentText} big />
              <StubCell label="Boarding" value={flight.departureTime} />
              <StubCell
                label="Class"
                value={isBusiness ? "BIZ" : "ECO"}
                accent={isBusiness ? "#92400e" : undefined}
              />
            </div>

            <div className="relative mt-3 rounded-md bg-white/70 px-2.5 py-1.5 ring-1 ring-white/80 backdrop-blur">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                PNR · Seq
              </p>
              <p
                className="font-mono text-xs font-bold tracking-wider"
                style={{ color: accentText }}
              >
                {passenger.pnr} · {seq}
              </p>
            </div>

            {/* Mini QR */}
            <div className="relative mt-3 flex justify-center">
              <div className="grid h-16 w-16 place-items-center rounded-md bg-white p-1 ring-1 ring-slate-200">
                <img
                  src={qrUrl}
                  alt="QR"
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = qrFallback;
                  }}
                />
              </div>
            </div>

            <p className="relative mt-2 text-center font-mono text-[9px] tracking-widest text-slate-600">
              {passenger.ticketNumber}
            </p>
          </div>
        </div>

        {/* Business perks strip */}
        {isBusiness && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-800">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Priority Boarding
            </span>
            <span>·</span>
            <span>Lounge Access</span>
            <span>·</span>
            <span>Extra Baggage 30kg</span>
            <span>·</span>
            <span>Fast Track Security</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <span>SIPANDAI · Verified · {passenger.scanCount}× scan</span>
          <span>
            {flight.originAirport} → {flight.destinationAirport} ·{" "}
            {flight.departureDate}
          </span>
        </div>
      </div>
    </Modal>
  );
}

function BPCell({
  label,
  value,
  bold,
  mono,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 leading-none",
          bold ? "text-xl font-bold" : "text-base font-semibold",
          mono ? "font-mono tracking-tight" : "",
        )}
        style={{ color: accent ?? "#0f172a" }}
      >
        {value}
      </p>
    </div>
  );
}

function StubCell({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "font-bold leading-tight",
          big ? "text-base" : "text-xs",
        )}
        style={{ color: accent ?? "#0f172a" }}
      >
        {value}
      </p>
    </div>
  );
}

// Soft pastel background per airline — bukan gradient saturated
function softTint(code: string): string {
  switch (code) {
    case "GA":
      return "#e0f2fe"; // sky-100
    case "JT":
    case "QZ":
    case "SJ":
    case "XT":
    case "AK":
      return "#fee2e2"; // red-100
    case "ID":
      return "#dbeafe"; // blue-100
    case "QG":
    case "IP":
      return "#d1fae5"; // emerald-100
    case "IW":
      return "#ffedd5"; // orange-100
    case "IU":
      return "#fce7f3"; // pink-100
    case "SAA":
      return "#e0f2fe"; // sky-100
    case "SQ":
      return "#fef3c7"; // amber-100
    case "MH":
      return "#dbeafe"; // blue-100
    default:
      return "#f1f5f9"; // slate-100
  }
}

function accentTextColor(code: string): string {
  switch (code) {
    case "GA":
      return "#0369a1"; // sky-700
    case "JT":
    case "QZ":
    case "SJ":
    case "XT":
    case "AK":
      return "#b91c1c"; // red-700
    case "ID":
      return "#1d4ed8"; // blue-700
    case "QG":
    case "IP":
      return "#047857"; // emerald-700
    case "IW":
      return "#c2410c"; // orange-700
    case "IU":
      return "#be185d"; // pink-700
    case "SAA":
      return "#0369a1";
    case "SQ":
      return "#b45309"; // amber-700
    case "MH":
      return "#1d4ed8";
    default:
      return "#0f172a";
  }
}
