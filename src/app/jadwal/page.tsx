"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock,
  DoorOpen,
  DownloadCloud,
  Loader2,
  Luggage,
  Maximize2,
  Minimize2,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  RefreshCw,
  Ticket,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { cn, todayDateString } from "@/lib/utils";
import {
  JadwalFetchResult,
  fetchKedatangan,
  fetchKeberangkatan,
} from "@/lib/jadwal/client";
import {
  HOME_IATA,
  JadwalKedatangan,
  JadwalKeberangkatan,
} from "@/lib/jadwal/types";
import { pullFidsKeberangkatan } from "@/lib/jadwal/flightSync";

type Tab = "keberangkatan" | "kedatangan";

const REFRESH_MS = 60_000;

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** remark FIDS → warna badge. */
function remarkTone(remark: string | null): Tone {
  const s = (remark ?? "").toLowerCase();
  if (s.includes("cancel") || s.includes("batal")) return "danger";
  if (s.includes("delay") || s.includes("tunda")) return "warning";
  if (s.includes("board") || s.includes("final")) return "info";
  if (s.includes("land") || s.includes("depart") || s.includes("arriv"))
    return "success";
  return "neutral";
}

/** Apakah remark menandakan status "hidup" (boarding / final call) → diberi denyut. */
function isLiveRemark(remark: string | null): boolean {
  const s = (remark ?? "").toLowerCase();
  return s.includes("board") || s.includes("final");
}

/** Palet aksen per-tone untuk pita kiri + glow kartu. */
const ACCENT: Record<Tone, { bar: string; glow: string; dot: string }> = {
  neutral: {
    bar: "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
    glow: "bg-slate-400/20",
    dot: "bg-slate-400",
  },
  info: {
    bar: "from-blue-400 to-cyan-400",
    glow: "bg-blue-400/25",
    dot: "bg-blue-500",
  },
  success: {
    bar: "from-emerald-400 to-teal-400",
    glow: "bg-emerald-400/25",
    dot: "bg-emerald-500",
  },
  warning: {
    bar: "from-amber-400 to-orange-400",
    glow: "bg-amber-400/25",
    dot: "bg-amber-500",
  },
  danger: {
    bar: "from-rose-400 to-red-400",
    glow: "bg-rose-400/25",
    dot: "bg-rose-500",
  },
};

/** Bentuk seragam satu penerbangan untuk kartu & modal (gabung berangkat/datang). */
interface BoardFlight {
  id: string;
  mode: "dep" | "arr";
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  remark: string | null;
  isExtra: boolean;
  jam: string;
  from: { iata: string; name: string };
  to: { iata: string; name: string };
  gate: string | null;
  counter: number | null;
  conveyor: number | null;
  note: string | null;
}

const HOME = { iata: HOME_IATA, name: "APT Pranoto" };

function noteOf(reason: string | null, keterangan: string | null): string | null {
  return [reason, keterangan].filter(Boolean).join(" · ") || null;
}

function toBoardDep(f: JadwalKeberangkatan): BoardFlight {
  return {
    id: f.id,
    mode: "dep",
    flightNumber: f.flightNumber,
    airlineCode: f.airlineCode,
    airlineName: f.airlineName,
    remark: f.remark,
    isExtra: f.isExtra,
    jam: f.jam,
    from: HOME,
    to: { iata: f.destinationIata, name: f.destinationName },
    gate: f.gate,
    counter: f.counter,
    conveyor: null,
    note: noteOf(f.reason, f.keterangan),
  };
}

function toBoardArr(f: JadwalKedatangan): BoardFlight {
  return {
    id: f.id,
    mode: "arr",
    flightNumber: f.flightNumber,
    airlineCode: f.airlineCode,
    airlineName: f.airlineName,
    remark: f.remark,
    isExtra: f.isExtra,
    jam: f.jam,
    from: { iata: f.originIata, name: f.originName },
    to: HOME,
    gate: null,
    counter: null,
    conveyor: f.conveyor,
    note: noteOf(f.reason, f.keterangan),
  };
}

