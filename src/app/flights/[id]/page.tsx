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
  CheckCircle2,
  Gauge,
  PowerOff,
  PlayCircle,
  Ban,
  Printer,
  History,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import {
  BoardingProgress,
  Flight,
  FlightAuditEvent,
  PassengerRecord,
  ScanEvent,
  SessionUser,
} from "@/lib/types";
import {
  deleteFlight,
  getFlights,
  getScanEvents,
  getSession,
  updateFlight,
} from "@/lib/storage";
import { canManageFlights } from "@/lib/auth";
import { cn, formatDateTime } from "@/lib/utils";
import { getBoardingProgress } from "@/lib/boarding";
import { getAuditForFlight, recordAudit } from "@/lib/audit";
import { getSettings, subscribeSettings } from "@/lib/settings";
import { getEffectiveFlightStatus } from "@/lib/flightStatus";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { getAirlineMeta } from "@/lib/airlines";

export default function FlightDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const toast = useToast();
  const confirm = useConfirm();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<FlightAuditEvent[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [settings, setSettings] = useState(() => getSettings());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!id) return;
    const s = getSession();
    setSession(s);
    setCanManage(canManageFlights(s?.role));
    refreshAll(id);
    setSettings(getSettings());
    const unsub = subscribeSettings(setSettings);
    const tick = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      setNow(new Date());
    }, 30_000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, [id]);

  const effective = flight
    ? getEffectiveFlightStatus(flight, now, settings)
    : null;

  const refreshAll = (flightId: string) => {
    const f = getFlights().find((x) => x.id === flightId) ?? null;
    setFlight(f);
    setEvents(getScanEvents());
    setAuditEvents(getAuditForFlight(flightId));
  };

  const progress: BoardingProgress | null = useMemo(
    () => (flight ? getBoardingProgress(flight, events) : null),
    [flight, events],
  );

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

  const onDelete = async () => {
    const res = await confirm({
      title: `Hapus flight ${flight.flightNumber}?`,
      description:
        "Jadwal ini akan dihapus permanen. Riwayat scan terkait tetap tersimpan di arsip.",
      tone: "danger",
      destructive: true,
      confirmLabel: "Hapus Flight",
      cancelLabel: "Batal",
    });
    if (!res.confirmed) return;
    deleteFlight(flight.id);
    toast.success("Flight dihapus.");
    router.replace("/flights");
  };

  const canCloseBoarding =
    canManage && (flight.status === "OPEN" || flight.status === "ACTIVE");
  const canReopenBoarding = canManage && flight.status === "CLOSED";
  const canCancel = canManage && flight.status !== "CANCELLED";

  const onCloseBoarding = async () => {
    const p = progress;
    const remainingMsg =
      p && p.expected !== null && p.remaining !== null && p.remaining > 0
        ? ` Masih ada ${p.remaining} dari ${p.expected} penumpang yang belum scan.`
        : "";
    const res = await confirm({
      title: `Tutup boarding ${flight.flightNumber}?`,
      description: `Status akan diubah menjadi CLOSED dan scan boarding pass tidak akan diterima lagi.${remainingMsg}`,
      tone: "warning",
      confirmLabel: "Tutup Boarding",
      cancelLabel: "Batal",
    });
    if (!res.confirmed) return;
    updateFlight(flight.id, { status: "CLOSED" });
    recordAudit({
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      action: "CLOSE_BOARDING",
      fromStatus: flight.status,
      toStatus: "CLOSED",
      session,
    });
    toast.success(`Boarding ${flight.flightNumber} ditutup.`);
    refreshAll(flight.id);
  };

  const onReopenBoarding = async () => {
    const res = await confirm({
      title: `Buka kembali boarding ${flight.flightNumber}?`,
      description:
        "Boarding sudah ditutup. Status akan diubah menjadi OPEN dan scan boarding pass kembali diterima.",
      tone: "info",
      confirmLabel: "Buka Kembali",
      cancelLabel: "Batal",
    });
    if (!res.confirmed) return;
    updateFlight(flight.id, { status: "OPEN" });
    recordAudit({
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      action: "REOPEN_BOARDING",
      fromStatus: flight.status,
      toStatus: "OPEN",
      session,
    });
    toast.success(`Boarding ${flight.flightNumber} dibuka kembali.`);
    refreshAll(flight.id);
  };

  const onSubmitCancel = () => {
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Alasan pembatalan wajib diisi.");
      return;
    }
    updateFlight(flight.id, {
      status: "CANCELLED",
      cancellationReason: reason,
    });
    recordAudit({
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      action: "CANCEL_FLIGHT",
      fromStatus: flight.status,
      toStatus: "CANCELLED",
      session,
      note: reason,
    });
    toast.warning(`Flight ${flight.flightNumber} dibatalkan.`);
    setCancelOpen(false);
    setCancelReason("");
    refreshAll(flight.id);
  };

  const onExportCsv = () => {
    const rows = [
      ["Seat", "Nama", "PNR", "Tiket", "Pertama Scan", "Terakhir Scan", "Scan"],
      ...passengers.map((p) => [
        p.seatNumber,
        p.passengerName ?? "",
        p.pnr,
        p.ticketNumber,
        p.firstScannedAt,
        p.lastScannedAt,
        String(p.scanCount),
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
    a.download = `manifest_${flight.flightNumber}_${flight.departureDate}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("Manifest CSV di-download.");
  };

  const onPrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col items-stretch gap-3 animate-fade-up sm:flex-row sm:items-center sm:justify-between print-hide">
          <Link
            href="/flights"
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 backdrop-blur transition hover:text-blue-700 hover:ring-blue-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke daftar
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onExportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            {canManage && (
              <>
                {canCloseBoarding && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCloseBoarding}
                  >
                    <PowerOff className="h-3.5 w-3.5" />
                    Tutup Boarding
                  </Button>
                )}
                {canReopenBoarding && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReopenBoarding}
                  >
                    <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Buka Kembali
                  </Button>
                )}
                {canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCancelOpen(true)}
                  >
                    <Ban className="h-3.5 w-3.5 text-amber-700" />
                    Batalkan
                  </Button>
                )}
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
              </>
            )}
          </div>
        </div>

        {/* Print-only header (visible only when printing) */}
        <div className="print-only">
          <h1 style={{ fontSize: "18pt", fontWeight: 700, margin: 0 }}>
            Manifest {flight.flightNumber} — {flight.originAirport} →{" "}
            {flight.destinationAirport}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "11pt", color: "#374151" }}>
            {flight.departureDate} {flight.departureTime} · Gate{" "}
            {flight.gateOrCheckpoint} · Status {flight.status}
            {flight.cancellationReason
              ? ` · Alasan: ${flight.cancellationReason}`
              : ""}
          </p>
          <p
            style={{ margin: "2px 0 12px", fontSize: "10pt", color: "#6b7280" }}
          >
            Dicetak: {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        {/* Flight summary hero */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white shadow-lift animate-fade-up stagger-1 print-hide">
          <div className="deco-blob -right-10 -top-10 h-40 w-40 bg-white/30" />
          <div className="deco-blob -bottom-12 -left-8 h-44 w-44 bg-cyan-200/40 opacity-40" />
          <div className="relative z-[1] flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="animate-float">
                <AirlineLogo code={flight.airlineCode} size="lg" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-bold tracking-tight">
                    {flight.flightNumber}
                  </h2>
                  <FlightStatusBadge status={effective?.status ?? flight.status} />
                  {effective && effective.status !== flight.status && (
                    <span
                      title={`Status manual: ${flight.status}`}
                      className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/25"
                    >
                      Manual: {flight.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/85">
                  {getAirlineMeta(flight.airlineCode).name}{" "}
                  <span className="text-white/60">
                    · {flight.airlineCode}
                  </span>
                </p>
                {effective && (
                  <p className="mt-1.5 text-xs text-white/75">
                    {effective.description}
                  </p>
                )}
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

        {/* Cancellation banner (if any) */}
        {flight.status === "CANCELLED" && flight.cancellationReason && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 shadow-sm animate-fade-up">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-[11px]">
                Penerbangan Dibatalkan
              </p>
              <p className="mt-0.5">Alasan: {flight.cancellationReason}</p>
            </div>
          </div>
        )}

        {/* Cancel modal */}
        {cancelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm print-hide">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lift animate-fade-up">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Batalkan Flight {flight.flightNumber}?
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Status akan diubah menjadi CANCELLED. Scan boarding pass
                    akan ditolak.
                  </p>
                </div>
              </div>
              <label className="mt-4 block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Alasan pembatalan
                  <span className="text-rose-500"> *</span>
                </span>
                <Input
                  className="mt-1.5"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="mis. cuaca buruk, kerusakan pesawat, …"
                  autoFocus
                />
              </label>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCancelOpen(false);
                    setCancelReason("");
                  }}
                >
                  Batal
                </Button>
                <Button variant="danger" size="sm" onClick={onSubmitCancel}>
                  <Ban className="h-3.5 w-3.5" />
                  Batalkan Penerbangan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Boarding progress */}
        {progress && <BoardingCard progress={progress} />}

        {/* Passengers */}
        <Card className="animate-fade-up stagger-3 lift">
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
            <span className="text-xs text-slate-500 print-hide">
              Daftar dibangun otomatis dari boarding pass yang sudah di-scan
              valid.
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {passengers.length === 0 ? (
              <EmptyState
                tone="info"
                icon={<Users className="h-6 w-6" />}
                title="Belum ada penumpang tercatat"
                description={
                  <>
                    Lakukan scan boarding pass di halaman{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                      /scan
                    </code>
                    .
                  </>
                }
              />
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

        {/* Audit trail */}
        <Card className="animate-fade-up stagger-4 lift print-hide">
          <div className="deco-blob -right-12 -top-12 h-36 w-36 bg-violet-200" />
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 ring-1 ring-violet-200">
                  <History className="h-3.5 w-3.5" />
                </span>
                Riwayat Status
                <span className="ml-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                  {auditEvents.length}
                </span>
              </span>
            </CardTitle>
            <button
              type="button"
              onClick={() => setShowAudit((v) => !v)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
            >
              {showAudit ? "Sembunyikan" : "Tampilkan"}
            </button>
          </CardHeader>
          {showAudit && (
            <CardBody className="p-0">
              {auditEvents.length === 0 ? (
                <EmptyState
                  tone="neutral"
                  icon={<History className="h-6 w-6" />}
                  title="Belum ada perubahan status tercatat"
                  description="Aksi tutup, buka kembali, dan batalkan akan muncul di sini."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {auditEvents.map((a, idx) => (
                    <li
                      key={a.id}
                      className="animate-fade-up px-5 py-3"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {ACTION_LABEL[a.action] ?? a.action}
                          {a.fromStatus && a.toStatus && (
                            <span className="ml-2 font-normal text-slate-500">
                              {a.fromStatus} → {a.toStatus}
                            </span>
                          )}
                        </p>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(a.at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        oleh <span className="font-medium">{a.userName}</span>
                      </p>
                      {a.note && (
                        <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-100">
                          {a.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

const ACTION_LABEL: Record<string, string> = {
  STATUS_CHANGE: "Status diubah",
  CLOSE_BOARDING: "Boarding ditutup",
  REOPEN_BOARDING: "Boarding dibuka kembali",
  CANCEL_FLIGHT: "Penerbangan dibatalkan",
};

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

const TONE_STYLES: Record<
  BoardingProgress["tone"],
  {
    blob: string;
    iconBg: string;
    iconText: string;
    iconRing: string;
    bar: string;
    valueText: string;
    chipBg: string;
    chipText: string;
    chipRing: string;
  }
> = {
  neutral: {
    blob: "bg-slate-200",
    iconBg: "bg-slate-100",
    iconText: "text-slate-700",
    iconRing: "ring-slate-200",
    bar: "bg-gradient-to-r from-slate-400 to-slate-500",
    valueText: "text-slate-800",
    chipBg: "bg-slate-50",
    chipText: "text-slate-700",
    chipRing: "ring-slate-200",
  },
  info: {
    blob: "bg-blue-200",
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
    iconRing: "ring-blue-200",
    bar: "bg-gradient-to-r from-blue-500 to-cyan-500",
    valueText: "text-blue-700",
    chipBg: "bg-blue-50",
    chipText: "text-blue-700",
    chipRing: "ring-blue-200",
  },
  warning: {
    blob: "bg-amber-200",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    iconRing: "ring-amber-200",
    bar: "bg-gradient-to-r from-amber-500 to-orange-500",
    valueText: "text-amber-700",
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    chipRing: "ring-amber-200",
  },
  success: {
    blob: "bg-emerald-200",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    iconRing: "ring-emerald-200",
    bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
    valueText: "text-emerald-700",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    chipRing: "ring-emerald-200",
  },
  danger: {
    blob: "bg-rose-200",
    iconBg: "bg-rose-100",
    iconText: "text-rose-700",
    iconRing: "ring-rose-200",
    bar: "bg-gradient-to-r from-rose-500 to-pink-500",
    valueText: "text-rose-700",
    chipBg: "bg-rose-50",
    chipText: "text-rose-700",
    chipRing: "ring-rose-200",
  },
};

function BoardingCard({ progress }: { progress: BoardingProgress }) {
  const t = TONE_STYLES[progress.tone];
  const expectedKnown = progress.expected !== null;
  const percent = progress.percent ?? 0;

  return (
    <Card className="animate-fade-up stagger-2 lift">
      <div className={cn("deco-blob -right-12 -top-12 h-40 w-40", t.blob)} />
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg ring-1",
                t.iconBg,
                t.iconText,
                t.iconRing,
              )}
            >
              <Gauge className="h-3.5 w-3.5" />
            </span>
            Progres Boarding
            {expectedKnown && (
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                  t.chipBg,
                  t.chipText,
                  t.chipRing,
                )}
              >
                {percent}%
              </span>
            )}
          </span>
        </CardTitle>
        <span className="text-xs text-slate-500 print-hide">
          Dihitung dari boarding pass unik (PNR + Seat + Tiket) yang sudah scan
          valid.
        </span>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Sudah boarding
            </p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className={cn("text-4xl font-bold", t.valueText)}>
                {progress.boarded}
              </span>
              <span className="text-base text-slate-400">
                {expectedKnown ? `/ ${progress.expected}` : "/ —"}
              </span>
            </p>
          </div>
          {expectedKnown && (
            <div className="flex gap-2">
              <div
                className={cn(
                  "rounded-xl px-3 py-2 ring-1",
                  t.chipBg,
                  t.chipRing,
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Sisa
                </p>
                <p className={cn("text-lg font-bold", t.chipText)}>
                  {progress.remaining}
                </p>
              </div>
              {progress.tone === "success" && (
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Lengkap
                </div>
              )}
            </div>
          )}
        </div>

        {expectedKnown ? (
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              <div
                className={cn("h-full rounded-full transition-all", t.bar)}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200 print-hide">
            Expected PAX belum diset untuk flight ini. Edit penerbangan dan isi
            kapasitas penumpang untuk melihat progres lengkap.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
