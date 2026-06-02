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
import { Flight, FlightStatus } from "@/lib/types";
import {
  deleteFlight,
  getFlights,
  getSession,
  updateFlight,
} from "@/lib/storage";
import { todayDateString, tomorrowDateString } from "@/lib/utils";
import { canManageFlights } from "@/lib/auth";

const STATUSES: FlightStatus[] = [
  "DRAFT",
  "OPEN",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
];

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<FlightStatus | "ALL">(
    "ALL",
  );

  const session = typeof window !== "undefined" ? getSession() : null;
  const canManage = canManageFlights(session?.role);

  useEffect(() => {
    setFlights(getFlights());
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

  const onChangeStatus = (id: string, status: FlightStatus) => {
    updateFlight(id, { status });
    setFlights(getFlights());
  };

  const onDelete = (id: string) => {
    if (!confirm("Yakin menghapus flight ini?")) return;
    deleteFlight(id);
    setFlights(getFlights());
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200">
              <Plane className="h-3.5 w-3.5" />
              Jadwal
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-800">
              Jadwal Penerbangan
            </h2>
            <p className="text-sm text-slate-500">
              Kelola jadwal flight hari ini & besok. Hanya status OPEN/ACTIVE
              yang dapat divalidasi.
            </p>
          </div>
          {canManage && (
            <Link href="/flights/create">
              <Button size="md">
                <Plus className="h-4 w-4" />
                Tambah Penerbangan
              </Button>
            </Link>
          )}
        </div>

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
                  <Th>Status</Th>
                  <Th className="text-right">Aksi</Th>
                </Tr>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <Tr>
                    <Td
                      colSpan={7}
                      className="py-10 text-center text-slate-500"
                    >
                      Tidak ada penerbangan sesuai filter.
                    </Td>
                  </Tr>
                ) : (
                  filtered.map((f, idx) => (
                    <Tr
                      key={f.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <Td>
                        <Link
                          href={`/flights/${f.id}`}
                          className="font-semibold text-slate-800 hover:text-blue-700"
                        >
                          {f.flightNumber}
                        </Link>
                        <div className="text-xs text-slate-500">
                          Maskapai {f.airlineCode}
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
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
