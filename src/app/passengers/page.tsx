"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plane,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FlightStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui/Table";
import { Flight, ScanEvent } from "@/lib/types";
import { getFlights, getScanEvents } from "@/lib/storage";
import { cn, formatDateTime } from "@/lib/utils";
import { PageHero, HeroChip } from "@/components/layout/PageHero";
import { Pagination } from "@/components/ui/Pagination";

type SearchField = "any" | "pnr" | "seat" | "ticket" | "name";

const PAGE_SIZE = 20;

interface Match {
  key: string;
  pnr: string;
  seat: string;
  ticketNumber: string;
  passengerName: string | null;
  flight: Flight | null;
  flightId: string | null;
  flightNumber: string | null;
  lastScannedAt: string;
  firstScannedAt: string;
  scanCount: number;
  validScans: number;
  boarded: boolean;
}

export default function PassengersPage() {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<SearchField>("any");
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setEvents(getScanEvents());
    setFlights(getFlights());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, field]);

  const flightById = useMemo(() => {
    const m = new Map<string, Flight>();
    for (const f of flights) m.set(f.id, f);
    return m;
  }, [flights]);

  const matches: Match[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const map = new Map<string, Match>();
    for (const e of events) {
      const pnr = (e.parsedPnr ?? "").trim();
      const seat = (e.parsedSeatNumber ?? "").trim();
      const ticket = (e.parsedTicketNumber ?? "").trim();
      const name = (e.parsedPassengerName ?? "").trim();

      let hit = false;
      const matchAny =
        pnr.toLowerCase().includes(q) ||
        seat.toLowerCase().includes(q) ||
        ticket.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q);
      if (field === "any") hit = matchAny;
      else if (field === "pnr") hit = pnr.toLowerCase().includes(q);
      else if (field === "seat") hit = seat.toLowerCase().includes(q);
      else if (field === "ticket") hit = ticket.toLowerCase().includes(q);
      else if (field === "name") hit = name.toLowerCase().includes(q);
      if (!hit) continue;

      const key = `${pnr}|${seat}|${ticket}|${e.flightId ?? "—"}`;
      const existing = map.get(key);
      const isValid = e.resultStatus === "VALID_FLIGHT";
      if (existing) {
        existing.scanCount += 1;
        if (isValid) existing.validScans += 1;
        if (e.scannedAt > existing.lastScannedAt)
          existing.lastScannedAt = e.scannedAt;
        if (e.scannedAt < existing.firstScannedAt)
          existing.firstScannedAt = e.scannedAt;
        existing.boarded = existing.boarded || isValid;
      } else {
        const flight = e.flightId ? flightById.get(e.flightId) ?? null : null;
        map.set(key, {
          key,
          pnr: pnr || "—",
          seat: seat || "—",
          ticketNumber: ticket || "—",
          passengerName: name || null,
          flight,
          flightId: e.flightId,
          flightNumber: e.parsedFlightNumber ?? flight?.flightNumber ?? null,
          lastScannedAt: e.scannedAt,
          firstScannedAt: e.scannedAt,
          scanCount: 1,
          validScans: isValid ? 1 : 0,
          boarded: isValid,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      b.lastScannedAt.localeCompare(a.lastScannedAt),
    );
  }, [events, query, field, flightById]);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return matches.slice(start, start + PAGE_SIZE);
  }, [matches, currentPage]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHero
          tone="violet"
          eyebrow="Cari Penumpang"
          eyebrowIcon={<Users className="h-3.5 w-3.5" />}
          ghostIcon={<Search className="h-full w-full" strokeWidth={1.5} />}
          title="Pencarian Penumpang Global"
          description="Telusuri penumpang berdasarkan PNR, kursi, nomor tiket, atau nama — lintas semua flight."
          meta={
            <>
              <HeroChip
                icon={<Users className="h-3 w-3" />}
                label="Total event"
                value={events.length}
              />
              <HeroChip
                icon={<Search className="h-3 w-3" />}
                label="Hasil"
                value={matches.length}
              />
            </>
          }
        />

        <Card className="animate-fade-up stagger-1 lift">
          <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-violet-200" />
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 ring-1 ring-violet-200">
                  <Search className="h-3.5 w-3.5" />
                </span>
                Kueri Pencarian
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {matches.length}
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  autoFocus
                  placeholder="Ketik PNR / Seat / Tiket / Nama…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select
                value={field}
                onChange={(e) => setField(e.target.value as SearchField)}
              >
                <option value="any">Semua field</option>
                <option value="pnr">PNR</option>
                <option value="seat">Seat</option>
                <option value="ticket">Tiket / SEQ</option>
                <option value="name">Nama</option>
              </Select>
            </div>

            {query.trim() === "" ? (
              <EmptyState
                tone="info"
                icon={<Search className="h-6 w-6" />}
                title="Mulai mengetik untuk mencari"
                description="Ketik minimal beberapa karakter dari PNR (mis. AB12CD), nomor kursi (12A), nomor tiket, atau nama penumpang."
              />
            ) : matches.length === 0 ? (
              <EmptyState
                tone="warning"
                icon={<XCircle className="h-6 w-6" />}
                title={`Tidak ada penumpang cocok dengan "${query}"`}
                description="Coba kata kunci lain atau ubah field pencarian."
              />
            ) : (
              <Table>
                <THead>
                  <Tr>
                    <Th>Penumpang</Th>
                    <Th>PNR</Th>
                    <Th>Seat</Th>
                    <Th>Tiket</Th>
                    <Th>Flight</Th>
                    <Th>Status</Th>
                    <Th>Terakhir scan</Th>
                  </Tr>
                </THead>
                <TBody>
                  {paginated.map((m, idx) => (
                    <Tr
                      key={m.key}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 25}ms` }}
                    >
                      <Td>
                        {m.passengerName ? (
                          <span className="font-semibold text-slate-800">
                            {m.passengerName}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">
                            (nama tidak ada)
                          </span>
                        )}
                      </Td>
                      <Td className="text-slate-600">{m.pnr}</Td>
                      <Td>
                        <span className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 ring-1 ring-blue-200">
                          {m.seat}
                        </span>
                      </Td>
                      <Td className="text-slate-600">{m.ticketNumber}</Td>
                      <Td>
                        {m.flight ? (
                          <Link
                            href={`/flights/${m.flight.id}`}
                            className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-blue-700"
                          >
                            <Plane className="h-3.5 w-3.5 text-blue-500" />
                            {m.flight.flightNumber}
                          </Link>
                        ) : (
                          <span className="text-slate-500">
                            {m.flightNumber ?? "—"}
                          </span>
                        )}
                        {m.flight && (
                          <div className="text-[11px] text-slate-500">
                            {m.flight.originAirport} →{" "}
                            {m.flight.destinationAirport} ·{" "}
                            {m.flight.departureDate}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          {m.boarded ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Sudah boarding
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                              <XCircle className="h-3 w-3" />
                              Belum / ditolak
                            </span>
                          )}
                          {m.flight && (
                            <span className="text-[11px] text-slate-500">
                              <FlightStatusBadge status={m.flight.status} />
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-slate-600">
                        <div className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatDateTime(m.lastScannedAt)}
                        </div>
                        <div
                          className={cn(
                            "text-[11px]",
                            m.scanCount > 1 ? "text-amber-600" : "text-slate-400",
                          )}
                        >
                          {m.scanCount}× scan
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}

            {matches.length > 0 && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={matches.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                label="penumpang"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
