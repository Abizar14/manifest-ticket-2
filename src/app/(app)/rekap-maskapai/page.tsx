"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Plane,
  RefreshCw,
  Users,
  CalendarDays,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { getAirlineMeta } from "@/lib/airlines";
import { getFlights, getScanEvents } from "@/lib/storage";
import { buildBoardedCounts } from "@/lib/boarding";
import { buildByAirlineReport, type ByAirlineReport } from "@/lib/reports/byAirline";
import { getSettings } from "@/lib/settings";
import { apiManifestByAirline, isAuthed } from "@/lib/api/client";
import { HOME_IATA } from "@/lib/jadwal/types";
import { cn, todayDateString, yesterdayDateString } from "@/lib/utils";

/**
 * Jam papan disimpan "naif-Z" (mis. 11:04 WITA → `...T11:04:00Z`). Tampilkan
 * apa adanya dari string ISO TANPA konversi timezone (jangan pakai new Date()
 * yang menggeser ke zona browser).
 */
function boardLabel(iso: string): string {
  return `${iso.slice(0, 10)} · ${iso.slice(11, 16)}`;
}

type Preset = "today" | "yesterday" | "range";
type Source = "server" | "lokal";

/** Bentuk seragam untuk render (server & lokal dinormalkan ke sini). */
interface ViewFlight {
  flightNumber: string;
  label: string; // tanggal + jam siap tampil
  passengers: number;
  // Id flight LOKAL untuk link ke halaman detail (yang membaca localStorage).
  // null bila jadwal ini tak ada di perangkat → baris non-klik.
  localFlightId: string | null;
}
interface ViewAirline {
  airlineCode: string;
  passengers: number;
  flights: number;
  flightsDetail: ViewFlight[];
}
interface ViewReport {
  totals: { passengers: number; flights: number; airlines: number };
  airlines: ViewAirline[];
}

function fromLocal(r: ByAirlineReport): ViewReport {
  return {
    totals: r.totals,
    airlines: r.airlines.map((a) => ({
      airlineCode: a.airlineCode,
      passengers: a.passengers,
      flights: a.flights,
      flightsDetail: a.flightsDetail.map((f) => ({
        flightNumber: f.flightNumber,
        // Jam papan lokal — tampilkan apa adanya (bukan naif-Z, tak perlu konversi).
        label: `${f.departureDate} · ${f.departureTime}`,
        passengers: f.passengers,
        localFlightId: f.flightId, // path lokal: id sudah id lokal
      })),
    })),
  };
}

