"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Lock,
  Plane,
  Rocket,
  ScanLine,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  title: React.ReactNode;
  description: string;
  stepTitle: string;
  stepBody: string;
  stepIcon: React.ComponentType<{ className?: string }>;
  illustration: React.ReactNode;
}

const SLIDES_KEY = "afvs.onboarded";

export default function OnboardingPage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);

  const slides: Slide[] = [
    {
      title: (
        <>
          Selamat Datang
          <br />
          <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
            di AFVS
          </span>
        </>
      ),
      description:
        "Pelajari cara menggunakan aplikasi dalam beberapa langkah mudah.",
      stepTitle: "Login dengan akun petugas",
      stepBody:
        "Gunakan akun dan kata sandi yang diberikan oleh administrator untuk masuk ke aplikasi dengan aman.",
      stepIcon: Lock,
      illustration: <WelcomeIllustration />,
    },
    {
      title: (
        <>
          Scan{" "}
          <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
            Boarding Pass
          </span>
        </>
      ),
      description: "Pindai boarding pass dengan cepat dan akurat untuk validasi.",
      stepTitle: "Arahkan barcode ke scanner",
      stepBody:
        "Gunakan kamera perangkat atau scanner resmi untuk memindai barcode pada boarding pass.",
      stepIcon: ScanLine,
      illustration: <ScannerIllustration />,
    },
    {
      title: (
        <>
          Pilih Jadwal &{" "}
          <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
            Pantau Status
          </span>
        </>
      ),
      description:
        "Lihat penerbangan, pantau status boarding, dan cek jadwal aktif dengan mudah.",
      stepTitle: "Lihat jadwal penerbangan",
      stepBody:
        "Cek jadwal penerbangan, pantau progress boarding secara real-time, dan lihat status validasi dengan praktis.",
      stepIcon: CalendarClock,
      illustration: <ScheduleIllustration />,
    },
    {
      title: (
        <>
          Siap{" "}
          <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
            Digunakan
          </span>
        </>
      ),
      description:
        "Anda siap memulai menggunakan aplikasi untuk mendukung operasional bandara.",
      stepTitle: "Mulai gunakan aplikasi",
      stepBody:
        "Login, lakukan pemindaian boarding pass, dan pantau semua aktivitas validasi dengan mudah dan real-time.",
      stepIcon: Rocket,
      illustration: <ReadyIllustration />,
    },
  ];

  const isLast = idx === slides.length - 1;
  const current = slides[idx];

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    setDirection(1);
    setIdx((i) => Math.min(slides.length - 1, i + 1));
  };

  const goPrev = () => {
    if (idx === 0) return;
    setDirection(-1);
    setIdx((i) => Math.max(0, i - 1));
  };

  const finish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SLIDES_KEY, "1");
    }
    router.replace("/login?from=onboarding");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const StepIcon = current.stepIcon;

  return (
    <div
      className="relative flex h-[100dvh] w-full items-stretch overflow-hidden bg-slate-950 text-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <OnboardingBackdrop />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col px-5 pb-5 pt-6 sm:max-w-lg sm:px-8 sm:pt-8">
        {/* Header */}
        <div className="flex shrink-0 flex-col items-center text-center animate-fade-up">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-400/20 ring-1 ring-white/25 backdrop-blur-md shadow-[0_0_24px_rgba(56,189,248,0.35)]">
            <ShieldCheck className="h-6 w-6 text-sky-200" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-slate-950" />
          </div>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
            AFVS
          </p>
          <p className="text-[11px] text-white/55">Airport Flight Validation</p>
        </div>

        {/* Title */}
        <div
          key={`title-${idx}`}
          className="mt-4 shrink-0 text-center animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-[32px]">
            {current.title}
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-white/70">
            {current.description}
          </p>
        </div>

        {/* Illustration */}
        <div className="relative my-3 flex min-h-0 flex-1 items-center justify-center">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Sebelumnya"
            disabled={idx === 0}
            className={cn(
              "absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15 hover:text-white",
              idx === 0 && "pointer-events-none opacity-0",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Berikutnya"
            className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div
            key={`illust-${idx}`}
            className="mx-auto flex h-full w-full max-w-[300px] items-center justify-center animate-fade-up"
            style={{
              animationDelay: "120ms",
              animationName:
                direction === 1 ? "slide-in-right" : "slide-in-left",
            }}
          >
            {current.illustration}
          </div>
        </div>

        {/* Step card */}
        <div
          key={`step-${idx}`}
          className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 shadow-[0_18px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-start gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/25 to-cyan-400/15 ring-1 ring-sky-300/40">
              <StepIcon className="h-5 w-5 text-sky-200" />
              <span className="absolute -right-1 -top-1 rounded-full bg-sky-400 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                {idx + 1}/{slides.length}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-white">
                {current.stepTitle}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/70">
                {current.stepBody}
              </p>
            </div>
          </div>
        </div>

        {/* Page dots */}
        <div className="mt-3 flex shrink-0 items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > idx ? 1 : -1);
                setIdx(i);
              }}
              aria-label={`Ke slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === idx
                  ? "w-6 bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.7)]"
                  : "w-1.5 bg-white/25 hover:bg-white/40",
              )}
            />
          ))}
        </div>

        {/* Swipe hint */}
        <p className="mt-1.5 shrink-0 text-center text-[11px] text-white/45">
          Geser untuk lanjut
        </p>

        {/* Bottom actions */}
        <div className="mt-3 grid shrink-0 grid-cols-2 gap-3">
          <button
            type="button"
            onClick={finish}
            className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[13.5px] font-semibold text-white/85 transition hover:bg-white/[0.08] hover:text-white"
          >
            Lewati
          </button>
          <button
            type="button"
            onClick={goNext}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-[13.5px] font-bold text-white shadow-[0_12px_28px_-8px_rgba(56,189,248,0.75)] ring-1 ring-sky-300/50 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-8px_rgba(56,189,248,0.95)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">{isLast ? "Mulai" : "Lanjut"}</span>
            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          0% {
            opacity: 0;
            transform: translateX(36px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-left {
          0% {
            opacity: 0;
            transform: translateX(-36px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function OnboardingBackdrop() {
  return (
    <>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(56,189,248,0.18)_0%,rgba(15,23,42,0)_55%),linear-gradient(180deg,#020617_0%,#0b1a3a_55%,#020617_100%)]" />

      {/* Airport silhouette */}
      <svg
        aria-hidden
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMax meet"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[40vh] w-full opacity-50"
      >
        <defs>
          <linearGradient id="ob-term" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0b1a3a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,180 L40,170 L70,165 L100,168 L130,150 L160,150 L180,140 L240,140 L260,148 L300,148 L320,140 L360,140 L380,150 L400,148 L400,200 L0,200 Z"
          fill="url(#ob-term)"
        />
        <rect x="320" y="100" width="4" height="50" fill="url(#ob-term)" />
        <ellipse cx="322" cy="98" rx="9" ry="5" fill="rgba(96,165,250,0.4)" />
        <circle cx="322" cy="96" r="1.6" fill="#fde68a">
          <animate
            attributeName="opacity"
            values="0.3;1;0.3"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* Stars */}
      {[
        [40, 60],
        [120, 30],
        [200, 80],
        [310, 50],
        [80, 110],
        [350, 100],
        [260, 40],
        [160, 130],
      ].map(([x, y], i) => (
        <span
          key={i}
          aria-hidden
          className="absolute h-1 w-1 rounded-full bg-sky-200/60 animate-pulse"
          style={{
            left: `${x}px`,
            top: `${y}px`,
            animationDelay: `${i * 0.2}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        />
      ))}

      {/* Top right plane */}
      <Plane
        aria-hidden
        className="absolute right-8 top-12 h-5 w-5 -rotate-[20deg] text-sky-200/40 animate-fly-by"
        strokeWidth={1.6}
      />
    </>
  );
}

