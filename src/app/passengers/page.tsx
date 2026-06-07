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
import { LargeTitle } from "@/components/mobile/LargeTitle";
import { ListSection } from "@/components/mobile/GroupedList";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";

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
      {/* ---------- MOBILE ---------- */}
      <div className="space-y-4 lg:hidden">
        <LargeTitle
          eyebrow="Penumpang"
          title="Pencarian"
          subtitle="PNR, kursi, tiket, atau nama — lintas semua flight"
        />

        <div className="rounded-2xl bg-surface ring-1 ring-hairline shadow-card p-3 space-y-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
            <input
              type="text"
              autoFocus
              placeholder="Ketik PNR / Seat / Tiket / Nama…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl bg-surface-2 pl-9 pr-3 text-[15px] font-medium text-ink ring-1 ring-hairline placeholder:font-normal placeholder:text-ink-subtle focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <SegmentedControl<SearchField>
            value={field}
            onChange={setField}
            size="sm"
            options={[
              { value: "any", label: "Semua" },
              { value: "pnr", label: "PNR" },
              { value: "seat", label: "Seat" },
              { value: "ticket", label: "Tiket" },
              { value: "name", label: "Nama" },
            ]}
          />
        </div>

        {query.trim() === "" ? (
          <div className="rounded-2xl bg-surface ring-1 ring-hairline shadow-card px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Search className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-ink">
              Mulai mengetik untuk mencari
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Ketik PNR, nomor kursi, tiket, atau nama penumpang.
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl bg-surface ring-1 ring-hairline shadow-card px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <XCircle className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-ink">
              Tidak ada hasil
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Coba kata kunci lain atau ubah field pencarian.
            </p>
          </div>
        ) : (
          <ListSection
            header={
              <span className="flex items-center justify-between">
                <span>Hasil pencarian</span>
                <span className="text-ink-subtle normal-case tracking-normal text-[11px] font-semibold">
                  {matches.length} ditemukan
                </span>
              </span>
            }
          >
            {paginated.map((m) => (
              <PassengerMobileRow key={m.key} match={m} />
            ))}
          </ListSection>
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
      </div>

      {/* ---------- DESKTOP ---------- */}
      <div className="space-y-6 hidden lg:block">
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
              <>
              {/* Mobile: card stack */}
              <ul className="space-y-2 md:hidden">
                {paginated.map((m, idx) => (
                  <li
                    key={m.key}
                    className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-200 animate-fade-up"
                    style={{ animationDelay: `${idx * 25}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {m.passengerName ? (
                          <p className="truncate text-sm font-bold text-slate-800">
                            {m.passengerName}
                          </p>
                        ) : (
                          <p className="italic text-sm text-slate-400">
                            (nama tidak ada)
                          </p>
                        )}
                        {m.flight ? (
                          <Link
                            href={`/flights/${m.flight.id}`}
                            className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
                          >
                            <Plane className="h-3 w-3" />
                            {m.flight.flightNumber}
                            <span className="font-normal text-slate-500">
                              · {m.flight.originAirport} → {m.flight.destinationAirport}
                            </span>
                          </Link>
                        ) : (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {m.flightNumber ?? "—"}
                          </p>
                        )}
                      </div>
                      {m.boarded ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Boarded
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">
                          <XCircle className="h-3 w-3" />
                          Belum
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="min-w-0 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">PNR</p>
                        <p className="truncate font-mono text-[11px] font-semibold text-slate-700">{m.pnr}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 px-2 py-1 ring-1 ring-blue-200">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-600">Seat</p>
                        <p className="font-mono text-[11px] font-bold text-blue-700">{m.seat}</p>
                      </div>
                      <div className="min-w-0 rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Tiket</p>
                        <p className="truncate font-mono text-[11px] font-semibold text-slate-700">{m.ticketNumber}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(m.lastScannedAt)}
                      </span>
                      <span className={cn(m.scanCount > 1 ? "text-amber-600 font-semibold" : "text-slate-400")}>
                        {m.scanCount}× scan
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden md:block">
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
              </div>
              </>
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

function PassengerMobileRow({ match }: { match: Match }) {
  const { flight } = match;
  const inner = (
    <div className="flex items-start gap-3 px-3.5 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[12px] font-bold text-blue-700">
        {match.seat !== "—" ? match.seat : "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-[14.5px] font-bold text-ink">
            {match.passengerName ?? (
              <span className="italic font-normal text-ink-subtle">(nama tidak ada)</span>
            )}
          </span>
          {match.boarded ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Boarded
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">
              <XCircle className="h-3 w-3" />
              Belum
            </span>
          )}
        </div>
        {flight ? (
          <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-blue-600">
            <Plane className="h-3 w-3" />
            {flight.flightNumber}
            <span className="font-normal text-ink-muted">
              · {flight.originAirport} → {flight.destinationAirport}
            </span>
          </p>
        ) : (
          <p className="mt-0.5 text-[12px] text-ink-muted">{match.flightNumber ?? "—"}</p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span className="font-mono font-semibold text-ink/85">{match.pnr}</span>
          <span className="text-ink-subtle">·</span>
          <span className="font-mono">{match.ticketNumber}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10.5px] text-ink-subtle">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(match.lastScannedAt)}
          </span>
          <span className={cn(match.scanCount > 1 ? "text-amber-600 font-semibold" : undefined)}>
            {match.scanCount}× scan
          </span>
        </div>
      </div>
    </div>
  );

  return flight ? (
    <Link href={`/flights/${flight.id}`} className="block transition active:bg-surface-2">
      {inner}
    </Link>
  ) : (
    inner
  );
}
