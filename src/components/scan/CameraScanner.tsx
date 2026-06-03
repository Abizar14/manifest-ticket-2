"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  X,
  AlertCircle,
  Loader2,
  Zap,
  ZapOff,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PREFERRED_FORMATS = [
  "pdf417",
  "aztec",
  "qr_code",
  "code_128",
  "code_39",
  "data_matrix",
];

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{
    rawValue: string;
    format: string;
  }[]>;
}

interface BarcodeDetectorCtor {
  new (init?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

interface MediaTrackCapabilitiesWithTorch extends MediaTrackCapabilities {
  torch?: boolean;
}

interface MediaTrackConstraintSetWithTorch extends MediaTrackConstraintSet {
  torch?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onDecode: (raw: string, format: string) => void;
}

export function CameraScanner({ open, onClose, onDecode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [hint, setHint] = useState(
    "Arahkan kamera ke barcode boarding pass…",
  );
  const lastDecodedRef = useRef<{ value: string; at: number }>({
    value: "",
    at: 0,
  });
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const start = async () => {
      setStarting(true);
      setError(null);

      const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
        .BarcodeDetector;
      if (!BD) {
        setSupported(false);
        setStarting(false);
        setError(
          "Browser tidak mendukung BarcodeDetector. Gunakan Chrome di Android atau scanner USB.",
        );
        return;
      }

      try {
        let formats = PREFERRED_FORMATS;
        if (BD.getSupportedFormats) {
          const sup = await BD.getSupportedFormats();
          const filtered = PREFERRED_FORMATS.filter((f) => sup.includes(f));
          if (filtered.length > 0) formats = filtered;
        }
        detectorRef.current = new BD({ formats });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ??
          {}) as MediaTrackCapabilitiesWithTorch;
        setTorchAvailable(Boolean(caps.torch));

        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setSupported(true);
        setStarting(false);
        loop();
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Tidak dapat mengakses kamera.";
        setError(msg);
        setStarting(false);
      }
    };

    const loop = () => {
      const detect = async () => {
        const v = videoRef.current;
        const det = detectorRef.current;
        if (!v || !det || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }
        try {
          const codes = await det.detect(v);
          if (codes && codes.length > 0) {
            const code = codes[0];
            const raw = (code.rawValue ?? "").trim();
            if (raw) {
              const now = Date.now();
              const last = lastDecodedRef.current;
              if (raw !== last.value || now - last.at > 2000) {
                lastDecodedRef.current = { value: raw, at: now };
                setHint(
                  `Terbaca · ${code.format.toUpperCase()} · ${raw.length} char`,
                );
                onDecode(raw, code.format);
              }
            }
          }
        } catch {
          // ignore frame error
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      rafRef.current = requestAnimationFrame(detect);
    };

    start();
    return () => {
      cancelled = true;
      stop();
      setTorchOn(false);
    };
  }, [open, onDecode]);

  const toggleTorch = async () => {
    const s = streamRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [
          { torch: next } as MediaTrackConstraintSetWithTorch,
        ],
      });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm print:hidden">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-950 shadow-lift ring-1 ring-slate-800 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <Camera className="h-3.5 w-3.5" />
            </span>
            Kamera Scanner
          </div>
          <div className="flex items-center gap-1">
            {torchAvailable && (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? "Matikan senter" : "Nyalakan senter"}
                className={cn(
                  "rounded-lg p-1.5 transition",
                  torchOn
                    ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                {torchOn ? (
                  <Zap className="h-4 w-4" />
                ) : (
                  <ZapOff className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video / Reticle */}
        <div className="relative aspect-[4/3] bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
          {/* Reticle overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-44 w-72 rounded-2xl ring-2 ring-emerald-400/60">
              <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl-xl border-l-2 border-t-2 border-emerald-400" />
              <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr-xl border-r-2 border-t-2 border-emerald-400" />
              <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-xl border-b-2 border-l-2 border-emerald-400" />
              <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-xl border-b-2 border-r-2 border-emerald-400" />
              <span className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-emerald-400/70 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse" />
            </div>
          </div>

          {/* Starting / error overlays */}
          {(starting || error || supported === false) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              {error || supported === false ? (
                <div className="mx-4 flex max-w-xs items-start gap-2 rounded-xl bg-rose-950/70 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                  Menyalakan kamera…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="space-y-1 px-4 py-3">
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-slate-300">
            <ScanLine className="h-3 w-3 text-emerald-400" />
            {hint}
          </p>
          <p className="text-center text-[10px] text-slate-500">
            Format: PDF417 (BCBP) · Aztec · QR · Code 128/39
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