/* ============== ILLUSTRATIONS ============== */

function WelcomeIllustration() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/20 blur-3xl"
      />
      {/* Orbit dots */}
      <Orbit r={108} dur={9} color="bg-sky-300" />
      <Orbit r={88} dur={6} color="bg-cyan-300" reverse delay={0.4} />

      {/* Centered stage */}
      <div className="relative flex h-[200px] w-[260px] items-center justify-center">
        {/* Boarding pass — anchored slightly left */}
        <div
          className="absolute left-1 top-1/2 w-[150px] -translate-y-1/2 -rotate-[10deg] rounded-2xl border border-white/15 bg-gradient-to-br from-white/95 to-sky-50 p-2.5 text-slate-800 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)]"
          style={{ animation: "float 4s ease-in-out infinite" }}
        >
          <div className="flex items-center justify-between text-[7px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <span>BOARDING PASS</span>
            <Plane className="h-2 w-2" />
          </div>
          <p className="mt-1.5 text-[8.5px] font-semibold text-slate-500">PENUMPANG</p>
          <p className="text-[10.5px] font-bold tracking-tight text-slate-900">
            JOHN DOE
          </p>
          <div className="mt-1.5 flex items-center justify-between rounded-md bg-gradient-to-r from-sky-100 to-cyan-100 px-1.5 py-1">
            <span className="text-[11px] font-extrabold text-slate-800">CGK</span>
            <Plane className="h-2.5 w-2.5 text-sky-600" />
            <span className="text-[11px] font-extrabold text-slate-800">DPS</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full bg-[repeating-linear-gradient(90deg,#0f172a_0,#0f172a_1px,transparent_1px,transparent_3px)]" />
        </div>

        {/* Floating shield token — anchored slightly right */}
        <div
          className="absolute right-1 top-1/2 flex h-[70px] w-[70px] -translate-y-1/2 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-400 to-blue-600 ring-1 ring-sky-300/60 shadow-[0_18px_40px_-8px_rgba(56,189,248,0.7)]"
          style={{ animation: "float 3.5s ease-in-out infinite", animationDelay: "0.3s" }}
        >
          <Ticket className="h-8 w-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
          <span
            aria-hidden
            className="absolute inset-0 rounded-[20px] ring-2 ring-sky-300/50"
            style={{ animation: "ripple 2.6s ease-out infinite" }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-[20px] ring-2 ring-sky-300/40"
            style={{ animation: "ripple 2.6s ease-out infinite", animationDelay: "1.1s" }}
          />
        </div>

        {/* Sparkles */}
        <Sparkle pos="left-2 top-2" delay="0s" />
        <Sparkle pos="right-3 top-4" delay="0.4s" />
        <Sparkle pos="left-4 bottom-3" delay="0.8s" />
        <Sparkle pos="right-2 bottom-5" delay="1.2s" />
      </div>
    </div>
  );
}

function Orbit({
  r,
  dur,
  color,
  reverse,
  delay = 0,
}: {
  r: number;
  dur: number;
  color: string;
  reverse?: boolean;
  delay?: number;
}) {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-1/2"
      style={{
        animation: `spin-slow ${dur}s linear ${delay}s infinite ${reverse ? "reverse" : ""}`,
      }}
    >
      <span
        className={cn(
          "absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
          color,
        )}
        style={{ left: r, top: 0 }}
      />
    </span>
  );
}

