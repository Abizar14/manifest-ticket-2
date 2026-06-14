"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ScanLine,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plane,
  User,
  Armchair,
  Clock,
  Usb,
  Keyboard,
  ShieldCheck,
  CameraOff,
  Image as ImageIcon,
  Sun,
  Moon,
  Lock,
  ArrowRight,
  Scan,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Cpu,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  FaceCaptureCamera,
  type FaceCaptureHandle,
  type FaceDetectionMode,
  type FaceState,
} from "@/components/scan/FaceCaptureCamera";
import { Modal } from "@/components/ui/Modal";
import { getAirlineMeta } from "@/lib/airlines";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { SEED_BOARDING_PASSES } from "@/lib/seedBoardingPasses";
import { useToast } from "@/components/ui/Toast";
import {
  getSession,
  getScanEvents,
  getFlights,
  updateScanEvent,
} from "@/lib/storage";
import {
  playFeedbackHaptic,
  playFeedbackSound,
  processScan,
  processScanWithFace,
} from "@/lib/scanService";
import { facePhotoStore } from "@/lib/facePhotoStore";
import { KtpVerifyModal } from "@/components/scan/KtpVerifyModal";
import { getEffectiveFlightStatus } from "@/lib/flightStatus";
import {
  flushOutbox,
  getOutboxSummary,
  subscribeOutbox,
  type OutboxSummary,
} from "@/lib/sikerenOutbox";
import {
  getSettings,
  saveSettings,
  subscribeSettings,
  type AppSettings,
} from "@/lib/settings";
import { setTheme } from "@/lib/theme";
import type {
  Flight,
  ParsedBarcode,
  ScanEvent,
  ScanResultStatus,
  SessionUser,
} from "@/lib/types";

interface LastResult {
  event: ScanEvent;
  flight: Flight | null;
  parsed: ParsedBarcode | null;
  flightNumber: string | null;
  seat: string | null;
  passengerName: string | null;
  route: string | null;
  faceUrl: string | null;
}

const STATUS_META: Record<
  ScanResultStatus,
  {
    label: string;
    icon: React.ReactNode;
    modalTone: "success" | "warning" | "danger";
    bar: string;
    pill: string;
    glow: string;
  }
> = {
  VALID_FLIGHT: {
    label: "VALID",
    icon: <CheckCircle2 className="h-12 w-12" />,
    modalTone: "success",
    bar: "from-emerald-500 via-emerald-400 to-teal-400",
    pill: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
    glow: "shadow-[0_0_60px_-12px_rgba(16,185,129,0.55)]",
  },
  DUPLICATE_SCAN: {
    label: "DUPLICATE - VALID",
    icon: <AlertTriangle className="h-12 w-12" />,
    modalTone: "warning",
    bar: "from-amber-500 via-amber-400 to-yellow-400",
    pill: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
    glow: "shadow-[0_0_60px_-12px_rgba(245,158,11,0.55)]",
  },
  FLIGHT_NOT_TODAY: {
    label: "BUKAN HARI INI",
    icon: <XCircle className="h-12 w-12" />,
    modalTone: "danger",
    bar: "from-rose-500 via-rose-400 to-pink-500",
    pill: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    glow: "shadow-[0_0_60px_-12px_rgba(244,63,94,0.55)]",
  },
  FLIGHT_NOT_ACTIVE: {
    label: "FLIGHT NOT ACTIVE",
    icon: <XCircle className="h-12 w-12" />,
    modalTone: "danger",
    bar: "from-rose-500 via-rose-400 to-pink-500",
    pill: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    glow: "shadow-[0_0_60px_-12px_rgba(244,63,94,0.55)]",
  },
  UNKNOWN_FLIGHT: {
    label: "UNKNOWN FLIGHT",
    icon: <XCircle className="h-12 w-12" />,
    modalTone: "danger",
    bar: "from-rose-500 via-rose-400 to-pink-500",
    pill: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    glow: "shadow-[0_0_60px_-12px_rgba(244,63,94,0.55)]",
  },
  INVALID_BARCODE: {
    label: "INVALID",
    icon: <XCircle className="h-12 w-12" />,
    modalTone: "danger",
    bar: "from-rose-500 via-rose-400 to-pink-500",
    pill: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    glow: "shadow-[0_0_60px_-12px_rgba(244,63,94,0.55)]",
  },
};

const MODAL_AUTO_CLOSE_MS = 6000;

type ModalToneName = "info" | "warning" | "danger" | "success" | "brand";

const AIRLINE_MODAL_TONE: Record<string, ModalToneName> = {
  GA: "info",
  ID: "info",
  SAA: "info",
  IP: "info",
  MH: "info",
  JT: "danger",
  QZ: "danger",
  SJ: "danger",
  XT: "danger",
  AK: "danger",
  IU: "brand",
  IW: "warning",
  SQ: "warning",
  QG: "success",
};

const AIRLINE_COUNTDOWN_BAR: Record<string, string> = {
  GA: "from-sky-600 via-blue-500 to-cyan-400",
  ID: "from-blue-700 via-blue-600 to-indigo-500",
  SAA: "from-sky-500 via-cyan-500 to-blue-500",
  IP: "from-blue-500 via-cyan-500 to-emerald-500",
  MH: "from-blue-600 via-blue-500 to-red-400",
  JT: "from-rose-600 via-red-500 to-orange-400",
  QZ: "from-rose-600 via-pink-500 to-red-400",
  SJ: "from-red-600 via-red-500 to-rose-400",
  XT: "from-rose-700 via-rose-500 to-red-500",
  AK: "from-red-600 via-rose-500 to-pink-400",
  IU: "from-fuchsia-600 via-pink-500 to-rose-400",
  IW: "from-amber-500 via-orange-500 to-red-400",
  SQ: "from-amber-500 via-yellow-500 to-orange-400",
  QG: "from-emerald-500 via-green-500 to-lime-400",
};

function airlineToneFor(code: string | null | undefined): ModalToneName {
  return AIRLINE_MODAL_TONE[(code ?? "").toUpperCase()] ?? "success";
}

function airlineBarFor(code: string | null | undefined): string {
  return (
    AIRLINE_COUNTDOWN_BAR[(code ?? "").toUpperCase()] ??
    "from-emerald-500 to-teal-400"
  );
}

function faceGateMessage(state: FaceState): { title: string; body: string } {
  switch (state) {
    case "no_face":
      return {
        title: "Wajah tidak terdeteksi",
        body: "Posisikan wajah penumpang di depan kamera sebelum scan.",
      };
    case "multiple":
      return {
        title: "Lebih dari 1 wajah",
        body: "Pastikan hanya 1 penumpang di depan kamera.",
      };
    case "too_far":
      return {
        title: "Wajah terlalu jauh",
        body: "Mendekat ke kamera supaya wajah terlihat jelas.",
      };
    case "off_center":
      return {
        title: "Wajah tidak menghadap kamera",
        body: "Hadapkan wajah lurus ke kamera dan ke tengah.",
      };
    default:
      return {
        title: "Validasi wajah belum siap",
        body: "Tunggu sebentar hingga kamera mendeteksi wajah.",
      };
  }
}

