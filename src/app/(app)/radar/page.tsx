"use client";

import "leaflet/dist/leaflet.css";
import type * as LeafletNS from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Compass,
  Crosshair,
  Gauge,
  Globe2,
  Locate,
  Moon,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Radar as RadarIcon,
  RefreshCw,
  Satellite,
  Signal,
  Sun,
  TowerControl,
  Wifi,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Aircraft,
  CATEGORY_META,
  FlightCategory,
  RadarSnapshot,
  SAMARINDA,
  deadReckon,
  fetchLiveRadar,
  metersToFeet,
  msToFpm,
  msToKnots,
  msToKmh,
  resetDemo,
  stepDemo,
} from "@/lib/radarService";

const RANGE_OPTIONS = [150, 250, 400] as const;
const ZOOM_FOR_RANGE: Record<number, number> = { 150: 9, 250: 8, 400: 7 };

// Tile Esri (tanpa API key). CARTO basemaps kini wajib API key — tanpa key
// tile-nya berupa gambar "API KEY REQUIRED" sehingga peta tampak kosong.
const TILE = {
  light: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    bg: "#e9eef3",
    maxNativeZoom: 19,
  },
  dark: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    bg: "#0b1020",
    maxNativeZoom: 16,
  },
} as const;
const TILE_ATTR =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const LIVE_POLL_MS = 12000;
const DEMO_STEP_MS = 4000;

const FILTERS: { key: FlightCategory | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "ARRIVING", label: "Datang" },
  { key: "DEPARTING", label: "Berangkat" },
  { key: "OVERFLIGHT", label: "Lewat" },
];

interface MarkerEntry {
  marker: LeafletNS.Marker;
  heading: number;
  category: FlightCategory;
  selected: boolean;
  trail: [number, number][];
  lastTrailAt: number;
}