function Sparkle({ pos, delay }: { pos: string; delay: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute h-1.5 w-1.5 rounded-full bg-sky-200 shadow-[0_0_8px_rgba(125,211,252,0.9)]",
        pos,
      )}
      style={{ animation: `pulse 2s ease-in-out ${delay} infinite` }}
    />
  );
}

function ScannerIllustration() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/25 blur-3xl"
      />
      <Orbit r={108} dur={8} color="bg-cyan-300" />
      <Orbit r={92} dur={5.5} color="bg-sky-300" reverse delay={0.3} />

      <div className="relative h-[200px] w-[240px]">
        {/* Scanner body */}
        <div
          className="absolute left-1/2 top-1/2 flex h-[130px] w-[170px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 ring-1 ring-sky-400/40 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)]"
          style={{ animation: "float 4s ease-in-out infinite" }}
        >
          <div className="rounded-full bg-emerald-500/90 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white ring-1 ring-emerald-300/60 shadow-[0_4px_12px_rgba(16,185,129,0.5)]">
            VALIDATED
          </div>
          <div className="mt-2 h-6 w-32 rounded-sm bg-[repeating-linear-gradient(90deg,#e2e8f0_0,#e2e8f0_1.5px,transparent_1.5px,transparent_4px)]" />
          <span
            aria-hidden
            className="absolute left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_12px_rgba(125,211,252,0.9)]"
            style={{ animation: "scan-bar 2.2s ease-in-out infinite", top: "30%" }}
          />
        </div>

        {/* Corner targeting brackets */}
        <CornerBracket pos="left-2 top-2" />
        <CornerBracket pos="right-2 top-2" rotate="rotate-90" />
        <CornerBracket pos="left-2 bottom-2" rotate="-rotate-90" />
        <CornerBracket pos="right-2 bottom-2" rotate="rotate-180" />

        {/* Sparkles */}
        <Sparkle pos="left-6 top-4" delay="0s" />
        <Sparkle pos="right-6 bottom-4" delay="0.6s" />
      </div>

      <style jsx>{`
        @keyframes scan-bar {
          0%,
          100% {
            top: 28%;
            opacity: 0.4;
          }
          50% {
            top: 65%;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function CornerBracket({
  pos,
  rotate,
}: {
  pos: string;
  rotate?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute block h-5 w-5 border-l-2 border-t-2 border-sky-300/70",
        pos,
        rotate,
      )}
    />
  );
}

function ScheduleIllustration() {
  const rows = [
    { from: "CGK", to: "DPS", code: "AF1234", status: "Open", tone: "emerald" },
    { from: "SUB", to: "DPS", code: "AF5678", status: "Active", tone: "sky" },
    { from: "CGK", to: "KNO", code: "AF9012", status: "Closed", tone: "slate" },
  ];
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/20 blur-3xl"
      />
      <Orbit r={120} dur={9} color="bg-sky-300" />
      <Orbit r={100} dur={6} color="bg-blue-300" reverse delay={0.5} />

      <div
        className="relative w-[240px] rounded-2xl border border-white/12 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-3 backdrop-blur-md ring-1 ring-sky-400/25 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)]"
        style={{ animation: "float 4.5s ease-in-out infinite" }}
      >
        <div className="flex items-center justify-between text-[10px] font-bold text-white">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3 text-sky-300" />
            Penerbangan Saya
          </span>
          <span className="text-[8px] font-semibold uppercase tracking-wider text-white/50">
            HARI INI
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white/[0.06] px-2 py-1.5 ring-1 ring-white/10"
              style={{
                animation: "fade-up 0.5s ease-out both",
                animationDelay: `${i * 120}ms`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-white">
                  {r.from}
                </span>
                <ArrowRight className="h-2.5 w-2.5 text-sky-300" />
                <span className="text-[11px] font-extrabold text-white">
                  {r.to}
                </span>
              </div>
              <span className="text-[9px] font-mono text-white/55">{r.code}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[8.5px] font-bold ring-1",
                  r.tone === "emerald" &&
                    "bg-emerald-400/20 text-emerald-200 ring-emerald-300/30",
                  r.tone === "sky" &&
                    "bg-sky-400/20 text-sky-200 ring-sky-300/30",
                  r.tone === "slate" &&
                    "bg-slate-400/20 text-slate-200 ring-slate-300/30",
                )}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReadyIllustration() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/25 blur-3xl"
      />
      <Orbit r={120} dur={9} color="bg-emerald-300" />
      <Orbit r={100} dur={6} color="bg-sky-300" reverse delay={0.4} />

      <div className="relative h-[200px] w-[260px]">
        {/* Boarding pass left */}
        <div
          className="absolute left-0 top-[20%] w-[130px] -rotate-[10deg] rounded-2xl border border-white/15 bg-gradient-to-br from-white/95 to-sky-50 p-2.5 text-slate-800 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)]"
          style={{ animation: "float 4s ease-in-out infinite" }}
        >
          <div className="flex items-center justify-between text-[7px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <span>BOARDING PASS</span>
            <Plane className="h-2 w-2" />
          </div>
          <p className="mt-1 text-[8px] font-semibold text-slate-500">PENUMPANG</p>
          <p className="text-[10px] font-bold tracking-tight text-slate-900">
            JOHN DOE
          </p>
          <div className="mt-1.5 flex items-center justify-between rounded-md bg-gradient-to-r from-sky-100 to-cyan-100 px-1.5 py-1">
            <span className="text-[10px] font-extrabold text-slate-800">CGK</span>
            <Plane className="h-2.5 w-2.5 text-sky-600" />
            <span className="text-[10px] font-extrabold text-slate-800">DPS</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full bg-[repeating-linear-gradient(90deg,#0f172a_0,#0f172a_1px,transparent_1px,transparent_3px)]" />
        </div>

        {/* Mini dashboard right */}
        <div
          className="absolute right-0 top-[15%] w-[120px] rotate-[8deg] rounded-2xl border border-white/12 bg-gradient-to-br from-slate-800/95 to-slate-900/95 p-2.5 ring-1 ring-sky-400/30 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)]"
          style={{ animation: "float 4s ease-in-out infinite", animationDelay: "0.4s" }}
        >
          <p className="text-[7.5px] font-bold uppercase tracking-wider text-white/50">
            Total Scan
          </p>
          <p
            className="text-[18px] font-extrabold leading-tight text-white"
            style={{ animation: "count-bump 2.4s ease-in-out infinite" }}
          >
            1.248
          </p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
              style={{ animation: "bar-grow 2.6s ease-in-out infinite" }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[8.5px] font-semibold text-white/70">Valid</span>
            <span
              className="rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[8.5px] font-bold text-emerald-200 ring-1 ring-emerald-300/40"
              style={{ animation: "pulse 1.8s ease-in-out infinite" }}
            >
              +28
            </span>
          </div>
        </div>

        {/* Center floating rocket */}
        <div
          className="absolute left-1/2 bottom-1 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 ring-1 ring-emerald-300/60 shadow-[0_18px_36px_-8px_rgba(16,185,129,0.65)]"
          style={{ animation: "rocket-bob 2.6s ease-in-out infinite" }}
        >
          <Rocket className="h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl ring-2 ring-emerald-300/50"
            style={{ animation: "ripple 2.4s ease-out infinite" }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl ring-2 ring-emerald-300/40"
            style={{ animation: "ripple 2.4s ease-out 1.1s infinite" }}
          />
          {/* Rocket trail */}
          <span
            aria-hidden
            className="absolute -bottom-3 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-300/80 to-transparent"
            style={{ animation: "rocket-trail 1.2s ease-in-out infinite" }}
          />
        </div>

        {/* Sparkles all around */}
        <Sparkle pos="left-4 top-1" delay="0s" />
        <Sparkle pos="right-6 top-2" delay="0.4s" />
        <Sparkle pos="left-8 bottom-8" delay="0.8s" />
        <Sparkle pos="right-3 bottom-10" delay="1.2s" />
        <Sparkle pos="left-1/2 top-4" delay="1.6s" />
      </div>

      <style jsx>{`
        @keyframes count-bump {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes bar-grow {
          0%, 100% { width: 70%; }
          50% { width: 85%; }
        }
        @keyframes rocket-bob {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -8px); }
        }
        @keyframes rocket-trail {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) scaleY(0.6); }
          50% { opacity: 1; transform: translateX(-50%) scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
