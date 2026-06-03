"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plane,
  ScanLine,
  CheckCircle2,
  AlertOctagon,
  CopyCheck,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  FlightStatusBadge,
  ScanStatusBadge,
} from "@/components/ui/StatusBadge";
import { Flight, ScanEvent } from "@/lib/types";
import { getFlights, getScanEvents } from "@/lib/storage";
import { cn, formatTime, todayDateString } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import { getBoardingProgress } from "@/lib/boarding";
import { PageHero, HeroChip } from "@/components/layout/PageHero";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { getSettings, subscribeSettings } from "@/lib/settings";
import { getEffectiveFlightStatus } from "@/lib/flightStatus";

export default function DashboardPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [settings, setSettings] = useState(() => getSettings());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setFlights(getFlights());
    setEvents(getScanEvents());
    setSettings(getSettings());
    const unsub = subscribeSettings(setSettings);
    const tick = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      setNow(new Date());
    }, 30_000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, []);

  const today = todayDateString();

  const flightsToday = useMemo(
    () => flights.filter((f) => f.departureDate === today),
    [flights, today],
  );

  const effectiveStats = useMemo(() => {
    const counts = { open: 0, active: 0, closed: 0, draft: 0, cancelled: 0 };
    for (const f of flightsToday) {
      const eff = getEffectiveFlightStatus(f, now, settings).status;
      if (eff === "OPEN") counts.open += 1;
      else if (eff === "ACTIVE") counts.active += 1;
      else if (eff === "CLOSED") counts.closed += 1;
      else if (eff === "DRAFT") counts.draft += 1;
      else if (eff === "CANCELLED") counts.cancelled += 1;
    }
    return counts;
  }, [flightsToday, now, settings]);

  const boardableNow = effectiveStats.open + effectiveStats.active;

  const eventsToday = useMemo(
    () => events.filter((e) => e.scannedAt.slice(0, 10) === today),
    [events, today],
  );

  const validCount = eventsToday.filter(
    (e) => e.resultStatus === "VALID_FLIGHT",
  ).length;
  const dupCount = eventsToday.filter(
    (e) => e.resultStatus === "DUPLICATE_SCAN",
  ).length;
  const rejectedCount = eventsToday.length - validCount - dupCount;

  const flightsCnt = useCountUp(flightsToday.length);
  const scanCnt = useCountUp(eventsToday.length);
  const validCnt = useCountUp(validCount);
  const dupCnt = useCountUp(dupCount);
  const rejectedCnt = useCountUp(rejectedCount);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHero
          tone="cyan"
          eyebrow="Dashboard Operasional"
          eyebrowIcon={<Sparkles className="h-3.5 w-3.5" />}
          ghostIcon={<Plane className="h-full w-full" strokeWidth={1.5} />}
          title={
            <span>
              Selamat datang kembali{" "}
              <span className="inline-block animate-float">👋</span>
            </span>
          }
          description="Ringkasan aktivitas validasi boarding pass hari ini."
          meta={
            <>
              <HeroChip
                icon={<Plane className="h-3 w-3" />}
                label="Flight hari ini"
                value={flightsToday.length}
              />
              <HeroChip
                icon={<ScanLine className="h-3 w-3" />}
                label="Scan hari ini"
                value={eventsToday.length}
              />
              <HeroChip
                icon={<CheckCircle2 className="h-3 w-3" />}
                label="Valid"
                value={validCount}
              />
            </>
          }
          actions={
            <>
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm transition hover:shadow-lift"
              >
                <ScanLine className="h-4 w-4" />
                Mulai Scan
              </Link>
              <Link
                href="/flights"
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                Jadwal Penerbangan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <div className="h-full animate-fade-up stagger-1">
            <StatCard
              label="Flight Hari Ini"
              value={flightsCnt}
              helper={
                boardableNow > 0
                  ? `${boardableNow} sedang boarding`
                  : `Tanggal ${today}`
              }
              tone="brand"
              icon={<Plane className="h-5 w-5" />}
            />
          </div>
          <div className="h-full animate-fade-up stagger-2">
            <StatCard
              label="Total Scan"
              value={scanCnt}
              helper="Hari ini"
              tone="sky"
              icon={<ScanLine className="h-5 w-5" />}
            />
          </div>
          <div className="h-full animate-fade-up stagger-3">
            <StatCard
              label="Valid"
              value={validCnt}
              helper="Boarding pass valid"
              tone="emerald"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          </div>
          <div className="h-full animate-fade-up stagger-4">
            <StatCard
              label="Duplicate"
              value={dupCnt}
              helper="Pernah di-scan"
              tone="amber"
              icon={<CopyCheck className="h-5 w-5" />}
            />
          </div>
          <div className="h-full animate-fade-up stagger-5">
            <StatCard
              label="Rejected"
              value={rejectedCnt}
              helper="Invalid / tidak hari ini"
              tone="rose"
              icon={<AlertOctagon className="h-5 w-5" />}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Today flights */}
          <Card className="animate-fade-up stagger-2 lift xl:col-span-2">
            <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-blue-200" />
            <CardHeader>
              <div>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                      <Plane className="h-3.5 w-3.5" />
                    </span>
                    Jadwal Penerbangan Hari Ini
                  </span>
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Flight yang boleh divalidasi pada pos pengecekan.
                </p>
              </div>
              <Link
                href="/flights"
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
              >
                Lihat semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {flightsToday.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                  Belum ada flight terjadwal untuk hari ini.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {flightsToday
                    .slice()
                    .sort((a, b) =>
                      a.departureTime.localeCompare(b.departureTime),
                    )
                    .map((f, idx) => (
                      <li
                        key={f.id}
                        className="animate-fade-up"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <Link
                          href={`/flights/${f.id}`}
                          className="group flex items-center justify-between px-5 py-3.5 transition hover:bg-blue-50/60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="transition group-hover:scale-105">
                              <AirlineLogo code={f.airlineCode} size="md" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {f.flightNumber}{" "}
                                <span className="font-normal text-slate-400">
                                  · {f.airlineCode}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500">
                                {f.originAirport} → {f.destinationAirport} ·{" "}
                                {f.gateOrCheckpoint}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <DashProgress
                              progress={getBoardingProgress(f, events)}
                            />
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              <Clock className="h-3.5 w-3.5" />
                              {f.departureTime}
                            </span>
                            {(() => {
                              const eff = getEffectiveFlightStatus(
                                f,
                                now,
                                settings,
                              );
                              const differs = eff.status !== f.status;
                              return (
                                <span
                                  className="inline-flex items-center gap-1"
                                  title={
                                    differs
                                      ? `Manual: ${f.status} • ${eff.description}`
                                      : eff.description
                                  }
                                >
                                  <FlightStatusBadge status={eff.status} />
                                  {differs && (
                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
                                      auto
                                    </span>
                                  )}
                                </span>
                              );
                            })()}
                          </div>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Recent events */}
          <Card className="animate-fade-up stagger-3 lift">
            <div className="deco-blob -right-12 -top-12 h-36 w-36 bg-emerald-200" />
            <CardHeader>
              <div>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                      <ScanLine className="h-3.5 w-3.5" />
                    </span>
                    Aktivitas Scan Terbaru
                  </span>
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  10 event terakhir.
                </p>
              </div>
              <Link
                href="/scan-events"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                Riwayat <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {events.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                  Belum ada aktivitas scan.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {events.slice(0, 10).map((e, idx) => (
                    <li
                      key={e.id}
                      className="px-5 py-3 animate-fade-up"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">
                          {e.parsedFlightNumber ?? "—"}
                        </p>
                        <ScanStatusBadge status={e.resultStatus} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatTime(e.scannedAt)} · oleh {e.scannedBy}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

const DASH_TONE: Record<
  "neutral" | "info" | "warning" | "success" | "danger",
  { bar: string; text: string; chip: string }
> = {
  neutral: {
    bar: "bg-slate-400",
    text: "text-slate-600",
    chip: "bg-slate-50 ring-slate-200",
  },
  info: {
    bar: "bg-blue-500",
    text: "text-blue-700",
    chip: "bg-blue-50 ring-blue-200",
  },
  warning: {
    bar: "bg-amber-500",
    text: "text-amber-700",
    chip: "bg-amber-50 ring-amber-200",
  },
  success: {
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    chip: "bg-emerald-50 ring-emerald-200",
  },
  danger: {
    bar: "bg-rose-500",
    text: "text-rose-700",
    chip: "bg-rose-50 ring-rose-200",
  },
};

function DashProgress({
  progress,
}: {
  progress: ReturnType<typeof getBoardingProgress>;
}) {
  if (progress.expected === null) {
    return (
      <span className="hidden sm:inline rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
        {progress.boarded} pax
      </span>
    );
  }
  const t = DASH_TONE[progress.tone];
  const percent = progress.percent ?? 0;
  return (
    <div
      className={cn(
        "hidden min-w-[120px] rounded-xl px-2.5 py-1 ring-1 sm:block",
        t.chip,
      )}
    >
      <div className={cn("text-[11px] font-bold", t.text)}>
        {progress.boarded}/{progress.expected}{" "}
        <span className="text-[10px] font-medium text-slate-400">
          {percent}%
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/80">
        <div
          className={cn("h-full rounded-full transition-all", t.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
