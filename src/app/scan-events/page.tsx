"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Filter, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
import { getScanEvents } from "@/lib/storage";
import { formatDateTime, todayDateString } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";

const STATUSES: ScanResultStatus[] = [
  "VALID_FLIGHT",
  "DUPLICATE_SCAN",
  "FLIGHT_NOT_TODAY",
  "FLIGHT_NOT_ACTIVE",
  "UNKNOWN_FLIGHT",
  "INVALID_BARCODE",
];

export default function ScanEventsPage() {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScanResultStatus | "ALL">(
    "ALL",
  );
  const [dateFilter, setDateFilter] = useState<"all" | "today">("today");

  useEffect(() => {
    setEvents(getScanEvents());
  }, []);

  const today = todayDateString();

  const filtered = useMemo(() => {
    return events
      .filter((e) =>
        dateFilter === "today" ? e.scannedAt.slice(0, 10) === today : true,
      )
      .filter((e) =>
        statusFilter === "ALL" ? true : e.resultStatus === statusFilter,
      )
      .filter((e) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          (e.parsedFlightNumber ?? "").toLowerCase().includes(q) ||
          e.rawBarcode.toLowerCase().includes(q) ||
          e.scannedBy.toLowerCase().includes(q)
        );
      });
  }, [events, search, statusFilter, dateFilter, today]);

  const summary = useMemo(() => {
    const t = filtered.length;
    const v = filtered.filter((e) => e.resultStatus === "VALID_FLIGHT").length;
    const d = filtered.filter(
      (e) => e.resultStatus === "DUPLICATE_SCAN",
    ).length;
    const r = t - v - d;
    return { total: t, valid: v, dup: d, rejected: r };
  }, [filtered]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-700 ring-1 ring-cyan-200">
            <History className="h-3.5 w-3.5" />
            Riwayat
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-800">
            Riwayat Scan Boarding Pass
          </h2>
          <p className="text-sm text-slate-500">
            Semua aktivitas scan (sukses & gagal) tercatat di sini.
          </p>
        </div>

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
            <span className="hidden items-center gap-1 text-xs font-semibold text-slate-500 sm:inline-flex">
              <Filter className="h-3.5 w-3.5" /> Filter aktif
            </span>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Cari flight / barcode / user…"
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
              <Select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value as "all" | "today")
                }
              >
                <option value="today">Hari ini</option>
                <option value="all">Semua tanggal</option>
              </Select>
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
                {filtered.length === 0 ? (
                  <Tr>
                    <Td
                      colSpan={8}
                      className="py-10 text-center text-slate-500"
                    >
                      Belum ada event scan sesuai filter.
                    </Td>
                  </Tr>
                ) : (
                  filtered.map((e, idx) => (
                    <Tr
                      key={e.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 25}ms` }}
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
