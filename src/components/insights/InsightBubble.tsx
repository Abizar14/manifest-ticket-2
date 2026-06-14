"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  Info,
  RefreshCw,
  X,
} from "lucide-react";
import { getAuditEvents } from "@/lib/audit";
import {
  AppInsight,
  InsightSeverity,
  buildAppInsightReport,
} from "@/lib/insights";
import { getSettings } from "@/lib/settings";
import { getFlights, getScanEvents } from "@/lib/storage";
import { cn, todayDateString } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

const DISMISSED_KEY = "afvs.insightBubble.dismissed";

const SEVERITY_META: Record<
  InsightSeverity,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    shell: string;
    iconBox: string;
    chip: string;
    toast: "success" | "info" | "warning" | "error";
  }
> = {
  success: {
    label: "Stabil",
    icon: CheckCircle2,
    shell: "border-emerald-200 bg-emerald-50/80",
    iconBox: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    chip: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    toast: "success",
  },
  info: {
    label: "Info",
    icon: Info,
    shell: "border-sky-200 bg-sky-50/80",
    iconBox: "bg-sky-100 text-sky-700 ring-sky-200",
    chip: "bg-sky-100 text-sky-700 ring-sky-200",
    toast: "info",
  },
  warning: {
    label: "Perlu Dicek",
    icon: AlertTriangle,
    shell: "border-amber-200 bg-amber-50/90",
    iconBox: "bg-amber-100 text-amber-700 ring-amber-200",
    chip: "bg-amber-100 text-amber-800 ring-amber-200",
    toast: "warning",
  },
  danger: {
    label: "Prioritas",
    icon: AlertOctagon,
    shell: "border-rose-200 bg-rose-50/90",
    iconBox: "bg-rose-100 text-rose-700 ring-rose-200",
    chip: "bg-rose-100 text-rose-800 ring-rose-200",
    toast: "error",
  },
};

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { date?: string; ids?: string[] };
    if (parsed.date !== todayDateString()) return [];
    return Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DISMISSED_KEY,
    JSON.stringify({ date: todayDateString(), ids }),
  );
}

function buildReportVersion() {
  return buildAppInsightReport({
    flights: getFlights(),
    events: getScanEvents(),
    auditEvents: getAuditEvents(),
    settings: getSettings(),
  });
}

export function InsightBubble() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [lastToastId, setLastToastId] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("afvs:settings", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("afvs:settings", refresh);
    };
  }, []);

  const report = useMemo(() => buildReportVersion(), [version]);
  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);
  const priorityInsights = report.insights.filter(
    (item) => item.severity === "warning" || item.severity === "danger",
  );
  const unreadPriority = priorityInsights.filter(
    (item) => !dismissedSet.has(item.id),
  );
  const topInsight = unreadPriority[0] ?? priorityInsights[0] ?? report.insights[0];
  const visibleInsights = report.insights.slice(0, 4);
  const unreadCount = unreadPriority.length;

  useEffect(() => {
    if (!topInsight) return;
    if (open) return;
    if (topInsight.severity !== "warning" && topInsight.severity !== "danger") return;
    if (dismissedSet.has(topInsight.id) || lastToastId === topInsight.id) return;

    const meta = SEVERITY_META[topInsight.severity];
    toast.show(topInsight.summary, {
      title: `AI Insight: ${topInsight.title}`,
      variant: meta.toast,
      duration: topInsight.severity === "danger" ? 6500 : 4800,
    });
    setLastToastId(topInsight.id);
  }, [dismissedSet, lastToastId, open, toast, topInsight]);

  const markRead = (id: string) => {
    setDismissed((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveDismissed(next);
      return next;
    });
  };

  const markAllRead = () => {
    const ids = report.insights.map((item) => item.id);
    setDismissed(ids);
    saveDismissed(ids);
  };

  if (!topInsight) return null;

  const topMeta = SEVERITY_META[topInsight.severity];
  const TopIcon = topMeta.icon;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-[55] print:hidden lg:bottom-5">
      {open && (
        <div className="mb-3 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] ring-1 ring-black/5 backdrop-blur dark:border-hairline dark:bg-surface">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50 px-4 py-3 dark:border-hairline dark:bg-none">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-ink">
                  AI Insight
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-ink-muted">
                  Alert operasional internal
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-ink"
              aria-label="Tutup AI Insight"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[min(540px,70vh)] space-y-3 overflow-y-auto p-3">
            <div
              className={cn(
                "rounded-2xl border p-3 ring-1 ring-white/70",
                topMeta.shell,
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
                    topMeta.iconBox,
                  )}
                >
                  <TopIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                        topMeta.chip,
                      )}
                    >
                      {topMeta.label}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Sekarang
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold leading-snug text-slate-900 dark:text-ink">
                    {topInsight.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-5 text-slate-700 dark:text-ink-muted">
                    {topInsight.summary}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-800 dark:text-ink">
                    {topInsight.recommendation}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {topInsight.href && (
                      <Link
                        href={topInsight.href}
                        onClick={() => markRead(topInsight.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-slate-800"
                      >
                        Buka detail
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => markRead(topInsight.id)}
                      className="rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      Sudah dibaca
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Insight lain
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVersion((v) => v + 1)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10"
                  >
                    Tandai semua
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {visibleInsights.map((insight) => (
                <MiniInsight
                  key={insight.id}
                  insight={insight}
                  read={dismissedSet.has(insight.id)}
                  onRead={() => markRead(insight.id)}
                />
              ))}
            </div>

            <Link
              href="/insights"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] font-extrabold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-white/5 dark:text-ink dark:ring-hairline dark:hover:bg-white/10"
            >
              Buka AI Insight Center
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setVersion((v) => v + 1);
        }}
        className={cn(
          "group relative flex h-14 items-center gap-3 rounded-2xl px-3.5 text-left shadow-[0_18px_40px_-16px_rgba(15,23,42,0.55)] ring-1 transition hover:-translate-y-0.5",
          unreadCount > 0
            ? "bg-slate-950 text-white ring-slate-800"
            : "bg-white text-slate-800 ring-slate-200 dark:bg-surface dark:text-ink dark:ring-hairline",
        )}
        aria-label="Buka AI Insight"
      >
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            unreadCount > 0
              ? "bg-white/12 text-cyan-200"
              : "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
          )}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block text-[12px] font-extrabold leading-tight">
            AI Insight
          </span>
          <span
            className={cn(
              "block max-w-[180px] truncate text-[11px] leading-tight",
              unreadCount > 0 ? "text-white/70" : "text-slate-500",
            )}
          >
            {unreadCount > 0
              ? `${unreadCount} alert perlu dicek`
              : "Operasional terpantau"}
          </span>
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

function MiniInsight({
  insight,
  read,
  onRead,
}: {
  insight: AppInsight;
  read: boolean;
  onRead: () => void;
}) {
  const meta = SEVERITY_META[insight.severity];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3 ring-1 ring-slate-100 dark:border-hairline dark:bg-surface-2 dark:ring-transparent",
        read ? "border-slate-100 opacity-70" : meta.shell,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
            meta.iconBox,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[12.5px] font-extrabold text-slate-900 dark:text-ink">
            {insight.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-4 text-slate-600 dark:text-ink-muted">
            {insight.summary}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {insight.href && (
              <Link
                href={insight.href}
                onClick={onRead}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 dark:text-sky-300"
              >
                Detail
              </Link>
            )}
            {!read && (
              <button
                type="button"
                onClick={onRead}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-ink"
              >
                Sudah dibaca
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
