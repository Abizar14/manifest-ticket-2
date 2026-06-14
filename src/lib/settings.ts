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
  ktpVerifyEnabled: boolean;
  ktpAutoPassThreshold: number;
  ktpManualThreshold: number;
  ktpSavePhoto: boolean;
  ktpRequireForValid: boolean;
}

const KEY = "afvs.settings";

const DEFAULTS: AppSettings = {
  soundOn: true,
  hapticOn: true,
  locale: "id",
  theme: "airport",
  flightListShowOnlyToday: true,
  autoClosePastDayFlights: true,
  boardingOpenEnabled: true,
  boardingOpenMinutesBefore: 60,
  boardingActiveEnabled: true,
  boardingActiveMinutesBefore: 30,
  boardingCloseEnabled: true,
  boardingCloseMinutesAfter: 10,
  faceCaptureEnabled: true,
  faceCameraDeviceId: null,
  kioskAutoEnter: false,
  requireFaceForScan: true,
  sikerenEnabled: false,
  sikerenEndpoint: "",
  sikerenApiKey: "",
  sikerenSyncMode: "auto",
  sikerenStation: "",
  ktpVerifyEnabled: false,
  ktpAutoPassThreshold: 0.85,
  ktpManualThreshold: 0.6,
  ktpSavePhoto: false,
  ktpRequireForValid: false,
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