export default function RadarPage() {
  const [source, setSource] = useState<"live" | "demo">("live");
  const [rangeKm, setRangeKm] = useState<number>(250);
  const [snapshot, setSnapshot] = useState<RadarSnapshot | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FlightCategory | "all">("all");
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Leaflet refs
  const [mapMounted, setMapMounted] = useState(false);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const setMapNode = useCallback((node: HTMLDivElement | null) => {
    mapDivRef.current = node;
    setMapMounted(Boolean(node));
  }, []);
  const LRef = useRef<typeof LeafletNS | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const layerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const tileLayerRef = useRef<LeafletNS.TileLayer | null>(null);
  const trailLineRef = useRef<LeafletNS.Polyline | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const rafRef = useRef<number | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // Mirrors for use inside imperative loops
  const snapshotRef = useRef<RadarSnapshot | null>(null);
  const selectedRef = useRef<string | null>(null);
  const filterRef = useRef<FlightCategory | "all">("all");
  const mapThemeRef = useRef<"light" | "dark">("light");
  const onSelectRef = useRef<(id: string) => void>(() => {});

  snapshotRef.current = snapshot;
  selectedRef.current = selectedId;
  filterRef.current = filter;
  mapThemeRef.current = mapTheme;
  onSelectRef.current = (id: string) =>
    setSelectedId((prev) => (prev === id ? null : id));

  // ───────────────────────── Data polling ─────────────────────────
  const loadLive = useCallback(async (range: number) => {
    setStatus("loading");
    try {
      const snap = await fetchLiveRadar(range + 40);
      setSnapshot(snap);
      setStatus("ok");
      setErrorMsg(null);
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data dari OpenSky.",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    if (source === "live") {
      resetDemo();
      loadLive(rangeKm);
      timer = setInterval(() => {
        if (!cancelled) loadLive(rangeKm);
      }, LIVE_POLL_MS);
    } else {
      resetDemo();
      setSnapshot(stepDemo(rangeKm));
      setStatus("ok");
      setErrorMsg(null);
      timer = setInterval(() => {
        if (!cancelled) setSnapshot(stepDemo(rangeKm));
      }, DEMO_STEP_MS);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [source, rangeKm, loadLive]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ───────────────────────── Leaflet init ─────────────────────────
  useEffect(() => {
    if (!mapMounted || !mapDivRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDivRef.current) return;
      LRef.current = L;

      const map = L.map(mapDivRef.current, {
        center: [SAMARINDA.lat, SAMARINDA.lon],
        zoom: ZOOM_FOR_RANGE[rangeKm] ?? 8,
        zoomControl: true,
        attributionControl: true,
        worldCopyJump: true,
      });
      mapRef.current = map;

      tileLayerRef.current = L.tileLayer(TILE[mapThemeRef.current].url, {
        maxNativeZoom: TILE[mapThemeRef.current].maxNativeZoom,
        maxZoom: 19,
        attribution: TILE_ATTR,
      }).addTo(map);

      // Marker bandara
      const airportIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative">
            <div style="position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:9999px;background:#fbbf24;box-shadow:0 0 12px 4px rgba(251,191,36,0.7);border:2px solid #fff7"></div>
            <div style="position:absolute;left:12px;top:-9px;white-space:nowrap;font:700 11px ui-sans-serif;color:#fbbf24;text-shadow:0 1px 3px #000">AAP · Samarinda</div>
          </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([SAMARINDA.lat, SAMARINDA.lon], {
        icon: airportIcon,
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      layerRef.current = layer;

      // Jaga ukuran peta saat container berubah (collapse sidebar, dll)
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(mapDivRef.current);
      roRef.current = ro;
      setTimeout(() => map.invalidateSize(), 200);

      // Animation loop (dead-reckoning halus)
      const tick = () => {
        renderMarkers();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      markersRef.current.clear();
      trailLineRef.current = null;
      layerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMounted]);

  // Recenter / zoom saat range berubah
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView(
      [SAMARINDA.lat, SAMARINDA.lon],
      ZOOM_FOR_RANGE[rangeKm] ?? 8,
      { animate: true },
    );
  }, [rangeKm]);

  // Ganti tile saat tema peta berubah (terang/gelap)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    tileLayerRef.current = L.tileLayer(TILE[mapTheme].url, {
      maxNativeZoom: TILE[mapTheme].maxNativeZoom,
      maxZoom: 19,
      attribution: TILE_ATTR,
    }).addTo(map);
    tileLayerRef.current.bringToBack();
    // Paksa label pesawat terbangun ulang dengan warna kontras tema baru
    const layer = layerRef.current;
    if (layer) {
      for (const entry of markersRef.current.values()) {
        layer.removeLayer(entry.marker);
      }
      markersRef.current.clear();
    }
  }, [mapTheme]);

  // ───────────────── Render markers (imperative) ─────────────────
  const renderMarkers = useCallback(() => {
    const L = LRef.current;
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!L || !layer || !map) return;

    const snap = snapshotRef.current;
    const now = Date.now();
    const selId = selectedRef.current;
    const flt = filterRef.current;
    const entries = markersRef.current;
    const seen = new Set<string>();

    if (snap) {
      for (const ac of snap.aircraft) {
        seen.add(ac.id);
        const dtSec = (now - ac.sampledAt) / 1000;
        const pos = deadReckon(
          ac.lat,
          ac.lon,
          ac.velocityMs,
          ac.headingDeg,
          dtSec,
        );
        const selected = ac.id === selId;
        const dimmed = flt !== "all" && ac.category !== flt && !selected;
        if (dimmed) {
          // Sembunyikan yang terfilter
          const ex = entries.get(ac.id);
          if (ex) {
            layer.removeLayer(ex.marker);
            entries.delete(ac.id);
          }
          continue;
        }

        const dark = mapThemeRef.current === "dark";
        let entry = entries.get(ac.id);
        if (!entry) {
          const marker = L.marker([pos.lat, pos.lon], {
            icon: buildPlaneIcon(L, ac, selected, dark),
            zIndexOffset: selected ? 1000 : 0,
          });
          marker.on("click", () => onSelectRef.current(ac.id));
          marker.addTo(layer);
          entry = {
            marker,
            heading: ac.headingDeg ?? 0,
            category: ac.category,
            selected,
            trail: [],
            lastTrailAt: 0,
          };
          entries.set(ac.id, entry);
        } else {
          entry.marker.setLatLng([pos.lat, pos.lon]);
          // Update icon hanya saat berubah (heading/kategori/seleksi)
          if (
            entry.heading !== (ac.headingDeg ?? 0) ||
            entry.category !== ac.category ||
            entry.selected !== selected
          ) {
            entry.marker.setIcon(buildPlaneIcon(L, ac, selected, dark));
            entry.marker.setZIndexOffset(selected ? 1000 : 0);
            entry.heading = ac.headingDeg ?? 0;
            entry.category = ac.category;
            entry.selected = selected;
          }
        }

        // Trail
        if (now - entry.lastTrailAt > 1000) {
          entry.trail.push([pos.lat, pos.lon]);
          if (entry.trail.length > 40) entry.trail.shift();
          entry.lastTrailAt = now;
        }
      }
    }

    // Bersihkan marker stale
    for (const [id, entry] of Array.from(entries.entries())) {
      if (!seen.has(id)) {
        layer.removeLayer(entry.marker);
        entries.delete(id);
      }
    }

    // Trail polyline untuk yang terpilih
    const selEntry = selId ? entries.get(selId) : null;
    if (selEntry && selEntry.trail.length > 1) {
      const meta = CATEGORY_META[selEntry.category];
      if (!trailLineRef.current) {
        trailLineRef.current = L.polyline(selEntry.trail, {
          color: meta.color,
          weight: 2.5,
          opacity: 0.7,
          dashArray: "1 6",
        }).addTo(map);
      } else {
        trailLineRef.current.setLatLngs(selEntry.trail);
        trailLineRef.current.setStyle({ color: meta.color });
      }
    } else if (trailLineRef.current) {
      trailLineRef.current.remove();
      trailLineRef.current = null;
    }
  }, []);

  // ───────────────────────── Derived UI data ─────────────────────────
  const aircraft = snapshot?.aircraft ?? [];
  const counts = useMemo(() => {
    const c = { ARRIVING: 0, DEPARTING: 0, OVERFLIGHT: 0, GROUND: 0 };
    for (const a of aircraft) c[a.category]++;
    return c;
  }, [aircraft]);

  const sortedList = useMemo(() => {
    const list =
      filter === "all"
        ? aircraft
        : aircraft.filter((a) => a.category === filter);
    return [...list].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [aircraft, filter]);

  const selected = useMemo(
    () => aircraft.find((a) => a.id === selectedId) ?? null,
    [aircraft, selectedId],
  );

  const dataAgeSec = snapshot
    ? Math.max(0, Math.round((nowTick - snapshot.fetchedAt) / 1000))
    : null;

  const focusSelected = useCallback((ac: Aircraft) => {
    const map = mapRef.current;
    if (map) map.panTo([ac.lat, ac.lon], { animate: true });
  }, []);

  return (
    <>
      <div className="space-y-4">
        {/* Hero / controls */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-gradient-to-br from-[#0b1a30] via-[#0a1830] to-[#071324] p-5 shadow-[0_18px_50px_-24px_rgba(8,47,90,0.8)] sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                <RadarIcon className="h-3.5 w-3.5 animate-spin-slow" />
                Live Flight Radar
              </div>
              <h2 className="mt-3 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
                Monitoring Pesawat Samarinda
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-300/80">
                Pantau lalu lintas udara menuju & dari{" "}
                <span className="font-semibold text-emerald-300">
                  Bandara APT Pranoto (AAP/WALS)
                </span>{" "}
                di peta langsung. Klik ikon pesawat untuk telemetri detail.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-900/60 p-1 ring-1 ring-slate-700/60">
                {(["live", "demo"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSource(s);
                      setSelectedId(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      source === s
                        ? s === "live"
                          ? "bg-emerald-500 text-slate-900 shadow-sm"
                          : "bg-sky-500 text-slate-900 shadow-sm"
                        : "text-slate-300 hover:text-white",
                    )}
                  >
                    {s === "live" ? (
                      <Satellite className="h-3.5 w-3.5" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    {s === "live" ? "Live" : "Demo"}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-xl bg-slate-900/60 p-1 ring-1 ring-slate-700/60">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRangeKm(r)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums transition",
                      rangeKm === r
                        ? "bg-slate-100 text-slate-900 shadow-sm"
                        : "text-slate-300 hover:text-white",
                    )}
                  >
                    {r}km
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  source === "live"
                    ? loadLive(rangeKm)
                    : setSnapshot(stepDemo(rangeKm))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-white"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    status === "loading" && "animate-spin",
                  )}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatChip
              icon={<Plane className="h-4 w-4" />}
              label="Total terlacak"
              value={aircraft.length}
              tone="slate"
            />
            <StatChip
              icon={<PlaneLanding className="h-4 w-4" />}
              label="Menuju Samarinda"
              value={counts.ARRIVING + counts.GROUND}
              tone="emerald"
            />
            <StatChip
              icon={<PlaneTakeoff className="h-4 w-4" />}
              label="Dari Samarinda"
              value={counts.DEPARTING}
              tone="sky"
            />
            <StatChip
              icon={<Signal className="h-4 w-4" />}
              label="Sumber data"
              value={source === "live" ? "OpenSky" : "Demo"}
              sub={
                dataAgeSec != null ? `update ${dataAgeSec}s lalu` : "menunggu…"
              }
              tone={source === "live" ? "emerald" : "sky"}
            />
          </div>

          {status === "error" && (
            <div className="relative mt-4 flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 shrink-0" />
                {errorMsg ?? "Data live tidak tersedia."}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSource("demo");
                  setSelectedId(null);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-amber-300 sm:self-auto"
              >
                <Zap className="h-3.5 w-3.5" />
                Pakai mode Demo
              </button>
            </div>
          )}
        </section>

        {/* Map + panel */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Map */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-[#0b1020] shadow-[0_18px_50px_-24px_rgba(8,47,90,0.8)]">
            <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Crosshair className="h-4 w-4 text-emerald-400" />
                Peta Langsung · APT Pranoto
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setMapTheme((t) => (t === "light" ? "dark" : "light"))
                  }
                  title={
                    mapTheme === "light" ? "Ganti peta gelap" : "Ganti peta terang"
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/70 px-2 py-1 text-[10.5px] font-semibold text-slate-200 ring-1 ring-slate-700/60 transition hover:bg-slate-700"
                >
                  {mapTheme === "light" ? (
                    <Moon className="h-3.5 w-3.5" />
                  ) : (
                    <Sun className="h-3.5 w-3.5" />
                  )}
                  {mapTheme === "light" ? "Gelap" : "Terang"}
                </button>
                <span className="hidden h-3 w-px bg-slate-700 sm:block" />
                {(["ARRIVING", "DEPARTING", "OVERFLIGHT"] as const).map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-400"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_META[k].color }}
                    />
                    {CATEGORY_META[k].short}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div
                ref={setMapNode}
                className="h-[60vh] min-h-[420px] w-full"
                style={{ background: TILE[mapTheme].bg }}
              />
              {aircraft.length === 0 && status !== "loading" && (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] flex justify-center">
                  <div className="rounded-2xl bg-slate-900/85 px-4 py-2.5 text-center text-xs text-slate-300 ring-1 ring-slate-700/60 backdrop-blur">
                    <Globe2 className="mx-auto mb-1 h-4 w-4 text-slate-400" />
                    Tidak ada pesawat di area ini. Perbesar range atau aktifkan
                    mode Demo.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="flex min-h-0 flex-col gap-4">
            {selected ? (
              <SelectedCard
                ac={selected}
                onClose={() => setSelectedId(null)}
                onLocate={() => focusSelected(selected)}
                nowTick={nowTick}
              />
            ) : (
              <div className="rounded-3xl border border-slate-200/70 bg-surface/95 p-5 text-center shadow-card dark:border-hairline">
                <TowerControl className="mx-auto h-8 w-8 text-blue-500/70" />
                <p className="mt-2 text-sm font-semibold text-ink">
                  Belum ada pesawat dipilih
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Klik ikon pesawat di peta atau item di daftar untuk melihat
                  telemetri detail.
                </p>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200/70 bg-surface/95 shadow-card dark:border-hairline">
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-hairline p-2.5">
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  const n =
                    f.key === "all"
                      ? aircraft.length
                      : counts[f.key as FlightCategory];
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold transition",
                        active
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {f.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] tabular-nums",
                          active
                            ? "bg-white/20"
                            : "bg-surface-2 text-ink-subtle",
                        )}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[52vh] flex-1 space-y-1.5 overflow-y-auto p-2.5">
                {sortedList.length === 0 ? (
                  <p className="px-2 py-8 text-center text-xs text-ink-muted">
                    Tidak ada penerbangan pada filter ini.
                  </p>
                ) : (
                  sortedList.map((ac) => (
                    <FlightRow
                      key={ac.id}
                      ac={ac}
                      active={ac.id === selectedId}
                      onClick={() => {
                        setSelectedId(ac.id === selectedId ? null : ac.id);
                        focusSelected(ac);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="px-1 text-[11px] leading-5 text-ink-subtle">
          <span className="font-semibold">Catatan:</span> kategori
          “Datang/Berangkat” adalah estimasi heuristik dari posisi, arah, &
          ketinggian (OpenSky gratis tidak menyediakan rute resmi). Data live
          bisa terlambat ±30–60 detik dan tergantung jangkauan receiver ADS-B di
          wilayah Kalimantan Timur. Peta: © Esri & OpenStreetMap.
        </p>
      </div>
    </>
  );
}

// ───────────────────────────── Subcomponents ─────────────────────────────

function StatChip({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone: "slate" | "emerald" | "sky";
}) {
  const toneCls = {
    slate: "text-slate-300 ring-slate-700/60",
    emerald: "text-emerald-300 ring-emerald-500/30",
    sky: "text-sky-300 ring-sky-500/30",
  }[tone];
  return (
    <div className="rounded-2xl bg-slate-900/50 p-3 ring-1 ring-slate-700/50">
      <div className={cn("inline-flex items-center gap-1.5", toneCls)}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-white">
        {value}
      </p>
      {sub && <p className="text-[10.5px] text-slate-400">{sub}</p>}
    </div>
  );
}

function FlightRow({
  ac,
  active,
  onClick,
}: {
  ac: Aircraft;
  active: boolean;
  onClick: () => void;
}) {
  const meta = CATEGORY_META[ac.category];
  const ft = metersToFeet(ac.baroAltM);
  const kts = msToKnots(ac.velocityMs);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
        active
          ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-sky-500/10 dark:ring-sky-500/25"
          : "hover:bg-surface-2",
      )}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
      >
        <Plane
          className="h-4 w-4"
          style={{ transform: `rotate(${ac.headingDeg ?? 0}deg)` }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-bold text-ink">
            {ac.callsign || ac.id.slice(0, 6)}
          </p>
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
          >
            {meta.short}
          </span>
        </div>
        <p className="truncate text-[11px] text-ink-muted">{ac.airlineName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-bold tabular-nums text-ink">
          {Math.round(ac.distanceKm)} km
        </p>
        <p className="text-[10px] tabular-nums text-ink-subtle">
          {ft ? `${ft}ft` : "—"} · {kts ? `${kts}kt` : "—"}
        </p>
      </div>
    </button>
  );
}

function SelectedCard({
  ac,
  onClose,
  onLocate,
  nowTick,
}: {
  ac: Aircraft;
  onClose: () => void;
  onLocate: () => void;
  nowTick: number;
}) {
  const meta = CATEGORY_META[ac.category];
  const ft = metersToFeet(ac.baroAltM);
  const kts = msToKnots(ac.velocityMs);
  const kmh = msToKmh(ac.velocityMs);
  const fpm = msToFpm(ac.verticalRateMs);
  const ageSec = Math.max(0, Math.round(nowTick / 1000 - ac.lastContact));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-gradient-to-br from-[#0b1a30] to-[#071324] shadow-[0_18px_50px_-24px_rgba(8,47,90,0.8)]">
      <div
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{
          background: `linear-gradient(135deg, ${meta.color}22, transparent)`,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: `${meta.color}1f`,
              color: meta.color,
              boxShadow: `0 0 18px ${meta.glow}`,
            }}
          >
            <Plane
              className="h-5 w-5"
              style={{ transform: `rotate(${ac.headingDeg ?? 0}deg)` }}
            />
          </span>
          <div>
            <p className="text-lg font-extrabold leading-tight text-white">
              {ac.callsign || ac.id.slice(0, 6)}
            </p>
            <p className="text-[11.5px] text-slate-300/80">{ac.airlineName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onLocate}
            title="Pusatkan di peta"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Locate className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            Tutup
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
        >
          {ac.category === "ARRIVING" || ac.category === "GROUND" ? (
            <PlaneLanding className="h-3.5 w-3.5" />
          ) : ac.category === "DEPARTING" ? (
            <PlaneTakeoff className="h-3.5 w-3.5" />
          ) : (
            <Plane className="h-3.5 w-3.5" />
          )}
          {meta.label}
        </span>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Telemetry
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="Altitude"
            value={ft != null ? `${ft.toLocaleString()} ft` : "—"}
          />
          <Telemetry
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Ground speed"
            value={kts != null ? `${kts} kt` : "—"}
            sub={kmh != null ? `${kmh} km/j` : undefined}
          />
          <Telemetry
            icon={<Compass className="h-3.5 w-3.5" />}
            label="Heading"
            value={ac.headingDeg != null ? `${Math.round(ac.headingDeg)}°` : "—"}
          />
          <Telemetry
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Vertical rate"
            value={fpm != null ? `${fpm > 0 ? "+" : ""}${fpm} fpm` : "—"}
          />
          <Telemetry
            icon={<Crosshair className="h-3.5 w-3.5" />}
            label="Jarak dari AAP"
            value={`${Math.round(ac.distanceKm)} km`}
          />
          <Telemetry
            icon={<Compass className="h-3.5 w-3.5" />}
            label="Bearing"
            value={`${Math.round(ac.bearingFromAirport)}°`}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5" />
            {ac.country}
          </span>
          {ac.squawk && (
            <span className="inline-flex items-center gap-1.5">
              <Signal className="h-3.5 w-3.5" />
              Squawk {ac.squawk}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            kontak {ageSec}s lalu
          </span>
          <span className="font-mono text-slate-500">{ac.id}</span>
        </div>
      </div>
    </div>
  );
}

function Telemetry({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900/50 px-3 py-2 ring-1 ring-slate-700/50">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-[15px] font-extrabold tabular-nums text-white">
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ───────────────────────────── Leaflet helpers ─────────────────────────────

/** Bangun divIcon pesawat (SVG berputar sesuai heading) + label callsign. */
function buildPlaneIcon(
  L: typeof LeafletNS,
  ac: Aircraft,
  selected: boolean,
  dark: boolean,
): LeafletNS.DivIcon {
  const meta = CATEGORY_META[ac.category];
  const size = selected ? 34 : 26;
  const half = size / 2;
  const label = ac.callsign || ac.id.slice(0, 6);
  // Label kontras dengan tema peta (putih+bayangan gelap di dark, gelap+halo putih di terang)
  const labelColor = dark
    ? selected
      ? "#ffffff"
      : "rgba(226,232,240,0.95)"
    : selected
      ? "#0f172a"
      : "rgba(15,23,42,0.92)";
  const labelShadow = dark
    ? "0 1px 3px #000,0 0 2px #000"
    : "0 1px 2px #fff,0 0 3px #fff,0 0 2px #fff";
  const stroke = dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.85)";
  const planePath =
    "M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L11 19v-5.5z";
  const html = `
    <div style="position:relative;width:0;height:0;">
      <div style="position:absolute;left:${-half}px;top:${-half}px;width:${size}px;height:${size}px;transform:rotate(${
        ac.headingDeg ?? 0
      }deg);filter:drop-shadow(0 0 ${selected ? 7 : 4}px ${meta.glow});">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${
          meta.color
        }" stroke="${stroke}" stroke-width="0.8">
          <path d="${planePath}"/>
        </svg>
      </div>
      <div style="position:absolute;left:${half - 2}px;top:${
        -half - 4
      }px;white-space:nowrap;font:${
        selected ? "700" : "600"
      } 10px ui-monospace,monospace;color:${labelColor};text-shadow:${labelShadow};">${label}</div>
    </div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
