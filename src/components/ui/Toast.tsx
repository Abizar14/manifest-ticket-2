"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastApi {
  show: (
    message: string,
    opts?: { title?: string; variant?: ToastVariant; duration?: number },
  ) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return {
      show: () => "",
      success: () => "",
      error: () => "",
      warning: () => "",
      info: () => "",
      dismiss: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, opts) => {
      const id = `tst_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const variant: ToastVariant = opts?.variant ?? "info";
      const duration = opts?.duration ?? (variant === "error" ? 5000 : 3200);
      setItems((prev) => [
        ...prev,
        { id, title: opts?.title, message, variant, duration },
      ]);
      if (duration > 0) {
        const tm = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, tm);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((tm) => clearTimeout(tm));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, title) => show(m, { variant: "success", title }),
      error: (m, title) => show(m, { variant: "error", title }),
      warning: (m, title) => show(m, { variant: "warning", title }),
      info: (m, title) => show(m, { variant: "info", title }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

const VARIANT_CFG: Record<
  ToastVariant,
  { ring: string; bg: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; label: string }
> = {
  success: {
    ring: "ring-emerald-200",
    bg: "bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    label: "text-emerald-700",
  },
  error: {
    ring: "ring-rose-200",
    bg: "bg-gradient-to-br from-rose-50 via-white to-rose-100/60",
    icon: XCircle,
    iconColor: "text-rose-600",
    label: "text-rose-700",
  },
  warning: {
    ring: "ring-amber-200",
    bg: "bg-gradient-to-br from-amber-50 via-white to-amber-100/60",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    label: "text-amber-700",
  },
  info: {
    ring: "ring-blue-200",
    bg: "bg-gradient-to-br from-blue-50 via-white to-blue-100/60",
    icon: Info,
    iconColor: "text-blue-600",
    label: "text-blue-700",
  },
};

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 print:hidden"
    >
      {items.map((t) => {
        const cfg = VARIANT_CFG[t.variant];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto relative overflow-hidden rounded-2xl border border-white/60 shadow-lift ring-1 backdrop-blur animate-fade-up",
              cfg.ring,
              cfg.bg,
            )}
          >
            <div className="flex items-start gap-3 px-4 py-3 pr-9">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/80 ring-1",
                  cfg.ring,
                )}
              >
                <Icon className={cn("h-4 w-4", cfg.iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                {t.title && (
                  <p
                    className={cn(
                      "text-[12px] font-bold uppercase tracking-wider",
                      cfg.label,
                    )}
                  >
                    {t.title}
                  </p>
                )}
                <p className="text-sm font-medium text-slate-800">
                  {t.message}
                </p>
              </div>
              <button
                aria-label="Dismiss"
                onClick={() => onDismiss(t.id)}
                className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
