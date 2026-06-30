"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

interface LoadingProgressProps {
  /** Durasi simulasi loading (ms). Sebaiknya sedikit lebih pendek dari splash. */
  duration?: number;
}

const STEPS = [
  { label: "Connecting", at: 22 },
  { label: "Securing", at: 46 },
  { label: "Sync Data", at: 70 },
  { label: "Preparing", at: 99 },
];

export function LoadingProgress({ duration = 5600 }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // smoothstep (easeInOut): naik merata 0→100, mulai & berhenti halus —
      // tidak front-loaded, jadi bar terlihat menempuh seluruh rentang.
      const t = Math.min(1, (now - start) / duration);
      const eased = t * t * (3 - 2 * t);
      setProgress(eased * 100);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  const pct = Math.round(progress);
  const activeIndex = STEPS.findIndex((s) => progress < s.at);

  return (
    <div className="flex w-full flex-col items-center">
      <p className="text-[13px] font-medium tracking-wide text-[#CBD5E1]">
        Initializing Operation Panel...
      </p>

      {/* Progress bar */}
      <div className="mt-3 flex w-full items-center gap-3">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[rgba(148,163,184,0.18)] ring-1 ring-[rgba(34,211,238,0.18)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#3B82F6,#22D3EE,#5EEAD4)] shadow-[0_0_14px_rgba(34,211,238,0.7)] transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
          {/* Shimmer di ujung bar */}
          <motion.div
            className="absolute inset-y-0 w-16 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)]"
            animate={{ x: ["-64px", "320px"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className="w-10 text-right text-sm font-semibold tabular-nums text-[#22D3EE]">
          {pct}%
        </span>
      </div>

      {/* Step status */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {STEPS.map((step, i) => {
          const done = progress >= step.at;
          const active = i === activeIndex;
          return (
            <div key={step.label} className="flex items-center gap-1.5">
              <span className="relative flex h-4 w-4 items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 18,
                      }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-[#22D3EE] text-[#020617] shadow-[0_0_10px_rgba(34,211,238,0.7)]"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </motion.span>
                  ) : active ? (
                    <motion.span
                      key="active"
                      className="h-2.5 w-2.5 rounded-full bg-[#5EEAD4]"
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.6, 1, 0.6],
                      }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[rgba(148,163,184,0.4)]" />
                  )}
                </AnimatePresence>
              </span>
              <span
                className={[
                  "text-xs font-medium transition-colors",
                  done
                    ? "text-[#F8FAFC]"
                    : active
                      ? "text-[#5EEAD4]"
                      : "text-[#64748B]",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
