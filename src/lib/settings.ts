"use client";

export type Locale = "id" | "en";
export type ThemeMode = "airport" | "dark";

export interface AppSettings {
  soundOn: boolean;
  hapticOn: boolean;
  locale: Locale;
  theme: ThemeMode;
  flightListShowOnlyToday: boolean;
  autoClosePastDayFlights: boolean;
  boardingOpenMinutesBefore: number;
  boardingActiveMinutesBefore: number;
  boardingCloseMinutesAfter: number;
}

const KEY = "afvs.settings";

const DEFAULTS: AppSettings = {
  soundOn: true,
  hapticOn: true,
  locale: "id",
  theme: "airport",
  flightListShowOnlyToday: true,
  autoClosePastDayFlights: true,
  boardingOpenMinutesBefore: 60,
  boardingActiveMinutesBefore: 30,
  boardingCloseMinutesAfter: 10,
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
