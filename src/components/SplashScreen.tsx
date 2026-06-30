"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AnimatedLogo } from "./AnimatedLogo";
import { FlightPathBackground } from "./FlightPathBackground";
import { LoadingProgress } from "./LoadingProgress";

export interface SplashScreenProps {
  /** Dipanggil setelah durasi splash habis. Parent yang menutup/redirect. */
  onFinish?: () => void;
  /** Total durasi splash sebelum onFinish (ms). Default 3500. */
  duration?: number;
}

// Variants untuk stagger teks.
const textContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.14, delayChildren: 0.5 },
  },
};
const textItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
  },
};

export function SplashScreen({ onFinish, duration = 3500 }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(() => onFinish?.(), duration);
    return () => clearTimeout(t);
  }, [onFinish, duration]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#020617] text-[#F8FAFC]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(14px)", scale: 1.04 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
    >
      <FlightPathBackground />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <AnimatedLogo />

        <motion.div
          variants={textContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          {/* Wordmark */}
          <motion.h1
            variants={textItem}
            className="mt-4 text-4xl font-extrabold tracking-[0.28em] text-[#F8FAFC] drop-shadow-[0_0_24px_rgba(34,211,238,0.45)] sm:text-5xl md:text-6xl"
          >
            SIPANDAI
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={textItem}
            className="mt-2 text-xs tracking-[0.3em] text-[#CBD5E1] sm:text-sm"
          >
            Sistem Validasi Boarding Pass
          </motion.p>

          {/* Divider glow */}
          <motion.div
            variants={textItem}
            className="mt-5 h-px w-40 bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.7),transparent)]"
          />

          {/* Tagline */}
          <motion.p
            variants={textItem}
            className="mt-5 text-base font-semibold text-[#22D3EE] sm:text-lg"
          >
            Smart Airport Validation System
          </motion.p>

          {/* Deskripsi */}
          <motion.p
            variants={textItem}
            className="mt-2 max-w-md text-sm leading-relaxed text-[#CBD5E1]"
          >
            Memastikan proses validasi boarding pass lebih cepat, aman, dan
            akurat.
          </motion.p>
        </motion.div>

        {/* Loading section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="mt-10 w-[min(440px,calc(100vw-3rem))]"
        >
          <LoadingProgress duration={Math.max(1200, duration - 450)} />
        </motion.div>
      </div>
    </motion.div>
  );
}