const FACE_HUD: Record<
  FaceState,
  { label: string; sub: string; ring: string; bg: string; text: string; sub2: string }
> = {
  ok: {
    label: "Face",
    sub: "Detected",
    ring: "ring-emerald-400/50",
    bg: "bg-emerald-500/15",
    text: "text-emerald-200",
    sub2: "text-emerald-100",
  },
  no_face: {
    label: "Cari",
    sub: "Wajah…",
    ring: "ring-rose-400/50",
    bg: "bg-rose-500/15",
    text: "text-rose-200",
    sub2: "text-rose-100",
  },
  multiple: {
    label: "Multi",
    sub: "Wajah",
    ring: "ring-amber-400/50",
    bg: "bg-amber-500/15",
    text: "text-amber-200",
    sub2: "text-amber-100",
  },
  too_far: {
    label: "Terlalu",
    sub: "Jauh",
    ring: "ring-amber-400/50",
    bg: "bg-amber-500/15",
    text: "text-amber-200",
    sub2: "text-amber-100",
  },
  off_center: {
    label: "Hadap",
    sub: "Tengah",
    ring: "ring-amber-400/50",
    bg: "bg-amber-500/15",
    text: "text-amber-200",
    sub2: "text-amber-100",
  },
  unknown: {
    label: "Face",
    sub: "Init…",
    ring: "ring-cyan-400/40",
    bg: "bg-cyan-500/15",
    text: "text-cyan-200",
    sub2: "text-cyan-100",
  },
};