export default function JadwalPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("keberangkatan");
  const [tanggal, setTanggal] = useState(() => todayDateString());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clock, setClock] = useState<string | null>(null);
  const [selected, setSelected] = useState<BoardFlight | null>(null);
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

  // Jam papan jadwal — berdetak tiap detik (split-flap board feel).
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    const res = await pullFidsKeberangkatan(tanggal || undefined);
    setSyncing(false);
    if (res.ok) {
      const serverNote =
        res.synced && res.synced > 0
          ? `${res.synced} tersimpan ke server`
          : "Tersimpan lokal (server offline/tak login)";
      toast.success(
        `${res.total} jadwal (+${res.added} baru, ${res.updated} update)`,
        serverNote,
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

  // Ringkasan papan: total + pecahan status (dipakai di chip statistik hero).
  const stats = useMemo(() => {
    const items = active?.items ?? [];
    let live = 0;
    let warn = 0;
    let danger = 0;
    for (const it of items) {
      const tone = remarkTone(it.remark);
      if (isLiveRemark(it.remark)) live += 1;
      if (tone === "warning") warn += 1;
      if (tone === "danger") danger += 1;
    }
    return { total: items.length, live, warn, danger };
  }, [active]);

  return (
    <AppShell>
      <div className="space-y-5">
        {/* ───────────── Hero / papan jadwal ───────────── */}
        <section className="animate-fade-up relative isolate overflow-hidden rounded-3xl border border-slate-800/60 bg-[linear-gradient(135deg,#0b1733_0%,#11244d_50%,#0a1a3a_100%)] p-5 text-white shadow-[0_24px_60px_-28px_rgba(8,20,55,0.9)] sm:p-6">
          {/* glow blobs */}
          <div
            aria-hidden
            className="deco-blob -right-16 -top-16 h-56 w-56 bg-sky-500/40"
          />
          <div
            aria-hidden
            className="deco-blob -bottom-20 left-1/3 h-52 w-52 bg-cyan-500/30"
          />
          {/* pesawat terbang melintas */}
          <Plane
            aria-hidden
            className="pointer-events-none absolute top-8 left-0 h-8 w-8 -rotate-12 text-sky-200/40 animate-fly-by"
          />
          {/* dotted radar grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:22px_22px]"
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-200 ring-1 ring-white/20 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                Live · APT Pranoto
              </span>
              <h2 className="mt-2.5 text-[22px] font-black leading-tight tracking-tight sm:text-[26px]">
                Jadwal Penerbangan
                <span className="ml-2 font-mono text-sky-300">(FIDS)</span>
              </h2>
              <p className="mt-1 text-xs text-sky-100/70">
                Papan jadwal langsung Bandara APT Pranoto, Samarinda.
                {fetchedAt && (
                  <span className="ml-1 text-sky-200/50">
                    Diperbarui {fetchedAt}.
                  </span>
                )}
              </p>
            </div>

            {/* Jam papan split-flap */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-black/30 px-3 py-2 font-mono text-2xl font-black tabular-nums tracking-wider text-sky-300 ring-1 ring-white/10 shadow-inner sm:text-3xl">
              <Clock className="mr-1 h-5 w-5 text-sky-400/70" />
              {clock ?? "--:--:--"}
            </div>
          </div>

          {/* Statistik ringkas */}
          <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatChip
              label={tab === "keberangkatan" ? "Berangkat" : "Datang"}
              value={stats.total}
              tone="info"
              icon={
                tab === "keberangkatan" ? (
                  <PlaneTakeoff className="h-3.5 w-3.5" />
                ) : (
                  <PlaneLanding className="h-3.5 w-3.5" />
                )
              }
            />
            <StatChip label="Boarding" value={stats.live} tone="success" pulse />
            <StatChip label="Tertunda" value={stats.warn} tone="warning" />
            <StatChip label="Batal" value={stats.danger} tone="danger" />
          </div>

          {/* Kontrol */}
          <div className="relative mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedControl<Tab>
              value={tab}
              onChange={setTab}
              className="border border-white/10 sm:max-w-xs"
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
            <div className="flex items-center gap-2 sm:ml-auto">
              <label className="relative inline-flex items-center">
                <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-sky-200/60" />
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="rounded-xl border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-sm text-white outline-none ring-sky-300/40 backdrop-blur [color-scheme:dark] focus:ring-2"
                />
              </label>
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-95 disabled:opacity-60"
                aria-label="Refresh"
                title="Refresh"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
              {tab === "keberangkatan" && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 text-xs font-bold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.8)] ring-1 ring-emerald-300/40 transition hover:-translate-y-0.5 hover:bg-emerald-400 active:scale-95 disabled:opacity-60"
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
        </section>

        {/* ───────────── Konten ───────────── */}
        {loading && !active ? (
          <SkeletonList />
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
          <DepartureList items={berangkat?.items ?? []} onSelect={setSelected} />
        ) : (
          <ArrivalList items={datang?.items ?? []} onSelect={setSelected} />
        )}
      </div>

      <FlightBoardModal
        flight={selected}
        clock={clock}
        onClose={() => setSelected(null)}
      />
    </AppShell>
  );
}

/* ════════════════════════ Sub-komponen ════════════════════════ */

function StatChip({
  label,
  value,
  tone,
  icon,
  pulse,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: Tone;
  readonly icon?: React.ReactNode;
  readonly pulse?: boolean;
}) {
  const a = ACCENT[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10 backdrop-blur">
      <div className={cn("absolute -right-3 -top-3 h-12 w-12 rounded-full blur-xl", a.glow)} />
      <div className="relative flex items-center gap-2">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-white/80",
            pulse && value > 0 && "animate-pulse",
          )}
        >
          {icon ?? <span className={cn("h-2 w-2 rounded-full", a.dot)} />}
        </span>
        <div className="leading-none">
          <div className="text-[18px] font-black tabular-nums text-white">
            {value}
          </div>
          <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/55">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Waktu gaya split-flap — angka mono besar di kotak gelap. */
function FlapTime({ jam }: { jam: string }) {
  return (
    <span className="inline-flex items-center gap-px rounded-lg bg-slate-900 px-2 py-1 font-mono text-lg font-black tabular-nums tracking-wide text-sky-300 ring-1 ring-white/10 shadow-inner dark:bg-black/40 sm:text-xl">
      {jam}
    </span>
  );
}

function RemarkPills({
  remark,
  isExtra,
  live,
}: {
  readonly remark: string | null;
  readonly isExtra: boolean;
  readonly live: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {isExtra && (
        <Badge tone="violet" className="!text-[10px]">
          Extra
        </Badge>
      )}
      {remark && (
        <span className="relative inline-flex">
          {live && (
            <span className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" />
          )}
          <Badge tone={remarkTone(remark)} className="relative !text-[10px]">
            {remark}
          </Badge>
        </span>
      )}
    </div>
  );
}

/** Chip meta kecil (gate / konter / belt) di kanan kartu. */
function MetaChip({
  icon,
  label,
  value,
  tone,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: React.ReactNode;
  readonly tone: "sky" | "slate" | "amber";
}) {
  const cls =
    tone === "sky"
      ? "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/25"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25"
        : "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-ink-muted dark:ring-hairline";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ring-1",
        cls,
      )}
    >
      {icon}
      <span className="text-[8.5px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

