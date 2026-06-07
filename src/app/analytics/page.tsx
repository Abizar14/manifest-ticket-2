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
};

const STATUS_LABEL: Record<ScanResultStatus, string> = {
  VALID_FLIGHT: "Valid",
  DUPLICATE_SCAN: "Duplikat",
  FLIGHT_NOT_TODAY: "Bukan hari ini",
  FLIGHT_NOT_ACTIVE: "Tidak aktif",
  UNKNOWN_FLIGHT: "Flight tdk dikenal",
  INVALID_BARCODE: "Barcode rusak",
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
    const bins = new Array(24).fill(0) as number[];
    for (const e of filteredEvents) {
      const h = new Date(e.scannedAt).getHours();
      if (!isNaN(h)) bins[h]++;
    }
    return bins;
  }, [filteredEvents]);

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
                <MobileHourly data={hourly} />
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
      <div className="space-y-6 hidden lg:block">
        <PageHero
          tone="indigo"
          eyebrow="Analitik"
          eyebrowIcon={<BarChart3 className="h-3.5 w-3.5" />}
          ghostIcon={<BarChart3 className="h-full w-full" strokeWidth={1.5} />}
          title="Statistik Operasional"
          description="Ringkasan aktivitas scan & distribusi hasil — bantu evaluasi throughput dan anomali."
          meta={
            <>
              <HeroChip
                icon={<TrendingUp className="h-3 w-3" />}
                label="Total scan"
                value={summary.total}
              />
              <HeroChip
                icon={<Plane className="h-3 w-3" />}
                label="Valid"
                value={summary.valid}
              />
              <HeroChip
                icon={<TrendingUp className="h-3 w-3" />}
                label="Success"
                value={`${summary.successRate}%`}
              />
            </>
          }
          actions={
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangePreset)}
              className="h-10 rounded-xl border-0 bg-white/95 px-3 text-sm font-semibold text-indigo-700 ring-1 ring-white/40 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="today">Hari ini ({todayDateString()})</option>
              <option value="7d">7 hari terakhir</option>
              <option value="30d">30 hari terakhir</option>
              <option value="all">Semua waktu</option>
            </select>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-full animate-fade-up stagger-1">
            <StatCard
              label="Total scan"
              value={summary.total}
              tone="brand"
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>
          <div className="h-full animate-fade-up stagger-2">
            <StatCard
              label="Valid"
              value={summary.valid}
              tone="emerald"
              icon={<Plane className="h-5 w-5" />}
            />
          </div>
          <div className="h-full animate-fade-up stagger-3">
            <StatCard
              label="Duplikat"
              value={summary.dup}
              tone="amber"
              icon={<Users className="h-5 w-5" />}
            />
          </div>
          <div className="h-full animate-fade-up stagger-4">
            <StatCard
              label="Success rate"
              value={`${summary.successRate}%`}
              tone="violet"
              icon={<TrendingUp className="h-5 w-5" />}
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
            <Card className="animate-fade-up stagger-1 lift">
              <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-indigo-200" />
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200">
                      <Clock className="h-3.5 w-3.5" />
                    </span>
                    Scan per Jam (0–23)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <HourlyBars data={hourly} />
              </CardBody>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="animate-fade-up stagger-2 lift">
                <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-emerald-200" />
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                        <PieChart className="h-3.5 w-3.5" />
                      </span>
                      Distribusi Status
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <StatusDonut data={statusDist} total={summary.total} />
                </CardBody>
              </Card>

              <Card className="animate-fade-up stagger-3 lift">
                <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-amber-200" />
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                        <Trophy className="h-3.5 w-3.5" />
                      </span>
                      Top User
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {topUsers.length === 0 ? (
                    <p className="text-sm text-slate-500">Tidak ada data.</p>
                  ) : (
                    <ul className="space-y-2">
                      {topUsers.map((u, i) => (
                        <li
                          key={u.user}
                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50/70 px-3 py-2 ring-1 ring-slate-200/70"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                              {i + 1}
                            </span>
                            <span className="truncate text-sm font-semibold text-slate-700">
                              {u.user}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-700">
                              {u.count}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              {u.valid} valid
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card className="animate-fade-up stagger-4 lift">
              <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-blue-200" />
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                      <Plane className="h-3.5 w-3.5" />
                    </span>
                    Top Flight
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody>
                {topFlights.length === 0 ? (
                  <p className="text-sm text-slate-500">Tidak ada data.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {topFlights.map((f, i) => (
                      <li
                        key={f.key}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50/70 px-3 py-2 ring-1 ring-slate-200/70"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                            {i + 1}
                          </span>
                          {f.flight ? (
                            <Link
                              href={`/flights/${f.flight.id}`}
                              className="truncate text-sm font-semibold text-slate-800 hover:text-blue-700"
                            >
                              {f.label}
                            </Link>
                          ) : (
                            <span className="truncate text-sm font-semibold text-slate-700">
                              {f.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-700">
                            {f.count}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            {f.valid} valid
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function HourlyBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const width = 720;
  const height = 180;
  const padTop = 12;
  const padBottom = 26;
  const padLeft = 28;
  const padRight = 8;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const barW = innerW / 24;
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[480px] w-full"
        role="img"
        aria-label="Distribusi scan per jam"
      >
        {/* axis lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padTop + innerH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 4}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="#94a3b8"
              >
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
        {/* bars */}
        {data.map((v, i) => {
          const h = (v / max) * innerH;
          const x = padLeft + i * barW + 2;
          const y = padTop + innerH - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={Math.max(barW - 4, 1)}
                height={h}
                rx={3}
                fill="url(#barGrad)"
              >
                <title>
                  {String(i).padStart(2, "0")}:00 — {v} scan
                </title>
              </rect>
              {i % 3 === 0 && (
                <text
                  x={x + (barW - 4) / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {String(i).padStart(2, "0")}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a5b4fc" />
          </linearGradient>
        </defs>
      </svg>
    </div>
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
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44 shrink-0">
        {arcs.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={r} fill={STATUS_COLORS[arcs[0].status]} />
            <circle cx={cx} cy={cy} r={inner} fill="white" />
          </>
        ) : (
          arcs.map((a) => (
            <path
              key={a.status}
              d={a.path}
              fill={STATUS_COLORS[a.status]}
              stroke="white"
              strokeWidth="1.5"
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
          y={cy - 4}
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#0f172a"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          total scan
        </text>
      </svg>
      <ul className="w-full space-y-1">
        {data.map((d) => {
          const pct = Math.round((d.count / total) * 100);
          return (
            <li
              key={d.status}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: STATUS_COLORS[d.status] }}
                />
                <span className="truncate text-slate-700">
                  {STATUS_LABEL[d.status]}
                </span>
              </span>
              <span className="font-semibold text-slate-700">
                {d.count}
                <span className="ml-1 text-[10px] text-slate-400">({pct}%)</span>
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