export default function KioskPage() {
  const router = useRouter();
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<FaceCaptureHandle>(null);
  const lastFaceUrlRef = React.useRef<string | null>(null);

  const [session, setSession] = React.useState<SessionUser | null>(null);
  const [settings, setSettings] = React.useState<AppSettings>(getSettings());
  const [value, setValue] = React.useState("");
  const [last, setLast] = React.useState<LastResult | null>(null);
  const [recent, setRecent] = React.useState<ScanEvent[]>([]);
  const [todayScans, setTodayScans] = React.useState<ScanEvent[]>([]);
  const [todayFlights, setTodayFlights] = React.useState<Flight[]>([]);
  const [flightsToday, setFlightsToday] = React.useState(0);
  const [inputMode, setInputMode] = React.useState<"idle" | "scanner" | "manual">(
    "idle",
  );
  const [now, setNow] = React.useState(new Date());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [ktpFlow, setKtpFlow] = React.useState<{
    eventId: string;
    expectedName: string | null;
  } | null>(null);
  const [faceState, setFaceState] = React.useState<FaceState>("unknown");
  const [faceDetectorSupported, setFaceDetectorSupported] = React.useState(false);
  const [detectionMode, setDetectionMode] = React.useState<FaceDetectionMode>("none");
  const [sessionStats, setSessionStats] = React.useState<{
    valid: number;
    duplicate: number;
    rejected: number;
  }>({ valid: 0, duplicate: 0, rejected: 0 });
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [outbox, setOutbox] = React.useState<OutboxSummary>(() =>
    typeof window === "undefined"
      ? {
          pending: 0,
          failed: 0,
          total: 0,
          lastSyncedAt: null,
          lastError: null,
          online: true,
        }
      : getOutboxSummary(),
  );
  const [syncing, setSyncing] = React.useState(false);

  const keyTimesRef = React.useRef<number[]>([]);
  const submittingRef = React.useRef(false);

  const isDark = settings.theme === "dark";

  React.useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) {
      router.replace("/login");
      return;
    }
    const all = getScanEvents();
    setRecent(all.slice(0, 6));
    const today = new Date().toISOString().slice(0, 10);
    setTodayScans(all.filter((e) => e.scannedAt.slice(0, 10) === today));
    const todays = getFlights().filter((f) => f.departureDate === today);
    setTodayFlights(todays);
    setFlightsToday(todays.length);
    const unsub = subscribeSettings((next) => setSettings(next));
    setTimeout(() => inputRef.current?.focus(), 50);
    return unsub;
  }, [router]);

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Refresh todayFlights & todayScans secara berkala + saat storage berubah
  // (mis. user buat flight baru di tab lain) supaya list "FLIGHT AKTIF" selalu
  // up-to-date tanpa harus reload halaman.
  React.useEffect(() => {
    const refresh = () => {
      const today = new Date().toISOString().slice(0, 10);
      setTodayFlights(getFlights().filter((f) => f.departureDate === today));
      const all = getScanEvents();
      setTodayScans(all.filter((e) => e.scannedAt.slice(0, 10) === today));
      setFlightsToday(getFlights().filter((f) => f.departureDate === today).length);
    };
    const id = window.setInterval(refresh, 3000);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("afvs.")) refresh();
    };
    const onFocus = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      const el = inputRef.current;
      if (!el) return;
      const active = document.activeElement as HTMLElement | null;
      if (active === el) return;
      // jangan rebut focus saat user sedang berinteraksi dengan kontrol form
      // (mis. dropdown webcam, tombol modal, atau input lain)
      if (active) {
        const tag = active.tagName;
        if (
          tag === "SELECT" ||
          tag === "OPTION" ||
          tag === "BUTTON" ||
          tag === "TEXTAREA" ||
          (tag === "INPUT" && active !== el)
        ) {
          return;
        }
        if (active.isContentEditable) return;
      }
      el.focus();
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  const ktpFlowOpen = ktpFlow !== null;
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (ktpFlowOpen) return;
        if (modalOpen) setModalOpen(false);
        else router.push("/scan");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, modalOpen, ktpFlowOpen]);

  React.useEffect(() => {
    return () => {
      if (lastFaceUrlRef.current) {
        URL.revokeObjectURL(lastFaceUrlRef.current);
        lastFaceUrlRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!modalOpen) return;
    const t = setTimeout(() => setModalOpen(false), MODAL_AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [modalOpen]);

  React.useEffect(() => {
    setOutbox(getOutboxSummary());
    return subscribeOutbox(() => setOutbox(getOutboxSummary()));
  }, []);

  // Poll face detection state from camera for HUD feedback
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const cam = cameraRef.current;
      if (!cam) return;
      setFaceState(cam.getFaceState());
      setFaceDetectorSupported(cam.isFaceDetectionSupported());
      setDetectionMode(cam.getDetectionMode());
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length === 1) {
      const t = performance.now();
      const arr = keyTimesRef.current;
      arr.push(t);
      if (arr.length > 12) arr.shift();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const times = keyTimesRef.current;
      if (times.length >= 6) {
        const span = times[times.length - 1] - times[0];
        const avg = span / (times.length - 1);
        setInputMode(avg < 30 ? "scanner" : "manual");
      } else {
        setInputMode("manual");
      }
      keyTimesRef.current = [];
      submit();
    }
  };

  const submit = async (rawInput?: string) => {
    if (!session) return;
    if (submittingRef.current) return;
    const raw = rawInput ?? value;
    if (!raw.trim()) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    submittingRef.current = true;

    const captureEnabled = Boolean(
      settings.faceCaptureEnabled && cameraRef.current?.isReady(),
    );

    // Face validation gate
    if (
      captureEnabled &&
      settings.requireFaceForScan &&
      cameraRef.current?.isFaceDetectionSupported()
    ) {
      const fs = cameraRef.current.getFaceState();
      if (fs !== "ok") {
        const { title, body } = faceGateMessage(fs);
        toast.warning(body, title);
        playFeedbackSound("INVALID_BARCODE");
        playFeedbackHaptic("INVALID_BARCODE");
        setValue("");
        setTimeout(() => inputRef.current?.focus(), 0);
        submittingRef.current = false;
        return;
      }
    }

    const getFaceBlob = async (): Promise<Blob | null> => {
      if (!captureEnabled) return null;
      return (await cameraRef.current?.captureFrame()) ?? null;
    };

    try {
      const { outcome, event } = captureEnabled
        ? await processScanWithFace(raw, session.email, getFaceBlob)
        : processScan(raw, session.email);

      playFeedbackSound(outcome.status);
      playFeedbackHaptic(outcome.status);

      setSessionStats((prev) => {
        if (outcome.status === "VALID_FLIGHT") return { ...prev, valid: prev.valid + 1 };
        if (outcome.status === "DUPLICATE_SCAN") return { ...prev, duplicate: prev.duplicate + 1 };
        return { ...prev, rejected: prev.rejected + 1 };
      });

      if (outcome.status === "VALID_FLIGHT") {
        toast.success(
          `${outcome.flight?.flightNumber ?? "Flight"} · seat ${outcome.parsed?.seatNumber ?? "—"}`,
          "Valid",
        );
      } else if (outcome.status === "DUPLICATE_SCAN") {
        toast.warning(outcome.message, "Duplicate - valid hari ini");
      } else {
        toast.error(outcome.message, "Rejected");
      }

      if (lastFaceUrlRef.current) {
        URL.revokeObjectURL(lastFaceUrlRef.current);
        lastFaceUrlRef.current = null;
      }
      let faceUrl: string | null = null;
      if (event.faceCaptureId) {
        faceUrl = await facePhotoStore.getObjectUrl(event.faceCaptureId);
        lastFaceUrlRef.current = faceUrl;
      }

      setLast({
        event,
        flight: outcome.flight,
        parsed: outcome.parsed,
        flightNumber:
          outcome.flight?.flightNumber ?? outcome.parsed?.flightNumber ?? null,
        seat: outcome.parsed?.seatNumber ?? null,
        passengerName: outcome.parsed?.passengerName ?? null,
        route: outcome.flight
          ? `${outcome.flight.originAirport} → ${outcome.flight.destinationAirport}`
          : null,
        faceUrl,
      });
      const all = getScanEvents();
      setRecent(all.slice(0, 6));
      const today = new Date().toISOString().slice(0, 10);
      setTodayScans(all.filter((e) => e.scannedAt.slice(0, 10) === today));
      setTodayFlights(getFlights().filter((f) => f.departureDate === today));
      const willOpenKtp =
        outcome.status === "VALID_FLIGHT" && settings.ktpVerifyEnabled;
      if (willOpenKtp) {
        setKtpFlow({
          eventId: event.id,
          expectedName: outcome.parsed?.passengerName ?? null,
        });
      } else {
        setModalOpen(true);
      }
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    } finally {
      submittingRef.current = false;
    }
  };

  const exitKiosk = () => router.push("/scan");
  const onDeviceChange = (deviceId: string) => {
    saveSettings({ faceCameraDeviceId: deviceId || null });
  };
  const toggleTheme = () => setTheme(isDark ? "airport" : "dark");
  const toggleSound = () => saveSettings({ soundOn: !settings.soundOn });

  const onForceSync = async () => {
    if (syncing) return;
    if (!settings.sikerenEnabled) {
      toast.info("Integrasi Sikeren belum diaktifkan di Settings.", "Sikeren off");
      return;
    }
    setSyncing(true);
    try {
      const res = await flushOutbox();
      if (res.sent > 0) {
        toast.success(`${res.sent} item terkirim ke Sikeren.`, "Sync OK");
      } else if (res.failed > 0) {
        toast.error(`${res.failed} item gagal.`, "Sync gagal");
      } else {
        toast.info("Tidak ada item untuk dikirim.", "Sikeren");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = () => {
    setModalOpen(false);
    setLast(null);
    setSessionStats({ valid: 0, duplicate: 0, rejected: 0 });
    setRecent([]);
    setValue("");
    if (lastFaceUrlRef.current) {
      URL.revokeObjectURL(lastFaceUrlRef.current);
      lastFaceUrlRef.current = null;
    }
    toast.success("Stats & riwayat tampilan dikosongkan", "Reset");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleDemoScan = async () => {
    if (demoLoading || submittingRef.current) return;
    setDemoLoading(true);
    try {
      const pick =
        SEED_BOARDING_PASSES[Math.floor(Math.random() * SEED_BOARDING_PASSES.length)];
      const raw = `${pick.flightNumber}|${pick.pnr}|${pick.ticket}|${pick.seat}`;
      await submit(raw);
    } finally {
      setDemoLoading(false);
    }
  };

  const lastMeta = last ? STATUS_META[last.event.resultStatus] : null;
  const captureEnabledUi = settings.faceCaptureEnabled;

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden transition-colors",
        "bg-[#eef3fb] text-slate-800",
        "dark:bg-[#0a1226] dark:text-white",
      )}
    >
      {/* Background grid + glow (dark only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-[0.18] dark:block"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(56,189,248,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.18) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/4 h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 h-[380px] w-[380px] rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/15"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <h1 className="text-[13px] font-black tracking-[0.18em]">
              KIOSK MODE
              <span className="mx-1.5 text-slate-400 dark:text-white/30">·</span>
              <span className="text-cyan-600 dark:text-cyan-300">POS VALIDASI</span>
            </h1>
            <p className="text-[10.5px] tracking-wider text-slate-500 dark:text-white/55">
              {session?.name ?? "—"} · {flightsToday} flight hari ini
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {settings.sikerenEnabled && (
            <SikerenSyncChip
              summary={outbox}
              syncing={syncing}
              onClick={onForceSync}
            />
          )}
          <SessionStatsChip stats={sessionStats} />
          <ScannerStatusBadge mode={inputMode} />
          <ClockChip now={now} />
          <SoundToggleChip on={settings.soundOn} onToggle={toggleSound} />
          <ThemeToggleChip isDark={isDark} onToggle={toggleTheme} />
          <button
            type="button"
            onClick={exitKiosk}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-md shadow-rose-500/30 transition hover:shadow-rose-500/50"
            title="Keluar Kiosk (Esc)"
          >
            <X className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </header>

      {/* Hidden input */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        aria-label="Scanner input"
        className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0"
      />

      {/* Main grid */}
      <main className="relative z-10 grid gap-4 px-6 pb-6 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Kiri: webcam with HUD */}
        <section className="flex flex-col gap-3">
          <BiometricCamera
            captureEnabled={captureEnabledUi}
            cameraRef={cameraRef}
            deviceId={settings.faceCameraDeviceId}
            onDeviceChange={onDeviceChange}
            faceState={faceState}
            faceDetectorSupported={faceDetectorSupported}
            gateActive={settings.requireFaceForScan}
          />

          <PrivacyBanner />
          {captureEnabledUi && detectionMode === "heuristic" && (
            <DetectionModeNotice />
          )}
        </section>

        {/* Kanan: scan ready + recent */}
        <section className="flex flex-col gap-4">
          <ScanReadyCard />
          <ActionRow
            onReset={handleReset}
            onDemo={handleDemoScan}
            demoLoading={demoLoading}
          />
          <ActiveFlightCards
            flights={todayFlights}
            scans={todayScans}
            now={now}
            settings={settings}
            highlightFlightId={last?.event.flightId ?? null}
            onMore={() =>
              router.push(session?.role === "security" ? "/scan" : "/scan-events")
            }
          />
        </section>
      </main>

      {/* Result Modal */}
      {last && lastMeta && (() => {
        const isValid =
          last.event.resultStatus === "VALID_FLIGHT" &&
          last.flight &&
          last.parsed;
        const airlineCode = last.flight?.airlineCode ?? null;
        const tone: ModalToneName = isValid
          ? airlineToneFor(airlineCode)
          : lastMeta.modalTone;
        const barGradient = isValid
          ? airlineBarFor(airlineCode)
          : ACCENT_BAR[lastMeta.modalTone];
        return (
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            tone={tone}
            size={isValid ? "xl" : "lg"}
            icon={lastMeta.icon}
            title={
              <span className="text-xl font-black tracking-tight">
                {lastMeta.label}
              </span>
            }
            description={last.event.message}
            footer={
              <ModalCloseFooter
                onClose={() => setModalOpen(false)}
                barGradient={barGradient}
                durationMs={MODAL_AUTO_CLOSE_MS}
                resetKey={last.event.id}
              />
            }
          >
            {isValid ? (
              <BoardingPassModalBody last={last} />
            ) : (
              <ResultModalBody last={last} meta={lastMeta} />
            )}
          </Modal>
        );
      })()}

      <KtpVerifyModal
        open={ktpFlow !== null}
        expectedName={ktpFlow?.expectedName ?? null}
        cameraRef={cameraRef}
        autoPassThreshold={settings.ktpAutoPassThreshold}
        manualThreshold={settings.ktpManualThreshold}
        onClose={(result) => {
          if (ktpFlow && result) {
            updateScanEvent(ktpFlow.eventId, { ktpVerification: result });
            if (result.status === "manual_reject") {
              toast.error("Nama KTP tidak cocok dengan boarding pass.", "KTP Reject");
            } else if (result.status === "matched") {
              toast.success("Nama KTP cocok.", "KTP OK");
            } else if (result.status === "manual_pass") {
              toast.info("KTP diverifikasi manual oleh operator.", "KTP Manual");
            }
          }
          setKtpFlow(null);
          setModalOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      />
    </div>
  );
}

/* ─────────────── Biometric Camera with HUD overlay ─────────────── */

function BiometricCamera({
  captureEnabled,
  cameraRef,
  deviceId,
  onDeviceChange,
  faceState,
  faceDetectorSupported,
  gateActive,
}: {
  captureEnabled: boolean;
  cameraRef: React.RefObject<FaceCaptureHandle>;
  deviceId: string | null;
  onDeviceChange: (id: string) => void;
  faceState: FaceState;
  faceDetectorSupported: boolean;
  gateActive: boolean;
}) {
  const hud = FACE_HUD[faceState];
  const ringColor =
    faceState === "ok"
      ? "border-emerald-400/70"
      : faceState === "no_face"
      ? "border-rose-400/70"
      : faceState === "multiple" || faceState === "too_far" || faceState === "off_center"
      ? "border-amber-400/70"
      : "border-cyan-300/70";
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/70 ring-1 ring-slate-200 dark:bg-[#0c1a36] dark:ring-cyan-400/15">
      {/* Camera viewport */}
      <div className="relative aspect-[4/3]">
        {captureEnabled ? (
          <FaceCaptureCamera
            ref={cameraRef}
            deviceId={deviceId}
            showDevicePicker
            onDeviceChange={onDeviceChange}
            hudVariant="minimal"
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-white/50">
              <CameraOff className="h-10 w-10" />
              <p className="text-sm font-semibold">Capture wajah nonaktif</p>
              <p className="text-xs">Aktifkan di Settings.</p>
            </div>
          </div>
        )}

        {/* HUD overlays — corner brackets (large) */}
        <span className="pointer-events-none absolute left-4 top-4 h-10 w-10 rounded-tl-xl border-l-2 border-t-2 border-cyan-400/80" />
        <span className="pointer-events-none absolute right-4 top-4 h-10 w-10 rounded-tr-xl border-r-2 border-t-2 border-cyan-400/80" />
        <span className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 rounded-bl-xl border-b-2 border-l-2 border-cyan-400/80" />
        <span className="pointer-events-none absolute bottom-4 right-4 h-10 w-10 rounded-br-xl border-b-2 border-r-2 border-cyan-400/80" />

        {/* Concentric rings + reticle behind face */}
        {captureEnabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="absolute h-[78%] w-[78%] rounded-full border border-cyan-400/15" />
            <span className="absolute h-[62%] w-[62%] rounded-full border border-cyan-400/25" />
            <span className="absolute h-[48%] w-[48%] rounded-full border border-cyan-400/40 animate-spin-slow" />
            <span className={cn("absolute h-[40%] w-[40%] rounded-[42%] border-2 transition-colors", ringColor)} />
          </div>
        )}

        {/* WEBCAM LIVE pill */}
        <div className="absolute left-4 top-4 ml-12 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow ring-1 ring-white/10 backdrop-blur">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-rose-500" />
          </span>
          Webcam Live
        </div>

        {/* Side HUD: live face state */}
        {captureEnabled && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-cyan-400/70" />
            <div className={cn("rounded-md px-2 py-1 ring-1 backdrop-blur transition-colors", hud.bg, hud.ring)}>
              <p className={cn("text-[8.5px] font-bold uppercase tracking-[0.18em]", hud.text)}>
                {hud.label}
              </p>
              <p className={cn("text-[9.5px] font-black tracking-wider", hud.sub2)}>
                {hud.sub}
              </p>
            </div>
          </div>
        )}

        {/* Top-center: gate banner when face required but not OK */}
        {captureEnabled && gateActive && faceDetectorSupported && faceState !== "ok" && (
          <div className="absolute inset-x-0 top-3 flex justify-center">
            <div className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-black uppercase tracking-wider ring-1 backdrop-blur",
              faceState === "no_face"
                ? "bg-rose-500/20 ring-rose-400/60 text-rose-100"
                : "bg-amber-500/20 ring-amber-400/60 text-amber-100",
            )}>
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
              {faceState === "no_face" && "Wajah tidak terdeteksi"}
              {faceState === "multiple" && "Lebih dari 1 wajah"}
              {faceState === "too_far" && "Wajah terlalu jauh"}
              {faceState === "off_center" && "Hadap kamera & ke tengah"}
              {faceState === "unknown" && "Menyiapkan deteksi…"}
            </div>
          </div>
        )}
        {captureEnabled && gateActive && faceDetectorSupported && faceState === "ok" && (
          <div className="absolute inset-x-0 top-3 flex justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-3 py-1 text-[10.5px] font-black uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-400/60 backdrop-blur">
              <CheckCircle2 className="h-3 w-3" />
              Siap scan
            </div>
          </div>
        )}

        {/* Side HUD: CAPTURE ACTIVE */}
        {captureEnabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <div className="rounded-md bg-emerald-500/15 px-2 py-1 ring-1 ring-emerald-400/40 backdrop-blur">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                Capture
              </p>
              <p className="text-[9.5px] font-black tracking-wider text-emerald-100">
                Active
              </p>
            </div>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-emerald-400/70" />
          </div>
        )}

        {/* LIVE bottom-left */}
        <div className="absolute bottom-4 left-4 ml-12 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white ring-1 ring-white/10 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          Live
        </div>

        {/* Animated scan line */}
        {captureEnabled && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-8 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-80 animate-scan-line"
          />
        )}
      </div>
    </div>
  );
}

