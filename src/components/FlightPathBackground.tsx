"use client";

import { motion } from "framer-motion";
import { Plane } from "lucide-react";

/**
 * Latar splash SIPANDAI: gradient navy, dotted grid, glow cyan, jalur pesawat
 * melengkung + titik cahaya berjalan, partikel halus, node maskapai, pesawat
 * kecil melintas, dan siluet bandara (terminal + control tower + runway) yang
 * subtle di bawah. Murni dekoratif → pointer-events-none.
 */

// Kurva jalur pesawat (koordinat viewBox 1440x900).
const FLIGHT_PATHS = [
  "M -80 250 C 320 120 760 300 1520 150",
  "M -80 470 C 360 360 820 560 1520 430",
  "M -80 690 C 260 740 700 520 1520 600",
];

// Partikel dibuat statis (deterministik) supaya tidak ada hydration mismatch.
const PARTICLES = [
  { left: "10%", top: "20%", size: 3, delay: 0.0, dur: 4.6 },
  { left: "22%", top: "34%", size: 2, delay: 0.8, dur: 5.4 },
  { left: "31%", top: "14%", size: 2, delay: 1.4, dur: 4.0 },
  { left: "44%", top: "26%", size: 3, delay: 0.5, dur: 5.8 },
  { left: "57%", top: "12%", size: 2, delay: 1.1, dur: 4.4 },
  { left: "66%", top: "30%", size: 3, delay: 0.3, dur: 6.0 },
  { left: "73%", top: "18%", size: 2, delay: 1.7, dur: 4.8 },
  { left: "82%", top: "36%", size: 2, delay: 0.9, dur: 5.2 },
  { left: "90%", top: "22%", size: 3, delay: 0.2, dur: 5.6 },
  { left: "15%", top: "52%", size: 2, delay: 1.3, dur: 4.2 },
  { left: "38%", top: "58%", size: 2, delay: 0.6, dur: 5.0 },
  { left: "62%", top: "54%", size: 3, delay: 1.0, dur: 6.2 },
  { left: "85%", top: "60%", size: 2, delay: 0.4, dur: 4.6 },
  { left: "50%", top: "44%", size: 2, delay: 1.5, dur: 5.4 },
];

// Node maskapai mengambang — pakai logo asli dari /public/airlines dibungkus
// chip kaca agar tetap elegan & menyatu dengan tema cyan.
const NODES = [
  { src: "/airlines/GA.webp", label: "GA", left: "13%", top: "20%" },
  { src: "/airlines/ID.webp", label: "ID", left: "87%", top: "21%" },
  { src: "/airlines/QG.webp", label: "QG", left: "6%", top: "60%" },
  { src: "/airlines/IW.webp", label: "IW", left: "21%", top: "63%" },
];

