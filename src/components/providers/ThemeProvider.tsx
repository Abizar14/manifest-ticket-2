"use client";

import { useEffect } from "react";
import { applyTheme, getTheme, subscribeTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Reconcile with current settings after mount (anti-FOUC script handles
    // the very first paint via inline <script> in <head>).
    applyTheme(getTheme());
    const unsub = subscribeTheme((t) => applyTheme(t));
    return unsub;
  }, []);

  return <>{children}</>;
}
