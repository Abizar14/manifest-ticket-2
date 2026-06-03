"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getAirlineMeta } from "@/lib/airlines";

type Size = "xs" | "sm" | "md" | "lg";
type Mode = "auto" | "rich" | "chip";

interface Props {
  code: string | null | undefined;
  size?: Size;
  mode?: Mode;
  showName?: boolean;
  className?: string;
}

const SIZE_BOX: Record<Size, string> = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

const SIZE_IMG: Record<Size, string> = {
  xs: "h-6 w-6 p-0.5",
  sm: "h-8 w-8 p-1",
  md: "h-10 w-10 p-1.5",
  lg: "h-12 w-12 p-1.5",
};

function useDisplayMode(): "standalone" | "browser" {
  const [mode, setMode] = useState<"standalone" | "browser">("browser");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(display-mode: standalone)");
    const apply = () => {
      const iosStandalone =
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true;
      setMode(mq.matches || iosStandalone ? "standalone" : "browser");
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return mode;
}

export function AirlineLogo({
  code,
  size = "md",
  mode = "auto",
  showName = false,
  className,
}: Props) {
  const displayMode = useDisplayMode();
  const meta = getAirlineMeta(code);
  const effective =
    mode === "auto" ? (displayMode === "browser" ? "rich" : "chip") : mode;
  const [imgFailed, setImgFailed] = useState(false);
  const hasLogo = !!meta.logoSrc && !imgFailed;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {hasLogo && effective === "rich" ? (
        <ImageMark
          size={size}
          meta={meta}
          onError={() => setImgFailed(true)}
        />
      ) : effective === "rich" ? (
        <RichMark size={size} meta={meta} />
      ) : (
        <ChipMark size={size} meta={meta} />
      )}
      {showName && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-xs font-semibold text-slate-800">
            {meta.name}
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {meta.code}
          </span>
        </span>
      )}
    </span>
  );
}

function ImageMark({
  size,
  meta,
  onError,
}: {
  size: Size;
  meta: ReturnType<typeof getAirlineMeta>;
  onError: () => void;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200",
        SIZE_IMG[size],
      )}
      aria-label={`${meta.name} (${meta.code})`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meta.logoSrc}
        alt={meta.name}
        onError={onError}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}

function RichMark({
  size,
  meta,
}: {
  size: Size;
  meta: ReturnType<typeof getAirlineMeta>;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br font-extrabold tracking-tight shadow-sm ring-1 ring-inset",
        SIZE_BOX[size],
        meta.gradient,
        meta.text,
        meta.ring,
      )}
      aria-label={`${meta.name} (${meta.code})`}
    >
      <span className="pointer-events-none absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/25 blur-[2px]" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/15 to-transparent" />
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute -left-1 -bottom-1 h-6 w-6 opacity-25"
      >
        <path
          d="M2 14 L22 6 L18 12 L22 14 L4 18 Z"
          fill="currentColor"
        />
      </svg>
      <span className="relative z-[1] drop-shadow-sm">{meta.code}</span>
    </span>
  );
}

function ChipMark({
  size,
  meta,
}: {
  size: Size;
  meta: ReturnType<typeof getAirlineMeta>;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold tracking-tight ring-1 ring-inset",
        SIZE_BOX[size],
        meta.solid,
        meta.text,
        meta.ring,
      )}
      aria-label={`${meta.name} (${meta.code})`}
    >
      {meta.code}
    </span>
  );
}