function PrivacyBanner() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-slate-200 backdrop-blur dark:bg-[#0c1a36] dark:ring-cyan-400/15">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-400/30">
        <ShieldCheck className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          Kamera Aktif untuk Verifikasi Visual Penumpang
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-white/55">
          Foto disimpan lokal di perangkat & tidak dikirim ke server.
        </p>
      </div>
      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-white/40" />
    </div>
  );
}

/* ─────────────── Scan ready card with audio waveform ─────────────── */

function ScanReadyCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/80 px-6 py-7 ring-1 ring-slate-200 backdrop-blur-md dark:bg-[#0c1a36] dark:ring-cyan-400/15">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 via-transparent to-blue-50/40 dark:from-cyan-500/5 dark:to-blue-500/5"
      />
      <div className="relative flex flex-col items-center gap-4">
        <Waveform />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-cyan-500/40">
          <Scan className="h-7 w-7" />
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-cyan-300/40 animate-ping"
          />
        </span>
        <div className="text-center">
          <p className="text-xl font-black tracking-tight">MENUNGGU SCAN…</p>
          <p className="mt-1.5 max-w-sm text-[12px] leading-snug text-slate-500 dark:text-white/55">
            Arahkan scanner USB ke boarding pass untuk memulai validasi.
          </p>
        </div>
      </div>
    </div>
  );
}

