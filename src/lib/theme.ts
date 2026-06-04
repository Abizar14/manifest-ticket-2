"use client";

import { getSettings, saveSettings, subscribeSettings, type ThemeMode } from "./settings";

export type { ThemeMode };

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#0b1a2e" : "#2563eb");
  }
}

export function getTheme(): ThemeMode {
  return getSettings().theme;
}

export function setTheme(theme: ThemeMode) {
  saveSettings({ theme });
  applyTheme(theme);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === "dark" ? "airport" : "dark";
  setTheme(next);
  return next;
}

export function subscribeTheme(cb: (theme: ThemeMode) => void): () => void {
  return subscribeSettings((s) => cb(s.theme));
}

/** Inline script content for anti-FOUC. Reads localStorage before first paint. */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var raw = localStorage.getItem("afvs.settings");
    var theme = "airport";
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.theme === "dark") theme = "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "airport");
  }
})();
`.trim();