export function FlightPathBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Gradient dasar navy → midnight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,#0F2A4D_0%,#071B3A_46%,#020617_100%)]" />

      {/* Dotted grid halus dengan mask radial */}
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(94,234,212,0.16)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:radial-gradient(ellipse_at_center,black_28%,transparent_78%)]" />

      {/* Glow cyan utama di belakang logo */}
      <div className="absolute left-1/2 top-[38%] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.20),transparent_62%)] blur-2xl" />

      {/* Jalur pesawat + titik cahaya berjalan (SMIL agar presisi mengikuti kurva) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <defs>
          <linearGradient id="fpGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
            <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {FLIGHT_PATHS.map((d, i) => (
          <path
            key={`path-${i}`}
            id={`fpath-${i}`}
            d={d}
            stroke="url(#fpGrad)"
            strokeWidth={1.1}
            strokeDasharray="2 11"
            strokeLinecap="round"
            opacity={0.6}
          />
        ))}

        {FLIGHT_PATHS.map((d, i) => (
          <circle
            key={`dot-${i}`}
            r={3.4}
            fill="#5EEAD4"
            opacity={0}
            style={{ filter: "drop-shadow(0 0 6px #5EEAD4)" }}
          >
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur={`${8 + i * 2}s`}
              begin={`${i * 1.3}s`}
              repeatCount="indefinite"
            />
            <animateMotion
              dur={`${8 + i * 2}s`}
              begin={`${i * 1.3}s`}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath xlinkHref={`#fpath-${i}`} />
            </animateMotion>
          </circle>
        ))}
      </svg>

      {/* Partikel cahaya berkedip */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={`particle-${i}`}
          className="absolute rounded-full bg-[#5EEAD4]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            boxShadow: "0 0 8px 1px rgba(94,234,212,0.7)",
          }}
          animate={{ opacity: [0.15, 0.85, 0.15], scale: [1, 1.25, 1] }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Node maskapai mengambang — logo asli dalam chip kaca */}
      {NODES.map((n, i) => (
        <motion.div
          key={`node-${i}`}
          className="absolute flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[rgba(34,211,238,0.3)] bg-[rgba(8,22,47,0.55)] p-2 shadow-[0_0_20px_-4px_rgba(34,211,238,0.55)] ring-1 ring-white/5 backdrop-blur-md"
          style={{ left: n.left, top: n.top }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.92, scale: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { duration: 1, delay: 0.6 + i * 0.15 },
            scale: { duration: 1, delay: 0.6 + i * 0.15 },
            y: { duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={n.src}
            alt={n.label}
            draggable={false}
            className="h-full w-full object-contain drop-shadow-[0_0_6px_rgba(34,211,238,0.35)]"
          />
        </motion.div>
      ))}

      {/* Pesawat kecil melintas pelan */}
      <motion.div
        className="absolute top-[16%] left-0 text-[#5EEAD4]"
        initial={{ x: "-12vw", opacity: 0 }}
        animate={{ x: "112vw", y: -70, opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "linear" }}
      >
        <Plane className="h-6 w-6 -rotate-[28deg] drop-shadow-[0_0_8px_rgba(94,234,212,0.7)]" />
      </motion.div>

      {/* Siluet bandara: terminal, control tower, runway lights */}
      <div className="absolute inset-x-0 bottom-0 h-[34vh] max-h-[300px] min-h-[180px] [mask-image:linear-gradient(to_top,black_55%,transparent)]">
        <svg
          className="absolute bottom-0 h-full w-full"
          viewBox="0 0 1440 240"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          {/* Garis horizon glow */}
          <rect x="0" y="186" width="1440" height="2" fill="#22D3EE" opacity="0.18" />

          {/* Terminal kiri (kanopi melengkung) */}
          <path
            d="M0 240 L0 178 Q 120 150 260 160 Q 360 167 440 158 L 440 240 Z"
            fill="#071B3A"
            opacity="0.92"
          />
          <path
            d="M0 178 Q 120 150 260 160 Q 360 167 440 158"
            stroke="#22D3EE"
            strokeOpacity="0.3"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Control tower */}
          <rect x="300" y="96" width="13" height="96" fill="#0A2444" opacity="0.95" />
          <rect x="290" y="78" width="33" height="26" rx="5" fill="#0F2A4D" opacity="0.95" />
          <rect x="293" y="83" width="27" height="9" rx="2" fill="#22D3EE" opacity="0.35" />
          <line x1="306.5" y1="78" x2="306.5" y2="62" stroke="#22D3EE" strokeOpacity="0.4" strokeWidth="1.2" />
          <circle cx="306.5" cy="60" r="2" fill="#5EEAD4" opacity="0.9" />

          {/* Terminal kanan (kanopi gelombang seperti referensi) */}
          <path
            d="M1440 240 L1440 168 Q 1330 138 1210 158 Q 1120 172 1030 156 Q 980 148 940 162 L 940 240 Z"
            fill="#071B3A"
            opacity="0.92"
          />
          <path
            d="M1440 168 Q 1330 138 1210 158 Q 1120 172 1030 156 Q 980 148 940 162"
            stroke="#22D3EE"
            strokeOpacity="0.3"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Bangunan tengah rendah */}
          <rect x="520" y="172" width="400" height="68" fill="#06182F" opacity="0.85" />

          {/* Jendela glow (deret) */}
          {Array.from({ length: 22 }).map((_, i) => (
            <rect
              key={`win-${i}`}
              x={534 + i * 17}
              y={182 + (i % 3) * 12}
              width="7"
              height="7"
              rx="1"
              fill="#22D3EE"
              opacity={0.12 + (i % 4) * 0.05}
            />
          ))}

          {/* Runway lights */}
          {Array.from({ length: 30 }).map((_, i) => (
            <circle
              key={`rl-${i}`}
              cx={20 + i * 48}
              cy={224}
              r={1.6}
              fill="#5EEAD4"
              opacity={0.25 + ((i * 7) % 5) * 0.12}
              style={{ filter: "drop-shadow(0 0 4px rgba(94,234,212,0.8))" }}
            />
          ))}
        </svg>
      </div>

      {/* Vignette atas agar konten makin pop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent_55%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}
