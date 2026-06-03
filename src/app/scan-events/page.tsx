"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Filter, Search, X, Download } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui/Table";
import { ScanStatusBadge } from "@/components/ui/StatusBadge";
import { ScanEvent, ScanResultStatus } from "@/lib/types";
import { getScanEvents, getScanEventsArchive } from "@/lib/storage";
import { formatDateTime, todayDateString } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import { useToast } from "@/components/ui/Toast";
import { PageHero, HeroChip } from "@/components/layout/PageHero";
import { Pagination } from "@/components/ui/Pagination";

const STATUSES: ScanResultStatus[] = [
  "VALID_FLIGHT",
  "DUPLICATE_SCAN",
  "FLIGHT_NOT_TODAY",
  "FLIGHT_NOT_ACTIVE",
  "UNKNOWN_FLIGHT",
  "INVALID_BARCODE",
];

const PAGE_SIZE = 25;

export default function ScanEventsPage() {
  const toast = useToast();
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [includeArchive, setIncludeArchive] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScanResultStatus | "ALL">(
    "ALL",
  );
  const [datePreset, setDatePreset] = useState<"today" | "all" | "custom">(
    "today",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [flightFilter, setFlightFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setEvents(getScanEvents());
  }, []);

  useEffect(() => {
    if (includeArchive) {
      setEvents([...getScanEvents(), ...getScanEventsArchive()]);
    } else {
      setEvents(getScanEvents());
    }
    setPage(1);
  }, [includeArchive]);

  const today = todayDateString();

  // Reset page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, datePreset, dateFrom, dateTo, flightFilter, userFilter]);

  const flightOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.parsedFlightNumber) set.add(e.parsedFlightNumber);
    }
    return Array.from(set).sort();
  }, [events]);

  const userOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.scannedBy);
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const dateStr = e.scannedAt.slice(0, 10);
      if (datePreset === "today" && dateStr !== today) return false;
      if (datePreset === "custom") {
        if (dateFrom && dateStr < dateFrom) return false;
        if (dateTo && dateStr > dateTo) return false;
      }

      if (statusFilter !== "ALL" && e.resultStatus !== statusFilter)
        return false;

      if (flightFilter && e.parsedFlightNumber !== flightFilter) return false;
      if (userFilter && e.scannedBy !== userFilter) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (e.parsedFlightNumber ?? "").toLowerCase().includes(q) ||
        (e.parsedPnr ?? "").toLowerCase().includes(q) ||
        (e.parsedTicketNumber ?? "").toLowerCase().includes(q) ||
        (e.parsedSeatNumber ?? "").toLowerCase().includes(q) ||
        (e.parsedPassengerName ?? "").toLowerCase().includes(q) ||
        e.rawBarcode.toLowerCase().includes(q) ||
        e.scannedBy.toLowerCase().includes(q)
      );
    });
  }, [
    events,
    search,
    statusFilter,
    datePreset,
    dateFrom,
    dateTo,
    flightFilter,
    userFilter,
    today,
  ]);

  const summary = useMemo(() => {
    const t = filtered.length;
    const v = filtered.filter((e) => e.resultStatus === "VALID_FLIGHT").length;
    const d = filtered.filter(
      (e) => e.resultStatus === "DUPLICATE_SCAN",
    ).length;
    const r = t - v - d;
    return { total: t, valid: v, dup: d, rejected: r };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const hasActiveFilter =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    datePreset !== "today" ||
    !!flightFilter ||
    !!userFilter;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setDatePreset("today");
    setDateFrom("");
    setDateTo("");
    setFlightFilter("");
    setUserFilter("");
  };

  const onExport = () => {
    if (filtered.length === 0) {
      toast.info("Tidak ada event untuk di-export.");
      return;
    }
    const rows = [
      [
        "Waktu",
        "Flight",
        "PNR",
        "Seat",
        "Tiket",
        "Penumpang",
        "Status",
        "Pesan",
        "Petugas",
        "Barcode",
      ],
      ...filtered.map((e) => [
        e.scannedAt,
        e.parsedFlightNumber ?? "",
        e.parsedPnr ?? "",
        e.parsedSeatNumber ?? "",
        e.parsedTicketNumber ?? "",
        e.parsedPassengerName ?? "",
        e.resultStatus,
        e.message,
        e.scannedBy,
        e.rawBarcode,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan_events_${todayDateString()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success(`${filtered.length} event di-export.`);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHero
          tone="amber"
          eyebrow="Riwayat"
          eyebrowIcon={<History className="h-3.5 w-3.5" />}
          ghostIcon={<History className="h-full w-full" strokeWidth={1.5} />}
          title="Riwayat Scan Boarding Pass"
          description="Semua aktivitas scan (sukses & gagal) tercatat di sini — filter, paginasi, dan ekspor CSV."
          meta={
            <>
              <HeroChip
                icon={<History className="h-3 w-3" />}
                label="Tampil"
                value={summary.total}
              />
              <HeroChip label="Valid" value={summary.valid} />
              <HeroChip label="Dup" value={summary.dup} />
              <HeroChip label="Ditolak" value={summary.rejected} />
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryPill
            label="Total"
            value={summary.total}
            tone="brand"
            delay={60}
          />
          <SummaryPill
            label="Valid"
            value={summary.valid}
            tone="emerald"
            delay={120}
          />
          <SummaryPill
            label="Duplicate"
            value={summary.dup}
            tone="amber"
            delay={180}
          />
          <SummaryPill
            label="Rejected"
            value={summary.rejected}
            tone="rose"
            delay={240}
          />
        </div>

        <Card className="animate-fade-up stagger-2 lift">
          <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-cyan-200" />
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200">
                  <History className="h-3.5 w-3.5" />
                </span>
                Scan Events
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {filtered.length}
                </span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onExport}>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              {hasActiveFilter && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" />
                  Reset filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Cari PNR / Tiket / Nama / Barcode / user…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ScanResultStatus | "ALL")
                }
              >
                <option value="ALL">Semua status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                value={datePreset}
                onChange={(e) =>
                  setDatePreset(e.target.value as "today" | "all" | "custom")
                }
              >
                <option value="today">Hari ini</option>
                <option value="all">Semua tanggal</option>
                <option value="custom">Range kustom…</option>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                disabled={datePreset !== "custom"}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Dari"
              />
              <Input
                type="date"
                value={dateTo}
                disabled={datePreset !== "custom"}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Sampai"
              />
              <Select
                value={flightFilter}
                onChange={(e) => setFlightFilter(e.target.value)}
              >
                <option value="">Semua flight</option>
                {flightOptions.map((fn) => (
                  <option key={fn} value={fn}>
                    {fn}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="">Semua petugas</option>
                {userOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={includeArchive}
                  onChange={(e) => setIncludeArchive(e.target.checked)}
                />
                <Filter className="h-3.5 w-3.5" />
                Sertakan arsip (event hari kemarin & sebelumnya)
              </label>
            </div>

            <Table>
              <THead>
                <Tr>
                  <Th>Waktu</Th>
                  <Th>Flight</Th>
                  <Th>Penumpang</Th>
                  <Th>Seat</Th>
                  <Th>PNR</Th>
                  <Th>Status</Th>
                  <Th>Pesan</Th>
                  <Th>Petugas</Th>
                </Tr>
              </THead>
              <TBody>
                {paginated.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} className="px-0 py-0">
                      <EmptyState
                        tone="info"
                        icon={<History className="h-6 w-6" />}
                        title="Belum ada event scan sesuai filter"
                        description="Coba ubah filter atau reset pencarian."
                      />
                    </Td>
                  </Tr>
                ) : (
                  paginated.map((e, idx) => (
                    <Tr
                      key={e.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 18}ms` }}
                    >
                      <Td className="whitespace-nowrap text-slate-600">
                        {formatDateTime(e.scannedAt)}
                      </Td>
                      <Td>
                        <span className="font-semibold text-slate-800">
                          {e.parsedFlightNumber ?? "—"}
                        </span>
                      </Td>
                      <Td className="text-slate-700">
                        {e.parsedPassengerName ?? "—"}
                      </Td>
                      <Td>{e.parsedSeatNumber ?? "—"}</Td>
                      <Td className="text-slate-600">
                        {e.parsedPnr ?? "—"}
                      </Td>
                      <Td>
                        <ScanStatusBadge status={e.resultStatus} />
                      </Td>
                      <Td className="max-w-[260px] truncate text-slate-600">
                        {e.message}
                      </Td>
                      <Td className="text-slate-600">{e.scannedBy}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>

            {filtered.length > 0 && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                label="event"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

function SummaryPill({
  label,
  value,
  tone,
  delay = 0,
}: {
  label: string;
  value: number;
  tone: "brand" | "emerald" | "amber" | "rose";
  delay?: number;
}) {
  const count = useCountUp(value);
  const map = {
    brand: {
      bg: "from-blue-50 via-white to-sky-100 border-blue-200",
      label: "text-blue-700/80",
      value: "text-blue-900",
      glow: "bg-blue-300",
    },
    emerald: {
      bg: "from-emerald-50 via-white to-green-100 border-emerald-200",
      label: "text-emerald-700/80",
      value: "text-emerald-900",
      glow: "bg-emerald-300",
    },
    amber: {
      bg: "from-amber-50 via-white to-yellow-100 border-amber-200",
      label: "text-amber-700/80",
      value: "text-amber-900",
      glow: "bg-amber-300",
    },
    rose: {
      bg: "from-rose-50 via-white to-pink-100 border-rose-200",
      label: "text-rose-700/80",
      value: "text-rose-900",
      glow: "bg-rose-300",
    },
  } as const;
  const t = map[tone];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br px-4 py-3 shadow-card backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-fade-up ${t.bg}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`deco-blob -right-6 -top-6 h-20 w-20 ${t.glow}`} />
      <div className="relative z-[1]">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${t.label}`}
        >
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${t.value}`}>{count}</p>
      </div>
    </div>
  );
}