export default function RekapMaskapaiPage() {
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState(todayDateString());
  const [to, setTo] = useState(todayDateString());
  const [report, setReport] = useState<ViewReport | null>(null);
  const [source, setSource] = useState<Source>("lokal");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Rentang efektif dari preset.
  const range = useMemo(() => {
    if (preset === "today") {
      const d = todayDateString();
      return { from: d, to: d };
    }
    if (preset === "yesterday") {
      const d = yesterdayDateString();
      return { from: d, to: d };
    }
    return { from, to };
  }, [preset, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    const useServer = getSettings().apiSyncEnabled && isAuthed();

    // Selalu siapkan hasil lokal sebagai fallback instan.
    // Keberangkatan saja: origin = bandara home (AAP).
    const departures = getFlights().filter(
      (f) => f.originAirport === HOME_IATA,
    );
    const local = fromLocal(
      buildByAirlineReport(
        departures,
        buildBoardedCounts(getScanEvents()),
        range.from,
        range.to,
      ),
    );

    if (useServer) {
      const res = await apiManifestByAirline({
        from: range.from,
        to: range.to,
        detail: true,
      });
      if (res.ok && res.data) {
        // Link detail memakai id LOKAL (halaman detail baca localStorage).
        // Cocokkan flight server → lokal by nomor+tanggal.
        const localById = new Map<string, string>();
        for (const f of departures) {
          localById.set(
            `${f.flightNumber.toUpperCase()}|${f.departureDate}`,
            f.id,
          );
        }
        setReport({
          totals: res.data.totals,
          airlines: res.data.airlines.map((a) => ({
            airlineCode: a.airlineCode,
            passengers: a.passengers,
            flights: a.flights,
            flightsDetail: a.flightsDetail.map((f) => ({
              flightNumber: f.flightNumber,
              label: boardLabel(f.std),
              passengers: f.passengers,
              localFlightId:
                localById.get(
                  `${f.flightNumber.toUpperCase()}|${f.std.slice(0, 10)}`,
                ) ?? null,
            })),
          })),
        });
        setSource("server");
        setLoading(false);
        return;
      }
    }
    setReport(local);
    setSource("lokal");
    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const presetLabel: Record<Preset, string> = {
    today: "Hari ini",
    yesterday: "Kemarin",
    range: "Rentang",
  };

  const maxPax = report?.airlines[0]?.passengers ?? 0;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                <Building2 className="h-5 w-5" />
              </span>
              Rekap PAX per Maskapai
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Jumlah penumpang yang sudah boarding (scan valid), dikelompokkan per
              maskapai.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-muted ring-1 ring-hairline transition hover:bg-surface active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Muat ulang
          </button>
        </div>

        {/* Period selector */}
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl bg-surface-2 p-1 ring-1 ring-hairline">
              {(["today", "yesterday", "range"] as Preset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    preset === p
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-ink-muted hover:bg-surface",
                  )}
                >
                  {presetLabel[p]}
                </button>
              ))}
            </div>

            {preset === "range" && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-ink-subtle" />
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-lg border border-hairline bg-surface px-2 py-1.5 text-ink"
                />
                <span className="text-ink-subtle">–</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-lg border border-hairline bg-surface px-2 py-1.5 text-ink"
                />
              </div>
            )}

            <span
              className={cn(
                "inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                source === "server"
                  ? "bg-sky-50 text-sky-700 ring-sky-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200",
              )}
              title={
                source === "server"
                  ? "Data dari server (backend)."
                  : "Data dari perangkat ini (offline / belum login sync)."
              }
            >
              Sumber: {source === "server" ? "Server" : "Lokal"}
            </span>
          </CardBody>
        </Card>

        {/* Totals */}
        {report && (
          <div className="grid grid-cols-3 gap-3">
            <TotalCard icon={<Users className="h-4 w-4" />} label="Total PAX" value={report.totals.passengers} tone="blue" />
            <TotalCard icon={<Plane className="h-4 w-4" />} label="Penerbangan" value={report.totals.flights} tone="violet" />
            <TotalCard icon={<Building2 className="h-4 w-4" />} label="Maskapai" value={report.totals.airlines} tone="emerald" />
          </div>
        )}

        {/* Airline cards */}
        {report && report.airlines.length === 0 ? (
          <EmptyState
            tone="info"
            icon={<Building2 className="h-6 w-6" />}
            title="Belum ada data pada periode ini"
            description="Pilih tanggal lain, atau lakukan scan boarding pass untuk mengisi data."
          />
        ) : (
          <div className="space-y-2.5">
            {report?.airlines.map((a) => {
              const meta = getAirlineMeta(a.airlineCode);
              const pct = maxPax > 0 ? Math.round((a.passengers / maxPax) * 100) : 0;
              const open = expanded === a.airlineCode;
              return (
                <Card key={a.airlineCode} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : a.airlineCode)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
                  >
                    <AirlineLogo code={a.airlineCode} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{meta.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {a.flights} penerbangan · {a.airlineCode}
                      </p>
                      {/* bar proporsi */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-black tabular-nums text-ink">
                        {a.passengers}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                        pax
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-ink-subtle transition-transform",
                        open && "rotate-90",
                      )}
                    />
                  </button>

                  {/* drill-down: daftar penerbangan */}
                  {open && (
                    <div className="border-t border-hairline bg-surface-2/40">
                      {a.flightsDetail.length === 0 ? (
                        <p className="px-4 py-3 text-[13px] text-ink-muted">
                          Tak ada rincian penerbangan.
                        </p>
                      ) : (
                        a.flightsDetail.map((f, i) => {
                          const inner = (
                            <>
                              <span className="inline-flex min-w-[4rem] items-center justify-center rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {f.flightNumber}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-ink-muted">
                                {f.label}
                              </span>
                              <span className="shrink-0 font-semibold text-ink">
                                {f.passengers} pax
                              </span>
                            </>
                          );
                          // Ada padanan lokal → bisa klik ke detail. Tidak ada
                          // (jadwal tak tersimpan di perangkat ini) → non-klik.
                          return f.localFlightId ? (
                            <Link
                              key={`${f.flightNumber}-${i}`}
                              href={`/flights/${f.localFlightId}`}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-surface"
                            >
                              {inner}
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
                            </Link>
                          ) : (
                            <div
                              key={`${f.flightNumber}-${i}`}
                              title="Detail tak tersedia — jadwal ini belum tersimpan di perangkat ini (tarik jadwal dulu di menu Jadwal)."
                              className="flex items-center gap-3 px-4 py-2.5 text-sm opacity-70"
                            >
                              {inner}
                              <span className="h-3.5 w-3.5 shrink-0" />
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function TotalCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "blue" | "violet" | "emerald";
}) {
  const toneCls: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
    violet: "bg-violet-100 text-violet-700 ring-violet-200",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };
  return (
    <Card>
      <CardBody className="flex items-center gap-3 py-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl ring-1", toneCls[tone])}>
          {icon}
        </span>
        <div>
          <p className="text-2xl font-black tabular-nums text-ink">{value}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            {label}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
