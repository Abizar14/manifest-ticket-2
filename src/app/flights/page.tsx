"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Filter,
  Plane,
  Trash2,
  Calendar,
  Search,
  Pencil,
  Eye,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FlightStatusBadge } from "@/components/ui/StatusBadge";
import { Flight, FlightStatus, ScanEvent, SessionUser } from "@/lib/types";
import {
  deleteFlight,
  getFlights,
  getScanEvents,
  getSession,
} from "@/lib/storage";
import {
  todayDateString,
  tomorrowDateString,
  yesterdayDateString,
  dateStringFromOffset,
  cn,
} from "@/lib/utils";
import { canManageFlights } from "@/lib/auth";
import { getBoardingProgress } from "@/lib/boarding";
import { getSettings, subscribeSettings } from "@/lib/settings";
import { getEffectiveFlightStatus } from "@/lib/flightStatus";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { Pagination } from "@/components/ui/Pagination";
import { LargeTitle } from "@/components/mobile/LargeTitle";
import { ListSection } from "@/components/mobile/GroupedList";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";
import { FlightRow } from "@/components/mobile/FlightRow";

const STATUSES: FlightStatus[] = [
  "DRAFT",
  "OPEN",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
];

const PAGE_SIZE = 15;

type DateFilter =
  | "all"
  | "today"
  | "tomorrow"
  | "yesterday"
  | "last7"
  | "past";

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [statusFilter, setStatusFilter] = useState<FlightStatus | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [settings, setSettings] = useState(() => getSettings());
  const [now, setNow] = useState(() => new Date());
  const [onlyBoardable, setOnlyBoardable] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();
  const [session, setSessionState] = useState<SessionUser | null>(null);
  const canManage = canManageFlights(session?.role);

  useEffect(() => {
    setSessionState(getSession());
    setFlights(getFlights());
    setEvents(getScanEvents());
    const s = getSettings();
    setSettings(s);
    setDateFilter(s.flightListShowOnlyToday ? "today" : "all");
    const unsub = subscribeSettings((next) => {
      setSettings(next);
    });
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, []);

  const filtered = useMemo(() => {
    const today = todayDateString();
    const tomorrow = tomorrowDateString();
    const yesterday = yesterdayDateString();
    const sevenDaysAgo = dateStringFromOffset(-7);
    return flights
      .filter((f) => {
        if (dateFilter === "today") return f.departureDate === today;
        if (dateFilter === "tomorrow") return f.departureDate === tomorrow;
        if (dateFilter === "yesterday") return f.departureDate === yesterday;
        if (dateFilter === "last7") {
          return f.departureDate >= sevenDaysAgo && f.departureDate <= today;
        }
        if (dateFilter === "past") return f.departureDate < today;
        return true;
      })
      .filter((f) => (statusFilter === "ALL" ? true : f.status === statusFilter))
      .filter((f) => {
        if (!onlyBoardable) return true;
        const eff = getEffectiveFlightStatus(f, now, settings).status;
        return eff === "ACTIVE" || eff === "OPEN";
      })
      .filter((f) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          f.flightNumber.toLowerCase().includes(q) ||
          f.airlineCode.toLowerCase().includes(q) ||
          f.destinationAirport.toLowerCase().includes(q) ||
          f.originAirport.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const showOldestFirst =
          dateFilter === "today" || dateFilter === "tomorrow";
        const cmp = (a.departureDate + a.departureTime).localeCompare(
          b.departureDate + b.departureTime,
        );
        return showOldestFirst ? cmp : -cmp;
      });
  }, [flights, search, dateFilter, statusFilter, onlyBoardable, now, settings]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, statusFilter, onlyBoardable]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const onDelete = async (id: string) => {
    const target = flights.find((f) => f.id === id);
    const res = await confirm({
      title: `Hapus flight ${target?.flightNumber ?? ""}?`,
      description:
        "Jadwal ini akan dihapus permanen. Riwayat scan terkait tetap tersimpan di arsip.",
      tone: "danger",
      destructive: true,
      confirmLabel: "Hapus Flight",
      cancelLabel: "Batal",
    });
    if (!res.confirmed) return;
    deleteFlight(id);
    toast.success("Flight dihapus.");
    setFlights(getFlights());
  };

  return (
    <AppShell>
      {/* ============ MOBILE — iOS-native layout ============ */}
      <div className="space-y-4 lg:hidden">
        <LargeTitle
          eyebrow="Jadwal Penerbangan"
          title="Flights"
          subtitle={`${filtered.length} dari ${flights.length} flight`}
          trailing={
            canManage && (
              <Link
                href="/flights/create"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lift active:scale-95"
                aria-label="Tambah Penerbangan"
              >
                <Plus className="h-4 w-4" />
              </Link>
            )
          }
        />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
          <Input
            className="h-11 rounded-2xl pl-9 text-[15px]"
            placeholder="Cari flight / rute / airline"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <SegmentedControl
          value={dateFilter}
          onChange={(v) => setDateFilter(v as DateFilter)}
          options={[
            { value: "today", label: "Hari ini" },
            { value: "tomorrow", label: "Besok" },
            { value: "yesterday", label: "Kemarin" },
            { value: "last7", label: "7 hari" },
            { value: "past", label: "Lampau" },
            { value: "all", label: "Semua" },
          ]}
          size="sm"
        />

        <SegmentedControl
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as FlightStatus | "ALL")}
          options={[
            { value: "ALL", label: "Semua status" },
            { value: "OPEN", label: "OPEN" },
            { value: "ACTIVE", label: "ACTIVE" },
            { value: "CLOSED", label: "CLOSED" },
          ]}
          size="sm"
        />

        {filtered.length === 0 ? (
          <EmptyState
            tone="info"
            icon={<Plane className="h-6 w-6" />}
            title="Tidak ada penerbangan"
            description="Coba ubah filter tanggal atau status, atau bersihkan pencarian."
          />
        ) : (
          <ListSection caption={`${paginated.length} flight ditampilkan · halaman ${currentPage} / ${totalPages}`}>
            {paginated.map((f) => {
              const eff = getEffectiveFlightStatus(f, now, settings);
              const differs = eff.status !== f.status;
              const progress = getBoardingProgress(f, events);
              return (
                <FlightRow
                  key={f.id}
                  flight={f}
                  effectiveStatus={eff.status}
                  effectiveAuto={differs}
                  progress={{
                    boarded: progress.boarded,
                    expected: progress.expected,
                    percent: progress.percent,
                    tone: progress.tone,
                  }}
                />
              );
            })}
          </ListSection>
        )}

        {filtered.length > 0 && totalPages > 1 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label="flight"
          />
        )}
      </div>

      {/* ============ DESKTOP — original layout ============ */}
      <div className="hidden lg:block space-y-6">
        <FlightsHero
          totalCount={flights.length}
          shownCount={filtered.length}
          canManage={canManage}
        />

        <section className="animate-fade-up stagger-1 relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-[0_18px_40px_-24px_rgba(15,42,98,0.35)] backdrop-blur-sm dark:border-hairline dark:bg-surface/95">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-blue-300/40 blur-3xl dark:bg-sky-500/15"
          />

          <header className="relative flex items-center justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-[0_8px_18px_-6px_rgba(37,99,235,0.7)] ring-1 ring-white/40">
                <Plane className="h-4 w-4" />
              </span>
              <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-slate-800 dark:text-ink">
                Daftar Flight
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-surface-elev dark:text-ink-muted">
                  {filtered.length}
                </span>
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-surface-elev dark:text-ink-muted dark:ring-hairline">
              <Filter className="h-3 w-3" />
              Filter aktif
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            </span>
          </header>

          <CardBody className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Cari flight number / rute…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value as DateFilter)
                }
              >
                <option value="today">Hari ini, {todayDateString()}</option>
                <option value="tomorrow">Besok</option>
                <option value="yesterday">Kemarin</option>
                <option value="last7">7 hari terakhir</option>
                <option value="past">Semua hari lampau</option>
                <option value="all">Semua tanggal</option>
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as FlightStatus | "ALL")
                }
              >
                <option value="ALL">Semua status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setOnlyBoardable((v) => !v)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[12.5px] font-semibold transition-all",
                  onlyBoardable
                    ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 shadow-[0_4px_12px_-4px_rgba(6,182,212,0.4)] dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-400/30"
                    : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-surface-elev dark:text-ink-muted dark:ring-hairline",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    onlyBoardable
                      ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                      : "bg-slate-300 dark:bg-ink-subtle",
                  )}
                />
                Hanya ACTIVE & OPEN
                {onlyBoardable && (
                  <X
                    className="h-3.5 w-3.5 opacity-70 hover:opacity-100"
                    aria-label="Matikan filter"
                  />
                )}
              </button>
            </div>

            {/* Mobile: card stack */}
            <div className="md:hidden">
              {filtered.length === 0 ? (
                <EmptyState
                  tone="info"
                  icon={<Plane className="h-6 w-6" />}
                  title="Tidak ada penerbangan sesuai filter"
                  description="Coba bersihkan pencarian atau ubah filter tanggal / status."
                />
              ) : (
                <ul className="space-y-2.5">
                  {paginated.map((f, idx) => (
                    <li
                      key={f.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <Link
                        href={`/flights/${f.id}`}
                        className="block rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-slate-200 transition active:scale-[0.99] dark:bg-surface dark:ring-hairline"
                      >
                        <div className="flex items-start gap-3">
                          <AirlineLogo code={f.airlineCode} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-bold text-slate-800 dark:text-ink">
                                {f.flightNumber}
                              </p>
                              <EffectiveBadge
                                flight={f}
                                now={now}
                                settings={settings}
                              />
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-muted">
                              <span className="font-medium text-slate-700 dark:text-ink/85">
                                {f.originAirport}
                              </span>{" "}
                              →{" "}
                              <span className="font-medium text-slate-700 dark:text-ink/85">
                                {f.destinationAirport}
                              </span>
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-ink-muted">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-hairline">
                                <Calendar className="h-3 w-3" />
                                {f.departureDate}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 font-mono font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-ink dark:ring-hairline">
                                {f.departureTime}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30">
                                {f.gateOrCheckpoint}
                              </span>
                            </div>
                            <div className="mt-2">
                              <ProgressMini
                                progress={getBoardingProgress(f, events)}
                              />
                            </div>
                          </div>
                        </div>
                        {canManage && (
                          <div
                            className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-2"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Link href={`/flights/${f.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Pencil className="h-3.5 w-3.5 text-blue-700" />
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                onDelete(f.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                              Hapus
                            </Button>
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Desktop: grid-aligned table */}
            <div className="hidden md:block">
              {filtered.length === 0 ? (
                <EmptyState
                  tone="info"
                  icon={<Plane className="h-6 w-6" />}
                  title="Tidak ada penerbangan sesuai filter"
                  description="Coba bersihkan pencarian atau ubah filter tanggal / status."
                />
              ) : (
                <div>
                  {/* Column headers */}
                  <div className="grid items-center gap-3 border-b border-slate-200/80 px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:border-hairline dark:text-ink-subtle grid-cols-[minmax(150px,1.4fr)_minmax(110px,1fr)_minmax(110px,1fr)_70px_minmax(80px,0.9fr)_minmax(130px,1.3fr)_110px_100px]">
                    <span>Flight</span>
                    <span>Rute</span>
                    <span>Tanggal</span>
                    <span>Waktu</span>
                    <span>Gate</span>
                    <span>Boarding</span>
                    <span>Status</span>
                    <span className="text-right">Aksi</span>
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-hairline">
                    {paginated.map((f, idx) => {
                      const eff = getEffectiveFlightStatus(f, now, settings);
                      const differs = eff.status !== f.status;
                      const progress = getBoardingProgress(f, events);
                      return (
                        <li
                          key={f.id}
                          className="animate-fade-up grid items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-surface-elev/60 grid-cols-[minmax(150px,1.4fr)_minmax(110px,1fr)_minmax(110px,1fr)_70px_minmax(80px,0.9fr)_minmax(130px,1.3fr)_110px_100px]"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          {/* Flight */}
                          <div className="flex min-w-0 items-center gap-2.5">
                            <AirlineLogo code={f.airlineCode} size="sm" />
                            <div className="min-w-0">
                              <Link
                                href={`/flights/${f.id}`}
                                className="block truncate text-[13.5px] font-bold tracking-tight text-slate-800 hover:text-blue-700 dark:text-ink dark:hover:text-blue-300"
                              >
                                {f.flightNumber}
                              </Link>
                              <div className="text-[11px] text-slate-500 dark:text-ink-muted">
                                {f.airlineCode}
                              </div>
                            </div>
                          </div>
                          {/* Rute */}
                          <span className="text-[13px] text-slate-700 dark:text-ink">
                            <span className="font-medium">{f.originAirport}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="font-medium">
                              {f.destinationAirport}
                            </span>
                          </span>
                          {/* Tanggal */}
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-700 dark:text-ink-muted">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {f.departureDate}
                          </span>
                          {/* Waktu */}
                          <span className="text-[12.5px] font-semibold tabular-nums text-slate-700 dark:text-ink">
                            {f.departureTime}
                          </span>
                          {/* Gate */}
                          <span className="text-[12.5px] text-slate-700 dark:text-ink">
                            {f.gateOrCheckpoint}
                          </span>
                          {/* Boarding */}
                          <ProgressMini progress={progress} />
                          {/* Status */}
                          <SolidStatusPill
                            status={eff.status}
                            title={
                              differs
                                ? `Manual: ${f.status} • ${eff.description}`
                                : eff.description
                            }
                          />
                          {/* Aksi */}
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/flights/${f.id}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-ink-muted dark:hover:bg-surface-elev dark:hover:text-ink"
                              title="Detail"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            {canManage && (
                              <>
                                <Link
                                  href={`/flights/${f.id}/edit`}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-500/15"
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => onDelete(f.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {filtered.length > 0 && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                label="flight"
              />
            )}
          </CardBody>
        </section>
      </div>
    </AppShell>
  );
}

function FlightsHero({
  totalCount,
  shownCount,
  canManage,
}: {
  readonly totalCount: number;
  readonly shownCount: number;
  readonly canManage: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-slate-200/70 p-6 shadow-[0_18px_40px_-22px_rgba(15,42,98,0.45)] dark:border-sky-500/20">
      {/* Photo background — full color, no washed-out overlay */}
      <img
        src="/asset-cards/card-bg-jadwal_penerbangan.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      {/* Subtle left-side dark gradient for text legibility — same in both modes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,12,30,0.65)_0%,rgba(5,12,30,0.4)_35%,rgba(5,12,30,0.1)_60%,rgba(5,12,30,0)_80%)]"
      />
      {/* Bottom vignette for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-[linear-gradient(180deg,transparent_0%,rgba(5,12,30,0.5)_100%)]"
      />

      {/* Right-side airport silhouette + plane */}
      <svg
        aria-hidden
        viewBox="0 0 500 280"
        preserveAspectRatio="xMaxYMid meet"
        className="pointer-events-none absolute inset-y-0 right-4 -z-10 h-full w-[55%] opacity-90"
      >
        <defs>
          <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(125,211,252,0.35)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
          <linearGradient id="runwayG" x1="50%" y1="0" x2="50%" y2="1">
            <stop offset="0%" stopColor="rgba(186,230,253,0)" />
            <stop offset="100%" stopColor="rgba(186,230,253,0.35)" />
          </linearGradient>
          <radialGradient id="planeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(186,230,253,0.95)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </radialGradient>
          <linearGradient id="planeBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,1)" />
            <stop offset="100%" stopColor="rgba(186,230,253,0.95)" />
          </linearGradient>
        </defs>

        {/* Distant terminal */}
        <path
          d="M0,210 L40,200 L70,192 L110,190 L130,180 L190,180 L200,172 L260,172 L270,178 L330,178 L340,170 L410,170 L420,178 L470,178 L490,184 L500,184 L500,280 L0,280 Z"
          fill="rgba(15,42,98,0.35)"
          className="dark:fill-[rgba(7,21,52,0.85)]"
        />
        {/* Terminal windows */}
        {Array.from({ length: 20 }).map((_, i) => (
          <rect
            key={i}
            x={70 + i * 20}
            y={188 + (i % 2) * 2}
            width="3"
            height="3"
            fill="rgba(254,243,199,0.7)"
            className="dark:fill-[rgba(254,243,199,0.9)]"
          />
        ))}
        {/* Control tower */}
        <g>
          <rect x="380" y="140" width="5" height="40" fill="rgba(15,42,98,0.5)" className="dark:fill-[rgba(255,255,255,0.2)]" />
          <ellipse cx="382.5" cy="138" rx="9" ry="6" fill="rgba(15,42,98,0.55)" className="dark:fill-[rgba(255,255,255,0.28)]" />
          <circle cx="382.5" cy="136" r="2" fill="#fde68a">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
        {/* Runway perspective */}
        <polygon points="180,255 280,255 360,280 100,280" fill="url(#runwayG)" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x={228 - i * 2}
            y={258 + i * 3}
            width={6 + i * 2}
            height="1.5"
            fill="rgba(254,243,199,0.75)"
          />
        ))}

        {/* BIG foreground plane — central focus */}
        <g transform="translate(250 110) rotate(-8)">
          {/* glow halo */}
          <circle cx="20" cy="0" r="95" fill="url(#planeGlow)" opacity="0.55" />
          {/* shadow */}
          <ellipse cx="0" cy="60" rx="100" ry="10" fill="rgba(15,42,98,0.25)" className="dark:fill-[rgba(0,0,0,0.45)]" />

          {/* fuselage */}
          <path
            d="M-90 0 C -80 -4, -40 -7, 30 -7 L 76 -5 L 92 -2 L 96 0 L 92 2 L 76 5 L 30 7 C -40 7, -80 4, -90 2 Z"
            fill="url(#planeBody)"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="0.6"
          />
          {/* main wing */}
          <path
            d="M-10 -2 L -45 -36 L 0 -38 L 30 -28 L 40 -2 Z"
            fill="rgba(224,242,254,0.92)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.6"
          />
          {/* main wing under */}
          <path
            d="M-10 2 L -45 38 L 0 40 L 30 30 L 40 2 Z"
            fill="rgba(186,230,253,0.85)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.6"
          />
          {/* tail */}
          <path
            d="M-90 -1 L -82 -22 L -70 -22 L -78 -1 Z"
            fill="rgba(224,242,254,0.95)"
          />
          <path
            d="M-90 1 L -82 22 L -70 22 L -78 1 Z"
            fill="rgba(186,230,253,0.85)"
          />
          {/* cockpit window */}
          <path
            d="M 70 -3 Q 84 -3, 90 0 Q 84 3, 70 3 Z"
            fill="rgba(15,42,98,0.45)"
            className="dark:fill-[rgba(7,21,52,0.7)]"
          />
          {/* engine pods */}
          <ellipse cx="-15" cy="-12" rx="8" ry="3" fill="rgba(15,42,98,0.4)" className="dark:fill-[rgba(7,21,52,0.6)]" />
          <ellipse cx="-15" cy="12" rx="8" ry="3" fill="rgba(15,42,98,0.4)" className="dark:fill-[rgba(7,21,52,0.6)]" />
          {/* nose light */}
          <circle cx="96" cy="0" r="3" fill="#ffffff">
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="96" cy="0" r="6" fill="rgba(254,243,199,0.6)" opacity="0.5">
            <animate
              attributeName="r"
              values="5;9;5"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
          {/* wingtip lights */}
          <circle cx="-45" cy="-36" r="1.6" fill="#fbbf24">
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="-45" cy="38" r="1.6" fill="#34d399">
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur="1.4s"
              repeatCount="indefinite"
              begin="0.7s"
            />
          </circle>
        </g>

        {/* contrail behind plane */}
        <path
          d="M30,100 C 80,95 130,98 180,102"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 6"
          fill="none"
        />
      </svg>

      <div className="relative min-h-[200px] flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white ring-1 ring-white/30 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <Plane className="h-3.5 w-3.5" />
            Jadwal
          </span>
          <h1 className="mt-3 text-[36px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_4px_16px_rgba(2,8,30,0.55)]">
            Jadwal Penerbangan
          </h1>
          <p className="mt-1 max-w-[520px] text-[13.5px] leading-relaxed text-white/85 drop-shadow-[0_1px_4px_rgba(2,8,30,0.5)]">
            Kelola jadwal flight hari ini & besok.
            <br />
            Hanya status OPEN/ACTIVE yang dapat divalidasi.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2.5 rounded-2xl bg-white/12 px-3.5 py-2 ring-1 ring-white/25 backdrop-blur-md shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/15 text-sky-200 ring-1 ring-white/25">
                <Plane className="h-3.5 w-3.5" />
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-white/75">
                  Total
                </span>
                <span className="mt-0.5 text-[16px] font-extrabold tabular-nums text-white">
                  {totalCount}
                </span>
              </div>
            </span>
            <span className="inline-flex items-center gap-2.5 rounded-2xl bg-white/12 px-3.5 py-2 ring-1 ring-white/25 backdrop-blur-md shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/15 text-cyan-200 ring-1 ring-white/25">
                <Filter className="h-3.5 w-3.5" />
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-white/75">
                  Tampil
                </span>
                <span className="mt-0.5 text-[16px] font-extrabold tabular-nums text-white">
                  {shownCount}
                </span>
              </div>
            </span>
          </div>
        </div>

        {canManage && (
          <Link
            href="/flights/create"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-sky-400/15 px-5 py-3 text-[13.5px] font-bold text-sky-100 shadow-[0_0_32px_rgba(56,189,248,0.45)] ring-1 ring-sky-400/50 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-sky-400/25 hover:shadow-[0_0_40px_rgba(56,189,248,0.65)]"
          >
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.25)_0%,transparent_70%)]"
            />
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Plus className="relative h-4 w-4" />
            <span className="relative">Tambah Penerbangan</span>
          </Link>
        )}
      </div>
    </section>
  );
}

const SOLID_PILL: Record<
  ReturnType<typeof getEffectiveFlightStatus>["status"],
  { bg: string; text: string; label: string }
> = {
  ACTIVE: {
    bg: "bg-emerald-500/90 dark:bg-emerald-500/25",
    text: "text-white dark:text-emerald-200",
    label: "ACTIVE",
  },
  OPEN: {
    bg: "bg-blue-500/90 dark:bg-blue-500/25",
    text: "text-white dark:text-blue-200",
    label: "OPEN",
  },
  CLOSED: {
    bg: "bg-slate-500/90 dark:bg-slate-500/25",
    text: "text-white dark:text-slate-200",
    label: "CLOSED",
  },
  DRAFT: {
    bg: "bg-amber-500/90 dark:bg-amber-500/25",
    text: "text-white dark:text-amber-200",
    label: "DRAFT",
  },
  CANCELLED: {
    bg: "bg-rose-500/90 dark:bg-rose-500/25",
    text: "text-white dark:text-rose-200",
    label: "CANCELLED",
  },
};

function SolidStatusPill({
  status,
  title,
}: {
  readonly status: ReturnType<typeof getEffectiveFlightStatus>["status"];
  readonly title?: string;
}) {
  const t = SOLID_PILL[status];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center rounded-full px-3 py-1 text-[10.5px] font-extrabold tracking-wider ring-1",
        t.bg,
        t.text,
        status === "ACTIVE"
          ? "ring-emerald-300/40"
          : status === "OPEN"
            ? "ring-blue-300/40"
            : status === "DRAFT"
              ? "ring-amber-300/40"
              : status === "CANCELLED"
                ? "ring-rose-300/40"
                : "ring-slate-300/40",
      )}
    >
      {t.label}
    </span>
  );
}

function EffectiveBadge({
  flight,
  now,
  settings,
}: {
  flight: Flight;
  now: Date;
  settings: ReturnType<typeof getSettings>;
}) {
  const eff = getEffectiveFlightStatus(flight, now, settings);
  const differs = eff.status !== flight.status;
  return (
    <span
      className="inline-flex items-center gap-1"
      title={
        differs
          ? `Manual: ${flight.status} • ${eff.description}`
          : eff.description
      }
    >
      <FlightStatusBadge status={eff.status} />
      {differs && (
        <span
          aria-label="Auto-derived"
          className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200"
        >
          auto
        </span>
      )}
    </span>
  );
}

const MINI_TONE: Record<
  "neutral" | "info" | "warning" | "success" | "danger",
  { bar: string; text: string }
> = {
  neutral: { bar: "bg-slate-400", text: "text-slate-700" },
  info: { bar: "bg-blue-500", text: "text-blue-700" },
  warning: { bar: "bg-amber-500", text: "text-amber-700" },
  success: { bar: "bg-emerald-500", text: "text-emerald-700" },
  danger: { bar: "bg-rose-500", text: "text-rose-700" },
};

function ProgressMini({
  progress,
}: {
  progress: ReturnType<typeof getBoardingProgress>;
}) {
  if (progress.expected === null) {
    return (
      <span className="text-xs italic text-slate-400">
        {progress.boarded} / —
      </span>
    );
  }
  const t = MINI_TONE[progress.tone];
  const percent = progress.percent ?? 0;
  return (
    <div className="min-w-[110px]">
      <div className={cn("text-xs font-semibold", t.text)}>
        {progress.boarded} / {progress.expected}{" "}
        <span className="text-[10px] font-medium text-slate-400">
          ({percent}%)
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        <div
          className={cn("h-full rounded-full transition-all", t.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