/** Kartu jadwal — bersih, sejajar, bisa diklik untuk papan layar penuh. */
function BoardRow({
  flight,
  index,
  onSelect,
}: {
  readonly flight: BoardFlight;
  readonly index: number;
  readonly onSelect: (f: BoardFlight) => void;
}) {
  const tone = remarkTone(flight.remark);
  const live = isLiveRemark(flight.remark);
  const a = ACCENT[tone];
  const Dir = flight.mode === "dep" ? PlaneTakeoff : PlaneLanding;
  return (
    <button
      type="button"
      onClick={() => onSelect(flight)}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className={cn(
        "animate-fade-up group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 text-left shadow-card backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,42,98,0.45)] dark:border-hairline dark:bg-surface/95",
        live && "ring-2 ring-blue-400/40 dark:ring-blue-400/30",
      )}
    >
      {/* pita aksen kiri */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b",
          a.bar,
          live && "animate-pulse",
        )}
      />
      {/* glow sudut */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-90",
          a.glow,
        )}
      />

      <div className="relative ml-1.5 shrink-0">
        <AirlineLogo code={flight.airlineCode} size="md" />
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[15px] font-black tracking-tight text-ink">
            {flight.flightNumber}
          </span>
          <RemarkPills
            remark={flight.remark}
            isExtra={flight.isExtra}
            live={live}
          />
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <span className="font-bold text-ink">{flight.from.iata}</span>
          <Dir className="h-3.5 w-3.5 text-sky-500 dark:text-sky-300" />
          <span className="truncate font-semibold text-ink">
            {flight.to.name} ({flight.to.iata})
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-ink-subtle">
          {flight.airlineName}
        </p>
      </div>

      <div className="relative flex shrink-0 flex-col items-end gap-1.5">
        <FlapTime jam={flight.jam} />
        <div className="flex items-center gap-1.5">
          {flight.gate && (
            <MetaChip
              icon={<DoorOpen className="h-3 w-3" />}
              label="Gate"
              value={flight.gate}
              tone="sky"
            />
          )}
          {flight.counter != null && (
            <MetaChip
              icon={<Ticket className="h-3 w-3" />}
              label="Konter"
              value={flight.counter}
              tone="slate"
            />
          )}
          {flight.conveyor != null && (
            <MetaChip
              icon={<Luggage className="h-3 w-3" />}
              label="Belt"
              value={flight.conveyor}
              tone="amber"
            />
          )}
        </div>
      </div>

      <ChevronRight className="relative h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function DepartureList({
  items,
  onSelect,
}: {
  readonly items: JadwalKeberangkatan[];
  readonly onSelect: (f: BoardFlight) => void;
}) {
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
      {items.map((f, i) => (
        <BoardRow key={f.id} index={i} flight={toBoardDep(f)} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ArrivalList({
  items,
  onSelect,
}: {
  readonly items: JadwalKedatangan[];
  readonly onSelect: (f: BoardFlight) => void;
}) {
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
      {items.map((f, i) => (
        <BoardRow key={f.id} index={i} flight={toBoardArr(f)} onSelect={onSelect} />
      ))}
    </div>
  );
}

/* ─────────── Modal papan jadwal gaya bandara (bisa layar penuh) ─────────── */

const BOARD_TONE: Record<Tone, string> = {
  neutral: "bg-slate-500/20 text-slate-100 ring-slate-300/30",
  info: "bg-sky-500/20 text-sky-100 ring-sky-300/40",
  success: "bg-emerald-500/20 text-emerald-100 ring-emerald-300/40",
  warning: "bg-amber-500/20 text-amber-100 ring-amber-300/40",
  danger: "bg-rose-500/20 text-rose-100 ring-rose-300/40",
};

function BoardTile({
  label,
  value,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.06] px-3 py-3 text-center ring-1 ring-white/10 backdrop-blur">
      <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-sky-200/60">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-black tabular-nums text-white sm:text-3xl">
        {value}
      </div>
    </div>
  );
}

function FlightBoardModal({
  flight,
  clock,
  onClose,
}: {
  readonly flight: BoardFlight | null;
  readonly clock: string | null;
  readonly onClose: () => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!flight) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [flight, onClose]);

  if (!flight) return null;

  const tone = remarkTone(flight.remark);
  const live = isLiveRemark(flight.remark);
  const Dir = flight.mode === "dep" ? PlaneTakeoff : PlaneLanding;
  const modeLabel = flight.mode === "dep" ? "Keberangkatan" : "Kedatangan";

  const toggleFs = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      boardRef.current?.requestFullscreen().catch(() => {});
    }
  };

  // Tiga ubin info, sesuai mode.
  const tiles =
    flight.mode === "dep"
      ? [
          { label: "Gate", value: flight.gate ?? "—" },
          { label: "Konter", value: flight.counter ?? "—" },
          { label: "Status", value: flight.remark ?? "Terjadwal" },
        ]
      : [
          { label: "Asal", value: flight.from.iata },
          { label: "Belt", value: flight.conveyor ?? "—" },
          { label: "Status", value: flight.remark ?? "Terjadwal" },
        ];

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm animate-fade-up"
      />

      <div
        ref={boardRef}
        className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-sky-500/25 bg-[linear-gradient(135deg,#08122b_0%,#0e2148_50%,#081428_100%)] text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] animate-fade-up [&:fullscreen]:max-w-none [&:fullscreen]:rounded-none [&:fullscreen]:justify-center"
      >
        {/* dekorasi */}
        <div aria-hidden className="deco-blob -right-16 -top-16 h-56 w-56 bg-sky-500/40" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:22px_22px]"
        />

        {/* Bar atas */}
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 sm:px-7">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-200/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            APT Pranoto · {modeLabel}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-sm font-bold tabular-nums text-sky-300 sm:inline">
              {clock ?? "--:--:--"}
            </span>
            <button
              type="button"
              onClick={toggleFs}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
              aria-label={isFs ? "Keluar layar penuh" : "Layar penuh"}
              title={isFs ? "Keluar layar penuh" : "Layar penuh seperti papan bandara"}
            >
              {isFs ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-rose-500/30 active:scale-95"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Isi papan */}
        <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 py-9 sm:py-12">
          {/* Nomor flight + maskapai */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <AirlineLogo code={flight.airlineCode} size="md" />
              <span className="font-mono text-4xl font-black tracking-tight sm:text-6xl">
                {flight.flightNumber}
              </span>
            </div>
            <p className="text-sm text-sky-200/70">
              {flight.airlineName}
              {flight.isExtra && (
                <span className="ml-2 rounded bg-violet-500/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-100 ring-1 ring-violet-300/30">
                  Extra
                </span>
              )}
            </p>
          </div>

          {/* Rute */}
          <div className="flex items-center justify-center gap-5 sm:gap-10">
            <div className="text-center">
              <div className="font-mono text-3xl font-black tabular-nums sm:text-5xl">
                {flight.from.iata}
              </div>
              <div className="mt-1 max-w-[12ch] truncate text-[11px] text-sky-200/60 sm:text-sm">
                {flight.from.name}
              </div>
            </div>
            <div className="flex flex-col items-center text-sky-300">
              <Dir className="h-7 w-7 motion-safe:animate-float sm:h-9 sm:w-9" />
              <div className="mt-1.5 h-px w-16 bg-gradient-to-r from-transparent via-sky-400/70 to-transparent sm:w-32" />
            </div>
            <div className="text-center">
              <div className="font-mono text-3xl font-black tabular-nums sm:text-5xl">
                {flight.to.iata}
              </div>
              <div className="mt-1 max-w-[12ch] truncate text-[11px] text-sky-200/60 sm:text-sm">
                {flight.to.name}
              </div>
            </div>
          </div>

          {/* Waktu besar */}
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/55">
              {flight.mode === "dep" ? "Estimasi Berangkat" : "Estimasi Tiba"}
            </div>
            <div className="font-mono text-6xl font-black tabular-nums text-sky-300 drop-shadow-[0_0_24px_rgba(56,189,248,0.45)] sm:text-8xl">
              {flight.jam}
            </div>
          </div>

          {/* Status besar */}
          <span
            className={cn(
              "relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold uppercase tracking-wider ring-1 sm:text-base",
              BOARD_TONE[tone],
            )}
          >
            {live && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
            )}
            {flight.remark ?? "Terjadwal"}
          </span>

          {/* Ubin info */}
          <div className="grid w-full max-w-md grid-cols-3 gap-3">
            {tiles.map((t) => (
              <BoardTile key={t.label} label={t.label} value={t.value} />
            ))}
          </div>

          {flight.note && (
            <p className="max-w-md rounded-xl bg-white/[0.06] px-4 py-2 text-center text-xs text-sky-100/80 ring-1 ring-white/10">
              {flight.note}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Skeleton shimmer saat memuat awal — lebih hidup dari spinner polos. */
function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Card className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-200/70 dark:bg-white/10">
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer dark:via-white/10" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="relative h-3.5 w-28 overflow-hidden rounded bg-slate-200/70 dark:bg-white/10">
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer dark:via-white/10" />
                </div>
                <div className="relative h-3 w-44 overflow-hidden rounded bg-slate-200/70 dark:bg-white/10">
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer dark:via-white/10" />
                </div>
              </div>
              <div className="relative h-7 w-16 overflow-hidden rounded-lg bg-slate-200/70 dark:bg-white/10">
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer dark:via-white/10" />
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
