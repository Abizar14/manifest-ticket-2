"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  IdCard,
  SkipForward,
  Camera,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { FaceCaptureHandle } from "./FaceCaptureCamera";
import { recognizeKtp, initKtpOcr } from "@/lib/ktpOcr";
import { similarity, normalizeName } from "@/lib/nameMatch";
import type { KtpVerification, KtpVerificationStatus } from "@/lib/types";

type Phase =
  | "idle"
  | "preparing"
  | "countdown"
  | "capturing"
  | "ocr"
  | "result";

interface Props {
  open: boolean;
  expectedName: string | null;
  cameraRef: React.RefObject<FaceCaptureHandle | null>;
  autoPassThreshold: number;
  manualThreshold: number;
  onClose: (result: KtpVerification | null) => void;
}

function statusLabel(status: KtpVerificationStatus): string {
  switch (status) {
    case "matched":
      return "COCOK";
    case "manual_pass":
      return "DIVERIFIKASI MANUAL";
    case "manual_reject":
      return "DITOLAK MANUAL";
    case "mismatch":
      return "TIDAK COCOK";
    case "ocr_failed":
      return "OCR GAGAL";
    case "skipped":
      return "DILEWATI";
  }
}

export function KtpVerifyModal({
  open,
  expectedName,
  cameraRef,
  autoPassThreshold,
  manualThreshold,
  onClose,
}: Props) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [ocrName, setOcrName] = React.useState<string | null>(null);
  const [rawText, setRawText] = React.useState<string>("");
  const [sim, setSim] = React.useState<number>(0);
  const [status, setStatus] = React.useState<KtpVerificationStatus | null>(null);
  const [countdown, setCountdown] = React.useState(5);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [sharpness, setSharpness] = React.useState(0);
  const livePreviewRef = React.useRef<HTMLVideoElement>(null);
  const SHARP_THRESHOLD = 90; // > 90 = tajam
  const isSharp = sharpness >= SHARP_THRESHOLD;

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Mirror stream dari FaceCaptureCamera ke video preview di modal supaya
  // operator bisa lihat fokus KTP real-time saat positioning.
  React.useEffect(() => {
    if (!open) return;
    if (phase !== "preparing" && phase !== "countdown" && phase !== "capturing") return;
    const stream = cameraRef.current?.getStream() ?? null;
    const v = livePreviewRef.current;
    if (!stream || !v) return;
    v.srcObject = stream;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
    return () => {
      v.srcObject = null;
    };
  }, [open, phase, cameraRef]);

  // Polling sharpness saat countdown: tampilkan meter live + auto-capture
  // begitu frame tajam (skip sisa countdown).
  React.useEffect(() => {
    if (phase !== "countdown") return;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      const s = cameraRef.current?.measureSharpness?.() ?? 0;
      setSharpness(s);
      if (s >= SHARP_THRESHOLD) {
        cancelled = true;
        window.clearInterval(id);
        doCaptureRef.current();
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, cameraRef]);

  const doCaptureRef = React.useRef<() => Promise<void>>(() => Promise.resolve());
  const startFlowRef = React.useRef<() => Promise<void>>(() => Promise.resolve());

  React.useEffect(() => {
    if (!open) {
      setPhase("idle");
      setOcrName(null);
      setRawText("");
      setSim(0);
      setStatus(null);
      setCountdown(5);
      return;
    }
    let cancelled = false;
    setPhase("preparing");
    initKtpOcr().finally(() => {
      if (cancelled) return;
      startFlowRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const startFlow = React.useCallback(async () => {
    setPhase("countdown");
    setCountdown(5);
    for (let i = 5; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 900));
    }
    await doCaptureRef.current();
  }, []);

  React.useEffect(() => {
    startFlowRef.current = startFlow;
  }, [startFlow]);

  const doCapture = React.useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam || !cam.isReady()) return;
    setPhase("capturing");
    const blob = await cam.captureFrame({
      width: 1280,
      height: 800,
      quality: 0.95,
      burst: 4,
    });
    if (!blob) {
      finish("ocr_failed", null, "", 0);
      return;
    }
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setPhase("ocr");
    try {
      const res = await recognizeKtp(blob);
      const name = res.name;
      setOcrName(name);
      setRawText(res.rawText);
      if (!name) {
        finish("ocr_failed", null, res.rawText, 0);
        return;
      }
      const s = expectedName ? similarity(name, expectedName) : 0;
      setSim(s);
      let nextStatus: KtpVerificationStatus;
      if (s >= autoPassThreshold) nextStatus = "matched";
      else if (s >= manualThreshold) nextStatus = "mismatch"; // tampil prompt manual
      else nextStatus = "mismatch";
      setStatus(nextStatus);
      setPhase("result");
    } catch {
      finish("ocr_failed", null, "", 0);
    }
  }, [cameraRef, expectedName, autoPassThreshold, manualThreshold]);

  React.useEffect(() => {
    doCaptureRef.current = doCapture;
  }, [doCapture]);

  const finish = (
    s: KtpVerificationStatus,
    name: string | null,
    raw: string,
    similarityVal: number,
  ) => {
    setStatus(s);
    setOcrName(name);
    setRawText(raw);
    setSim(similarityVal);
    setPhase("result");
  };

  const accept = () => {
    if (!status) return;
    const finalStatus: KtpVerificationStatus =
      status === "matched" ? "matched" : "manual_pass";
    onClose({
      status: finalStatus,
      ocrName,
      rawText,
      similarity: sim,
      capturedAt: new Date().toISOString(),
    });
  };

  const reject = () => {
    onClose({
      status: "manual_reject",
      ocrName,
      rawText,
      similarity: sim,
      capturedAt: new Date().toISOString(),
    });
  };

  const skip = () => {
    onClose({
      status: "skipped",
      ocrName: null,
      capturedAt: new Date().toISOString(),
    });
  };

  const retry = () => {
    setOcrName(null);
    setRawText("");
    setSim(0);
    setStatus(null);
    startFlow();
  };

  const expectedNorm = expectedName ? normalizeName(expectedName).toUpperCase() : "—";
  const ocrNorm = ocrName ? normalizeName(ocrName).toUpperCase() : "—";

  return (
    <Modal open={open} onClose={skip} title="Verifikasi KTP" size="lg" icon={<IdCard className="h-5 w-5" />}>
      <div className="space-y-4 p-1">
        <div className="flex items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-[13px] text-blue-900 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20">
          <IdCard className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-bold">Arahkan KTP ke kamera</div>
            <p className="mt-0.5 leading-snug">
              Posisikan KTP rata dengan kamera, pastikan terang & tidak buram. Pencocokan
              hanya untuk <b>nama</b>. Foto KTP tidak disimpan.
            </p>
          </div>
        </div>

        {/* Expected name (boarding pass) */}
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-hairline dark:bg-surface">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-subtle">
            Nama di Boarding Pass
          </div>
          <div className="mt-0.5 text-[18px] font-extrabold tracking-tight text-ink">
            {expectedName ?? "—"}
          </div>
        </div>

        {/* Phase content */}
        {phase === "preparing" && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-surface-elev dark:text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat OCR (sekali per sesi)…
          </div>
        )}

        {(phase === "countdown" || phase === "capturing") && (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-blue-300/30">
              <video
                ref={livePreviewRef}
                className="aspect-[16/10] w-full object-cover"
                playsInline
                muted
              />
              {/* KTP frame overlay — ratio ~85:54 (KTP nyata) */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[78%] w-[78%] rounded-xl ring-2 ring-amber-300/80 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]">
                  <span className="absolute -left-1 -top-1 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-amber-300" />
                  <span className="absolute -right-1 -top-1 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-amber-300" />
                  <span className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-amber-300" />
                  <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-amber-300" />
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-950">
                    Sejajarkan KTP di sini
                  </div>
                </div>
              </div>
              {phase === "countdown" && (
                <>
                  <div className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-2xl font-extrabold text-white tabular-nums shadow-lift">
                    {countdown}
                  </div>
                  <div className="absolute left-3 top-3 flex flex-col gap-1">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider ring-1 backdrop-blur",
                        isSharp
                          ? "bg-emerald-500/90 text-white ring-emerald-300/60"
                          : sharpness >= SHARP_THRESHOLD * 0.5
                            ? "bg-amber-500/90 text-amber-950 ring-amber-300/60"
                            : "bg-rose-500/90 text-white ring-rose-300/60",
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {isSharp
                        ? "TAJAM — auto capture"
                        : sharpness >= SHARP_THRESHOLD * 0.5
                          ? "KURANG TAJAM"
                          : "BLUR — geser KTP"}
                    </div>
                    <div className="rounded-md bg-slate-950/70 px-2 py-0.5 text-[9.5px] font-bold text-white ring-1 ring-white/10">
                      Fokus: {Math.round(sharpness)}
                    </div>
                  </div>
                </>
              )}
              {phase === "capturing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                  <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengambil 4 frame… memilih paling tajam
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-3 py-2 text-[12px] text-blue-900 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/30">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span className="font-semibold">
                  Geser KTP maju-mundur (umumnya 30–40 cm utk webcam laptop) sampai badge
                  hijau <b>TAJAM</b> menyala — capture otomatis dimulai.
                </span>
              </div>
            </div>
          </div>
        )}

        {(phase === "capturing" || phase === "ocr") && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-surface-elev dark:text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {phase === "capturing" ? "Mengambil foto KTP…" : "Membaca teks KTP…"}
          </div>
        )}

        {phase === "result" && status && (
          <div className="space-y-3">
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 ring-1",
                status === "matched" &&
                  "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30",
                status === "mismatch" &&
                  sim >= manualThreshold &&
                  "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30",
                status === "mismatch" &&
                  sim < manualThreshold &&
                  "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30",
                status === "ocr_failed" &&
                  "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-surface-elev dark:text-ink-muted dark:ring-hairline",
              )}
            >
              {status === "matched" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : status === "ocr_failed" ? (
                <AlertTriangle className="h-6 w-6" />
              ) : sim >= manualThreshold ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                  {status === "matched"
                    ? "COCOK"
                    : status === "ocr_failed"
                      ? "TIDAK BISA BACA"
                      : sim >= manualThreshold
                        ? "PERIKSA MANUAL"
                        : "TIDAK COCOK"}
                </div>
                {status !== "ocr_failed" && (
                  <div className="text-[15px] font-extrabold tabular-nums">
                    {(sim * 100).toFixed(0)}% kemiripan
                  </div>
                )}
              </div>
            </div>

            {previewUrl && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-hairline dark:bg-surface-elev">
                <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  Frame yang dibaca
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Capture KTP"
                  className="h-32 w-full rounded-xl object-contain"
                />
              </div>
            )}

            {/* Side-by-side names */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-surface-elev">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  Boarding Pass
                </div>
                <div className="mt-0.5 text-[14px] font-bold text-ink">{expectedNorm}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-surface-elev">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                  KTP (OCR)
                </div>
                <div className="mt-0.5 text-[14px] font-bold text-ink">{ocrNorm}</div>
              </div>
            </div>

            {rawText && status === "ocr_failed" && (
              <details className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-ink-muted dark:bg-surface-elev">
                <summary className="cursor-pointer font-semibold">Teks mentah OCR</summary>
                <pre className="mt-1 whitespace-pre-wrap font-mono leading-tight">
                  {rawText}
                </pre>
              </details>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={retry}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-bold text-ink hover:bg-slate-50 dark:border-hairline dark:bg-surface dark:hover:bg-surface-elev"
              >
                Coba lagi
              </button>
              {status !== "matched" && (
                <button
                  type="button"
                  onClick={reject}
                  className="rounded-2xl bg-rose-600 px-3 py-2.5 text-[13px] font-bold text-white hover:bg-rose-700"
                >
                  Tolak
                </button>
              )}
              <button
                type="button"
                onClick={accept}
                className={cn(
                  "rounded-2xl px-3 py-2.5 text-[13px] font-bold text-white",
                  status === "matched"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700",
                )}
              >
                {status === "matched" ? "Lanjutkan" : "Cocok (manual)"}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={skip}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-ink-subtle hover:text-ink"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Lewati verifikasi KTP
        </button>
        <span className="sr-only">{statusLabel("skipped")}</span>
      </div>
    </Modal>
  );
}
