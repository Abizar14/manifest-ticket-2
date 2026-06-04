"use client";

import { useEffect, useState } from "react";
import { Moon, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTheme,
  setTheme,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/theme";

interface Props {
  /** Compact icon-only button vs. labeled pill. */
  variant?: "icon" | "pill";
  className?: string;
}

export function ThemeSwitch({ variant = "icon", className }: Props) {
  const [theme, setLocalTheme] = useState<ThemeMode>("airport");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocalTheme(getTheme());
    setMounted(true);
    const unsub = subscribeTheme(setLocalTheme);
    return unsub;
  }, []);

  const next: ThemeMode = theme === "dark" ? "airport" : "dark";
  const label = theme === "dark" ? "Beralih ke Airport Brand" : "Beralih ke Dark";
  const Icon = theme === "dark" ? Plane : Moon;

  const toggle = () => setTheme(next);

  if (!mounted) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
          variant === "pill" && "w-auto px-3",
          className,
        )}
      />
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggle}
        title={label}
        aria-label={label}
        className={cn(
          "group inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink hover:shadow-sm",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 text-brandvar transition group-hover:rotate-12" />
        {theme === "dark" ? "Dark" : "Airport"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cn(
        "group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-surface text-ink-muted transition hover:border-brandvar/40 hover:text-ink hover:shadow-sm",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity",
          theme === "dark"
            ? "bg-gradient-to-br from-sky-500/15 to-indigo-500/15"
            : "bg-gradient-to-br from-blue-500/10 to-cyan-400/10",
        )}
      />
      <Icon className="relative h-4 w-4 text-brandvar transition group-hover:rotate-12" />
    </button>
  );
}
