"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "afvs.install.dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function wasRecentlyDismissed() {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (Number.isNaN(at)) return false;
  return Date.now() - at < DISMISS_TTL_MS;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos()) {
      const id = window.setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 4000);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.clearTimeout(id);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore quota */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const res = await deferred.userChoice;
    if (res.outcome === "accepted" || res.outcome === "dismissed") {
      setDeferred(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-30 px-3 lg:hidden print:hidden",
        "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]",
        "animate-fade-up",
      )}
      role="dialog"
      aria-live="polite"
    >
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-3 text-white shadow-lift dark:border-hairline">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-cyan-300/30 blur-2xl" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="absolute right-2 top-2 rounded-full bg-white/15 p-1 text-white/85 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pr-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
              Pasang sebagai App
            </p>
            <p className="truncate text-sm font-semibold">
              {showIosHint ? "Tambahkan ke Layar Utama" : "Lebih cepat & full-screen"}
            </p>
            {showIosHint ? (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/85">
                Tap
                <Share className="inline h-3 w-3" />
                lalu pilih “Add to Home Screen”
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-white/75">
                Akses offline, ikon di home screen, status bar nyatu.
              </p>
            )}
          </div>
          {!showIosHint && (
            <button
              type="button"
              onClick={install}
              className="relative flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              Pasang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
