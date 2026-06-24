"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Plane,
  ScanLine,
  Sparkles,
} from "lucide-react";

interface AirportHeroProps {
  userName: string;
  flightsToday: number;
  scansToday: number;
  validToday: number;
}

export function AirportHero({
  userName,
  flightsToday,
  scansToday,
  validToday,
}: AirportHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] shadow-[0_24px_60px_-20px_rgba(15,42,98,0.45)] ring-1 ring-slate-200/70 dark:ring-sky-400/20">
      {/* Photo background — always full color, no washed-out overlay */}
      <img
        src="/asset-cards/card-bg-dashboard.webp"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 h-full w-full object-cover object-center"
      />

      {/* Subtle left-side gradient for text legibility — same in both modes since photo is dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(5,12,30,0.6)_0%,rgba(5,12,30,0.35)_35%,rgba(5,12,30,0.1)_60%,rgba(5,12,30,0)_80%)]"
      />

      {/* Bottom vignette for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-36 bg-[linear-gradient(180deg,transparent_0%,rgba(5,12,30,0.45)_100%)]"
      />

      {/* Moving plane fly-by */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[18%] left-0 animate-fly-by">
          <Plane
            className="h-6 w-6 -rotate-[18deg] text-white/70 drop-shadow-[0_0_8px_rgba(186,230,253,0.8)]"
            strokeWidth={1.6}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-[1] flex min-h-[240px] flex-col gap-7 px-7 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white ring-1 ring-white/30 shadow-[0_6px_18px_-4px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Dashboard Operasional
          </span>

          <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_4px_16px_rgba(2,8,30,0.5)] sm:text-[34px] lg:text-[40px]">
            Selamat datang kembali,
            <br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-transparent">
              {userName}!
            </span>{" "}
            <span className="inline-block animate-float">👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-white/85 drop-shadow-[0_1px_4px_rgba(2,8,30,0.5)] sm:text-[15px]">
            Ringkasan aktivitas validasi boarding pass hari ini.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <HeroChip
              icon={<Plane className="h-3 w-3" />}
              label="Flight hari ini"
              value={flightsToday}
            />
            <HeroChip
              icon={<ScanLine className="h-3 w-3" />}
              label="Scan hari ini"
              value={scansToday}
            />
            <HeroChip
              icon={<CheckCircle2 className="h-3 w-3" />}
              label="Valid"
              value={validToday}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/scan"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-sky-400/15 px-6 py-3 text-sm font-bold text-sky-100 shadow-[0_0_32px_rgba(56,189,248,0.5)] ring-1 ring-sky-400/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-400/25 hover:shadow-[0_0_40px_rgba(56,189,248,0.7)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
            <span className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40">
              <ScanLine className="h-3.5 w-3.5" />
            </span>
            <span className="relative">Mulai Scan</span>
            <span
              aria-hidden
              className="relative ml-0.5 h-2 w-2 animate-pulse-glow rounded-full bg-sky-300"
            />
          </Link>
          <Link
            href="/flights"
            className="group inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/30 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:ring-white/50"
          >
            Jadwal Penerbangan
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-[12px] font-semibold text-white ring-1 ring-white/25 shadow-sm backdrop-blur-md transition hover:bg-white/20">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white/95">
        {icon}
      </span>
      <span className="text-white/80">{label}</span>
      <span className="rounded-full bg-white/25 px-1.5 text-[12px] font-extrabold tabular-nums text-white shadow-inner">
        {value}
      </span>
    </span>
  );
}
