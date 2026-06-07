"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatTone = "blue" | "cyan" | "emerald" | "amber" | "rose";

interface PremiumStatCardProps {
  label: string;
  value: React.ReactNode;
  helper?: string;
  icon: React.ReactNode;
  tone?: StatTone;
  className?: string;
}

const TONES: Record<
  StatTone,
  {
    bg: string;
    blob: string;
    glowLine: string;
    accentDot: string;
  }
> = {
  blue: {
    bg: "from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6]",
    blob: "bg-cyan-400/45",
    glowLine: "via-cyan-300",
    accentDot: "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]",
  },
  cyan: {
    bg: "from-[#0e7490] via-[#0891b2] to-[#22d3ee]",
    blob: "bg-sky-300/50",
    glowLine: "via-sky-200",
    accentDot: "bg-sky-200 shadow-[0_0_14px_rgba(186,230,253,0.95)]",
  },
  emerald: {
    bg: "from-[#047857] via-[#059669] to-[#34d399]",
    blob: "bg-emerald-300/50",
    glowLine: "via-emerald-200",
    accentDot: "bg-emerald-200 shadow-[0_0_14px_rgba(167,243,208,0.95)]",
  },
  amber: {
    bg: "from-[#b45309] via-[#ea580c] to-[#fb923c]",
    blob: "bg-amber-300/55",
    glowLine: "via-amber-200",
    accentDot: "bg-amber-200 shadow-[0_0_14px_rgba(254,215,170,0.95)]",
  },
  rose: {
    bg: "from-[#9f1239] via-[#be185d] to-[#f472b6]",
    blob: "bg-pink-300/50",
    glowLine: "via-pink-200",
    accentDot: "bg-pink-200 shadow-[0_0_14px_rgba(251,207,232,0.95)]",
  },
};

export function PremiumStatCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
  className,
}: PremiumStatCardProps) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "group relative isolate flex h-[148px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-[0_18px_40px_-20px_rgba(15,42,98,0.55)] ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-18px_rgba(15,42,98,0.75)] hover:ring-white/35",
        t.bg,
        className,
      )}
    >
      {/* Floating glow blob top-right */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 -z-10 h-40 w-40 rounded-full blur-2xl animate-drift",
          t.blob,
        )}
      />

      {/* Diagonal sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(125deg,transparent_35%,rgba(255,255,255,0.14)_50%,transparent_65%)]"
      />

      {/* Tone-specific bottom decoration */}
      <ToneDecoration tone={tone} />

      {/* Header row: label + icon */}
      <div className="relative z-[1] flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
          {label}
        </p>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/30 backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          <span className="text-white drop-shadow-sm">{icon}</span>
        </div>
      </div>

      {/* Big value */}
      <div className="relative z-[1] mt-1.5">
        <p className="text-[44px] font-extrabold leading-none tabular-nums tracking-tight drop-shadow-[0_3px_8px_rgba(0,0,0,0.25)]">
          {value}
        </p>
        {helper && (
          <p className="mt-2 max-w-[60%] truncate text-[12px] font-medium text-white/85">
            {helper}
          </p>
        )}
      </div>

      {/* Bottom glow line — bright at center */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent",
          t.glowLine,
        )}
      />
      {/* Bottom center accent dot */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-[-3px] left-1/2 z-[1] h-1.5 w-1.5 -translate-x-1/2 rounded-full",
          t.accentDot,
        )}
      />

      {/* Shimmer on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"
      />
    </div>
  );
}

/* ============= Per-tone decorative SVGs ============= */

function ToneDecoration({ tone }: { tone: StatTone }) {
  if (tone === "blue") return <PlaneTrailDecoration />;
  if (tone === "cyan") return <DotGridDecoration />;
  if (tone === "emerald") return <BoardingPassDecoration />;
  if (tone === "amber") return <WaveDecoration variant="soft" />;
  return <WaveDecoration variant="sharp" />;
}

function PlaneTrailDecoration() {
  return (
    <>
      {/* Small outline plane — tucked into bottom-right corner only */}
      <svg
        aria-hidden
        viewBox="0 0 100 70"
        preserveAspectRatio="xMaxYMax meet"
        className="pointer-events-none absolute right-0 bottom-0 z-0 h-[46px] w-[72px] opacity-95"
      >
        <defs>
          <radialGradient id="noseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(186,230,253,1)" />
            <stop offset="40%" stopColor="rgba(125,211,252,0.6)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </radialGradient>
          <linearGradient id="planeStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(224,242,254,0.95)" />
            <stop offset="100%" stopColor="rgba(125,211,252,0.7)" />
          </linearGradient>
        </defs>

        {/* soft halo behind plane nose */}
        <circle cx="82" cy="42" r="22" fill="url(#noseGlow)" opacity="0.6" />

        <g
          transform="translate(8 18) rotate(-10)"
          fill="none"
          stroke="url(#planeStroke)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* fuselage */}
          <path d="M6 22 C 22 17, 50 15, 72 18 L 82 20 L 86 22 L 82 24 L 72 25 C 50 27, 22 27, 8 25 Z" />
          {/* main wing */}
          <path d="M34 21 L 22 33 L 42 31 L 54 22 Z" />
          {/* tail wing */}
          <path d="M10 20 L 2 12 L 9 13 L 17 19 Z" />
        </g>

        {/* bright nose glow dot */}
        <circle cx="84" cy="36" r="2" fill="#ffffff">
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="84" cy="36" r="4" fill="rgba(186,230,253,0.8)" opacity="0.5">
          <animate
            attributeName="r"
            values="3.5;6;3.5"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.1;0.6"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* Animated glowing light bar — bottom left */}
      <svg
        aria-hidden
        viewBox="0 0 120 12"
        preserveAspectRatio="xMinYMid meet"
        className="pointer-events-none absolute left-5 bottom-2 z-0 h-2 w-[90px]"
      >
        <defs>
          <linearGradient id="lightBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(186,230,253,1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {/* base dim line */}
        <rect x="0" y="5" width="120" height="1.2" fill="rgba(255,255,255,0.25)" rx="1" />
        {/* moving bright segment */}
        <rect y="4" width="40" height="2" fill="url(#lightBar)" rx="1">
          <animate
            attributeName="x"
            values="-40;120"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </rect>
        {/* leading bright dot */}
        <circle cy="5" r="2.4" fill="#ffffff">
          <animate
            attributeName="cx"
            values="0;120"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.1;0.9;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </>
  );
}

function DotGridDecoration() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 80"
      preserveAspectRatio="xMaxYMax meet"
      className="pointer-events-none absolute right-3 bottom-5 z-0 h-14 w-32 opacity-70"
    >
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 9 }).map((__, col) => (
          <circle
            key={`${row}-${col}`}
            cx={col * 13 + 4}
            cy={row * 14 + 8}
            r={1.5}
            fill="rgba(255,255,255,0.6)"
            opacity={0.4 + ((row + col) % 3) * 0.2}
          />
        )),
      )}
    </svg>
  );
}

