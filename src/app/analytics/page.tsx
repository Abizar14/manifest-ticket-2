"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  PieChart,
  Trophy,
  Plane,
  Clock,
  Users,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Copy,
  CalendarDays,
  ChevronDown,
  ArrowRight,
  Medal,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Flight,
  ScanEvent,
  ScanResultStatus,
  SessionUser,
} from "@/lib/types";
import { getFlights, getScanEvents, getSession } from "@/lib/storage";
import { canManageFlights } from "@/lib/auth";
import { cn, todayDateString } from "@/lib/utils";
import { PageHero, HeroChip } from "@/components/layout/PageHero";
import { LargeTitle } from "@/components/mobile/LargeTitle";
import { ListSection } from "@/components/mobile/GroupedList";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";

type RangePreset = "today" | "7d" | "30d" | "all";

const STATUS_COLORS: Record<ScanResultStatus, string> = {
  VALID_FLIGHT: "#10b981",
  DUPLICATE_SCAN: "#f59e0b",
  FLIGHT_NOT_TODAY: "#fb923c",
  FLIGHT_NOT_ACTIVE: "#fb7185",
  UNKNOWN_FLIGHT: "#ef4444",
  INVALID_BARCODE: "#a855f7",
  KTP_MISMATCH: "#e11d48",
};

const STATUS_LABEL: Record<ScanResultStatus, string> = {
  VALID_FLIGHT: "Valid",
  DUPLICATE_SCAN: "Duplikat",
  FLIGHT_NOT_TODAY: "Bukan hari ini",
  FLIGHT_NOT_ACTIVE: "Tidak aktif",
  UNKNOWN_FLIGHT: "Flight tdk dikenal",
  INVALID_BARCODE: "Barcode rusak",
  KTP_MISMATCH: "KTP tidak cocok",
};

