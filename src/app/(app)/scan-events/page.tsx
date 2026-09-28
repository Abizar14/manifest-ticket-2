"use client";

import { useEffect, useMemo, useState } from "react";
import {
  History,
  Filter,
  Search,
  X,
  Download,
  TrendingUp,
  CheckCircle2,
  CopyCheck,
  AlertOctagon,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
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
import { LargeTitle } from "@/components/mobile/LargeTitle";
import { ListSection } from "@/components/mobile/GroupedList";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";
import { EventRow } from "@/components/mobile/EventRow";
import { downloadXlsx, type XlsxTone } from "@/lib/xlsxExport";
import { FaceThumb } from "@/components/scan/FaceThumb";
import { Modal } from "@/components/ui/Modal";

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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

  const onExport = async () => {
    if (filtered.length === 0) {
      toast.info("Tidak ada event untuk di-export.");
      return;
    }

    let rangeLabel = "Semua waktu";
    if (datePreset === "today") rangeLabel = `Hari ini (${today})`;
    else if (datePreset === "custom") {
      const f = dateFrom || "—";
      const t = dateTo || "—";
      rangeLabel = `${f} s/d ${t}`;
    }
    const validN = filtered.filter((e) => e.resultStatus === "VALID_FLIGHT").length;
    const dupN = filtered.filter((e) => e.resultStatus === "DUPLICATE_SCAN").length;
    const rejN = filtered.length - validN - dupN;

    const statusTone = (s: string): XlsxTone => {
      if (s === "VALID_FLIGHT") return "success";
      if (s === "DUPLICATE_SCAN") return "warning";
      return "danger";
    };

    try {
      await downloadXlsx({
        filename: `ScanEvents_${todayDateString()}.xlsx`,
        sheetName: "Scan Events",
        title: "RIWAYAT SCAN BOARDING PASS",
        subtitle: `${rangeLabel} · ${filtered.length} event · ${validN} valid · ${dupN} duplikat · ${rejN} ditolak`,
        meta: [
          { label: "Rentang waktu", value: rangeLabel },
          {
            label: "Status filter",
            value: statusFilter === "ALL" ? "Semua" : statusFilter,
          },
          { label: "Flight filter", value: flightFilter || "(semua)" },
          { label: "Petugas filter", value: userFilter || "(semua)" },
          { label: "Pencarian", value: search || "(kosong)" },
          { label: "Termasuk arsip", value: includeArchive ? "Ya" : "Tidak" },
          { label: "Total event", value: filtered.length },
          { label: "  • Valid", value: validN },
          { label: "  • Duplikat", value: dupN },
          { label: "  • Ditolak", value: rejN },
          {
            label: "Dicetak",
            value: formatDateTime(new Date().toISOString()),
          },
        ],
        columns: [
          { header: "No.", width: 6, align: "center" },
          { header: "Waktu", width: 20, align: "left" },
          { header: "Flight", width: 10, align: "center" },
          { header: "PNR", width: 10, align: "center" },
          { header: "Seat", width: 8, align: "center" },
          { header: "Tiket / SEQ", width: 14, align: "center" },
          { header: "Penumpang", width: 24, align: "left" },
          { header: "Status", width: 16, align: "center" },
          { header: "Pesan", width: 32, align: "left" },
          { header: "Petugas", width: 18, align: "left" },
          { header: "Barcode", width: 30, align: "left" },
        ],
        rows: filtered.map((e, i) => [
          i + 1,
          formatDateTime(e.scannedAt),
          { value: e.parsedFlightNumber ?? "", tone: "info" as const },
          { value: e.parsedPnr ?? "", tone: "mono" as const },
          { value: e.parsedSeatNumber ?? "", tone: "info" as const },
          { value: e.parsedTicketNumber ?? "", tone: "mono" as const },
          e.parsedPassengerName ?? "",
          { value: e.resultStatus, tone: statusTone(e.resultStatus) },
          e.message,
          e.scannedBy,
          { value: e.rawBarcode, tone: "mono" as const },
        ]),
        totals: [
          "TOTAL",
          `${filtered.length} event`,
          "",
          "",
          "",
          "",
          "",
          `${validN} ✓ / ${dupN} ⚠ / ${rejN} ✗`,
          "",
          "",
          "",
        ],
      });
      toast.success(`${filtered.length} event di-export.`);
    } catch (err) {
      toast.error("Gagal export Excel — coba lagi.");
      console.error(err);
    }
  };

  return (
    <>
      {/* ============ MOBILE — iOS-native layout ============ */}
      <div className="space-y-4 lg:hidden">
        <LargeTitle
          eyebrow="Riwayat"
          title="Scan Events"
          subtitle={`${summary.total} event · ${summary.valid} valid · ${summary.dup} dup · ${summary.rejected} ditolak`}
          trailing={
            <button
              type="button"
              onClick={onExport}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lift active:scale-95"
              aria-label="Export Excel"
            >
              <Download className="h-4 w-4" />
            </button>
          }
        />

        <div className="grid grid-cols-4 gap-2">
          <MiniStat tone="brand" label="Total" value={summary.total} />
          <MiniStat tone="emerald" label="Valid" value={summary.valid} />
          <MiniStat tone="amber" label="Dup" value={summary.dup} />
          <MiniStat tone="rose" label="Tolak" value={summary.rejected} />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
          <Input
            className="h-11 rounded-2xl pl-9 text-[15px]"
            placeholder="Cari PNR / nama / barcode / petugas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <SegmentedControl
          value={datePreset}
          onChange={(v) => setDatePreset(v as "today" | "all" | "custom")}
          options={[
            { value: "today", label: "Hari ini" },
            { value: "all", label: "Semua" },
            { value: "custom", label: "Range" },
          ]}
        />

        {datePreset === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-2xl text-[14px]"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-2xl text-[14px]"
            />
          </div>
        )}

        <SegmentedControl
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as ScanResultStatus | "ALL")}
          options={[
            { value: "ALL", label: "Semua" },
            { value: "VALID_FLIGHT", label: "Valid" },
            { value: "DUPLICATE_SCAN", label: "Dup" },
            { value: "INVALID_BARCODE", label: "Invalid" },
          ]}
          size="sm"
        />

        <label className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-[12.5px] font-semibold text-ink-muted ring-1 ring-hairline">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-blue-600"
            checked={includeArchive}
            onChange={(e) => setIncludeArchive(e.target.checked)}
          />
          <Filter className="h-3.5 w-3.5" />
          Sertakan arsip (hari kemarin & sebelumnya)
        </label>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-muted ring-1 ring-hairline active:bg-hairline/40"
          >
            <X className="h-3.5 w-3.5" />
            Reset filter
          </button>
        )}

        {paginated.length === 0 ? (
          <EmptyState
            tone="info"
            icon={<History className="h-6 w-6" />}
            title="Tidak ada event"
            description="Coba ubah filter atau reset pencarian."
          />
        ) : (
          <ListSection caption={`${paginated.length} dari ${filtered.length} event · halaman ${currentPage} / ${totalPages}`}>
            {paginated.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ListSection>
        )}

        {filtered.length > 0 && totalPages > 1 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label="event"
          />
        )}
      </div>

      {/* ============ DESKTOP — original layout ============ */}
      <div className="hidden lg:block space-y-6">
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryPill
            label="Total"
            value={summary.total}
            tone="brand"
            icon={<TrendingUp className="h-5 w-5" />}
            delay={60}
          />
          <SummaryPill
            label="Valid"
            value={summary.valid}
            tone="emerald"
            icon={<CheckCircle2 className="h-5 w-5" />}
            delay={120}
          />
          <SummaryPill
            label="Duplicate"
            value={summary.dup}
            tone="amber"
            icon={<CopyCheck className="h-5 w-5" />}
            delay={180}
          />
          <SummaryPill
            label="Rejected"
            value={summary.rejected}
            tone="rose"
            icon={<AlertOctagon className="h-5 w-5" />}
            delay={240}
          />
        </div>

        <Card className="animate-fade-up stagger-2 lift">
          <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-cyan-200" />
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/30">
                  <History className="h-3.5 w-3.5" />
                </span>
                Scan Events
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-ink-muted">
                  {filtered.length}
                </span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onExport}>
                <Download className="h-3.5 w-3.5" />
                Export Excel
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
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-ink-muted dark:ring-hairline">
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

            {/* Mobile: card stack */}
            <div className="md:hidden">
              {paginated.length === 0 ? (
                <EmptyState
                  tone="info"
                  icon={<History className="h-6 w-6" />}
                  title="Belum ada event scan sesuai filter"
                  description="Coba ubah filter atau reset pencarian."
                />
              ) : (
                <ul className="space-y-2">
                  {paginated.map((e, idx) => (
                    <li
                      key={e.id}
                      className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-200 animate-fade-up dark:bg-surface dark:ring-hairline"
                      style={{ animationDelay: `${idx * 18}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <FaceThumb
                          faceCaptureId={e.faceCaptureId}
                          size={44}
                          onClick={setLightboxUrl}
                          alt={e.parsedPassengerName ?? "Foto wajah"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-ink">
                                {e.parsedFlightNumber ?? "—"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-ink-muted">
                                {formatDateTime(e.scannedAt)}
                              </p>
                            </div>
                            <ScanStatusBadge status={e.resultStatus} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                        <Cell label="Penumpang" value={e.parsedPassengerName ?? "—"} />
                        <Cell label="Seat" value={e.parsedSeatNumber ?? "—"} />
                        <Cell label="PNR" value={e.parsedPnr ?? "—"} />
                      </div>
                      {e.message && (
                        <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-ink-muted dark:ring-hairline">
                          {e.message}
                        </p>
                      )}
                      <p className="mt-2 text-[10px] text-slate-400 dark:text-ink-subtle">
                        oleh <span className="font-semibold text-slate-600 dark:text-ink-muted">{e.scannedBy}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block">
            <Table>
              <THead>
                <Tr>
                  <Th>Foto</Th>
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
                    <Td colSpan={9} className="px-0 py-0">
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
                      <Td>
                        <FaceThumb
                          faceCaptureId={e.faceCaptureId}
                          size={40}
                          onClick={setLightboxUrl}
                          alt={e.parsedPassengerName ?? "Foto wajah"}
                        />
                      </Td>
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
            </div>

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

      <Modal
        open={Boolean(lightboxUrl)}
        onClose={() => setLightboxUrl(null)}
        title="Foto wajah penumpang"
        size="md"
      >
        {lightboxUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Foto wajah penumpang"
              className="max-h-[70vh] w-auto rounded-2xl object-contain ring-1 ring-slate-200 dark:ring-hairline"
            />
          </div>
        )}
      </Modal>
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-hairline">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-ink-subtle">
        {label}
      </p>
      <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-ink">
        {value}
      </p>
    </div>
  );
}

const MINI_STAT_TONE: Record<
  "brand" | "emerald" | "amber" | "rose",
  { bg: string; text: string; ring: string }
> = {
  brand: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
};

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "emerald" | "amber" | "rose";
}) {
  const t = MINI_STAT_TONE[tone];
  return (
    <div
      className={`rounded-2xl px-2 py-2.5 ring-1 ${t.bg} ${t.ring} text-center`}
    >
      <p
        className={`text-[16px] font-extrabold leading-none tabular-nums ${t.text}`}
      >
        {value}
      </p>
      <p
        className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${t.text}/80`}
      >
        {label}
      </p>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
  icon,
  delay = 0,
}: {
  label: string;
  value: number;
  tone: "brand" | "emerald" | "amber" | "rose";
  icon?: React.ReactNode;
  delay?: number;
}) {
  const count = useCountUp(value);
  return (
    <div
      className="h-full animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <StatCard label={label} value={count} tone={tone} icon={icon} />
    </div>
  );
}