function BoardingPassDecoration() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 80"
      preserveAspectRatio="xMaxYMax meet"
      className="pointer-events-none absolute right-3 bottom-3 z-0 h-16 w-32 opacity-85"
    >
      {/* boarding pass silhouette */}
      <g transform="translate(40 12) rotate(-12)">
        {/* main body */}
        <path
          d="M0,8 L0,32 Q0,38 6,38 L88,38 Q94,38 94,32 L94,28 L100,28 L100,16 L94,16 L94,8 Q94,2 88,2 L6,2 Q0,2 0,8 Z"
          fill="rgba(255,255,255,0.22)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
        />
        {/* perforation */}
        <line
          x1="68"
          y1="6"
          x2="68"
          y2="34"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        {/* lines inside */}
        <line
          x1="8"
          y1="12"
          x2="42"
          y2="12"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.4"
        />
        <line
          x1="8"
          y1="18"
          x2="60"
          y2="18"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
        <line
          x1="8"
          y1="24"
          x2="38"
          y2="24"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
        <line
          x1="8"
          y1="30"
          x2="50"
          y2="30"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
        />
        {/* barcode strip */}
        <rect
          x="74"
          y="10"
          width="2"
          height="22"
          fill="rgba(255,255,255,0.7)"
        />
        <rect
          x="78"
          y="10"
          width="1"
          height="22"
          fill="rgba(255,255,255,0.5)"
        />
        <rect
          x="81"
          y="10"
          width="2.5"
          height="22"
          fill="rgba(255,255,255,0.7)"
        />
        <rect
          x="86"
          y="10"
          width="1"
          height="22"
          fill="rgba(255,255,255,0.5)"
        />
      </g>
    </svg>
  );
}

function WaveDecoration({ variant }: { variant: "soft" | "sharp" }) {
  const path =
    variant === "soft"
      ? "M0,40 C25,28 45,52 70,40 C95,28 115,52 140,40 C165,28 185,52 210,40"
      : "M0,40 L20,28 L40,52 L60,28 L80,52 L100,28 L120,52 L140,28 L160,52 L180,28 L200,52 L220,40";
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 60"
      preserveAspectRatio="xMidYMax meet"
      className="pointer-events-none absolute inset-x-0 bottom-2 z-0 h-12 w-full opacity-85"
    >
      {/* glow under wave */}
      <path
        d={path}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.2"
      />
      <path
        d={path}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* highlight dot at center */}
      <circle cx="110" cy="40" r="2.5" fill="#fde68a" opacity="0.95">
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
