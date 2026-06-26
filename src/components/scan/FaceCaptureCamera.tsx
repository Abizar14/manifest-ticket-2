"use client";

import * as React from "react";
import {
  Camera,
  AlertCircle,
  Loader2,
  CircleUserRound,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FaceState =
  | "unknown"
  | "no_face"
  | "multiple"
  | "too_far"
  | "off_center"
  | "ok";

export type FaceDetectionMode = "native" | "heuristic" | "none";

export interface FaceCaptureHandle {
  /**
   * Snapshot frame video saat ini → JPEG Blob (target 320x240 default).
   * Return null jika stream belum ready atau gagal encode.
   *
   * Pakai `burst` > 1 untuk ambil N frame berurutan dan pilih yang paling
   * tajam (Laplacian variance) — berguna untuk OCR KTP supaya hasil tidak
   * blur. Default burst = 1.
   */
  captureFrame: (opts?: {
    width?: number;
    height?: number;
    quality?: number;
    burst?: number;
  }) => Promise<Blob | null>;
  /** Akses langsung ke video element (untuk live preview di komponen lain). */
  getVideoElement: () => HTMLVideoElement | null;
  /** Stream MediaStream (untuk preview di video element lain). */
  getStream: () => MediaStream | null;
  /**
   * Ukur ketajaman frame saat ini (Laplacian variance pada grayscale).
   * Nilai lebih besar = lebih tajam. Threshold praktis: > 80 = tajam, < 30 = blur.
   *
   * `opts.region` (relatif 0..1) membatasi pengukuran ke sub-area tertentu —
   * mis. kotak NAMA pada KTP — supaya fokus dinilai TEPAT di area yang akan
   * dibaca OCR, bukan tengah frame. `opts.aspect` = rasio frame capture
   * (captureFrame center-crop ke aspect ini) supaya region presisi sama.
   */
  measureSharpness: (opts?: {
    region?: { x: number; y: number; w: number; h: number };
    aspect?: number;
  }) => number;
  isReady: () => boolean;
  getFaceState: () => FaceState;
  isFaceDetectionSupported: () => boolean;
  getDetectionMode: () => FaceDetectionMode;
}

interface Props {
  deviceId?: string | null;
  /** mode "user" (default, kamera depan) atau "environment" */
  facingMode?: "user" | "environment";
  onReady?: () => void;
  onError?: (message: string) => void;
  className?: string;
  /** menampilkan device-picker mini saat tersedia >1 webcam */
  showDevicePicker?: boolean;
  onDeviceChange?: (deviceId: string) => void;
  /** "default": status pill + face oval + live badge bawaan.
   *  "minimal": tanpa overlay bawaan — parent menambahkan HUD sendiri. */
  hudVariant?: "default" | "minimal";
  /** Balik preview horizontal (efek cermin) agar terasa natural saat orang
   *  menghadap kamera. HANYA tampilan; capture canvas tetap baca video mentah,
   *  jadi foto tersimpan tidak ikut terbalik. */
  mirror?: boolean;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

/**
 * Webcam preview persisten. Stream di-start sekali pada mount dan tidak
 * di-stop per scan supaya capture instant (tanpa latency 200-500ms
 * getUserMedia re-init).
 */
export const FaceCaptureCamera = React.forwardRef<FaceCaptureHandle, Props>(
  function FaceCaptureCamera(
    {
      deviceId,
      facingMode = "user",
      onReady,
      onError,
      className,
      showDevicePicker = false,
      onDeviceChange,
      hudVariant = "default",
      mirror = false,
    },
    ref,
  ) {
    const minimal = hudVariant === "minimal";
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const [state, setState] = React.useState<
      "starting" | "ready" | "error" | "denied"
    >("starting");
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [devices, setDevices] = React.useState<VideoDevice[]>([]);
    const [pulse, setPulse] = React.useState(0);
    const faceStateRef = React.useRef<FaceState>("unknown");
    const faceDetectorSupportedRef = React.useRef<boolean>(false);
    const detectionModeRef = React.useRef<FaceDetectionMode>("none");

    const onReadyRef = React.useRef(onReady);
    const onErrorRef = React.useRef(onError);
    React.useEffect(() => {
      onReadyRef.current = onReady;
      onErrorRef.current = onError;
    }, [onReady, onError]);

    React.useImperativeHandle(
      ref,
      () => ({
        isReady: () => state === "ready",
        getFaceState: () => faceStateRef.current,
        isFaceDetectionSupported: () => faceDetectorSupportedRef.current,
        getDetectionMode: () => detectionModeRef.current,
        getVideoElement: () => videoRef.current,
        getStream: () => streamRef.current,
        measureSharpness: (opts) => {
          const v = videoRef.current;
          if (!v || v.readyState < 2) return 0;
          const W = 240;
          const H = 160;
          let canvas = canvasRef.current;
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvasRef.current = canvas;
          }
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return 0;
          const vw = v.videoWidth || W;
          const vh = v.videoHeight || H;
          let sx: number;
          let sy: number;
          let sw: number;
          let sh: number;
          const region = opts?.region;
          if (region) {
            // Ukur ketajaman TEPAT pada area yang akan dibaca OCR (kotak nama
            // KTP), bukan tengah frame. Cegah capture saat tengah kartu sudah
            // fokus tapi nama-nya masih buram.
            // 1) tiru center-crop ke aspect capture (captureFrame pakai aspect
            //    yang sama), supaya koordinat region klop dengan hasil OCR.
            const aspect = opts?.aspect ?? vw / vh;
            let cw = vw;
            let ch = vw / aspect;
            if (ch > vh) {
              ch = vh;
              cw = vh * aspect;
            }
            const cx = (vw - cw) / 2;
            const cy = (vh - ch) / 2;
            // 2) ambil sub-region nama relatif terhadap frame ter-crop.
            sx = cx + region.x * cw;
            sy = cy + region.y * ch;
            sw = Math.max(1, region.w * cw);
            sh = Math.max(1, region.h * ch);
          } else {
            const scale = Math.max(W / vw, H / vh);
            sw = W / scale;
            sh = H / scale;
            sx = (vw - sw) / 2;
            sy = (vh - sh) / 2;
          }
          ctx.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
          const data = ctx.getImageData(0, 0, W, H).data;
          const gray = new Float32Array(W * H);
          for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          // Laplacian 3x3 variance
          let sum = 0;
          let sumSq = 0;
          let n = 0;
          for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              const i = y * W + x;
              const lap =
                4 * gray[i] -
                gray[i - 1] -
                gray[i + 1] -
                gray[i - W] -
                gray[i + W];
              sum += lap;
              sumSq += lap * lap;
              n++;
            }
          }
          if (n === 0) return 0;
          const mean = sum / n;
          return sumSq / n - mean * mean;
        },
        captureFrame: async (opts) => {
          const v = videoRef.current;
          if (!v || v.readyState < 2) return null;
          const w = opts?.width ?? 320;
          const h = opts?.height ?? 240;
          const q = opts?.quality ?? 0.82;
          const burst = Math.max(1, Math.min(opts?.burst ?? 1, 6));
          let canvas = canvasRef.current;
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvasRef.current = canvas;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          const vw = v.videoWidth || w;
          const vh = v.videoHeight || h;
          const scale = Math.max(w / vw, h / vh);
          const sw = w / scale;
          const sh = h / scale;
          const sx = (vw - sw) / 2;
          const sy = (vh - sh) / 2;

          // visual feedback pulse
          setPulse((p) => p + 1);

          const blobFromCanvas = () =>
            new Promise<Blob | null>((resolve) => {
              canvas!.toBlob((b) => resolve(b ?? null), "image/jpeg", q);
            });

          if (burst === 1) {
            ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
            return blobFromCanvas();
          }

          // Multi-shot: ambil N frame berjarak ~80ms, pilih paling tajam.
          // Sharpness = Laplacian variance pada grayscale (sampling ringan).
          const sampleSharpness = (): number => {
            const data = ctx.getImageData(0, 0, w, h).data;
            // downsample stride supaya cepat
            const stride = 4 * 3; // tiap 3 px
            const gray = new Float32Array(Math.ceil((w * h) / 3));
            let gi = 0;
            for (let i = 0; i < data.length; i += stride) {
              gray[gi++] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            // variance dari diff antar tetangga (proxy Laplacian)
            let sum = 0;
            let sumSq = 0;
            let n = 0;
            for (let i = 1; i < gi - 1; i++) {
              const d = gray[i + 1] - 2 * gray[i] + gray[i - 1];
              sum += d;
              sumSq += d * d;
              n++;
            }
            if (n === 0) return 0;
            const mean = sum / n;
            return sumSq / n - mean * mean;
          };

          let bestBlob: Blob | null = null;
          let bestScore = -1;
          for (let i = 0; i < burst; i++) {
            ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
            const score = sampleSharpness();
            if (score > bestScore) {
              const b = await blobFromCanvas();
              if (b) {
                bestBlob = b;
                bestScore = score;
              }
            }
            if (i < burst - 1) await new Promise((r) => setTimeout(r, 80));
          }
          return bestBlob;
        },
      }),
      [state],
    );

    React.useEffect(() => {
      let cancelled = false;

      const start = async () => {
        setState("starting");
        setErrorMsg(null);
        if (
          typeof navigator === "undefined" ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          const msg = "Browser tidak mendukung akses kamera.";
          setErrorMsg(msg);
          setState("error");
          onErrorRef.current?.(msg);
          return;
        }

        try {
          // pakai exact supaya kalau device tidak valid kita dapat error jelas,
          // bukan silent fallback ke kamera lain (membingungkan user).
          const constraints: MediaStreamConstraints = {
            video: deviceId
              ? {
                  deviceId: { exact: deviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : {
                  facingMode: { ideal: facingMode },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
            audio: false,
          };
          // stop stream lama dulu supaya device tidak bentrok saat switch
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
          // beri jeda 1 tick supaya OS sempat release device
          await new Promise((r) => setTimeout(r, 50));

          // Webcam murah (UVC) seperti Kisonli HD2K lambat melepas device
          // setelah handle sebelumnya di-stop (StrictMode remount di dev, atau
          // saat ganti device). getUserMedia bisa gagal dengan
          // "NotReadableError: Could not start video source" padahal device
          // sebenarnya bebas beberapa ratus ms kemudian. Retry singkat dengan
          // backoff mengatasi race ini.
          const getStreamWithRetry = async (
            c: MediaStreamConstraints,
            retries = 3,
          ): Promise<MediaStream> => {
            let lastErr: unknown;
            for (let attempt = 0; attempt <= retries; attempt++) {
              if (cancelled) throw new DOMException("cancelled", "AbortError");
              try {
                return await navigator.mediaDevices.getUserMedia(c);
              } catch (err) {
                lastErr = err;
                const name = (err as DOMException)?.name;
                // hanya retry untuk error "device sibuk sesaat"
                if (name !== "NotReadableError" && name !== "AbortError") {
                  throw err;
                }
                if (attempt === retries) break;
                await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
              }
            }
            throw lastErr;
          };

          // Rantai fallback bertingkat:
          //   1. device pilihan + 720p ideal
          //   2. kamera default 720p (kalau device pilihan gagal)
          //   3. { video: true } — biarkan browser pilih mode native webcam.
          // Webcam murah (Kisonli HD2K) sering gagal "Could not start video
          // source" di resolusi tertentu tapi jalan dengan video:true.
          const attempts: MediaStreamConstraints[] = [constraints];
          if (deviceId) {
            attempts.push({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
          }
          attempts.push({ video: true, audio: false });

          let stream: MediaStream | null = null;
          let lastErr: unknown = null;
          for (let i = 0; i < attempts.length; i++) {
            try {
              stream = await getStreamWithRetry(attempts[i]);
              break;
            } catch (err) {
              lastErr = err;
              const name = (err as DOMException)?.name;
              // izin ditolak / dibatalkan → tidak ada gunanya fallback
              if (
                name === "NotAllowedError" ||
                name === "PermissionDeniedError" ||
                name === "AbortError"
              ) {
                throw err;
              }
              // attempt terakhir tetap gagal → lempar ke handler error
              if (i === attempts.length - 1) throw err;
            }
          }
          if (!stream) throw lastErr;
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          // coba aktifkan continuous autofocus + exposure kalau hardware mendukung.
          // Banyak webcam laptop tidak punya AF, tapi USB webcam kelas atas
          // (Logitech BRIO, dll) bisa fokus lebih tajam dengan ini.
          try {
            const track = stream.getVideoTracks()[0];
            const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
              focusMode?: string[];
              exposureMode?: string[];
              whiteBalanceMode?: string[];
            };
            const advanced: MediaTrackConstraintSet[] = [];
            if (caps.focusMode?.includes("continuous")) {
              advanced.push({ focusMode: "continuous" } as MediaTrackConstraintSet);
            }
            if (caps.exposureMode?.includes("continuous")) {
              advanced.push({ exposureMode: "continuous" } as MediaTrackConstraintSet);
            }
            if (caps.whiteBalanceMode?.includes("continuous")) {
              advanced.push({ whiteBalanceMode: "continuous" } as MediaTrackConstraintSet);
            }
            if (advanced.length > 0) {
              await track.applyConstraints({ advanced });
            }
          } catch {
            /* hardware tidak mendukung — biarkan default */
          }
          const v = videoRef.current;
          if (v) {
            try {
              v.pause();
            } catch {
              /* ignore */
            }
            v.srcObject = stream;
            v.muted = true;
            v.playsInline = true;
            // tunggu metadata baru play, supaya video tidak stuck frame hitam
            await new Promise<void>((resolve) => {
              let settled = false;
              const finish = () => {
                if (settled) return;
                settled = true;
                v.removeEventListener("loadedmetadata", finish);
                v.removeEventListener("loadeddata", finish);
                resolve();
              };
              if (v.readyState >= 2) {
                finish();
                return;
              }
              v.addEventListener("loadedmetadata", finish);
              v.addEventListener("loadeddata", finish);
              setTimeout(finish, 2500);
            });
            if (cancelled) return;
            // retry play sampai 3x supaya autoplay race teratasi
            for (let i = 0; i < 3; i++) {
              try {
                await v.play();
                break;
              } catch {
                await new Promise((r) => setTimeout(r, 120));
              }
            }
          }
          setState("ready");
          onReadyRef.current?.();

          // enumerate devices setelah permission granted (label baru tersedia)
          try {
            const list = await navigator.mediaDevices.enumerateDevices();
            const cams = list
              .filter((d) => d.kind === "videoinput")
              .map((d) => ({
                deviceId: d.deviceId,
                label: d.label || `Kamera ${d.deviceId.slice(0, 6)}`,
              }));
            setDevices(cams);
          } catch {
            /* ignore */
          }
        } catch (e) {
          if (cancelled) return;
          const err = e as DOMException;
          const denied =
            err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
          const msg = denied
            ? "Izin kamera ditolak. Aktifkan izin di pengaturan browser."
            : err?.message || "Tidak dapat mengakses webcam.";
          setErrorMsg(msg);
          setState(denied ? "denied" : "error");
          onErrorRef.current?.(msg);
          // Tetap enumerasi device walau gagal — supaya dropdown tidak mentok
          // di "Memuat daftar webcam…" dan user bisa pilih webcam lain manual.
          try {
            const list = await navigator.mediaDevices.enumerateDevices();
            const cams = list
              .filter((d) => d.kind === "videoinput")
              .map((d) => ({
                deviceId: d.deviceId,
                label: d.label || `Kamera ${d.deviceId.slice(0, 6)}`,
              }));
            if (!cancelled) setDevices(cams);
          } catch {
            /* ignore */
          }
        }
      };

      start();

      return () => {
        cancelled = true;
        const s = streamRef.current;
        if (s) {
          s.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const v = videoRef.current;
        if (v) v.srcObject = null;
      };
    }, [deviceId, facingMode]);

    // Face detection loop. Try native FaceDetector first; fall back to a
    // skin-tone heuristic (YCbCr) so detection still works in Chrome desktop
    // where window.FaceDetector isn't exposed without a flag.
    React.useEffect(() => {
      if (state !== "ready") return;
      if (typeof window === "undefined") return;

      const FD = (window as unknown as {
        FaceDetector?: new (opts?: unknown) => {
          detect: (
            src: CanvasImageSource,
          ) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
        };
      }).FaceDetector;

      faceDetectorSupportedRef.current = true; // always true now (heuristic works everywhere)

      const nativeDetector = FD ? new FD({ fastMode: true, maxDetectedFaces: 3 }) : null;
      detectionModeRef.current = nativeDetector ? "native" : "heuristic";
      const heuristicCanvas = document.createElement("canvas");
      heuristicCanvas.width = 160;
      heuristicCanvas.height = 120;

      let stopped = false;
      let timer: number | null = null;

      const detectNative = async (v: HTMLVideoElement): Promise<FaceState> => {
        if (!nativeDetector) return "unknown";
        const faces = await nativeDetector.detect(v);
        if (faces.length === 0) return "no_face";
        if (faces.length > 1) return "multiple";
        const b = faces[0].boundingBox;
        const fw = v.videoWidth;
        const fh = v.videoHeight;
        const widthRatio = b.width / fw;
        const heightRatio = b.height / fh;
        const cx = (b.x + b.width / 2) / fw;
        const cy = (b.y + b.height / 2) / fh;
        if (widthRatio < 0.18 || heightRatio < 0.22) return "too_far";
        if (Math.abs(cx - 0.5) > 0.22 || Math.abs(cy - 0.5) > 0.25)
          return "off_center";
        return "ok";
      };

      const detectHeuristic = (v: HTMLVideoElement): FaceState => {
        const ctx = heuristicCanvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return "unknown";
        const W = heuristicCanvas.width;
        const H = heuristicCanvas.height;
        ctx.drawImage(v, 0, 0, W, H);
        // ROI: center 60% of frame
        const rx = Math.floor(W * 0.2);
        const ry = Math.floor(H * 0.2);
        const rw = Math.floor(W * 0.6);
        const rh = Math.floor(H * 0.6);
        const data = ctx.getImageData(rx, ry, rw, rh).data;
        // Inner core: center 50% of ROI
        const ix = Math.floor(rw * 0.25);
        const iy = Math.floor(rh * 0.25);
        const iw = Math.floor(rw * 0.5);
        const ih = Math.floor(rh * 0.5);
        let skin = 0;
        let coreSkin = 0;
        // Sample bands: top/bottom thirds of ROI for vertical center check
        let topSkin = 0;
        let bottomSkin = 0;
        let leftSkin = 0;
        let rightSkin = 0;
        let p = 0;
        for (let y = 0; y < rh; y++) {
          for (let x = 0; x < rw; x++) {
            const r = data[p];
            const g = data[p + 1];
            const b = data[p + 2];
            p += 4;
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
            // YCbCr skin range + minimum luminance to exclude very dark pixels
            const y_lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const isSkin =
              cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && y_lum > 40;
            if (!isSkin) continue;
            skin++;
            if (x >= ix && x < ix + iw && y >= iy && y < iy + ih) coreSkin++;
            if (y < rh / 3) topSkin++;
            else if (y >= (rh * 2) / 3) bottomSkin++;
            if (x < rw / 3) leftSkin++;
            else if (x >= (rw * 2) / 3) rightSkin++;
          }
        }
        const total = rw * rh;
        const coreTotal = iw * ih;
        const skinRatio = skin / total;
        const coreRatio = coreSkin / coreTotal;
        if (skinRatio < 0.04) return "no_face";
        if (coreRatio < 0.09) {
          // skin present but not in core → off-center
          return "off_center";
        }
        if (skinRatio < 0.11) return "too_far";
        // optional horizontal balance check
        const lrBalance = Math.abs(leftSkin - rightSkin) / Math.max(1, leftSkin + rightSkin);
        if (lrBalance > 0.7) return "off_center";
        return "ok";
      };

      const tick = async () => {
        if (stopped) return;
        const v = videoRef.current;
        if (!v || v.readyState < 2 || v.videoWidth === 0) {
          timer = window.setTimeout(tick, 400);
          return;
        }
        try {
          let next: FaceState = "unknown";
          if (nativeDetector) {
            next = await detectNative(v);
          } else {
            next = detectHeuristic(v);
          }
          faceStateRef.current = next;
        } catch {
          /* skip tick */
        }
        timer = window.setTimeout(tick, 350);
      };
      tick();

      return () => {
        stopped = true;
        if (timer !== null) window.clearTimeout(timer);
      };
    }, [state]);

    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-800",
          className,
        )}
      >
        <video
          ref={videoRef}
          // mirror: balik tampilan saja (efek cermin). Capture canvas pakai
          // videoRef mentah → foto tersimpan TIDAK ikut terbalik.
          className={cn("h-full w-full object-cover", mirror && "-scale-x-100")}
          muted
          playsInline
        />

        {/* Frame overlay — area wajah */}
        {!minimal && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[55%] w-[42%] rounded-[40%] ring-2 ring-cyan-400/60">
            <span className="absolute -left-1 -top-1 h-7 w-7 rounded-tl-2xl border-l-2 border-t-2 border-cyan-300" />
            <span className="absolute -right-1 -top-1 h-7 w-7 rounded-tr-2xl border-r-2 border-t-2 border-cyan-300" />
            <span className="absolute -bottom-1 -left-1 h-7 w-7 rounded-bl-2xl border-b-2 border-l-2 border-cyan-300" />
            <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-br-2xl border-b-2 border-r-2 border-cyan-300" />
          </div>
        </div>
        )}

        {/* Status pill top-left */}
        {!minimal && (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10.5px] font-semibold text-white shadow-sm ring-1 ring-white/10 backdrop-blur">
          {state === "ready" && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <CircleUserRound className="h-3 w-3 text-emerald-300" />
              <span>Webcam Ready</span>
            </>
          )}
          {state === "starting" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-cyan-300" />
              <span>Menyalakan kamera…</span>
            </>
          )}
          {(state === "error" || state === "denied") && (
            <>
              <AlertCircle className="h-3 w-3 text-rose-300" />
              <span>{state === "denied" ? "Izin ditolak" : "Webcam error"}</span>
            </>
          )}
        </div>
        )}

        {/* Device picker top-right — selalu tampil supaya user bisa ganti / fallback walau error */}
        {showDevicePicker && state !== "denied" && (
          <div className="absolute right-3 top-3 z-30">
            <label className="flex items-center gap-1.5 rounded-2xl bg-slate-950/90 px-2.5 py-1.5 shadow-lift ring-1 ring-cyan-400/30 backdrop-blur">
              {state === "starting" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-cyan-300" />
              )}
              <select
                value={deviceId ?? ""}
                onChange={(e) => onDeviceChange?.(e.target.value)}
                className="max-w-[200px] cursor-pointer truncate bg-transparent pr-1 text-[11.5px] font-semibold text-white focus:outline-none"
                style={{ colorScheme: "dark" }}
                aria-label="Pilih webcam"
              >
                <option value="" className="bg-slate-900 text-white">
                  Webcam default
                </option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-white">
                    {d.label}
                  </option>
                ))}
                {devices.length === 0 && (
                  <option value="" disabled className="bg-slate-900 text-white">
                    Memuat daftar webcam…
                  </option>
                )}
              </select>
            </label>
          </div>
        )}

        {/* Capture pulse */}
        {pulse > 0 && (
          <span
            key={pulse}
            className="pointer-events-none absolute inset-0 animate-flash-once bg-white/40"
          />
        )}

        {/* Error overlay */}
        {(state === "error" || state === "denied") && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm">
            <div className="flex max-w-xs items-start gap-2 rounded-xl bg-rose-950/70 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {state === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
            <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
              <Camera className="h-4 w-4 text-cyan-300" />
              Menyalakan webcam…
            </div>
          </div>
        )}

        {/* Ready check — small bottom-right */}
        {!minimal && state === "ready" && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30 backdrop-blur">
            <CheckCircle2 className="h-3 w-3" />
            Live
          </div>
        )}
      </div>
    );
  },
);