function Waveform() {
  // 28 vertical bars with deterministic heights — animated via CSS delays
  const bars = React.useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const seed = Math.sin(i * 1.7) * 0.5 + 0.5;
        const h = 30 + Math.round(seed * 70);
        const delay = (i % 10) * 80;
        return { h, delay };
      }),
    [],
  );
  return (
    <div className="flex h-12 items-center gap-1">
      {bars.map((b, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full bg-gradient-to-t from-cyan-500/70 to-cyan-300/90 animate-wave dark:from-cyan-500/70 dark:to-cyan-200"
          style={{
            height: `${b.h}%`,
            animationDelay: `${b.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────── Active flight cards ─────────────── */

interface FlightCardData {
  flight: Flight;
  effectiveStatus: "OPEN" | "ACTIVE";
  boarded: number;
  lastScans: ScanEvent[];
  lastScanAt: number;
}

function ActiveFlightCards({
  flights,
  scans,
  now,
  settings,
  highlightFlightId,
  onMore,
}: {
  flights: Flight[];
  scans: ScanEvent[];
  now: Date;
  settings: AppSettings;
  highlightFlightId: string | null;
  onMore: () => void;
}) {
  const cards: FlightCardData[] = React.useMemo(() => {
    const validScans = scans.filter(
      (e) => e.resultStatus === "VALID_FLIGHT" && e.flightId,
    );
    return flights
      .map((flight) => {
        // Pakai stored status sebagai dasar tampilan (kalau supervisor mark
        // OPEN/ACTIVE manual, harus tetap muncul di kiosk walaupun window
        // auto-close lewat). Effective hanya jadi badge tambahan.
        const eff = getEffectiveFlightStatus(flight, now, settings);
        const isBoardable =
          flight.status === "OPEN" ||
          flight.status === "ACTIVE" ||
          eff.status === "OPEN" ||
          eff.status === "ACTIVE";
        if (!isBoardable) return null;
        const fScans = validScans
          .filter((e) => e.flightId === flight.id)
          .sort(
            (a, b) =>
              new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
          );
        const lastAt = fScans[0]
          ? new Date(fScans[0].scannedAt).getTime()
          : 0;
        // Tampilkan badge "OPEN" untuk semua yang lolos filter — kalau
        // stored OPEN/ACTIVE tapi effective lain (CLOSED), tetap OPEN biar
        // konsisten dengan list /flights.
        const displayStatus: "OPEN" | "ACTIVE" =
          flight.status === "ACTIVE" || eff.status === "ACTIVE"
            ? "ACTIVE"
            : "OPEN";
        return {
          flight,
          effectiveStatus: displayStatus,
          boarded: fScans.length,
          lastScans: fScans.slice(0, 3),
          lastScanAt: lastAt,
        };
      })
      .filter((c): c is FlightCardData => c !== null)
      .sort((a, b) => {
        // ACTIVE first, then by most-recent scan, then by STD
        if (a.effectiveStatus !== b.effectiveStatus) {
          return a.effectiveStatus === "ACTIVE" ? -1 : 1;
        }
        if (a.lastScanAt !== b.lastScanAt) return b.lastScanAt - a.lastScanAt;
        return a.flight.departureTime.localeCompare(b.flight.departureTime);
      });
  }, [flights, scans, now, settings]);

  return (
    <div className="rounded-3xl bg-white/80 ring-1 ring-slate-200 backdrop-blur-md dark:bg-[#0c1a36] dark:ring-cyan-400/15">
      <div className="flex items-center justify-between px-5 py-3">
        <h3 className="text-[10.5px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/70">
          Flight Aktif · Boarding
        </h3>
        <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-white/70">
          {cards.length}
        </span>
      </div>
      <div className="max-h-[420px] space-y-2 overflow-y-auto px-3 pb-3">
        {cards.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-slate-400 dark:text-white/40">
            Belum ada flight yang sedang boarding.
          </div>
        )}
        {cards.map((c) => (
          <FlightBoardingCard
            key={c.flight.id}
            data={c}
            highlight={highlightFlightId === c.flight.id}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onMore}
        className="group flex w-full items-center justify-center gap-1.5 border-t border-slate-200/70 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-cyan-700 transition hover:bg-cyan-50/50 dark:border-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-500/5"
      >
        Lihat semua scan hari ini
        <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function FlightBoardingCard({
  data,
  highlight,
}: {
  data: FlightCardData;
  highlight: boolean;
}) {
  const { flight, effectiveStatus, boarded, lastScans } = data;
  const expected = flight.expectedPax ?? null;
  const percent =
    expected && expected > 0
      ? Math.min(100, Math.round((boarded / expected) * 100))
      : null;

  const statusPill =
    effectiveStatus === "ACTIVE"
      ? "bg-amber-500/15 text-amber-700 ring-amber-300 dark:text-amber-300 dark:ring-amber-500/40"
      : "bg-emerald-500/15 text-emerald-700 ring-emerald-300 dark:text-emerald-300 dark:ring-emerald-500/40";

  const barColor =
    effectiveStatus === "ACTIVE"
      ? "from-amber-400 to-orange-500"
      : "from-emerald-400 to-teal-500";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-slate-200 transition dark:bg-[#0e1f44] dark:ring-cyan-400/15",
        highlight &&
          "ring-2 ring-cyan-400 shadow-[0_0_24px_-4px_rgba(34,211,238,0.45)] dark:ring-cyan-300",
      )}
    >
      {/* Header row: airline + flight + status */}
      <div className="flex items-center gap-2.5">
        <AirlineLogo code={flight.airlineCode} size="sm" mode="rich" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-black tracking-tight tabular-nums">
              {flight.flightNumber}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1",
                statusPill,
              )}
            >
              {effectiveStatus === "ACTIVE" ? "Final Call" : "Open"}
            </span>
          </div>
          <p className="truncate text-[10.5px] text-slate-500 dark:text-white/55">
            {flight.originAirport} → {flight.destinationAirport} · Gate{" "}
            {flight.gateOrCheckpoint} · {flight.departureTime}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-black tabular-nums text-slate-800 dark:text-white">
            {boarded}
            {expected !== null && (
              <span className="text-[11px] font-bold text-slate-400 dark:text-white/40">
                /{expected}
              </span>
            )}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
            pax
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {percent !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-all",
              barColor,
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Mini scan list */}
      {lastScans.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {lastScans.map((e) => (
            <MiniScanRow key={e.id} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniScanRow({ event }: { event: ScanEvent }) {
  const [faceUrl, setFaceUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (event.faceCaptureId) {
      facePhotoStore.getObjectUrl(event.faceCaptureId).then((u) => {
        if (cancelled && u) {
          URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setFaceUrl(u);
      });
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [event.faceCaptureId]);

  const time = new Date(event.scannedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <li className="flex items-center gap-2 rounded-lg bg-slate-50/70 px-2 py-1 dark:bg-white/[0.04]">
      <div className="shrink-0">
        {faceUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={faceUrl}
            alt=""
            className="h-6 w-6 rounded-md object-cover ring-1 ring-slate-200 dark:ring-cyan-400/20"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-white/5 dark:text-white/30 dark:ring-cyan-400/10">
            <User className="h-3 w-3" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-white/85">
          {event.parsedPassengerName ?? "—"}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-mono tabular-nums text-slate-400 dark:text-white/45">
        seat {event.parsedSeatNumber ?? "—"}
      </span>
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400 dark:text-white/45">
        {time}
      </span>
    </li>
  );
}

/* ─────────────── Header chips ─────────────── */

function ScannerStatusBadge({ mode }: { mode: "idle" | "scanner" | "manual" }) {
  if (mode === "scanner") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
        <Usb className="h-3 w-3" />
        Scanner USB
      </span>
    );
  }
  if (mode === "manual") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">
        <Keyboard className="h-3 w-3" />
        Input manual
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-white/70 dark:ring-white/15">
      <ScanLine className="h-3 w-3" />
      Menunggu input
    </span>
  );
}

function ClockChip({ now }: { now: Date }) {
  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/5 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700 tabular-nums ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-white/15">
      <Clock className="h-3 w-3" />
      {time}
    </span>
  );
}

function ThemeToggleChip({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isDark ? "Mode terang" : "Mode gelap"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/5 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-900/10 dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}

function SoundToggleChip({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={on ? "Matikan suara feedback" : "Aktifkan suara feedback"}
      aria-label={on ? "Sound on" : "Sound off"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 transition",
        on
          ? "bg-emerald-100 text-emerald-700 ring-emerald-300 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/25"
          : "bg-slate-900/5 text-slate-500 ring-slate-200 hover:bg-slate-900/10 dark:bg-white/10 dark:text-white/60 dark:ring-white/15 dark:hover:bg-white/15",
      )}
    >
      {on ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
    </button>
  );
}

function SikerenSyncChip({
  summary,
  syncing,
  onClick,
}: {
  summary: OutboxSummary;
  syncing: boolean;
  onClick: () => void;
}) {
  const offline = !summary.online;
  const hasFailed = summary.failed > 0;
  const hasPending = summary.pending > 0;

  let tone:
    | "ok"
    | "pending"
    | "failed"
    | "offline"
    | "syncing" = "ok";
  if (syncing) tone = "syncing";
  else if (offline) tone = "offline";
  else if (hasFailed) tone = "failed";
  else if (hasPending) tone = "pending";

  const toneClass: Record<typeof tone, string> = {
    ok: "bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
    pending:
      "bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
    failed:
      "bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
    offline:
      "bg-slate-200 text-slate-700 ring-slate-300 dark:bg-white/10 dark:text-white/70 dark:ring-white/15",
    syncing:
      "bg-cyan-100 text-cyan-700 ring-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/30",
  };

  const icon =
    tone === "syncing" ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : tone === "offline" ? (
      <CloudOff className="h-3 w-3" />
    ) : (
      <Cloud className="h-3 w-3" />
    );

  const label =
    tone === "syncing"
      ? "Sync…"
      : tone === "offline"
        ? "Offline"
        : tone === "failed"
          ? `Gagal ${summary.failed}`
          : tone === "pending"
            ? `Pending ${summary.pending}`
            : "Tersinkron";

  const lastSync = summary.lastSyncedAt
    ? new Date(summary.lastSyncedAt).toLocaleTimeString("id-ID")
    : "belum pernah";

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Sikeren · ${label} · last sync: ${lastSync}${
        summary.lastError ? ` · ${summary.lastError}` : ""
      }`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
        toneClass[tone],
      )}
      disabled={syncing}
    >
      {icon}
      <span className="tabular-nums">{label}</span>
    </button>
  );
}

function SessionStatsChip({
  stats,
}: {
  stats: { valid: number; duplicate: number; rejected: number };
}) {
  const total = stats.valid + stats.duplicate + stats.rejected;
  return (
    <div
      title={`Total: ${total} · Valid ${stats.valid} · Duplicate ${stats.duplicate} · Ditolak ${stats.rejected}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-bold ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/15"
    >
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        <span className="tabular-nums">{stats.valid}</span>
      </span>
      <span className="text-slate-300 dark:text-white/20">·</span>
      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
        <AlertTriangle className="h-3 w-3" />
        <span className="tabular-nums">{stats.duplicate}</span>
      </span>
      <span className="text-slate-300 dark:text-white/20">·</span>
      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300">
        <XCircle className="h-3 w-3" />
        <span className="tabular-nums">{stats.rejected}</span>
      </span>
    </div>
  );
}

function ActionRow({
  onReset,
  onDemo,
  demoLoading,
}: {
  onReset: () => void;
  onDemo: () => void;
  demoLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-slate-200 backdrop-blur dark:bg-[#0c1a36] dark:ring-cyan-400/15">
      <button
        type="button"
        onClick={onDemo}
        disabled={demoLoading}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-md shadow-cyan-500/20 transition hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {demoLoading ? "Memproses…" : "Demo Scan"}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-900/10 dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/15"
        title="Reset stats & tampilan"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>
    </div>
  );
}

function DetectionModeNotice() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50/80 px-4 py-2.5 ring-1 ring-amber-200 backdrop-blur dark:bg-amber-500/10 dark:ring-amber-500/30">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/30">
        <Cpu className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
          Validasi wajah: mode heuristik
        </p>
        <p className="mt-0.5 text-[10.5px] leading-snug text-amber-800/80 dark:text-amber-200/70">
          Browser tidak menyediakan FaceDetector API. Deteksi memakai analisis warna kulit (kurang akurat di pencahayaan ekstrem).
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Modal close footer with countdown ─────────────── */

const ACCENT_BAR: Record<"success" | "warning" | "danger", string> = {
  success: "from-emerald-500 to-teal-400",
  warning: "from-amber-500 to-orange-400",
  danger: "from-rose-500 to-pink-400",
};

function ModalCloseFooter({
  onClose,
  barGradient,
  durationMs,
  resetKey,
}: {
  onClose: () => void;
  barGradient: string;
  durationMs: number;
  resetKey: string;
}) {
  const [remaining, setRemaining] = React.useState(Math.ceil(durationMs / 1000));
  React.useEffect(() => {
    setRemaining(Math.ceil(durationMs / 1000));
    const start = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const left = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setRemaining(left);
      if (elapsed >= durationMs) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [durationMs, resetKey]);

  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            key={resetKey}
            className={cn("h-full rounded-full bg-gradient-to-r", barGradient)}
            style={{
              width: "100%",
              animation: `kiosk-countdown ${durationMs}ms linear forwards`,
            }}
          />
        </div>
        <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-ink-subtle">
          Tutup otomatis dalam {remaining}s
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20"
      >
        <X className="h-3.5 w-3.5" />
        Tutup
      </button>
      <style>{`
        @keyframes kiosk-countdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────── Boarding pass modal body (VALID) ─────────────── */

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function BoardingPassModalBody({ last }: { last: LastResult }) {
  const { flight, parsed, faceUrl, passengerName } = last;
  if (!flight || !parsed) return null;
  const meta = getAirlineMeta(flight.airlineCode);
  const enrich = SEED_BOARDING_PASSES.find(
    (s) => s.pnr.toUpperCase() === parsed.pnr.toUpperCase(),
  );
  const cabinClass = enrich?.cabinClass ?? "Economy";
  const isBusiness = cabinClass === "Business";
  const originCity = (enrich?.originCity ?? flight.originAirport).toUpperCase();
  const destCity = (enrich?.destinationCity ?? flight.destinationAirport).toUpperCase();
  const name = (passengerName ?? parsed.passengerName ?? "(nama tidak ada di barcode)").toUpperCase();
  const seatRow = parseInt(parsed.seatNumber, 10) || 0;
  const group =
    isBusiness ? "1" : seatRow <= 10 ? "2" : seatRow <= 20 ? "3" : "4";
  const seq = (
    ((parseInt(parsed.ticketNumber.slice(-3), 10) || 1) % 250) + 1
  )
    .toString()
    .padStart(3, "0");
  const dt = new Date(flight.departureDate);
  const shortDate = isNaN(dt.getTime())
    ? flight.departureDate
    : `${dt.getDate().toString().padStart(2, "0")}${MONTHS[dt.getMonth()]}`;

  const barcodeData = `${parsed.pnr}${parsed.ticketNumber}${parsed.seatNumber}`.replace(/[^A-Za-z0-9]/g, "");
  const barcodeUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(barcodeData)}`;
  const barcodeFallback = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&scale=2&height=12&includetext=false&backgroundcolor=ffffff`;

  const softBg = isBusiness ? "#fef3c7" : softTint(flight.airlineCode);
  const accentText = isBusiness ? "#92400e" : accentTextColor(flight.airlineCode);
  const accentGradient = isBusiness
    ? "from-amber-500 via-yellow-500 to-amber-600"
    : meta.gradient;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/80">
      <div className={cn("h-1.5 w-full bg-gradient-to-r", accentGradient)} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_220px]">
        {/* MAIN */}
        <div className="relative bg-white p-5">
          <Plane className="pointer-events-none absolute right-2 top-1/3 h-48 w-48 -translate-y-1/2 rotate-[18deg] text-slate-50" />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {meta.logoSrc ? (
                <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200">
                  <Image
                    src={meta.logoSrc}
                    alt={meta.name}
                    width={44}
                    height={44}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className={cn(
                  "grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-sm font-bold text-white",
                  meta.gradient,
                )}>
                  {flight.airlineCode}
                </div>
              )}
              <div>
                <p className="text-base font-bold tracking-tight" style={{ color: accentText }}>
                  {meta.name}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Boarding Pass
                </p>
              </div>
            </div>
            <div className="rounded-xl px-3 py-1.5 text-right" style={{ backgroundColor: softBg }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                Group
              </p>
              <p className="text-xl font-bold leading-none" style={{ color: accentText }}>
                {group}
              </p>
            </div>
          </div>

          {/* NAME */}
          <div className="relative mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Name
            </p>
            <p className="mt-1 text-lg font-bold uppercase tracking-tight text-slate-900">
              {name}
            </p>
          </div>

          {/* From / To */}
          <div className="relative mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                From
              </p>
              <p className="mt-1 text-xl font-bold leading-tight text-slate-900">
                {originCity}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {flight.originAirport}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-px w-10 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
              <span
                className="grid h-7 w-7 place-items-center rounded-full text-white"
                style={{ backgroundColor: accentText }}
              >
                <Plane className="h-3.5 w-3.5 rotate-90" />
              </span>
              <div className="h-px w-10 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                To
              </p>
              <p className="mt-1 text-xl font-bold leading-tight text-slate-900">
                {destCity}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {flight.destinationAirport}
              </p>
            </div>
          </div>

          {/* PNR pill */}
          <div className="relative mt-4">
            <span className="inline-flex items-baseline gap-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: softBg }}>
              <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-500">PNR</span>
              <span className="font-mono text-sm font-bold tracking-widest" style={{ color: accentText }}>
                {parsed.pnr}
              </span>
            </span>
          </div>

          {/* Detail grid */}
          <div className="relative mt-4 grid grid-cols-4 gap-x-3 gap-y-3 rounded-xl bg-slate-50/70 p-3.5 ring-1 ring-slate-100">
            <BPCell label="Date" value={shortDate} />
            <BPCell label="Flight" value={flight.flightNumber} />
            <BPCell label="Seat" value={parsed.seatNumber} bold accent={accentText} />
            <BPCell label="Gate" value={flight.gateOrCheckpoint} bold accent={accentText} />
            <BPCell label="Boarding" value={flight.departureTime} />
            <BPCell label="Class" value={isBusiness ? "BUSINESS" : "ECONOMY"} accent={isBusiness ? "#92400e" : undefined} />
            <BPCell label="Seq" value={seq} />
            <BPCell label="Ticket" value={parsed.ticketNumber} mono />
          </div>

          {/* Barcode row */}
          <div className="relative mt-4">
            <div className="grid h-12 place-items-center rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
              <img
                src={barcodeUrl}
                alt="Barcode"
                className="h-10 w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = barcodeFallback;
                }}
              />
            </div>
            <p className="mt-1 text-center font-mono text-[10px] tracking-widest text-slate-500">
              {parsed.pnr} · {parsed.ticketNumber} · {parsed.seatNumber}
            </p>
          </div>
        </div>

        {/* Perforation */}
        <div className="relative hidden md:block">
          <div className="absolute -left-2 top-0 h-4 w-4 -translate-y-1/2 rounded-full bg-slate-100" />
          <div className="absolute -left-2 bottom-0 h-4 w-4 translate-y-1/2 rounded-full bg-slate-100" />
          <div className="mx-auto h-full w-px border-l-2 border-dashed border-slate-300" />
        </div>

        {/* STUB — face photo + key details */}
        <div className="relative overflow-hidden p-4" style={{ backgroundColor: softBg }}>
          <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", meta.gradient)} />
          <Plane className="pointer-events-none absolute -right-4 bottom-4 h-28 w-28 rotate-[18deg] text-white/50" />

          <div className="relative mt-1 flex items-center gap-2">
            {meta.logoSrc ? (
              <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-slate-200">
                <Image
                  src={meta.logoSrc}
                  alt={meta.name}
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white", meta.gradient)}>
                {flight.airlineCode}
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accentText }}>
                {meta.name}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                Boarding Pass
              </p>
            </div>
          </div>

          {/* Face photo */}
          <div className="relative mt-3 flex flex-col items-center">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              Foto Penumpang
            </p>
            <div className="mt-1.5">
              {faceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faceUrl}
                  alt="Foto penumpang"
                  className="h-28 w-28 rounded-xl object-cover ring-2 ring-white shadow-md"
                />
              ) : (
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-xl bg-white/70 text-slate-400 ring-2 ring-white">
                  <ImageIcon className="h-6 w-6" />
                  <span className="mt-1 text-[9px]">no photo</span>
                </div>
              )}
            </div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow">
              <CheckCircle2 className="h-2.5 w-2.5" /> Verified
            </span>
          </div>

          <div className="relative mt-3 grid grid-cols-2 gap-x-2.5 gap-y-2">
            <StubCell label="Seat" value={parsed.seatNumber} accent={accentText} big />
            <StubCell label="Gate" value={flight.gateOrCheckpoint} accent={accentText} big />
            <StubCell label="Flight" value={flight.flightNumber} />
            <StubCell label="Date" value={shortDate} />
            <StubCell label="Boarding" value={flight.departureTime} />
            <StubCell label="Class" value={isBusiness ? "BIZ" : "ECO"} accent={isBusiness ? "#92400e" : undefined} />
          </div>

          <div className="relative mt-3 rounded-md bg-white/70 px-2.5 py-1.5 ring-1 ring-white/80 backdrop-blur">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              PNR · Seq
            </p>
            <p className="font-mono text-xs font-bold tracking-wider" style={{ color: accentText }}>
              {parsed.pnr} · {seq}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          AFVS · Verified · {new Date(last.event.scannedAt).toLocaleTimeString("id-ID")}
        </span>
        <span>
          {flight.originAirport} → {flight.destinationAirport} · {flight.departureDate}
        </span>
      </div>
    </div>
  );
}

