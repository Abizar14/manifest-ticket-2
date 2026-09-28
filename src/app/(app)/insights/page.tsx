"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Copy,
  Gauge,
  Plane,
  RefreshCw,
  ScanLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LargeTitle } from "@/components/mobile/LargeTitle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAuditEvents } from "@/lib/audit";
import {
  AppInsight,
  InsightCategory,
  InsightSeverity,
  buildAppInsightReport,
} from "@/lib/insights";
import { getSettings } from "@/lib/settings";
import { getFlights, getScanEvents } from "@/lib/storage";
import { cn, todayDateString } from "@/lib/utils";

const CATEGORY_OPTIONS: {
  value: InsightCategory | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "all", label: "Semua", icon: Sparkles },
  { value: "overview", label: "Ringkasan", icon: Gauge },
  { value: "flights", label: "Flights", icon: Plane },
  { value: "scan", label: "Scan", icon: ScanLine },
  { value: "passengers", label: "Penumpang", icon: Users },
  { value: "system", label: "Sistem", icon: Settings },
];

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  overview: "Ringkasan",
  flights: "Flights",
  scan: "Scan",
  passengers: "Penumpang",
  system: "Sistem",
};

const CATEGORY_ICON: Record<
  InsightCategory,
  React.ComponentType<{ className?: string }>
> = {
  overview: Gauge,
  flights: Plane,
  scan: ScanLine,
  passengers: Users,
  system: Settings,
};

const SEVERITY_STYLE: Record<
  InsightSeverity,
  {
    badge: "success" | "info" | "warning" | "danger";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    shell: string;
    iconBox: string;
    metric: string;
  }
> = {
  success: {
    badge: "success",
    label: "Stabil",
    icon: CheckCircle2,
    shell: "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    iconBox: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
    metric: "text-emerald-700 dark:text-emerald-300",
  },
  info: {
    badge: "info",
    label: "Info",
    icon: Activity,
    shell: "border-sky-200/80 bg-sky-50/50 dark:border-sky-500/25 dark:bg-sky-500/10",
    iconBox: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
    metric: "text-sky-700 dark:text-sky-300",
  },
  warning: {
    badge: "warning",
    label: "Perlu dicek",
    icon: AlertTriangle,
    shell: "border-amber-200/80 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/10",
    iconBox: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
    metric: "text-amber-700 dark:text-amber-300",
  },
  danger: {
    badge: "danger",
    label: "Prioritas",
    icon: AlertOctagon,
    shell: "border-rose-200/80 bg-rose-50/60 dark:border-rose-500/25 dark:bg-rose-500/10",
    iconBox: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
    metric: "text-rose-700 dark:text-rose-300",
  },
};

