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
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
import { FlightStatusBadge } from "@/components/ui/StatusBadge";
import { Flight, FlightStatus, ScanEvent, SessionUser } from "@/lib/types";
import {
  deleteFlight,
  getFlights,
  getScanEvents,
  getSession,
  updateFlight,
} from "@/lib/storage";
import { todayDateString, tomorrowDateString, cn } from "@/lib/utils";
import { canManageFlights } from "@/lib/auth";
import { getBoardingProgress } from "@/lib/boarding";
import { recordAudit } from "@/lib/audit";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero, HeroChip } from "@/components/layout/PageHero";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { Pagination } from "@/components/ui/Pagination";

const STATUSES: FlightStatus[] = [
  "DRAFT",
  "OPEN",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
];

const PAGE_SIZE = 15;

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<FlightStatus | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);

  const toast = useToast();
  const confirm = useConfirm();
  const [session, setSessionState] = useState<SessionUser | null>(null);
  const canManage = canManageFlights(session?.role);

  useEffect(() => {
    setSessionState(getSession());
    setFlights(getFlights());
    setEvents(getScanEvents());
  }, []);

  const filtered = useMemo(() => {
    const today = todayDateString();
    const tomorrow = tomorrowDateString();
    return flights
      .filter((f) => {
        if (dateFilter === "today") return f.departureDate === today;
        if (dateFilter === "tomorrow") return f.departureDate === tomorrow;
        return true;
      })
      .filter((f) => (statusFilter === "ALL" ? true : f.status === statusFilter))
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
      .sort((a, b) =>
        (a.departureDate + a.departureTime).localeCompare(
          b.departureDate + b.departureTime,
        ),
      );
  }, [flights, search, dateFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const onChangeStatus = (id: string, status: FlightStatus) => {
    const before = flights.find((f) => f.id === id);
    if (!before || before.status === status) return;
    updateFlight(id, { status });
    recordAudit({
      flightId: id,
      flightNumber: before.flightNumber,
      action: "STATUS_CHANGE",
      fromStatus: before.status,
      toStatus: status,
      session,
    });
    toast.success(`${before.flightNumber}: ${before.status} → ${status}`);
    setFlights(getFlights());
  };

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
      <div className="space-y-6">
        <PageHero
          tone="blue"
          eyebrow="Jadwal"
          eyebrowIcon={<Plane className="h-3.5 w-3.5" />}
          ghostIcon={<Plane className="h-full w-full" strokeWidth={1.5} />}
          title="Jadwal Penerbangan"
          description="Kelola jadwal flight hari ini & besok. Hanya status OPEN/ACTIVE yang dapat divalidasi."
          meta={
            <>
              <HeroChip
                icon={<Plane className="h-3 w-3" />}
                label="Total"
                value={flights.length}
              />
              <HeroChip
                icon={<Filter className="h-3 w-3" />}
                label="Tampil"
                value={filtered.length}
              />
            </>
          }
          actions={
            canManage && (
              <Link href="/flights/create">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:shadow-lift">
                  <Plus className="h-4 w-4" />
                  Tambah Penerbangan
                </span>
              </Link>
            )
          }
        />

        <Card className="animate-fade-up stagger-1 lift">
          <div className="deco-blob -right-16 -top-16 h-44 w-44 bg-blue-200" />
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                  <Plane className="h-3.5 w-3.5" />
                </span>
                Daftar Flight
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {filtered.length}
                </span>
              </span>
            </CardTitle>
            <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
              <Filter className="h-3.5 w-3.5" />
              Filter aktif
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
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
                  setDateFilter(
                    e.target.value as "all" | "today" | "tomorrow",
                  )
                }
              >
                <option value="all">Semua tanggal</option>
                <option value="today">Hari ini</option>
                <option value="tomorrow">Besok</option>
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
            </div>

            <Table>
              <THead>
                <Tr>
                  <Th>Flight</Th>
                  <Th>Rute</Th>
                  <Th>Tanggal</Th>
                  <Th>Waktu</Th>
                  <Th>Gate</Th>
                  <Th>Boarding</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Aksi</Th>
                </Tr>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} className="px-0 py-0">
                      <EmptyState
                        tone="info"
                        icon={<Plane className="h-6 w-6" />}
                        title="Tidak ada penerbangan sesuai filter"
                        description="Coba bersihkan pencarian atau ubah filter tanggal / status."
                      />
                    </Td>
                  </Tr>
                ) : (
                  paginated.map((f, idx) => (
                    <Tr
                      key={f.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <AirlineLogo code={f.airlineCode} size="sm" />
                          <div className="min-w-0">
                            <Link
                              href={`/flights/${f.id}`}
                              className="block font-semibold text-slate-800 hover:text-blue-700"
                            >
                              {f.flightNumber}
                            </Link>
                            <div className="text-xs text-slate-500">
                              {f.airlineCode}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="font-medium text-slate-700">
                          {f.originAirport}
                        </span>{" "}
                        <span className="text-slate-400">→</span>{" "}
                        <span className="font-medium text-slate-700">
                          {f.destinationAirport}
                        </span>
                      </Td>
                      <Td>
                        <div className="inline-flex items-center gap-1 text-slate-700">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {f.departureDate}
                        </div>
                      </Td>
                      <Td>{f.departureTime}</Td>
                      <Td>{f.gateOrCheckpoint}</Td>
                      <Td>
                        <ProgressMini
                          progress={getBoardingProgress(f, events)}
                        />
                      </Td>
                      <Td>
                        {canManage ? (
                          <Select
                            value={f.status}
                            onChange={(e) =>
                              onChangeStatus(
                                f.id,
                                e.target.value as FlightStatus,
                              )
                            }
                            className="h-8 text-xs"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <FlightStatusBadge status={f.status} />
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/flights/${f.id}`}>
                            <Button variant="ghost" size="sm" title="Detail">
                              <Eye className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                          </Link>
                          {canManage && (
                            <>
                              <Link href={`/flights/${f.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-blue-700" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(f.id)}
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </Td>
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
                label="flight"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
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
