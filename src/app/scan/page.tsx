"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CopyCheck,
  Plane,
  Clock,
  Volume2,
  VolumeX,
  Bug,
  Camera,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CameraScanner } from "@/components/scan/CameraScanner";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FlightStatusBadge } from "@/components/ui/StatusBadge";
import {
  Flight,
  ScanEvent,
  ScanResultStatus,
  SessionUser,
} from "@/lib/types";
import { getFlights, getScanEvents, getSession } from "@/lib/storage";
import {
  playFeedbackHaptic,
  playFeedbackSound,
  processScan,
} from "@/lib/scanService";
import { formatTime, todayDateString } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getSettings, saveSettings, subscribeSettings } from "@/lib/settings";
import { useToast } from "@/components/ui/Toast";
import { PageHero, HeroChip } from "@/components/layout/PageHero";

interface LastResult {
  status: ScanResultStatus;
  message: string;
  raw: string;
  flightNumber: string | null;
  seat: string | null;
  passengerName: string | null;
  pnr: string | null;
  scannedAt: string;
}

export default function ScanPage() {
  const searchParams = useSearchParams();
  const source = searchParams?.get("source");
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [session, setSession] = useState<SessionUser | null>(null);
  const [last, setLast] = useState<LastResult | null>(null);
  const [recent, setRecent] = useState<ScanEvent[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [debugOn, setDebugOn] = useState(false);
  const [keyLog, setKeyLog] = useState<string[]>([]);
  const [pulseKey, setPulseKey] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const s = getSession();
    setSession(s);
    setFlights(getFlights());
    setRecent(getScanEvents().slice(0, 8));
    setSoundOn(getSettings().soundOn);
    const unsub = subscribeSettings((next) => setSoundOn(next.soundOn));
    setTimeout(() => inputRef.current?.focus(), 50);
    return unsub;
  }, []);

  // honor ?source=camera|usb|manual from BottomNav scan picker
  useEffect(() => {
    if (source === "camera") {
      setCameraOpen(true);
    } else if (source === "usb" || source === "manual") {
      setCameraOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [source]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    saveSettings({ soundOn: next });
  };

  useEffect(() => {
    const handler = () => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    const t = window.setInterval(handler, 1500);
    return () => window.clearInterval(t);
  }, []);

  const today = todayDateString();
  const flightsToday = useMemo(
    () =>
      flights
        .filter((f) => f.departureDate === today)
        .sort((a, b) => a.departureTime.localeCompare(b.departureTime)),
    [flights, today],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (debugOn) {
      const k = e.key.length === 1 ? e.key : `<${e.key}>`;
      setKeyLog((prev) => [...prev.slice(-119), k]);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const submit = (rawInput?: string) => {
    if (!session) return;
    const raw = rawInput ?? value;
    if (!raw.trim()) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    const { outcome, event } = processScan(raw, session.email);
    playFeedbackSound(outcome.status);
    playFeedbackHaptic(outcome.status);
    if (outcome.status === "VALID_FLIGHT") {
      toast.success(
        `${outcome.flight?.flightNumber ?? "Flight"} · seat ${outcome.parsed?.seatNumber ?? "—"}`,
        "Valid",
      );
    } else if (outcome.status === "DUPLICATE_SCAN") {
      toast.warning(outcome.message, "Duplicate");
    } else {
      toast.error(outcome.message, "Rejected");
    }
    setLast({
      status: outcome.status,
      message: outcome.message,
      raw: event.rawBarcode,
      flightNumber:
        outcome.flight?.flightNumber ?? outcome.parsed?.flightNumber ?? null,
      seat: outcome.parsed?.seatNumber ?? null,
      passengerName: outcome.parsed?.passengerName ?? null,
      pnr: outcome.parsed?.pnr ?? null,
      scannedAt: event.scannedAt,
    });
    setRecent(getScanEvents().slice(0, 8));
    setPulseKey((k) => k + 1);
    setValue("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Scanner area */}
        <div className="space-y-5 xl:col-span-2">
          <PageHero
            tone="emerald"
            eyebrow="Pos Validasi"
            eyebrowIcon={<ScanLine className="h-3.5 w-3.5" />}
            ghostIcon={<ScanLine className="h-full w-full" strokeWidth={1.5} />}
            title="Pos Validasi Boarding Pass"
            description="Scan barcode dengan scanner USB/Bluetooth. Input tersubmit otomatis saat scanner mengirim Enter."
            actions={
              <>
                <button
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-white/40 transition hover:shadow-lift"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Pakai Kamera
                </button>
                <button
                  onClick={() => {
                    setDebugOn((v) => !v);
                    setKeyLog([]);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ring-1 backdrop-blur transition",
                    debugOn
                      ? "bg-amber-100 text-amber-800 ring-amber-200"
                      : "bg-white/15 text-white ring-white/25 hover:bg-white/25",
                  )}
                >
                  <Bug className="h-3.5 w-3.5" />
                  {debugOn ? "Debug ON" : "Debug"}
                </button>
                <button
                  onClick={toggleSound}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ring-1 backdrop-blur transition",
                    soundOn
                      ? "bg-white text-emerald-700 ring-white/40"
                      : "bg-white/15 text-white ring-white/25 hover:bg-white/25",
                  )}
                >
                  {soundOn ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5" /> Sound aktif
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3.5 w-3.5" /> Sound mati
                    </>
                  )}
                </button>
              </>
            }
            meta={
              <HeroChip
                icon={<ScanLine className="h-3 w-3" />}
                label="Recent"
                value={recent.length}
              />
            }
          />

          <Card className="animate-fade-up stagger-1">
            <div className="deco-blob -right-16 -top-16 h-48 w-48 bg-blue-200" />
            <div className="deco-blob -bottom-16 -left-16 h-48 w-48 bg-cyan-200 opacity-40" />
            <CardBody>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700/80">
                  Barcode Boarding Pass
                </span>
                <div className="relative mt-2 animate-pulse-glow rounded-2xl">
                  <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
                  <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="GA123|AB12CD|990001|12A"
                    className="h-16 border-blue-200 bg-white pl-14 text-lg font-mono tracking-wide shadow-inner focus:border-blue-400 focus:ring-blue-200"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Mendukung barcode boarding pass asli (IATA BCBP) maupun
                  format MVP <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">FLIGHT|PNR|TICKET|SEAT</code>. Tekan Enter
                  untuk submit manual.
                </p>
              </label>
            </CardBody>
          </Card>

          {debugOn && (
            <Card className="animate-fade-up border-amber-200/80">
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2 text-amber-800">
                    <Bug className="h-4 w-4" />
                    Debug Scanner
                  </span>
                </CardTitle>
                <button
                  className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  onClick={() => setKeyLog([])}
                >
                  Clear
                </button>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Raw keystrokes (urutan persis dari scanner)
                  </p>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-3 text-xs text-emerald-300 ring-1 ring-slate-800">
                    {keyLog.length === 0
                      ? "(belum ada keystroke — scan sekali sambil input ter-focus)"
                      : keyLog.join("")}
                  </pre>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Isi input sekarang (sebelum Enter)
                  </p>
                  <code className="mt-1 block break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-100">
                    {value || "(empty)"}
                  </code>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tekan tombol scanner lagi — Anda akan lihat persis karakter
                  yang dikirim. Jika hasilnya hanya angka pendek seperti
                  <code className="mx-1 rounded bg-slate-100 px-1">0035</code>
                  berarti scanner Anda 1D-only dan membaca barcode sequence
                  number, bukan PDF417 BCBP.
                </p>
              </CardBody>
            </Card>
          )}

          <div key={pulseKey} className="animate-fade-up">
            <ResultCard last={last} />
          </div>

          <Card className="animate-fade-up stagger-2 lift">
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200">
                    <ScanLine className="h-3.5 w-3.5" />
                  </span>
                  Scan Terbaru
                </span>
              </CardTitle>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {recent.length} entry
              </span>
            </CardHeader>
            <CardBody className="p-0">
              {recent.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  Belum ada hasil scan. Mulai pindai boarding pass.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recent.map((e, idx) => (
                    <li
                      key={e.id}
                      className="animate-fade-up px-5 py-3 transition hover:bg-blue-50/40"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {e.parsedFlightNumber ?? "—"}{" "}
                          <span className="font-normal text-slate-400">
                            · seat {e.parsedSeatNumber ?? "—"}
                          </span>
                        </p>
                        <ResultPill status={e.resultStatus} />
                      </div>
                      {e.parsedPassengerName && (
                        <p className="mt-0.5 text-[12px] text-slate-700">
                          {e.parsedPassengerName}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatTime(e.scannedAt)} — {e.message}
                      </p>
                      <code className="mt-1 block truncate rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500 ring-1 ring-slate-100">
                        {e.rawBarcode || "(empty)"}
                      </code>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Side: today flights */}
        <div>
          <Card className="animate-fade-up stagger-3 lift">
            <div className="deco-blob -right-10 -top-10 h-32 w-32 bg-blue-200" />
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                    <Plane className="h-3.5 w-3.5" />
                  </span>
                  Flight Hari Ini
                </span>
              </CardTitle>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {today}
              </span>
            </CardHeader>
            <CardBody className="p-0">
              {flightsToday.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  Tidak ada flight hari ini.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {flightsToday.map((f, idx) => (
                    <li
                      key={f.id}
                      className="animate-fade-up px-5 py-3 transition hover:bg-blue-50/40"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">
                          {f.flightNumber}
                        </p>
                        <FlightStatusBadge status={f.status} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {f.originAirport} → {f.destinationAirport} ·{" "}
                        {f.gateOrCheckpoint}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        {f.departureTime}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDecode={(raw) => submit(raw)}
      />
    </AppShell>
  );
}

function ResultCard({ last }: { last: LastResult | null }) {
  if (!last) {
    return (
      <Card className="border-dashed border-slate-200">
        <CardBody className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 ring-1 ring-slate-200">
            <ScanLine className="h-7 w-7" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Menunggu scan…
          </p>
          <p className="text-xs text-slate-500">
            Arahkan barcode boarding pass ke scanner.
          </p>
        </CardBody>
      </Card>
    );
  }

  const cfg = getResultConfig(last.status);
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 shadow-card transition-all duration-300",
        cfg.container,
        cfg.glowAnim,
      )}
    >
      <div className={cn("deco-blob -right-10 -top-10 h-32 w-32", cfg.blob)} />
      <div className="relative z-[1] flex items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset shadow-sm animate-badge-pop",
            cfg.iconBg,
          )}
        >
          <Icon className={cn("h-7 w-7", cfg.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider",
              cfg.label,
            )}
          >
            {cfg.title}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {last.flightNumber ?? "—"}
            {last.seat && (
              <span className="text-lg font-normal text-slate-400">
                {"  "}· seat {last.seat}
              </span>
            )}
          </p>
          {last.passengerName && (
            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {last.passengerName}
              {last.pnr && last.pnr !== "—" && (
                <span className="font-normal text-slate-400">
                  {"  "}· PNR {last.pnr}
                </span>
              )}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-700">{last.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span>
              <strong className="text-slate-600">Barcode:</strong>{" "}
              <code className="text-slate-700">{last.raw || "(empty)"}</code>
            </span>
            <span>
              <strong className="text-slate-600">Waktu:</strong>{" "}
              {formatTime(last.scannedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultPill({ status }: { status: ScanResultStatus }) {
  const cfg = getResultConfig(status);
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        cfg.pill,
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.title}
    </span>
  );
}

function getResultConfig(status: ScanResultStatus) {
  switch (status) {
    case "VALID_FLIGHT":
      return {
        title: "Valid Flight",
        icon: CheckCircle2,
        container:
          "bg-gradient-to-br from-emerald-50 via-white to-green-100 border-emerald-200",
        iconBg: "bg-white ring-emerald-200",
        iconColor: "text-emerald-600",
        label: "text-emerald-700",
        pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        blob: "bg-emerald-300",
        glowAnim: "animate-pulse-glow-emerald",
      };
    case "DUPLICATE_SCAN":
      return {
        title: "Duplicate Scan",
        icon: CopyCheck,
        container:
          "bg-gradient-to-br from-amber-50 via-white to-yellow-100 border-amber-200",
        iconBg: "bg-white ring-amber-200",
        iconColor: "text-amber-600",
        label: "text-amber-700",
        pill: "bg-amber-50 text-amber-700 ring-amber-200",
        blob: "bg-amber-300",
        glowAnim: "",
      };
    case "FLIGHT_NOT_TODAY":
      return {
        title: "Bukan Hari Ini",
        icon: AlertTriangle,
        container:
          "bg-gradient-to-br from-rose-50 via-white to-pink-100 border-rose-200",
        iconBg: "bg-white ring-rose-200",
        iconColor: "text-rose-600",
        label: "text-rose-700",
        pill: "bg-rose-50 text-rose-700 ring-rose-200",
        blob: "bg-rose-300",
        glowAnim: "animate-pulse-glow-rose",
      };
    case "FLIGHT_NOT_ACTIVE":
      return {
        title: "Flight Tidak Aktif",
        icon: AlertTriangle,
        container:
          "bg-gradient-to-br from-rose-50 via-white to-pink-100 border-rose-200",
        iconBg: "bg-white ring-rose-200",
        iconColor: "text-rose-600",
        label: "text-rose-700",
        pill: "bg-rose-50 text-rose-700 ring-rose-200",
        blob: "bg-rose-300",
        glowAnim: "animate-pulse-glow-rose",
      };
    case "UNKNOWN_FLIGHT":
      return {
        title: "Flight Tidak Dikenal",
        icon: XCircle,
        container:
          "bg-gradient-to-br from-rose-50 via-white to-pink-100 border-rose-200",
        iconBg: "bg-white ring-rose-200",
        iconColor: "text-rose-600",
        label: "text-rose-700",
        pill: "bg-rose-50 text-rose-700 ring-rose-200",
        blob: "bg-rose-300",
        glowAnim: "animate-pulse-glow-rose",
      };
    case "INVALID_BARCODE":
    default:
      return {
        title: "Barcode Invalid",
        icon: XCircle,
        container:
          "bg-gradient-to-br from-rose-50 via-white to-pink-100 border-rose-200",
        iconBg: "bg-white ring-rose-200",
        iconColor: "text-rose-600",
        label: "text-rose-700",
        pill: "bg-rose-50 text-rose-700 ring-rose-200",
        blob: "bg-rose-300",
        glowAnim: "animate-pulse-glow-rose",
      };
  }
}