export default function InsightsPage() {
  const [selected, setSelected] = useState<InsightCategory | "all">("all");
  const [version, setVersion] = useState(0);

  const report = useMemo(() => {
    return buildAppInsightReport({
      flights: getFlights(),
      events: getScanEvents(),
      auditEvents: getAuditEvents(),
      settings: getSettings(),
    });
  }, [version]);

  useEffect(() => {
    const onFocus = () => setVersion((v) => v + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filteredInsights = useMemo(() => {
    if (selected === "all") return report.insights;
    return report.insights.filter((item) => item.category === selected);
  }, [report.insights, selected]);

  const highestSeverity = report.overview.openIssues > 0 ? "warning" : "success";

  return (
    <>
      <div className="space-y-5 lg:hidden">
        <LargeTitle
          eyebrow={`Hari ini (${todayDateString()})`}
          title="AI Insight"
          subtitle="Ringkasan lintas flight, scan, penumpang, dan sistem"
          trailing={
            <button
              type="button"
              onClick={() => setVersion((v) => v + 1)}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-2">
          <OverviewTile label="Flight" value={report.overview.flightsToday} sub={`${report.overview.boardableNow} boarding`} icon={<Plane className="h-3.5 w-3.5" />} tone="blue" />
          <OverviewTile label="Scan" value={report.overview.scansToday} sub={`${report.overview.successRate}% valid`} icon={<ScanLine className="h-3.5 w-3.5" />} tone="sky" />
          <OverviewTile label="Masalah" value={report.overview.openIssues} sub="butuh cek" icon={<AlertTriangle className="h-3.5 w-3.5" />} tone={report.overview.openIssues > 0 ? "amber" : "emerald"} />
          <OverviewTile label="Ditolak" value={report.overview.rejectedToday} sub={`${report.overview.duplicateToday} duplikat`} icon={<AlertOctagon className="h-3.5 w-3.5" />} tone="rose" />
        </div>

        <CategoryTabs selected={selected} onSelect={setSelected} />

        <div className="space-y-3">
          {filteredInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} compact />
          ))}
        </div>
      </div>

      <div className="hidden space-y-6 lg:block">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 px-7 py-6 shadow-[0_18px_40px_-24px_rgba(15,42,98,0.35)] dark:border-hairline dark:bg-surface/95">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25">
                <BrainCircuit className="h-3.5 w-3.5" />
                AI Insight Center
              </div>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-tight text-ink">
                Pusat insight seluruh aplikasi
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                Membaca data flight, scan event, penumpang, audit, dan setting untuk
                memberi rekomendasi operasional tanpa mengirim data ke layanan AI eksternal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={SEVERITY_STYLE[highestSeverity].badge}>
                {report.overview.openIssues > 0
                  ? `${report.overview.openIssues} perlu dicek`
                  : "Operasi stabil"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVersion((v) => v + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <OverviewPanel
            label="Flight Hari Ini"
            value={report.overview.flightsToday}
            helper={`${report.overview.boardableNow} sedang boarding`}
            tone="blue"
            icon={<Plane className="h-5 w-5" />}
          />
          <OverviewPanel
            label="Total Scan"
            value={report.overview.scansToday}
            helper={`${report.overview.validToday} valid`}
            tone="sky"
            icon={<ScanLine className="h-5 w-5" />}
          />
          <OverviewPanel
            label="Success Rate"
            value={`${report.overview.successRate}%`}
            helper="scan valid hari ini"
            tone="emerald"
            icon={<Gauge className="h-5 w-5" />}
          />
          <OverviewPanel
            label="Duplicate"
            value={report.overview.duplicateToday}
            helper="scan berulang"
            tone="amber"
            icon={<Copy className="h-5 w-5" />}
          />
          <OverviewPanel
            label="Open Issues"
            value={report.overview.openIssues}
            helper="prioritas & warning"
            tone={report.overview.openIssues > 0 ? "rose" : "emerald"}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Rekomendasi lintas modul
            </CardTitle>
            <CategoryTabs selected={selected} onSelect={setSelected} desktop />
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function CategoryTabs({
  selected,
  onSelect,
  desktop,
}: {
  selected: InsightCategory | "all";
  onSelect: (value: InsightCategory | "all") => void;
  desktop?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto",
        desktop
          ? "max-w-3xl justify-end"
          : "rounded-2xl bg-surface p-1 ring-1 ring-hairline shadow-card",
      )}
    >
      {CATEGORY_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition",
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function InsightCard({
  insight,
  compact,
}: {
  insight: AppInsight;
  compact?: boolean;
}) {
  const style = SEVERITY_STYLE[insight.severity];
  const SeverityIcon = style.icon;
  const CategoryIcon = CATEGORY_ICON[insight.category];
  const body = (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift",
        style.shell,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1", style.iconBox)}>
          <SeverityIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={style.badge}>{style.label}</Badge>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-ink-muted ring-1 ring-hairline dark:bg-surface-2/70">
              <CategoryIcon className="h-3 w-3" />
              {CATEGORY_LABEL[insight.category]}
            </span>
          </div>
          <h3 className="mt-2 text-[15px] font-bold tracking-tight text-ink">
            {insight.title}
          </h3>
        </div>
      </div>

      <p className={cn("mt-3 text-sm leading-6 text-ink-muted", compact && "text-[13px] leading-5")}>
        {insight.summary}
      </p>
      <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[13px] leading-5 text-ink ring-1 ring-hairline dark:bg-surface-2/70">
        <span className="font-semibold">Saran: </span>
        {insight.recommendation}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        {insight.metricLabel && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
              {insight.metricLabel}
            </p>
            <p className={cn("mt-0.5 text-xl font-extrabold tabular-nums", style.metric)}>
              {insight.metricValue}
            </p>
          </div>
        )}
        {insight.href && (
          <Link
            href={insight.href}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-2 text-[12px] font-semibold text-ink ring-1 ring-hairline transition hover:bg-white hover:text-blue-700 dark:bg-surface-2 dark:hover:bg-surface-elev"
          >
            Buka
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </article>
  );

  return body;
}

const OVERVIEW_TONE: Record<
  "blue" | "sky" | "emerald" | "amber" | "rose",
  {
    panel: string;
    icon: string;
    value: string;
  }
> = {
  blue: {
    panel: "from-blue-50 to-white dark:from-sky-500/10 dark:to-surface",
    icon: "bg-blue-100 text-blue-700 ring-blue-200",
    value: "text-blue-700 dark:text-sky-300",
  },
  sky: {
    panel: "from-sky-50 to-white dark:from-cyan-500/10 dark:to-surface",
    icon: "bg-sky-100 text-sky-700 ring-sky-200",
    value: "text-sky-700 dark:text-cyan-300",
  },
  emerald: {
    panel: "from-emerald-50 to-white dark:from-emerald-500/10 dark:to-surface",
    icon: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    panel: "from-amber-50 to-white dark:from-amber-500/10 dark:to-surface",
    icon: "bg-amber-100 text-amber-700 ring-amber-200",
    value: "text-amber-700 dark:text-amber-300",
  },
  rose: {
    panel: "from-rose-50 to-white dark:from-rose-500/10 dark:to-surface",
    icon: "bg-rose-100 text-rose-700 ring-rose-200",
    value: "text-rose-700 dark:text-rose-300",
  },
};

function OverviewPanel({
  label,
  value,
  helper,
  tone,
  icon,
}: {
  label: string;
  value: number | string;
  helper: string;
  tone: keyof typeof OVERVIEW_TONE;
  icon: React.ReactNode;
}) {
  const t = OVERVIEW_TONE[tone];
  return (
    <div className={cn("rounded-2xl border border-slate-200/70 bg-gradient-to-br p-4 shadow-card dark:border-hairline", t.panel)}>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1", t.icon)}>
        {icon}
      </span>
      <p className={cn("mt-4 text-3xl font-extrabold tabular-nums leading-none", t.value)}>
        {value}
      </p>
      <p className="mt-2 text-[12px] font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{helper}</p>
    </div>
  );
}

function OverviewTile({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  tone: keyof typeof OVERVIEW_TONE;
}) {
  const t = OVERVIEW_TONE[tone];
  return (
    <div className="rounded-2xl bg-surface px-3 py-3 shadow-card ring-1 ring-hairline">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg ring-1", t.icon)}>
        {icon}
      </span>
      <p className={cn("mt-2 text-[24px] font-extrabold tabular-nums leading-none", t.value)}>
        {value}
      </p>
      <p className="mt-1 text-[11.5px] font-semibold text-ink">{label}</p>
      <p className="text-[10.5px] text-ink-subtle">{sub}</p>
    </div>
  );
}
