"use client";

import { useMemo, useState } from "react";
import { Ticket, Plane, QrCode, Copy, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHero, HeroChip } from "@/components/layout/PageHero";
import { Card, CardBody } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { getAirlineMeta } from "@/lib/airlines";
import {
  SEED_BOARDING_PASSES,
  SeedBoardingPass,
  buildPayload,
} from "@/lib/seedBoardingPasses";
import { todayDateString, tomorrowDateString } from "@/lib/utils";
import { cn } from "@/lib/utils";

const AIRLINES: SeedBoardingPass["airlineCode"][] = [
  "GA",
  "JT",
  "QZ",
  "SJ",
  "ID",
];

function resolveDate(ref: "today" | "tomorrow"): string {
  return ref === "today" ? todayDateString() : tomorrowDateString();
}

function formatDateLabel(yyyyMmDd: string): string {
  try {
    const [y, m, d] = yyyyMmDd.split("-").map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    return dt
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
  } catch {
    return yyyyMmDd;
  }
}

export default function BoardingPassSeederPage() {
  const [filter, setFilter] = useState<"ALL" | SeedBoardingPass["airlineCode"]>(
    "ALL",
  );
  const [active, setActive] = useState<SeedBoardingPass | null>(null);
  const toast = useToast();

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? SEED_BOARDING_PASSES
        : SEED_BOARDING_PASSES.filter((bp) => bp.airlineCode === filter),
    [filter],
  );

  const countByAirline = useMemo(() => {
    const out: Record<string, number> = {};
    for (const bp of SEED_BOARDING_PASSES) {
      out[bp.airlineCode] = (out[bp.airlineCode] ?? 0) + 1;
    }
    return out;
  }, []);

  const copyPayload = (bp: SeedBoardingPass) => {
    const payload = buildPayload(bp);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(payload).then(
        () => toast.success(payload, "Payload disalin"),
        () => toast.error("Gagal menyalin", "Clipboard error"),
      );
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHero
          tone="violet"
          eyebrow="Seeder Data"
          eyebrowIcon={<Ticket className="h-3.5 w-3.5" />}
          ghostIcon={<Ticket className="h-full w-full" strokeWidth={1.5} />}
          title="Boarding Pass Seeder"
          description="25 contoh boarding pass siap-scan (5 per maskapai). Klik kartu untuk lihat tampilan penuh dengan QR code — bisa di-scan langsung dari layar lain."
          meta={
            <>
              <HeroChip
                icon={<Ticket className="h-3 w-3" />}
                label="Total"
                value={SEED_BOARDING_PASSES.length}
              />
              <HeroChip
                icon={<Plane className="h-3 w-3" />}
                label="Maskapai"
                value={AIRLINES.length}
              />
            </>
          }
        />

        {/* Filter pills */}
        <Card>
          <CardBody className="flex flex-wrap items-center gap-2">
            <FilterPill
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
              label="Semua"
              count={SEED_BOARDING_PASSES.length}
            />
            {AIRLINES.map((code) => {
              const meta = getAirlineMeta(code);
              return (
                <FilterPill
                  key={code}
                  active={filter === code}
                  onClick={() => setFilter(code)}
                  label={`${code} · ${meta.name}`}
                  count={countByAirline[code] ?? 0}
                  accent={meta.gradient}
                />
              );
            })}
          </CardBody>
        </Card>

        {/* Grid of tickets */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bp, idx) => (
            <button
              key={bp.id}
              type="button"
              onClick={() => setActive(bp)}
              className="animate-fade-up text-left transition focus:outline-none"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <MiniBoardingPass bp={bp} />
            </button>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      <BoardingPassModal
        bp={active}
        onClose={() => setActive(null)}
        onCopy={copyPayload}
      />
    </AppShell>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition",
        active
          ? accent
            ? `bg-gradient-to-r text-white ring-transparent shadow-sm ${accent}`
            : "bg-slate-900 text-white ring-slate-900 shadow-sm"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
      )}
    >
      {label}
      <span
        className={cn(
          "inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
          active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function MiniBoardingPass({ bp }: { bp: SeedBoardingPass }) {
  const meta = getAirlineMeta(bp.airlineCode);
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lift">
      {/* Color stripe header */}
      <div
        className={cn(
          "relative flex items-center justify-between bg-gradient-to-r px-4 py-2.5 text-white",
          meta.gradient,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 text-[11px] font-bold ring-1 ring-white/30">
            {bp.airlineCode}
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold opacity-90">{meta.name}</p>
            <p className="text-[9px] uppercase tracking-widest opacity-75">
              Boarding Pass
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-white/25">
          {bp.cabinClass}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold leading-none tracking-tight text-slate-900">
              {bp.origin}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
              {bp.originCity}
            </p>
          </div>
          <Plane className="h-5 w-5 text-slate-300" />
          <div className="text-right">
            <p className="text-2xl font-bold leading-none tracking-tight text-slate-900">
              {bp.destination}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
              {bp.destinationCity}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-slate-200 pt-3 text-[10px]">
          <Field label="Flight" value={bp.flightNumber} />
          <Field label="Seat" value={bp.seat} />
          <Field label="Gate" value={bp.gate} />
        </div>

        <p className="mt-3 truncate text-sm font-semibold text-slate-800">
          {bp.passengerName}
        </p>
        <p className="text-[10px] text-slate-500">
          PNR {bp.pnr} · {bp.boardingTime}
        </p>
      </div>

      {/* Action hint */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 group-hover:bg-slate-50">
        <span className="inline-flex items-center gap-1">
          <QrCode className="h-3 w-3" />
          Lihat QR
        </span>
        <span className="text-slate-400">{bp.id}</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function BoardingPassModal({
  bp,
  onClose,
  onCopy,
}: {
  bp: SeedBoardingPass | null;
  onClose: () => void;
  onCopy: (bp: SeedBoardingPass) => void;
}) {
  if (!bp) return null;
  const meta = getAirlineMeta(bp.airlineCode);
  const date = formatDateLabel(resolveDate(bp.dateRef));
  const payload = buildPayload(bp);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=8&data=${encodeURIComponent(
    payload,
  )}`;

  return (
    <Modal
      open={!!bp}
      onClose={onClose}
      tone="info"
      size="lg"
      hideClose
      title={
        <span className="inline-flex items-center gap-2">
          <Ticket className="h-4 w-4 text-slate-500" />
          Boarding Pass · {bp.flightNumber}
        </span>
      }
      description={`Payload: ${payload}`}
      footer={
        <>
          <button
            type="button"
            onClick={() => onCopy(bp)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy payload
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Tutup
          </button>
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <div className="grid sm:grid-cols-[1fr,240px]">
          {/* Main */}
          <div className="bg-white p-5">
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white text-sm font-bold ring-1 ring-white/30",
                    meta.gradient,
                  )}
                >
                  {bp.airlineCode}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {meta.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">
                    Boarding Pass
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {bp.cabinClass}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="text-4xl font-extrabold leading-none tracking-tight text-slate-900">
                  {bp.origin}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                  {bp.originCity}
                </p>
              </div>
              <Plane className="h-7 w-7 text-slate-400" />
              <div className="text-right">
                <p className="text-4xl font-extrabold leading-none tracking-tight text-slate-900">
                  {bp.destination}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                  {bp.destinationCity}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3 text-[10px]">
              <DetailField label="Flight" value={bp.flightNumber} />
              <DetailField label="Date" value={date} />
              <DetailField label="Boarding" value={bp.boardingTime} />
              <DetailField label="Gate" value={bp.gate} />
              <DetailField label="Seat" value={bp.seat} />
              <DetailField label="Class" value={bp.cabinClass} />
              <DetailField label="PNR" value={bp.pnr} />
              <DetailField label="Ticket" value={bp.ticket} />
            </div>

            <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Passenger
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {bp.passengerName}
              </p>
            </div>

            <div
              className="mt-3 h-8 rounded-md opacity-90"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #0f172a 0 2px, transparent 2px 4px, #0f172a 4px 5px, transparent 5px 9px)",
              }}
            />
            <p className="mt-1 font-mono text-[10px] text-slate-500">
              {payload}
            </p>
          </div>

          {/* Stub */}
          <div
            className={cn(
              "relative bg-gradient-to-br p-5 text-white",
              meta.gradient,
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-widest opacity-85">
                  Flight
                </p>
                <p className="text-lg font-extrabold">{bp.flightNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest opacity-85">
                  Gate
                </p>
                <p className="text-lg font-extrabold">{bp.gate}</p>
              </div>
            </div>

            <div className="mt-4 grid place-items-center rounded-xl bg-white p-3">
              <img
                alt={`QR ${payload}`}
                src={qrUrl}
                className="h-44 w-44"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
              <StubField label="Seat" value={bp.seat} />
              <StubField label="PNR" value={bp.pnr} />
              <StubField label="From" value={bp.origin} />
              <StubField label="To" value={bp.destination} />
            </div>

            <p className="mt-3 text-[10px] opacity-85">
              Boarding closes 10 min before departure.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function StubField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest opacity-85">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