function BPCell({
  label,
  value,
  bold,
  mono,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 leading-none",
          bold ? "text-lg font-bold" : "text-sm font-semibold",
          mono ? "font-mono tracking-tight" : "",
        )}
        style={{ color: accent ?? "#0f172a" }}
      >
        {value}
      </p>
    </div>
  );
}

function StubCell({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "font-bold leading-tight",
          big ? "text-sm" : "text-[11px]",
        )}
        style={{ color: accent ?? "#0f172a" }}
      >
        {value}
      </p>
    </div>
  );
}

function softTint(code: string): string {
  switch (code) {
    case "GA": return "#e0f2fe";
    case "JT": case "QZ": case "SJ": case "XT": case "AK": return "#fee2e2";
    case "ID": return "#dbeafe";
    case "QG": case "IP": return "#d1fae5";
    case "IW": return "#ffedd5";
    case "IU": return "#fce7f3";
    case "SAA": return "#e0f2fe";
    case "SQ": return "#fef3c7";
    case "MH": return "#dbeafe";
    default: return "#f1f5f9";
  }
}

function accentTextColor(code: string): string {
  switch (code) {
    case "GA": return "#0369a1";
    case "JT": case "QZ": case "SJ": case "XT": case "AK": return "#b91c1c";
    case "ID": return "#1d4ed8";
    case "QG": case "IP": return "#047857";
    case "IW": return "#c2410c";
    case "IU": return "#be185d";
    case "SAA": return "#0369a1";
    case "SQ": return "#b45309";
    case "MH": return "#1d4ed8";
    default: return "#0f172a";
  }
}

