"use client";

import { AirlineMeta, getAirlineMeta } from "./airlines";

/**
 * Radar / live flight tracking service — Samarinda (APT Pranoto).
 *
 * Sumber data utama: OpenSky Network REST `states/all` (anonim, tanpa API key,
 * CORS-friendly). Kalau gagal / kosong / kena rate-limit, UI bisa fallback ke
 * mode DEMO (simulator deterministik di sisi klien) supaya tetap hidup.
 *
 * Semua client-side — konsisten dengan arsitektur offline-first aplikasi.
 */

/** Bandar Udara Internasional APT Pranoto, Samarinda. */
export const SAMARINDA = {
  iata: "AAP",
  icao: "WALS",
  name: "Bandara APT Pranoto",
  city: "Samarinda",
  lat: -0.3741667,
  lon: 117.2575,
} as const;

export type FlightCategory = "ARRIVING" | "DEPARTING" | "OVERFLIGHT" | "GROUND";

export interface Aircraft {
  /** ICAO24 hex address — id unik & stabil. */
  id: string;
  /** Callsign ATC (mis. "CTV432"), sudah di-trim. */
  callsign: string;
  country: string;
  lat: number;
  lon: number;
  /** Altitude barometrik (meter). */
  baroAltM: number | null;
  geoAltM: number | null;
  onGround: boolean;
  /** Ground speed (m/s). */
  velocityMs: number | null;
  /** True track / heading (derajat, 0 = utara). */
  headingDeg: number | null;
  /** Vertical rate (m/s, + naik, − turun). */
  verticalRateMs: number | null;
  squawk: string | null;
  /** Unix detik kontak terakhir. */
  lastContact: number;

  // ── Turunan (dihitung relatif ke Samarinda) ──
  distanceKm: number;
  /** Bearing dari bandara ke pesawat (derajat). */
  bearingFromAirport: number;
  category: FlightCategory;
  airline: AirlineMeta;
  airlineName: string;
  /** Timestamp (ms) saat sampel ini diambil — dipakai untuk dead-reckoning. */
  sampledAt: number;
}

export interface RadarSnapshot {
  aircraft: Aircraft[];
  fetchedAt: number;
  source: "live" | "demo";
}

// ───────────────────────────── Geo helpers ─────────────────────────────

