"use client";

export type Locale = "id" | "en";
export type ThemeMode = "airport" | "dark";
export type SikerenSyncMode = "auto" | "manual";

export interface AppSettings {
  soundOn: boolean;
  hapticOn: boolean;
  locale: Locale;
  theme: ThemeMode;
  flightListShowOnlyToday: boolean;
  autoClosePastDayFlights: boolean;
  boardingOpenEnabled: boolean;
  boardingOpenMinutesBefore: number;
  boardingActiveEnabled: boolean;
  boardingActiveMinutesBefore: number;
  boardingCloseEnabled: boolean;
  boardingCloseMinutesAfter: number;
  faceCaptureEnabled: boolean;
  faceCameraDeviceId: string | null;
  kioskAutoEnter: boolean;
  requireFaceForScan: boolean;
  sikerenEnabled: boolean;
  sikerenEndpoint: string;
  sikerenApiKey: string;
  sikerenSyncMode: SikerenSyncMode;
  sikerenStation: string;
  /** Sinkronisasi scan & flight ke backend AFVS (NestJS). */
  apiSyncEnabled: boolean;
  /** Auto-tarik jadwal keberangkatan dari FIDS bandara tiap beberapa menit. */
  fidsAutoSync: boolean;
  ktpVerifyEnabled: boolean;
  ktpAutoPassThreshold: number;
  ktpManualThreshold: number;
  ktpSavePhoto: boolean;
  ktpRequireForValid: boolean;
  /** Mode kiosk "KTP dulu": kamera memindai KTP lebih dulu, lalu boarding pass
   *  dicocokkan ke nama KTP. Tanpa capture wajah. */
  ktpScanFirst: boolean;
  /** Izinkan jalur "Tanpa KTP" di mode KTP-first — 1 tap + audit. */
  allowNoKtpExemption: boolean;
  /** Jenis dokumen identitas yang dibaca di KTP-first: "ktp" | "sim" | "id". */
  idDocType: "ktp" | "sim" | "id";
}

const KEY = "afvs.settings";

/**
 * Setelan boarding rekomendasi untuk POS PENDATAAN PRA X-RAY (mode hybrid):
 * scan dibuka lama (4 jam sebelum STD), final call dimatikan, penutupan utama
 * mengikuti papan FIDS ("Departured") dengan pengaman waktu STD+30. Dipakai
 * sebagai default DAN oleh tombol "Reset boarding ke rekomendasi" di Pengaturan.
 */
export type BoardingSettings = Pick<
  AppSettings,
  | "boardingOpenEnabled"
  | "boardingOpenMinutesBefore"
  | "boardingActiveEnabled"
  | "boardingActiveMinutesBefore"
  | "boardingCloseEnabled"
  | "boardingCloseMinutesAfter"
>;

export const RECOMMENDED_BOARDING: BoardingSettings = {
  boardingOpenEnabled: true,
  boardingOpenMinutesBefore: 240,
  boardingActiveEnabled: false,
  boardingActiveMinutesBefore: 30,
  boardingCloseEnabled: true,
  boardingCloseMinutesAfter: 30,
};

const DEFAULTS: AppSettings = {
  soundOn: true,
  hapticOn: true,
  locale: "id",
  theme: "airport",
  flightListShowOnlyToday: true,
  autoClosePastDayFlights: true,
  // Pos pendataan pra X-ray (mode hybrid) — lihat RECOMMENDED_BOARDING.
  ...RECOMMENDED_BOARDING,
  faceCaptureEnabled: true,
  faceCameraDeviceId: null,
  kioskAutoEnter: false,
  requireFaceForScan: true,
  sikerenEnabled: false,
  sikerenEndpoint: "",
  sikerenApiKey: "",
  sikerenSyncMode: "auto",
  sikerenStation: "",
  apiSyncEnabled: false,
  fidsAutoSync: true,
  ktpVerifyEnabled: false,
  ktpAutoPassThreshold: 0.85,
  ktpManualThreshold: 0.6,
  ktpSavePhoto: false,
  ktpRequireForValid: false,
  ktpScanFirst: false,
  allowNoKtpExemption: true,
  idDocType: "ktp",
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSettings(): AppSettings {
  if (!isBrowser()) return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(patch: Partial<AppSettings>) {
  if (!isBrowser()) return;
  const next = { ...getSettings(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("afvs:settings", { detail: next }));
}

export function subscribeSettings(cb: (s: AppSettings) => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<AppSettings>).detail;
    cb(detail ?? getSettings());
  };
  window.addEventListener("afvs:settings", handler);
  return () => window.removeEventListener("afvs:settings", handler);
}