/* ─────────────── Result modal body ─────────────── */

function ResultModalBody({
  last,
  meta,
}: {
  last: LastResult;
  meta: (typeof STATUS_META)[ScanResultStatus];
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-subtle">
          Flight
        </p>
        <p className="mt-0.5 text-4xl font-black tracking-tight text-slate-900 dark:text-ink">
          {last.flightNumber ?? "—"}
        </p>
        {last.route && (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-ink-muted">
            <Plane className="h-3.5 w-3.5 text-blue-500 dark:text-cyan-300" />
            {last.route}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          {last.passengerName && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-hairline-soft">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-ink-subtle">
                Penumpang
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate font-bold text-slate-800 dark:text-ink">
                <User className="h-3.5 w-3.5 text-slate-400 dark:text-ink-subtle" />
                {last.passengerName}
              </p>
            </div>
          )}
          {last.seat && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-hairline-soft">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-ink-subtle">
                Seat
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-base font-bold text-slate-900 dark:text-ink">
                <Armchair className="h-3.5 w-3.5 text-slate-400 dark:text-ink-subtle" />
                {last.seat}
              </p>
            </div>
          )}
        </div>
        <p className="mt-4 text-[10px] text-slate-400 dark:text-ink-subtle">
          {new Date(last.event.scannedAt).toLocaleString("id-ID")}
        </p>
      </div>
      <div className="flex items-start justify-end">
        {last.faceUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={last.faceUrl}
            alt="Foto wajah penumpang"
            className={cn(
              "h-32 w-32 rounded-2xl object-cover ring-2 ring-white shadow-lg",
              meta.glow,
            )}
          />
        ) : (
          <div className="flex h-32 w-32 flex-col items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-white/5 dark:text-ink-subtle dark:ring-hairline">
            <ImageIcon className="h-6 w-6" />
            <span className="mt-1 text-[10px]">no photo</span>
          </div>
        )}
      </div>
    </div>
  );
}