export default function AnalyticsPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [range, setRange] = useState<RangePreset>("today");

  useEffect(() => {
    setSession(getSession());
    setEvents(getScanEvents());
    setFlights(getFlights());
  }, []);

  const canSee = canManageFlights(session?.role);

  const filteredEvents = useMemo(() => {
    if (range === "all") return events;
    const now = new Date();
    const cutoff = new Date(now);
    if (range === "today") {
      cutoff.setHours(0, 0, 0, 0);
    } else if (range === "7d") {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (range === "30d") {
      cutoff.setDate(cutoff.getDate() - 30);
    }
    const cutoffIso = cutoff.toISOString();
    return events.filter((e) => e.scannedAt >= cutoffIso);
  }, [events, range]);

  const summary = useMemo(() => {
    const total = filteredEvents.length;
    let valid = 0;
    let dup = 0;
    let rejected = 0;
    for (const e of filteredEvents) {
      if (e.resultStatus === "VALID_FLIGHT") valid++;
      else if (e.resultStatus === "DUPLICATE_SCAN") dup++;
      else rejected++;
    }
    const successRate = total > 0 ? Math.round((valid / total) * 100) : 0;
    return { total, valid, dup, rejected, successRate };
  }, [filteredEvents]);

  const hourly = useMemo(() => {
    const total = new Array(24).fill(0) as number[];
    const valid = new Array(24).fill(0) as number[];
    for (const e of filteredEvents) {
      const h = new Date(e.scannedAt).getHours();
      if (!isNaN(h)) {
        total[h]++;
        if (e.resultStatus === "VALID_FLIGHT") valid[h]++;
      }
    }
    return { total, valid };
  }, [filteredEvents]);

  const prevSummary = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (range === "today") {
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    } else if (range === "7d") {
      end = new Date(now);
      end.setDate(end.getDate() - 7);
      start = new Date(end);
      start.setDate(start.getDate() - 7);
    } else if (range === "30d") {
      end = new Date(now);
      end.setDate(end.getDate() - 30);
      start = new Date(end);
      start.setDate(start.getDate() - 30);
    }
    if (!start || !end)
      return { total: 0, valid: 0, dup: 0, rejected: 0, successRate: 0 };
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    let total = 0;
    let valid = 0;
    let dup = 0;
    let rejected = 0;
    for (const e of events) {
      if (e.scannedAt < startIso || e.scannedAt > endIso) continue;
      total++;
      if (e.resultStatus === "VALID_FLIGHT") valid++;
      else if (e.resultStatus === "DUPLICATE_SCAN") dup++;
      else rejected++;
    }
    const successRate = total > 0 ? Math.round((valid / total) * 100) : 0;
    return { total, valid, dup, rejected, successRate };
  }, [events, range]);

  const trends = useMemo(() => {
    function pct(curr: number, prev: number) {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return Math.round(((curr - prev) / prev) * 100);
    }
    return {
      total: pct(summary.total, prevSummary.total),
      valid: pct(summary.valid, prevSummary.valid),
      dup: pct(summary.dup, prevSummary.dup),
      successRate: summary.successRate - prevSummary.successRate,
    };
  }, [summary, prevSummary]);

  const prevLabel =
    range === "today"
      ? "kemarin"
      : range === "7d"
        ? "7 hari sblm"
        : range === "30d"
          ? "30 hari sblm"
          : "periode sblm";

  const statusDist = useMemo(() => {
    const map = new Map<ScanResultStatus, number>();
    for (const e of filteredEvents) {
      map.set(e.resultStatus, (map.get(e.resultStatus) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEvents]);

  const topUsers = useMemo(() => {
    const map = new Map<string, { count: number; valid: number }>();
    for (const e of filteredEvents) {
      const k = e.scannedBy || "—";
      const cur = map.get(k) ?? { count: 0, valid: 0 };
      cur.count++;
      if (e.resultStatus === "VALID_FLIGHT") cur.valid++;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([user, v]) => ({ user, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredEvents]);

  const topFlights = useMemo(() => {
    const map = new Map<string, { count: number; valid: number }>();
    for (const e of filteredEvents) {
      const k = e.flightId ?? e.parsedFlightNumber ?? "—";
      if (k === "—") continue;
      const cur = map.get(k) ?? { count: 0, valid: 0 };
      cur.count++;
      if (e.resultStatus === "VALID_FLIGHT") cur.valid++;
      map.set(k, cur);
    }
    const flightByIdOrNum = new Map<string, Flight>();
    for (const f of flights) {
      flightByIdOrNum.set(f.id, f);
      flightByIdOrNum.set(f.flightNumber, f);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({
        key: k,
        flight: flightByIdOrNum.get(k) ?? null,
        label: flightByIdOrNum.get(k)?.flightNumber ?? k,
        ...v,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredEvents, flights]);

  if (!canSee) {
    return (
      <AppShell>
        <Card>
          <CardBody>
            <EmptyState
              tone="warning"
              icon={<ShieldAlert className="h-6 w-6" />}
              title="Akses ditolak"
              description="Halaman analitik hanya tersedia untuk admin atau supervisor."
            />
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* ---------- MOBILE ---------- */}
      <div className="space-y-4 lg:hidden">
        <LargeTitle
          eyebrow="Analitik"
          title="Statistik"
          subtitle="Aktivitas scan & distribusi hasil"
        />

        <SegmentedControl<RangePreset>
          value={range}
          onChange={setRange}
          size="sm"
          options={[
            { value: "today", label: "Hari ini" },
            { value: "7d", label: "7 hari" },
            { value: "30d", label: "30 hari" },
            { value: "all", label: "Semua" },
          ]}
        />

        <div className="grid grid-cols-2 gap-2">
          <AnalyticsKpi
            label="Total scan"
            value={summary.total}
            tone="indigo"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <AnalyticsKpi
            label="Valid"
            value={summary.valid}
            tone="emerald"
            icon={<Plane className="h-3.5 w-3.5" />}
          />
          <AnalyticsKpi
            label="Duplikat"
            value={summary.dup}
            tone="amber"
            icon={<Users className="h-3.5 w-3.5" />}
          />
          <AnalyticsKpi
            label="Success rate"
            value={`${summary.successRate}%`}
            tone="violet"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
        </div>

        {summary.total === 0 ? (
          <div className="rounded-2xl bg-surface ring-1 ring-hairline shadow-card px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <BarChart3 className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-ink">
              Belum ada data untuk rentang ini
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Ubah rentang atau jalankan scan untuk melihat statistik.
            </p>
          </div>
        ) : (
          <>
            <ListSection header="Scan per Jam (0–23)">
              <div className="p-3">
                <MobileHourly data={hourly.total} />
              </div>
            </ListSection>

            <ListSection header="Distribusi Status">
              <div className="space-y-1.5 px-3 py-2.5">
                {statusDist.map((d) => {
                  const pct = Math.round((d.count / summary.total) * 100);
                  return (
                    <div key={d.status}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ background: STATUS_COLORS[d.status] }}
                          />
                          <span className="truncate text-ink">
                            {STATUS_LABEL[d.status]}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-ink">
                          {d.count}
                          <span className="ml-1 text-[10.5px] font-normal text-ink-subtle">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-hairline/60">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: STATUS_COLORS[d.status],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ListSection>

            {topUsers.length > 0 && (
              <ListSection header="Top User">
                {topUsers.map((u, i) => (
                  <div
                    key={u.user}
                    className="flex items-center gap-3 px-3.5 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                      {u.user}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                      {u.count}
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      {u.valid} valid
                    </span>
                  </div>
                ))}
              </ListSection>
            )}

            {topFlights.length > 0 && (
              <ListSection header="Top Flight">
                {topFlights.map((f, i) => {
                  const rowInner = (
                    <div className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                        {f.label}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                        {f.count}
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        {f.valid} valid
                      </span>
                    </div>
                  );
                  return f.flight ? (
                    <Link
                      key={f.key}
                      href={`/flights/${f.flight.id}`}
                      className="block transition active:bg-surface-2"
                    >
                      {rowInner}
                    </Link>
                  ) : (
                    <div key={f.key}>{rowInner}</div>
                  );
                })}
              </ListSection>
            )}
          </>
        )}
      </div>

      {/* ---------- DESKTOP ---------- */}
      <div className="space-y-5 hidden lg:block">
        <section className="relative animate-fade-up overflow-hidden rounded-3xl border border-white/15 px-7 py-6 text-white shadow-lift">
          {/* photo bg */}
          <img
            src="/asset-cards/card-bg-statistik.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          {/* soft left-side dark gradient for text legibility */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,12,30,0.72)_0%,rgba(5,12,30,0.45)_45%,rgba(5,12,30,0.1)_75%,rgba(5,12,30,0)_100%)]"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/95 ring-1 ring-white/25 backdrop-blur">
                <BarChart3 className="h-3.5 w-3.5" />
                Analitik
              </div>
              <h2 className="mt-3 text-[28px] font-bold tracking-tight drop-shadow-sm">
                Statistik Operasional
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-white/85 drop-shadow-sm">
                Ringkasan aktivitas scan &amp; distribusi hasil — bantu evaluasi
                throughput dan anomali.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <HeroChip
                  icon={<TrendingUp className="h-3 w-3" />}
                  label="Total Scan"
                  value={summary.total}
                />
                <HeroChip
                  icon={<ShieldCheck className="h-3 w-3" />}
                  label="Valid"
                  value={summary.valid}
                />
                <HeroChip
                  icon={<TrendingUp className="h-3 w-3" />}
                  label="Success"
                  value={`${summary.successRate}%`}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <HeroDateSelect value={range} onChange={setRange} />
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-full animate-fade-up stagger-1">
            <StatCard
              label="Total Scan"
              value={summary.total}
              tone="brand"
              icon={<BarChart3 className="h-5 w-5" />}
              helper={formatDelta(trends.total, prevLabel)}
            />
          </div>
          <div className="h-full animate-fade-up stagger-2">
            <StatCard
              label="Valid"
              value={summary.valid}
              tone="emerald"
              icon={<ShieldCheck className="h-5 w-5" />}
              helper={formatDelta(trends.valid, prevLabel)}
            />
          </div>
          <div className="h-full animate-fade-up stagger-3">
            <StatCard
              label="Duplikat"
              value={summary.dup}
              tone="amber"
              icon={<Copy className="h-5 w-5" />}
              helper={formatDelta(trends.dup, prevLabel)}
            />
          </div>
          <div className="h-full animate-fade-up stagger-4">
            <StatCard
              label="Success Rate"
              value={`${summary.successRate}%`}
              tone="violet"
              icon={<TrendingUp className="h-5 w-5" />}
              helper={formatDeltaPp(trends.successRate, prevLabel)}
            />
          </div>
        </div>

        {summary.total === 0 ? (
          <Card className="animate-fade-up stagger-1 lift">
            <CardBody>
              <EmptyState
                tone="info"
                icon={<BarChart3 className="h-6 w-6" />}
                title="Belum ada data untuk rentang ini"
                description="Ubah rentang waktu atau jalankan scan untuk melihat statistik."
              />
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
              <Card className="animate-fade-up stagger-1 lift">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>
                      <span className="inline-flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30">
                          <Clock className="h-3.5 w-3.5" />
                        </span>
                        Scan per Jam (0–23)
                      </span>
                    </CardTitle>
                    <HeroDateSelect value={range} onChange={setRange} compact />
                  </div>
                </CardHeader>
                <CardBody>
                  <HourlyCombo
                    total={hourly.total}
                    valid={hourly.valid}
                    peakTotalLabel="Total Scan"
                    peakValidLabel="Valid Scan"
                  />
                </CardBody>
              </Card>

              <Card className="animate-fade-up stagger-2 lift">
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
                        <PieChart className="h-3.5 w-3.5" />
                      </span>
                      Distribusi Status
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <StatusDonut data={statusDist} total={summary.total} />
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500">
                      <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" />
                    </span>
                    Data real-time
                  </div>
                </CardBody>
              </Card>

              <Card className="animate-fade-up stagger-3 lift">
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
                        <Trophy className="h-3.5 w-3.5" />
                      </span>
                      Top User
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {topUsers.length === 0 ? (
                    <p className="text-sm text-ink-muted">Tidak ada data.</p>
                  ) : (
                    <>
                      <ul className="space-y-2.5">
                        {topUsers.slice(0, 3).map((u, i) => (
                          <TopUserRow
                            key={u.user}
                            rank={i + 1}
                            user={u.user}
                            count={u.count}
                            valid={u.valid}
                          />
                        ))}
                      </ul>
                      <div className="mt-3 border-t border-hairline pt-2">
                        <Link
                          href="/scan-events"
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                          Lihat semua pengguna
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card className="animate-fade-up stagger-4 lift">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30">
                        <Plane className="h-3.5 w-3.5" />
                      </span>
                      Top Flight
                    </span>
                  </CardTitle>
                  <Link
                    href="/flights"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
                  >
                    Lihat semua flight
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                {topFlights.length === 0 ? (
                  <p className="text-sm text-ink-muted">Tidak ada data.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {topFlights.slice(0, 4).map((f, i) => (
                      <TopFlightCard key={f.key} rank={i + 1} f={f} />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function HourlyCombo({
  total,
  valid,
  peakTotalLabel,
  peakValidLabel,
}: {
  total: number[];
  valid: number[];
  peakTotalLabel: string;
  peakValidLabel: string;
}) {
  const max = Math.max(...total, ...valid, 1);
  const width = 720;
  const height = 220;
  const padTop = 30;
  const padBottom = 28;
  const padLeft = 32;
  const padRight = 16;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const barW = innerW / 24;

  const peakTotalIdx = total.reduce(
    (best, v, i) => (v > total[best] ? i : best),
    0,
  );
  const peakValidIdx = valid.reduce(
    (best, v, i) => (v > valid[best] ? i : best),
    0,
  );

  // path for the "Valid Scan" smooth line overlay
  const points = valid.map((v, i) => {
    const x = padLeft + i * barW + barW / 2;
    const y = padTop + innerH - (v / max) * innerH;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
  // area under the line
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1][0]} ${padTop + innerH} L ${points[0][0]} ${padTop + innerH} Z`
      : "";

  return (
    <div className="overflow-x-auto">
      {/* legend */}
      <div className="mb-2 flex items-center gap-4 text-[11px] font-semibold text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-b from-blue-400 to-blue-600" />
          Total Scan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-full bg-emerald-500" />
          Valid Scan
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[520px] w-full"
        role="img"
        aria-label="Distribusi scan per jam"
      >
        <defs>
          <linearGradient id="comboBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="comboAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padTop + innerH * (1 - t);
          return (
            <g key={t} className="text-slate-300 dark:text-slate-600">
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="currentColor"
                className="text-slate-400 dark:text-slate-500"
              >
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}

        {/* total bars */}
        {total.map((v, i) => {
          const h = (v / max) * innerH;
          const x = padLeft + i * barW + 3;
          const y = padTop + innerH - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(barW - 6, 1)}
              height={h}
              rx={3}
              fill="url(#comboBarGrad)"
              opacity={i === peakTotalIdx ? 1 : 0.85}
            >
              <title>
                {String(i).padStart(2, "0")}:00 — {v} scan
              </title>
            </rect>
          );
        })}

        {/* area under valid */}
        {areaPath && <path d={areaPath} fill="url(#comboAreaGrad)" />}

        {/* valid line */}
        <path
          d={linePath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* dots */}
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={valid[i] > 0 ? 2.5 : 0}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
        ))}

        {/* x-axis ticks */}
        {total.map((_, i) => {
          if (i % 2 !== 0) return null;
          const x = padLeft + i * barW + barW / 2;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              className="text-slate-400 dark:text-slate-500"
            >
              {String(i).padStart(2, "0")}
            </text>
          );
        })}

        {/* peak callouts */}
        {total[peakTotalIdx] > 0 && (
          <PeakCallout
            x={padLeft + peakTotalIdx * barW + barW / 2}
            y={padTop + innerH - (total[peakTotalIdx] / max) * innerH}
            value={total[peakTotalIdx]}
            label={peakTotalLabel}
            color="#2563eb"
          />
        )}
        {valid[peakValidIdx] > 0 && peakValidIdx !== peakTotalIdx && (
          <PeakCallout
            x={padLeft + peakValidIdx * barW + barW / 2}
            y={padTop + innerH - (valid[peakValidIdx] / max) * innerH - 6}
            value={valid[peakValidIdx]}
            label={peakValidLabel}
            color="#059669"
            anchor="below"
          />
        )}
      </svg>
    </div>
  );
}

function PeakCallout({
  x,
  y,
  value,
  label,
  color,
  anchor = "above",
}: {
  x: number;
  y: number;
  value: number;
  label: string;
  color: string;
  anchor?: "above" | "below";
}) {
  const dy = anchor === "above" ? -18 : 22;
  return (
    <g>
      <rect
        x={x - 34}
        y={y + dy - 12}
        width={68}
        height={26}
        rx={6}
        className="fill-white dark:fill-slate-800"
        stroke={color}
        strokeWidth="1.2"
      />
      <text
        x={x}
        y={y + dy - 1}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={color}
      >
        {value}
      </text>
      <text
        x={x}
        y={y + dy + 9}
        textAnchor="middle"
        fontSize="8"
        fill="currentColor"
        className="text-slate-500 dark:text-slate-400"
      >
        {label}
      </text>
    </g>
  );
}

function StatusDonut({
  data,
  total,
}: {
  data: { status: ScanResultStatus; count: number }[];
  total: number;
}) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const inner = 48;

  let acc = 0;
  const arcs = data.map((d) => {
    const start = (acc / total) * Math.PI * 2;
    acc += d.count;
    const end = (acc / total) * Math.PI * 2;
    return {
      status: d.status,
      count: d.count,
      path: arcPath(cx, cy, r, inner, start, end),
    };
  });

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40 shrink-0">
        {arcs.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={r} fill={STATUS_COLORS[arcs[0].status]} />
            <circle
              cx={cx}
              cy={cy}
              r={inner}
              className="fill-white dark:fill-slate-900"
            />
          </>
        ) : (
          arcs.map((a) => (
            <path
              key={a.status}
              d={a.path}
              fill={STATUS_COLORS[a.status]}
              strokeWidth="2"
              className="stroke-white dark:stroke-slate-900"
            >
              <title>
                {STATUS_LABEL[a.status]}: {a.count} (
                {Math.round((a.count / total) * 100)}%)
              </title>
            </path>
          ))
        )}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize="28"
          fontWeight="800"
          fill="currentColor"
          className="text-ink"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          className="text-ink-muted"
        >
          Total Scan
        </text>
      </svg>
      <ul className="w-full space-y-1.5">
        {data.map((d) => {
          const pct = Math.round((d.count / total) * 100);
          return (
            <li
              key={d.status}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[d.status] }}
                />
                <span className="truncate text-ink">
                  {STATUS_LABEL[d.status]}
                </span>
              </span>
              <span className="font-semibold tabular-nums text-ink">
                {d.count}
                <span className="ml-1 text-[10px] font-normal text-ink-subtle">
                  ({pct}%)
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  ir: number,
  start: number,
  end: number,
) {
  const large = end - start > Math.PI ? 1 : 0;
  const x1 = cx + r * Math.sin(start);
  const y1 = cy - r * Math.cos(start);
  const x2 = cx + r * Math.sin(end);
  const y2 = cy - r * Math.cos(end);
  const xi1 = cx + ir * Math.sin(end);
  const yi1 = cy - ir * Math.cos(end);
  const xi2 = cx + ir * Math.sin(start);
  const yi2 = cy - ir * Math.cos(start);
  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
    `L ${xi1} ${yi1}`,
    `A ${ir} ${ir} 0 ${large} 0 ${xi2} ${yi2}`,
    "Z",
  ].join(" ");
}

const ANALYTICS_KPI_TONE: Record<
  "indigo" | "emerald" | "amber" | "violet",
  { icon: string; value: string }
> = {
  indigo: { icon: "bg-indigo-100 text-indigo-700", value: "text-indigo-700" },
  emerald: { icon: "bg-emerald-100 text-emerald-700", value: "text-emerald-700" },
  amber: { icon: "bg-amber-100 text-amber-700", value: "text-amber-700" },
  violet: { icon: "bg-violet-100 text-violet-700", value: "text-violet-700" },
};

function AnalyticsKpi({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number | string;
  tone: keyof typeof ANALYTICS_KPI_TONE;
  icon: React.ReactNode;
}) {
  const t = ANALYTICS_KPI_TONE[tone];
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-hairline shadow-card px-3.5 py-3">
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-lg",
          t.icon,
        )}
      >
        {icon}
      </span>
      <p
        className={cn(
          "mt-2 text-[24px] font-extrabold tabular-nums leading-none",
          t.value,
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11.5px] font-semibold text-ink-muted">{label}</p>
    </div>
  );
}

function MobileHourly({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-28 items-end gap-[2px]">
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-indigo-300 to-indigo-500"
                style={{ height: `${Math.max(pct, v > 0 ? 4 : 0)}%` }}
                title={`${String(i).padStart(2, "0")}:00 — ${v} scan`}
              />
            </div>
            {i % 4 === 0 && (
              <span className="text-[9px] tabular-nums text-ink-subtle">
                {String(i).padStart(2, "0")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeroDateSelect({
  value,
  onChange,
  compact,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
  compact?: boolean;
}) {
  const label =
    value === "today"
      ? `Hari ini (${todayDateString()})`
      : value === "7d"
        ? "7 hari terakhir"
        : value === "30d"
          ? "30 hari terakhir"
          : "Semua waktu";
  if (compact) {
    return (
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as RangePreset)}
          className="h-9 appearance-none rounded-xl bg-surface-2 pl-8 pr-8 text-[12.5px] font-semibold text-ink ring-1 ring-hairline focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="today">Hari ini</option>
          <option value="7d">7 hari</option>
          <option value="30d">30 hari</option>
          <option value="all">Semua</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
      </div>
    );
  }
  return (
    <div className="relative">
      {/* neon glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-[3px] rounded-2xl bg-[radial-gradient(60%_120%_at_50%_50%,rgba(56,189,248,0.65)_0%,rgba(56,189,248,0)_70%)] blur-md"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-300/70 shadow-[0_0_18px_rgba(56,189,248,0.55)]"
      />
      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RangePreset)}
        aria-label={label}
        className="relative h-11 appearance-none rounded-2xl border-0 bg-slate-900/50 pl-10 pr-10 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        <option value="today" className="text-slate-900">
          Hari ini ({todayDateString()})
        </option>
        <option value="7d" className="text-slate-900">
          7 hari terakhir
        </option>
        <option value="30d" className="text-slate-900">
          30 hari terakhir
        </option>
        <option value="all" className="text-slate-900">
          Semua waktu
        </option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100" />
    </div>
  );
}

function formatDelta(deltaPct: number, prevLabel: string): string {
  const sign = deltaPct > 0 ? "+" : deltaPct < 0 ? "−" : "—";
  const abs = Math.abs(deltaPct);
  return `${sign}${abs}% vs ${prevLabel}`;
}

function formatDeltaPp(deltaPp: number, prevLabel: string): string {
  const sign = deltaPp > 0 ? "+" : deltaPp < 0 ? "−" : "—";
  const abs = Math.abs(deltaPp);
  return `${sign}${abs}pp vs ${prevLabel}`;
}

const TOP_USER_MEDAL: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-400 to-yellow-600 text-white",
  2: "bg-gradient-to-br from-slate-300 to-slate-500 text-white",
  3: "bg-gradient-to-br from-orange-300 to-amber-700 text-white",
};

function TopUserRow({
  rank,
  user,
  count,
  valid,
}: {
  rank: number;
  user: string;
  count: number;
  valid: number;
}) {
  const pct = count > 0 ? Math.round((valid / count) * 100) : 0;
  const medal = TOP_USER_MEDAL[rank] ?? "bg-slate-200 text-slate-700";
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold shadow-sm ring-1 ring-white/40",
          medal,
        )}
      >
        {rank <= 3 ? <Medal className="h-3.5 w-3.5" /> : rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[12.5px] font-semibold text-ink">
            {user}
          </span>
          <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink">
            {count}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-hairline/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-[1px] text-[9.5px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
            {valid} valid
          </span>
        </div>
      </div>
    </li>
  );
}

function TopFlightCard({
  rank,
  f,
}: {
  rank: number;
  f: {
    key: string;
    flight: Flight | null;
    label: string;
    count: number;
    valid: number;
  };
}) {
  const pct = f.count > 0 ? Math.round((f.valid / f.count) * 100) : 0;
  const medal = TOP_USER_MEDAL[rank] ?? "bg-slate-200 text-slate-700";
  const body = (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-sky-50 via-white to-sky-50/30 px-3.5 py-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift dark:from-slate-800/60 dark:via-slate-900/60 dark:to-slate-800/40">
      {/* plane silhouette watermark */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute -bottom-2 right-2 h-16 w-16 rotate-[18deg] fill-sky-200/60 transition-transform duration-500 group-hover:scale-110 dark:fill-sky-500/15"
      >
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" />
      </svg>

      <div className="relative flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold shadow-sm ring-1 ring-white/40",
            medal,
          )}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-ink">
            {f.label}
          </p>
          {f.flight ? (
            <p className="mt-0.5 truncate text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
              {f.flight.originAirport} → {f.flight.destinationAirport}
              <span className="ml-1.5 font-bold text-ink/80">
                {f.flight.departureTime}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-subtle">
              data flight tdk tersedia
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[18px] font-extrabold tabular-nums leading-none text-ink">
            {f.count}
          </p>
          <p className="mt-1 inline-block rounded-full bg-emerald-50 px-1.5 py-[1px] text-[9.5px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
            {f.valid} valid
          </p>
        </div>
      </div>

      <div className="relative mt-3">
        <div className="flex items-center justify-between text-[10px] font-semibold text-ink-muted">
          <span>Success rate</span>
          <span className="tabular-nums text-ink">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-hairline/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );

  return f.flight ? (
    <Link href={`/flights/${f.flight.id}`} className="block h-full">
      {body}
    </Link>
  ) : (
    <div className="h-full">{body}</div>
  );
}
