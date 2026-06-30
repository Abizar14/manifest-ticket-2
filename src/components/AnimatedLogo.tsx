"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

/**
 * Logo SIPANDAI: shield/check di dalam badge glass dengan glow cyan, dua orbit
 * ring berputar (efek Saturn), pulse ring, floating halus, dan shimmer scan.
 */
export function AnimatedLogo() {
  return (
    <motion.div
      className="relative flex h-56 w-56 items-center justify-center"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {/* Glow latar */}
      <div className="absolute h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.35),transparent_64%)] blur-xl" />

      {/* Orbit ring elips (Saturn) — luar */}
      <div className="absolute [perspective:700px]">
        <div className="[transform:rotateX(72deg)]">
          <motion.div
            className="h-56 w-56 rounded-full border border-[rgba(34,211,238,0.22)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22D3EE] shadow-[0_0_12px_3px_rgba(34,211,238,0.85)]" />
          </motion.div>
        </div>
      </div>

      {/* Orbit ring elips — dalam, arah berlawanan */}
      <div className="absolute [perspective:700px]">
        <div className="[transform:rotateX(70deg)_rotateZ(28deg)]">
          <motion.div
            className="h-44 w-44 rounded-full border border-[rgba(59,130,246,0.20)]"
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5EEAD4] shadow-[0_0_10px_2px_rgba(94,234,212,0.8)]" />
          </motion.div>
        </div>
      </div>

      {/* Badge inti */}
      <motion.div
        className="relative flex h-28 w-28 items-center justify-center rounded-[1.75rem] bg-[linear-gradient(160deg,#0F2A4D,#071B3A)] ring-1 ring-[rgba(34,211,238,0.4)] shadow-[0_0_55px_-6px_rgba(34,211,238,0.6)]"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glow internal */}
        <div className="absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(circle_at_50%_28%,rgba(34,211,238,0.28),transparent_70%)]" />

        {/* Shimmer scan tipis */}
        <div className="absolute inset-0 overflow-hidden rounded-[1.75rem]">
          <motion.div
            className="absolute -inset-y-4 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(94,234,212,0.35),transparent)]"
            animate={{ x: ["-160%", "260%"] }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 1.2,
            }}
          />
        </div>

        <ShieldCheck
          className="relative h-14 w-14 text-[#22D3EE] drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]"
          strokeWidth={1.6}
        />

        {/* Pulse ring */}
        <motion.span
          className="absolute inset-0 rounded-[1.75rem] ring-2 ring-[#22D3EE]"
          animate={{ opacity: [0.5, 0], scale: [1, 1.28] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