const EARTH_R_KM = 6371;
const M_PER_DEG_LAT = 110574;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Bearing awal dari titik A ke titik B (derajat, 0–360). */
export function bearingDeg(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const φ1 = toRad(aLat);
  const φ2 = toRad(bLat);
  const Δλ = toRad(bLon - aLon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Selisih sudut absolut terkecil (0–180). */
function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Majukan posisi (lat/lon) sepanjang heading dengan kecepatan tertentu.
 * Dipakai untuk dead-reckoning agar blip meluncur halus di antara polling.
 */
export function deadReckon(
  lat: number,
  lon: number,
  velocityMs: number | null,
  headingDeg: number | null,
  dtSec: number,
): { lat: number; lon: number } {
  if (!velocityMs || velocityMs <= 0 || headingDeg == null || dtSec <= 0) {
    return { lat, lon };
  }
  const dist = velocityMs * dtSec; // meter
  const h = toRad(headingDeg);
  const dN = dist * Math.cos(h);
  const dE = dist * Math.sin(h);
  const nextLat = lat + dN / M_PER_DEG_LAT;
  const nextLon =
    lon + dE / (M_PER_DEG_LAT * Math.cos(toRad(lat)) || 1);
  return { lat: nextLat, lon: nextLon };
}

// ─────────────────────── Airline (ICAO callsign) ───────────────────────

/** Prefix callsign ICAO (3 huruf) → kode IATA + nama. Best-effort. */
const ICAO_AIRLINE: Record<string, { iata: string; name: string }> = {
  GIA: { iata: "GA", name: "Garuda Indonesia" },
  LNI: { iata: "JT", name: "Lion Air" },
  CTV: { iata: "QG", name: "Citilink" },
  BTK: { iata: "ID", name: "Batik Air" },
  SJY: { iata: "SJ", name: "Sriwijaya Air" },
  WON: { iata: "IW", name: "Wings Air" },
  AWQ: { iata: "QZ", name: "Indonesia AirAsia" },
  PAS: { iata: "IP", name: "Pelita Air" },
  SJV: { iata: "IU", name: "Super Air Jet" },
  TGN: { iata: "8B", name: "TransNusa" },
};

function resolveAirline(callsign: string): {
  meta: AirlineMeta;
  name: string;
} {
  const prefix = callsign.slice(0, 3).toUpperCase();
  const hit = ICAO_AIRLINE[prefix];
  if (hit) {
    return { meta: getAirlineMeta(hit.iata), name: hit.name };
  }
  return { meta: getAirlineMeta(prefix), name: callsign || "Unknown" };
}

// ───────────────────────────── Klasifikasi ─────────────────────────────

/**
 * Tentukan kategori penerbangan relatif ke Samarinda (heuristik — OpenSky
 * gratis tidak menyediakan origin/destination, jadi disimpulkan dari geometri).
 */
function classify(
  lat: number,
  lon: number,
  headingDeg: number | null,
  verticalRateMs: number | null,
  baroAltM: number | null,
  geoAltM: number | null,
  onGround: boolean,
  distanceKm: number,
): FlightCategory {
  if (onGround && distanceKm < 8) return "GROUND";

  const bearingToAirport = bearingDeg(lat, lon, SAMARINDA.lat, SAMARINDA.lon);
  const diff = angleDiff(headingDeg ?? 0, bearingToAirport);
  const approaching = diff < 75;
  const receding = diff > 105;
  const vr = verticalRateMs ?? 0;
  const alt = baroAltM ?? geoAltM ?? 99999;

  if (approaching && (vr < -0.7 || (distanceKm < 140 && alt < 5000))) {
    return "ARRIVING";
  }
  if (receding && (vr > 0.7 || (distanceKm < 140 && alt < 6500))) {
    return "DEPARTING";
  }
  return "OVERFLIGHT";
}

function buildAircraft(
  raw: {
    id: string;
    callsign: string;
    country: string;
    lat: number;
    lon: number;
    baroAltM: number | null;
    geoAltM: number | null;
    onGround: boolean;
    velocityMs: number | null;
    headingDeg: number | null;
    verticalRateMs: number | null;
    squawk: string | null;
    lastContact: number;
  },
  sampledAt: number,
): Aircraft {
  const distanceKm = haversineKm(
    SAMARINDA.lat,
    SAMARINDA.lon,
    raw.lat,
    raw.lon,
  );
  const bearingFromAirport = bearingDeg(
    SAMARINDA.lat,
    SAMARINDA.lon,
    raw.lat,
    raw.lon,
  );
  const category = classify(
    raw.lat,
    raw.lon,
    raw.headingDeg,
    raw.verticalRateMs,
    raw.baroAltM,
    raw.geoAltM,
    raw.onGround,
    distanceKm,
  );
  const { meta, name } = resolveAirline(raw.callsign);
  return {
    ...raw,
    distanceKm,
    bearingFromAirport,
    category,
    airline: meta,
    airlineName: name,
    sampledAt,
  };
}

// ─────────────────────────── OpenSky (live) ───────────────────────────

const OPENSKY_URL = "https://opensky-network.org/api/states/all";

/** Index kolom array state OpenSky. */
type OpenSkyState = (number | string | boolean | null)[];

function parseState(s: OpenSkyState, sampledAt: number): Aircraft | null {
  const lon = s[5] as number | null;
  const lat = s[6] as number | null;
  if (lat == null || lon == null) return null;
  const callsign = ((s[1] as string | null) ?? "").trim();
  return buildAircraft(
    {
      id: (s[0] as string) || `${lat},${lon}`,
      callsign,
      country: (s[2] as string) ?? "—",
      lat,
      lon,
      baroAltM: (s[7] as number | null) ?? null,
      geoAltM: (s[13] as number | null) ?? null,
      onGround: Boolean(s[8]),
      velocityMs: (s[9] as number | null) ?? null,
      headingDeg: (s[10] as number | null) ?? null,
      verticalRateMs: (s[11] as number | null) ?? null,
      squawk: (s[14] as string | null) ?? null,
      lastContact: (s[4] as number) ?? Math.floor(sampledAt / 1000),
    },
    sampledAt,
  );
}

/**
 * Ambil snapshot live dari OpenSky pada bounding-box sekitar Samarinda.
 * @param rangeKm radius area pantau (default 280 km).
 */
export async function fetchLiveRadar(rangeKm = 280): Promise<RadarSnapshot> {
  const dLat = rangeKm / 111;
  const dLon = rangeKm / (111 * Math.cos(toRad(SAMARINDA.lat)) || 1);
  const params = new URLSearchParams({
    lamin: String(SAMARINDA.lat - dLat),
    lamax: String(SAMARINDA.lat + dLat),
    lomin: String(SAMARINDA.lon - dLon),
    lomax: String(SAMARINDA.lon + dLon),
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${OPENSKY_URL}?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 429) {
      throw new Error("Rate limit OpenSky (429) — coba lagi nanti / pakai Demo.");
    }
    if (!res.ok) throw new Error(`OpenSky error ${res.status}`);
    const data = (await res.json()) as { states: OpenSkyState[] | null };
    const sampledAt = Date.now();
    const aircraft = (data.states ?? [])
      .map((s) => parseState(s, sampledAt))
      .filter((a): a is Aircraft => a !== null);
    return { aircraft, fetchedAt: sampledAt, source: "live" };
  } finally {
    clearTimeout(timer);
  }
}

// ──────────────────────────── Demo simulator ───────────────────────────

interface DemoEntity {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  altM: number;
  velocityMs: number;
  headingDeg: number;
  verticalRateMs: number;
  squawk: string;
  mode: "ARRIVING" | "DEPARTING" | "OVERFLIGHT";
}

const DEMO_CALLSIGNS = [
  "CTV", // Citilink
  "LNI", // Lion Air
  "GIA", // Garuda
  "WON", // Wings Air
  "BTK", // Batik Air
  "SJV", // Super Air Jet
  "PAS", // Pelita Air
  "AWQ", // AirAsia
];

let demoFleet: DemoEntity[] = [];
let demoLastStep = 0;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawnDemoEntity(seed: number): DemoEntity {
  const roll = Math.random();
  const mode: DemoEntity["mode"] =
    roll < 0.4 ? "ARRIVING" : roll < 0.75 ? "DEPARTING" : "OVERFLIGHT";
  const callsign = `${DEMO_CALLSIGNS[seed % DEMO_CALLSIGNS.length]}${Math.floor(
    rand(100, 999),
  )}`;
  const squawk = String(Math.floor(rand(1000, 7777)));

  if (mode === "ARRIVING") {
    // Mulai jauh, menuju bandara, turun.
    const bearing = rand(0, 360);
    const distKm = rand(150, 250);
    const dN = distKm * Math.cos(toRad(bearing));
    const dE = distKm * Math.sin(toRad(bearing));
    const lat = SAMARINDA.lat + dN / 110.574;
    const lon =
      SAMARINDA.lon + dE / (111.32 * Math.cos(toRad(SAMARINDA.lat)));
    return {
      id: `demo-${seed}-${Math.floor(rand(0, 1e6))}`,
      callsign,
      lat,
      lon,
      altM: rand(6000, 10000),
      velocityMs: rand(180, 240),
      headingDeg: (bearing + 180) % 360, // menuju bandara
      verticalRateMs: rand(-9, -3),
      squawk,
      mode,
    };
  }
  if (mode === "DEPARTING") {
    // Mulai dekat bandara, menjauh, naik.
    const bearing = rand(0, 360);
    const distKm = rand(15, 70);
    const dN = distKm * Math.cos(toRad(bearing));
    const dE = distKm * Math.sin(toRad(bearing));
    const lat = SAMARINDA.lat + dN / 110.574;
    const lon =
      SAMARINDA.lon + dE / (111.32 * Math.cos(toRad(SAMARINDA.lat)));
    return {
      id: `demo-${seed}-${Math.floor(rand(0, 1e6))}`,
      callsign,
      lat,
      lon,
      altM: rand(1500, 5000),
      velocityMs: rand(170, 230),
      headingDeg: bearing, // menjauh dari bandara
      verticalRateMs: rand(4, 11),
      squawk,
      mode,
    };
  }
  // OVERFLIGHT — lewat di ketinggian jelajah.
  const bearing = rand(0, 360);
  const distKm = rand(120, 230);
  const dN = distKm * Math.cos(toRad(bearing));
  const dE = distKm * Math.sin(toRad(bearing));
  const lat = SAMARINDA.lat + dN / 110.574;
  const lon = SAMARINDA.lon + dE / (111.32 * Math.cos(toRad(SAMARINDA.lat)));
  return {
    id: `demo-${seed}-${Math.floor(rand(0, 1e6))}`,
    callsign,
    lat,
    lon,
    altM: rand(10000, 12000),
    velocityMs: rand(220, 260),
    headingDeg: rand(0, 360),
    verticalRateMs: rand(-1, 1),
    squawk,
    mode,
  };
}

function advanceDemo(e: DemoEntity, dtSec: number) {
  const next = deadReckon(e.lat, e.lon, e.velocityMs, e.headingDeg, dtSec);
  e.lat = next.lat;
  e.lon = next.lon;
  e.altM = Math.max(0, e.altM + e.verticalRateMs * dtSec);

  // Pesawat datang yang sudah dekat & rendah → "mendarat", level off.
  if (e.mode === "ARRIVING" && e.altM < 800) {
    e.verticalRateMs = 0;
    e.altM = rand(150, 600);
  }
  // Pesawat berangkat yang sudah tinggi → level off.
  if (e.mode === "DEPARTING" && e.altM > 10500) {
    e.verticalRateMs = rand(-0.5, 0.5);
  }
}

/** Maju satu langkah simulasi demo, kembalikan snapshot. */
export function stepDemo(rangeKm = 250): RadarSnapshot {
  const now = Date.now();
  const target = 10;

  if (demoFleet.length === 0) {
    demoLastStep = now;
    demoFleet = Array.from({ length: target }, (_, i) => spawnDemoEntity(i));
  } else {
    const dtSec = Math.min(20, (now - demoLastStep) / 1000);
    demoLastStep = now;
    for (const e of demoFleet) advanceDemo(e, dtSec);
    // Respawn yang sudah keluar jangkauan agar layar tetap hidup.
    demoFleet = demoFleet.map((e, i) => {
      const dist = haversineKm(SAMARINDA.lat, SAMARINDA.lon, e.lat, e.lon);
      if (dist > rangeKm + 60) return spawnDemoEntity(i + Math.floor(now / 1000));
      return e;
    });
  }

  const aircraft = demoFleet.map((e) =>
    buildAircraft(
      {
        id: e.id,
        callsign: e.callsign,
        country: "Indonesia",
        lat: e.lat,
        lon: e.lon,
        baroAltM: e.altM,
        geoAltM: e.altM,
        onGround: e.altM < 100,
        velocityMs: e.velocityMs,
        headingDeg: e.headingDeg,
        verticalRateMs: e.verticalRateMs,
        squawk: e.squawk,
        lastContact: Math.floor(now / 1000),
      },
      now,
    ),
  );
  return { aircraft, fetchedAt: now, source: "demo" };
}

/** Reset simulator demo (mis. saat ganti sumber). */
export function resetDemo() {
  demoFleet = [];
  demoLastStep = 0;
}

// ──────────────────────────── Util tampilan ───────────────────────────

export const CATEGORY_META: Record<
  FlightCategory,
  { label: string; short: string; color: string; glow: string }
> = {
  ARRIVING: {
    label: "Menuju Samarinda",
    short: "Datang",
    color: "#34d399",
    glow: "rgba(52,211,153,0.55)",
  },
  DEPARTING: {
    label: "Dari Samarinda",
    short: "Berangkat",
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.55)",
  },
  OVERFLIGHT: {
    label: "Melintas",
    short: "Lewat",
    color: "#cbd5e1",
    glow: "rgba(203,213,225,0.4)",
  },
  GROUND: {
    label: "Di darat (APT Pranoto)",
    short: "Darat",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.55)",
  },
};

export const metersToFeet = (m: number | null) =>
  m == null ? null : Math.round(m * 3.28084);
export const msToKnots = (ms: number | null) =>
  ms == null ? null : Math.round(ms * 1.94384);
export const msToKmh = (ms: number | null) =>
  ms == null ? null : Math.round(ms * 3.6);
export const msToFpm = (ms: number | null) =>
  ms == null ? null : Math.round(ms * 196.85);
