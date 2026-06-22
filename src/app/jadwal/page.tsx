"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  DoorOpen,
  DownloadCloud,
  Loader2,
  Luggage,
  PlaneLanding,
  PlaneTakeoff,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { todayDateString } from "@/lib/utils";
import {
  JadwalFetchResult,
  fetchKedatangan,
  fetchKeberangkatan,
} from "@/lib/jadwal/client";
import { JadwalKedatangan, JadwalKeberangkatan } from "@/lib/jadwal/types";
import { pullFidsKeberangkatan } from "@/lib/jadwal/flightSync";

type Tab = "keberangkatan" | "kedatangan";

const REFRESH_MS = 60_000;

/** remark FIDS → warna badge. */
function remarkTone(
  remark: string | null,
): "neutral" | "info" | "success" | "warning" | "danger" {
  const s = (remark ?? "").toLowerCase();
  if (s.includes("cancel") || s.includes("batal")) return "danger";
  if (s.includes("delay") || s.includes("tunda")) return "warning";
  if (s.includes("board") || s.includes("final")) return "info";
  if (s.includes("land") || s.includes("depart") || s.includes("arriv"))
    return "success";
  return "neutral";
}

export default function JadwalPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("keberangkatan");
  const [tanggal, setTanggal] = useState(() => todayDateString());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [berangkat, setBerangkat] = useState<
    JadwalFetchResult<JadwalKeberangkatan> | null
  >(null);
  const [datang, setDatang] = useState<
    JadwalFetchResult<JadwalKedatangan> | null
  >(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const [b, d] = await Promise.all([
        fetchKeberangkatan(tanggal || undefined),
        fetchKedatangan(tanggal || undefined),
      ]);
      setBerangkat(b);
      setDatang(d);
      if (!silent) setLoading(false);
    },
    [tanggal],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh berkala (silent — tak munculkan spinner penuh).
  useEffect(() => {
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    const res = await pullFidsKeberangkatan(tanggal || undefined);
    setSyncing(false);
    if (res.ok) {
      toast.success(
        `${res.total} jadwal (+${res.added} baru, ${res.updated} update)`,
        "Disinkron ke data scan",
      );
    } else {
      toast.error(res.error ?? "Gagal sinkron", "Gagal");
    }
  };

  const active = tab === "keberangkatan" ? berangkat : datang;
  const fetchedAt = active?.fetchedAt
    ? new Date(active.fetchedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header / kontrol */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-ink">
                Jadwal Penerbangan (FIDS)
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Sumber langsung papan jadwal bandara APT Pranoto.
                {fetchedAt && (
                  <span className="ml-1 text-ink-subtle">
                    Diperbarui {fetchedAt}.
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 text-xs font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </button>
              {tab === "keberangkatan" && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  title="Merge keberangkatan ke data scan lokal"
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <DownloadCloud className="h-3.5 w-3.5" />
                  )}
                  Sinkron ke scan
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedControl<Tab>
              value={tab}
              onChange={setTab}
              className="sm:max-w-xs"
              options={[
                {
                  value: "keberangkatan",
                  label: "Keberangkatan",
                  icon: <PlaneTakeoff className="h-3.5 w-3.5" />,
                },
                {
                  value: "kedatangan",
                  label: "Kedatangan",
                  icon: <PlaneLanding className="h-3.5 w-3.5" />,
                },
              ]}
            />
            <label className="relative inline-flex items-center sm:ml-auto">
              <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-ink-subtle" />
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="rounded-xl border border-hairline bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none ring-blue-200 focus:ring-2"
              />
            </label>
          </div>
        </Card>

        {/* Konten */}
        {loading && !active ? (
          <Card>
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat jadwal…
            </div>
          </Card>
        ) : active && !active.ok ? (
          <Card>
            <EmptyState
              tone="warning"
              icon={<AlertTriangle className="h-6 w-6" />}
              title="Gagal mengambil jadwal"
              description={active.error ?? "Coba lagi beberapa saat."}
              action={
                <button
                  type="button"
                  onClick={() => load()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba lagi
                </button>
              }
            />
          </Card>
        ) : tab === "keberangkatan" ? (
          <DepartureList items={berangkat?.items ?? []} />
        ) : (
          <ArrivalList items={datang?.items ?? []} />
        )}
      </div>
    </AppShell>
  );
}

function DepartureList({ items }: { items: JadwalKeberangkatan[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          tone="info"
          icon={<PlaneTakeoff className="h-6 w-6" />}
          title="Tidak ada keberangkatan"
          description="Belum ada jadwal keberangkatan untuk tanggal ini."
        />
      </Card>
    );
  }
  return (
    <div className="space-y-2.5">
      {items.map((f) => (
        <Card key={f.id} className="p-3.5">
          <div className="flex items-center gap-3">
            <AirlineLogo code={f.airlineCode} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold tracking-tight text-ink">
                  {f.flightNumber}
                </span>
                {f.isExtra && (
                  <Badge tone="violet" className="!text-[10px]">
                    Extra
                  </Badge>
                )}
                {f.remark && (
                  <Badge tone={remarkTone(f.remark)} className="!text-[10px]">
                    {f.remark}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-muted">
                {f.airlineName} · ke{" "}
                <span className="font-semibold text-ink">
                  {f.destinationName} ({f.destinationIata})
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-lg font-extrabold tabular-nums text-ink">
                {f.jam}
              </p>
              <div className="mt-0.5 flex items-center justify-end gap-2 text-[11px] text-ink-muted">
                {f.gate && (
                  <span className="inline-flex items-center gap-1">
                    <DoorOpen className="h-3 w-3" />
                    Gate {f.gate}
                  </span>
                )}
                {f.counter != null && (
                  <span className="inline-flex items-center gap-1">
                    Konter {f.counter}
                  </span>
                )}
              </div>
            </div>
          </div>
          {(f.keterangan || f.reason) && (
            <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-muted">
              {[f.reason, f.keterangan].filter(Boolean).join(" · ")}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

function ArrivalList({ items }: { items: JadwalKedatangan[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          tone="info"
          icon={<PlaneLanding className="h-6 w-6" />}
          title="Tidak ada kedatangan"
          description="Belum ada jadwal kedatangan untuk tanggal ini."
        />
      </Card>
    );
  }
  return (
    <div className="space-y-2.5">
      {items.map((f) => (
        <Card key={f.id} className="p-3.5">
          <div className="flex items-center gap-3">
            <AirlineLogo code={f.airlineCode} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold tracking-tight text-ink">
                  {f.flightNumber}
                </span>
                {f.isExtra && (
                  <Badge tone="violet" className="!text-[10px]">
                    Extra
                  </Badge>
                )}
                {f.remark && (
                  <Badge tone={remarkTone(f.remark)} className="!text-[10px]">
                    {f.remark}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-muted">
                {f.airlineName} · dari{" "}
                <span className="font-semibold text-ink">
                  {f.originName} ({f.originIata})
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-lg font-extrabold tabular-nums text-ink">
                {f.jam}
              </p>
              {f.conveyor != null && (
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-ink-muted">
                  <Luggage className="h-3 w-3" />
                  Conveyor {f.conveyor}
                </div>
              )}
            </div>
          </div>
          {(f.keterangan || f.reason) && (
            <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-muted">
              {[f.reason, f.keterangan].filter(Boolean).join(" · ")}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
