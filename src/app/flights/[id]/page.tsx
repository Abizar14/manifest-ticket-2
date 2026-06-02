"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Pencil,
  Plane,
  MapPin,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FlightStatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui/Table";
import { Flight, PassengerRecord, ScanEvent } from "@/lib/types";
import {
  deleteFlight,
  getFlights,
  getScanEvents,
  getSession,
} from "@/lib/storage";
import { canManageFlights } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export default function FlightDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [flight, setFlight] = useState<Flight | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const session = getSession();
    setCanManage(canManageFlights(session?.role));
    const f = getFlights().find((x) => x.id === id) ?? null;
    setFlight(f);
    setEvents(getScanEvents());
  }, [id]);

  const passengers: PassengerRecord[] = useMemo(() => {
    if (!flight) return [];
    const map = new Map<string, PassengerRecord>();
    for (const e of events) {
      if (e.resultStatus !== "VALID_FLIGHT") continue;
      if (e.flightId !== flight.id) continue;
      const key = `${e.parsedPnr ?? ""}-${e.parsedSeatNumber ?? ""}-${e.parsedTicketNumber ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.lastScannedAt = e.scannedAt;
        existing.scanCount += 1;
      } else {
        map.set(key, {
          passengerName: e.parsedPassengerName,
          pnr: e.parsedPnr ?? "—",
          ticketNumber: e.parsedTicketNumber ?? "—",
          seatNumber: e.parsedSeatNumber ?? "—",
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          firstScannedAt: e.scannedAt,
          lastScannedAt: e.scannedAt,
          scanCount: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }),
    );
  }, [events, flight]);

  if (!flight) {
    return (
      <AppShell>
        <div className="max-w-xl">
          <Link
            href="/flights"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>
          <Card className="mt-3 animate-fade-up">
            <CardBody className="py-12 text-center text-sm text-slate-500">
              Flight tidak ditemukan.
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  const onDelete = () => {
    if (!confirm("Yakin menghapus flight ini? Riwayat scan tetap tersimpan.")) return;
    deleteFlight(flight.id);
    router.replace("/flights");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-fade-up">
          <Link
            href="/flights"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 backdrop-blur transition hover:text-blue-700 hover:ring-blue-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke daftar
          </Link>
          {canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/flights/${flight.id}/edit`}>
                <Button size="sm" variant="outline">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
              <Button size="sm" variant="danger" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </Button>
            </div>
          )}
        </div>

        {/* Flight summary hero */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white shadow-lift animate-fade-up stagger-1">
          <div className="deco-blob -right-10 -top-10 h-40 w-40 bg-white/30" />
          <div className="deco-blob -bottom-12 -left-8 h-44 w-44 bg-cyan-200/40 opacity-40" />
          <div className="relative z-[1] flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur animate-float">
                <Plane className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-bold tracking-tight">
                    {flight.flightNumber}
                  </h2>
                  <FlightStatusBadge status={flight.status} />
                </div>
                <p className="text-sm text-white/85">
                  Maskapai {flight.airlineCode}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-3">
              <Info icon={<MapPin className="h-4 w-4" />} label="Rute">
                <span className="font-semibold">{flight.originAirport}</span>{" "}
                <span className="opacity-60">→</span>{" "}
                <span className="font-semibold">
                  {flight.destinationAirport}
                </span>
              </Info>
              <Info icon={<Calendar className="h-4 w-4" />} label="Tanggal">
                {flight.departureDate}
              </Info>
              <Info icon={<Clock className="h-4 w-4" />} label="Waktu">
                {flight.departureTime}
              </Info>
              <Info icon={<Plane className="h-4 w-4" />} label="Gate">
                {flight.gateOrCheckpoint}
              </Info>
            </div>
          </div>
        </div>

        {/* Passengers */}
        <Card className="animate-fade-up stagger-2 lift">
          <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-emerald-200" />
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                  <Users className="h-3.5 w-3.5" />
                </span>
                Penumpang Tercatat
                <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {passengers.length}
                </span>
              </span>
            </CardTitle>
            <span className="text-xs text-slate-500">
              Daftar dibangun otomatis dari boarding pass yang sudah di-scan
              valid.
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {passengers.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                Belum ada penumpang tercatat. Lakukan scan boarding pass di
                halaman <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">/scan</code>.
              </div>
            ) : (
              <Table>
                <THead>
                  <Tr>
                    <Th>Seat</Th>
                    <Th>Nama Penumpang</Th>
                    <Th>PNR</Th>
                    <Th>Tiket / SEQ</Th>
                    <Th>Pertama scan</Th>
                    <Th>Terakhir scan</Th>
                    <Th>Scan</Th>
                  </Tr>
                </THead>
                <TBody>
                  {passengers.map((p, idx) => (
                    <Tr
                      key={`${p.pnr}-${p.seatNumber}-${p.ticketNumber}`}
                      className="animate-fade-up"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <Td>
                        <span className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 ring-1 ring-blue-200">
                          {p.seatNumber}
                        </span>
                      </Td>
                      <Td className="text-slate-700">
                        {p.passengerName ?? (
                          <span className="italic text-slate-400">
                            (tidak ada dalam barcode)
                          </span>
                        )}
                      </Td>
                      <Td className="text-slate-600">{p.pnr}</Td>
                      <Td className="text-slate-600">{p.ticketNumber}</Td>
                      <Td className="whitespace-nowrap text-slate-600">
                        {formatDateTime(p.firstScannedAt)}
                      </Td>
                      <Td className="whitespace-nowrap text-slate-600">
                        {formatDateTime(p.lastScannedAt)}
                      </Td>
                      <Td>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          {p.scanCount}×
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

function Info({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-[120px] rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/25 backdrop-blur">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-white">{children}</p>
    </div>
  );
}
