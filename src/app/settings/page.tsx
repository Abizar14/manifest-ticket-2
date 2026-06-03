"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Sliders,
  Database,
  Volume2,
  VolumeX,
  Vibrate,
  Languages,
  Download,
  Trash2,
  RefreshCw,
  Archive,
  CalendarCheck,
  Timer,
  DoorOpen,
  AlarmClockCheck,
  DoorClosed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  exportAllData,
  getScanEventsArchive,
  getSession,
  purgeScanEventsArchive,
  resetAll,
} from "@/lib/storage";
import {
  AppSettings,
  Locale,
  getSettings,
  saveSettings,
} from "@/lib/settings";
import { SessionUser, UserRole } from "@/lib/types";
import { useT } from "@/lib/useT";
import { cn } from "@/lib/utils";
import { PageHero, HeroChip } from "@/components/layout/PageHero";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrator",
  supervisor: "Supervisor",
  security: "Security",
};

const TABS = [
  { id: "profile", icon: UserIcon, key: "settings.tab.profile" as const },
  { id: "preferences", icon: Sliders, key: "settings.tab.preferences" as const },
  { id: "data", icon: Database, key: "settings.tab.data" as const },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [tab, setTab] = useState<TabId>("profile");
  const [archiveCount, setArchiveCount] = useState(0);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setSettings(getSettings());
    setArchiveCount(getScanEventsArchive().length);
  }, [router]);

  const update = (patch: Partial<AppSettings>) => {
    saveSettings(patch);
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const onExportAll = () => {
    const json = exportAllData();
    download(`afvs_backup_${stamp()}.json`, json, "application/json");
    toast.success("Backup data berhasil di-download.");
  };

  const onExportArchive = () => {
    const data = getScanEventsArchive();
    if (data.length === 0) {
      toast.info("Arsip kosong — belum ada scan event yang diarsipkan.");
      return;
    }
    download(
      `afvs_scan_archive_${stamp()}.json`,
      JSON.stringify(data, null, 2),
      "application/json",
    );
    toast.success(`${data.length} event arsip di-download.`);
  };

  const onPurgeArchive = async () => {
    if (archiveCount === 0) {
      toast.info("Arsip sudah kosong.");
      return;
    }
    const res = await confirm({
      title: `Hapus ${archiveCount} scan event arsip?`,
      description:
        "Data scan event yang sudah diarsipkan akan dihapus permanen. Aksi ini tidak bisa dibatalkan.",
      tone: "danger",
      destructive: true,
      confirmLabel: "Hapus Arsip",
      cancelLabel: "Batal",
    });
    if (!res.confirmed) return;
    purgeScanEventsArchive();
    setArchiveCount(0);
    toast.success("Arsip scan event dihapus.");
  };

  const onReset = async () => {
    const res = await confirm({
      title: "Reset semua data?",
      description: t("settings.data.resetConfirm"),
      tone: "danger",
      destructive: true,
      confirmLabel: "Reset Data",
      cancelLabel: "Batal",
    });
    if (!res.confirmed) return;
    resetAll();
    toast.success("Data direset ke seed awal. Memuat ulang…");
    setTimeout(() => window.location.reload(), 600);
  };

  if (!session) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHero
          tone="slate"
          eyebrow={t("settings.title")}
          eyebrowIcon={<SettingsIcon className="h-3.5 w-3.5" />}
          ghostIcon={
            <SettingsIcon className="h-full w-full" strokeWidth={1.5} />
          }
          title={t("settings.title")}
          description={t("settings.subtitle")}
          meta={
            <>
              <HeroChip label="User" value={session.name} />
              <HeroChip label="Role" value={session.role} />
            </>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <Card className="animate-fade-up stagger-1 lift">
            <CardBody className="p-2">
              <nav className="space-y-1">
                {TABS.map(({ id, icon: Icon, key }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                        active
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(key)}
                    </button>
                  );
                })}
              </nav>
            </CardBody>
          </Card>

          <Card className="animate-fade-up stagger-2 lift">
            <div className="deco-blob -right-12 -top-12 h-40 w-40 bg-blue-200" />
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                    {tab === "profile" ? (
                      <UserIcon className="h-3.5 w-3.5" />
                    ) : tab === "preferences" ? (
                      <Sliders className="h-3.5 w-3.5" />
                    ) : (
                      <Database className="h-3.5 w-3.5" />
                    )}
                  </span>
                  {t(`settings.tab.${tab}` as const)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              {tab === "profile" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label={t("settings.profile.name")} value={session.name} />
                  <ReadOnly label={t("settings.profile.email")} value={session.email} />
                  <ReadOnly
                    label={t("settings.profile.role")}
                    value={ROLE_LABEL[session.role]}
                  />
                </div>
              )}

              {tab === "preferences" && (
                <div className="space-y-5">
                  <div className="space-y-3">
                  <ToggleRow
                    icon={
                      settings.soundOn ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )
                    }
                    title={t("settings.pref.sound")}
                    description="Beep saat scan valid / duplicate / invalid."
                    checked={settings.soundOn}
                    onChange={(v) => update({ soundOn: v })}
                  />
                  <ToggleRow
                    icon={<Vibrate className="h-4 w-4" />}
                    title={t("settings.pref.haptic")}
                    description="Getaran pendek saat scan diterima / ditolak."
                    checked={settings.hapticOn}
                    onChange={(v) => update({ hapticOn: v })}
                  />
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
                        <Languages className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {t("settings.pref.locale")}
                        </p>
                        <p className="text-xs text-slate-500">
                          Bahasa untuk navigasi & label utama.
                        </p>
                      </div>
                    </div>
                    <div className="inline-flex overflow-hidden rounded-xl ring-1 ring-slate-200">
                      {(["id", "en"] as Locale[]).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => update({ locale: loc })}
                          className={cn(
                            "px-3 py-1.5 text-xs font-semibold transition",
                            settings.locale === loc
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-600 hover:bg-blue-50",
                          )}
                        >
                          {loc.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  </div>

                  <SectionDivider
                    icon={<CalendarCheck className="h-3.5 w-3.5" />}
                    label={t("settings.section.boarding")}
                  />

                  <div className="space-y-3">
                    <ToggleRow
                      icon={<CalendarCheck className="h-4 w-4" />}
                      title={t("settings.pref.flightOnlyToday")}
                      description={t("settings.pref.flightOnlyToday.desc")}
                      checked={settings.flightListShowOnlyToday}
                      onChange={(v) => update({ flightListShowOnlyToday: v })}
                    />
                    <ToggleRow
                      icon={<Timer className="h-4 w-4" />}
                      title={t("settings.pref.autoClose")}
                      description={t("settings.pref.autoClose.desc")}
                      checked={settings.autoClosePastDayFlights}
                      onChange={(v) => update({ autoClosePastDayFlights: v })}
                    />
                    <NumberRow
                      icon={<DoorOpen className="h-4 w-4" />}
                      title={t("settings.pref.openWindow")}
                      description={t("settings.pref.openWindow.desc")}
                      value={settings.boardingOpenMinutesBefore}
                      min={0}
                      max={240}
                      suffix="menit"
                      onChange={(v) =>
                        update({ boardingOpenMinutesBefore: v })
                      }
                    />
                    <NumberRow
                      icon={<AlarmClockCheck className="h-4 w-4" />}
                      title={t("settings.pref.activeWindow")}
                      description={t("settings.pref.activeWindow.desc")}
                      value={settings.boardingActiveMinutesBefore}
                      min={0}
                      max={Math.max(0, settings.boardingOpenMinutesBefore)}
                      suffix="menit"
                      onChange={(v) =>
                        update({ boardingActiveMinutesBefore: v })
                      }
                    />
                    <NumberRow
                      icon={<DoorClosed className="h-4 w-4" />}
                      title={t("settings.pref.closeWindow")}
                      description={t("settings.pref.closeWindow.desc")}
                      value={settings.boardingCloseMinutesAfter}
                      min={0}
                      max={120}
                      suffix="menit"
                      onChange={(v) =>
                        update({ boardingCloseMinutesAfter: v })
                      }
                    />
                  </div>
                </div>
              )}

              {tab === "data" && (
                <div className="space-y-3">
                  <DataRow
                    icon={<Download className="h-4 w-4" />}
                    title={t("settings.data.export")}
                    description="Unduh semua flight, scan, audit, dan pengaturan dalam satu file JSON."
                    action={
                      <Button size="sm" variant="outline" onClick={onExportAll}>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    }
                  />
                  <DataRow
                    icon={<Archive className="h-4 w-4" />}
                    title={`${t("settings.data.archiveExport")} (${archiveCount})`}
                    description="Scan event hari kemarin & sebelumnya yang sudah dipindahkan ke arsip."
                    action={
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onExportArchive}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={onPurgeArchive}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          Purge
                        </Button>
                      </div>
                    }
                  />
                  <DataRow
                    icon={<RefreshCw className="h-4 w-4" />}
                    title={t("settings.data.reset")}
                    description="Hapus semua data lokal dan kembalikan ke seed awal. Sesi login akan logout."
                    danger
                    action={
                      <Button size="sm" variant="danger" onClick={onReset}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset
                      </Button>
                    }
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          checked ? "bg-emerald-500" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function NumberRow({
  icon,
  title,
  description,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <div className="inline-flex items-center gap-1 rounded-xl bg-white ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 5))}
          className="h-8 w-8 rounded-l-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="kurang"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || 0))}
          className="w-12 border-0 bg-transparent text-center text-sm font-bold tabular-nums text-slate-800 outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 5))}
          className="h-8 w-8 rounded-r-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="tambah"
        >
          +
        </button>
        {suffix && (
          <span className="pr-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionDivider({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-200">
        {icon}
      </span>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

function DataRow({
  icon,
  title,
  description,
  action,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-3 rounded-2xl px-4 py-3 ring-1 sm:flex-row sm:items-center",
        danger
          ? "bg-rose-50/60 ring-rose-100"
          : "bg-slate-50 ring-slate-100",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white ring-1",
            danger ? "text-rose-600 ring-rose-200" : "text-slate-600 ring-slate-200",
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}
