"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ScanLine,
  Plane,
  History,
  Menu,
  Camera,
  Bluetooth,
  X,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onMoreClick: () => void;
}

type TabTone = "blue" | "sky" | "amber" | "slate";

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (p: string) => boolean;
  tone: TabTone;
}

const TONES: Record<
  TabTone,
  {
    text: string;
    iconBg: string;
    indicator: string;
    glow: string;
  }
> = {
  blue: {
    text: "text-blue-700",
    iconBg: "from-blue-100 to-cyan-100 text-blue-700",
    indicator: "from-blue-500 to-cyan-400",
    glow: "shadow-[0_0_12px_rgba(59,130,246,0.6)]",
  },
  sky: {
    text: "text-sky-700",
    iconBg: "from-sky-100 to-indigo-100 text-sky-700",
    indicator: "from-sky-500 to-indigo-400",
    glow: "shadow-[0_0_12px_rgba(14,165,233,0.6)]",
  },
  amber: {
    text: "text-amber-700",
    iconBg: "from-amber-100 to-orange-100 text-amber-700",
    indicator: "from-amber-500 to-orange-400",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.6)]",
  },
  slate: {
    text: "text-violet-700",
    iconBg: "from-violet-100 to-fuchsia-100 text-violet-700",
    indicator: "from-violet-500 to-fuchsia-400",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.6)]",
  },
};

const LEFT_TABS: Tab[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    match: (p) => p.startsWith("/dashboard"),
    tone: "blue",
  },
  {
    href: "/flights",
    label: "Flights",
    icon: Plane,
    match: (p) => p === "/flights" || p.startsWith("/flights/"),
    tone: "sky",
  },
];

const RIGHT_TABS: Tab[] = [
  {
    href: "/scan-events",
    label: "Events",
    icon: History,
    match: (p) => p.startsWith("/scan-events"),
    tone: "amber",
  },
];

export function BottomNav({ onMoreClick }: Props) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const scanActive = pathname === "/scan";

  useEffect(() => {
    if (pickerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  const go = (href: string) => {
    setPickerOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* ============ Bottom Sheet Picker ============ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setPickerOpen(false)}
            className="absolute inset-0 animate-fade-in bg-slate-950/60 backdrop-blur-md"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="absolute inset-x-0 bottom-0 animate-sheet-up overflow-hidden rounded-t-3xl border-t border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 text-white shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-drift rounded-full bg-cyan-400/20 blur-3xl" />
            <div
              className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 animate-drift rounded-full bg-blue-400/20 blur-3xl"
              style={{ animationDelay: "1.5s" }}
            />

            <div className="relative flex items-center justify-between">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-white/25" />
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="absolute right-0 top-0 -translate-y-1 rounded-full bg-white/10 p-1.5 text-white/80 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-4">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200 ring-1 ring-white/15 backdrop-blur">
                <Sparkles className="h-3 w-3" />
                Pilih Metode Scan
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight">
                Mau scan pakai apa?
              </h3>
              <p className="mt-0.5 text-xs text-white/65">
                Pilih sesuai perangkat yang tersedia di pos.
              </p>
            </div>

            <div className="relative mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <ScanOption
                onClick={() => go("/scan?source=camera")}
                icon={<Camera className="h-6 w-6" />}
                title="Kamera"
                subtitle="Pakai kamera HP / tablet"
                accent="from-blue-500 to-cyan-400"
                badge="Default"
                animDelay="60ms"
              />
              <ScanOption
                onClick={() => go("/scan?source=usb")}
                icon={<Bluetooth className="h-6 w-6" />}
                title="USB / Bluetooth"
                subtitle="Scanner fisik (auto-Enter)"
                accent="from-violet-500 to-fuchsia-500"
                badge="Cepat"
                animDelay="140ms"
              />
            </div>

            <button
              type="button"
              onClick={() => go("/scan?source=manual")}
              className="relative mt-3 flex w-full animate-fade-up items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/10"
              style={{ animationDelay: "220ms" }}
            >
              <Keyboard className="h-4 w-4" />
              Input Manual (ketik kode)
            </button>
          </div>
        </div>
      )}

      {/* ============ Floating Dock Bottom Nav ============ */}
      <nav
        aria-label="Bottom navigation"
        className="fixed inset-x-0 bottom-0 z-30 animate-fade-up px-3 pb-3 lg:hidden print:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="relative mx-auto max-w-md">
          {/* outer glow halo */}
          <div className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-blue-400/20 via-violet-400/20 to-amber-400/20 blur-xl" />

          {/* multi-color gradient ring */}
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-r from-blue-400/40 via-violet-400/40 to-amber-400/40 p-px">
            <div className="h-full w-full rounded-[1.7rem] bg-white/0" />
          </div>

          {/* main dock */}
          <div className="relative rounded-[1.75rem] border border-white/70 bg-gradient-to-b from-white/95 to-white/85 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.5)_inset]">
            {/* inner top highlight */}
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            {/* inner bottom shadow */}
            <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-900/10 to-transparent" />

            <div className="relative grid grid-cols-5">
              {LEFT_TABS.map((tab) => (
                <NavItem
                  key={tab.href}
                  tab={tab}
                  active={tab.match(pathname)}
                />
              ))}

              {/* center FAB */}
              <div className="relative flex items-start justify-center">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  aria-label="Buka pilihan scan"
                  aria-expanded={pickerOpen}
                  className="group relative -mt-7 flex flex-col items-center gap-0.5 pb-1.5"
                >
                  {/* rotating conic gradient halo */}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute left-1/2 top-0 -mt-1 h-16 w-16 -translate-x-1/2 rounded-[1.4rem] opacity-80 blur-[1px] animate-spin-slow",
                      "bg-[conic-gradient(from_0deg,#3b82f6,#22d3ee,#a855f7,#f59e0b,#3b82f6)]",
                    )}
                  />
                  {/* pulse ring when idle */}
                  {!scanActive && !pickerOpen && (
                    <span className="pointer-events-none absolute left-1/2 top-0 -mt-1 h-16 w-16 -translate-x-1/2 animate-pulse-glow rounded-[1.4rem]" />
                  )}

                  {/* main button face */}
                  <span
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.25rem] bg-gradient-to-br shadow-[0_12px_30px_-8px_rgba(59,130,246,0.6)] ring-[3px] ring-white transition-all duration-300 group-hover:scale-105 group-active:scale-95",
                      scanActive
                        ? "from-emerald-500 via-teal-500 to-cyan-500"
                        : "from-blue-600 via-blue-500 to-cyan-400",
                      pickerOpen && "scale-95 rotate-6",
                    )}
                  >
                    {/* inner gloss */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.5),transparent_55%)]"
                    />
                    {/* shimmer sweep on hover */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    {/* sparkle */}
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white/90" />
                    <span className="absolute bottom-1 left-1 h-1 w-1 animate-pulse rounded-full bg-white/70" />
                    <ScanLine className="relative h-6 w-6 text-white drop-shadow" />
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[10px] font-extrabold tracking-wide transition",
                      scanActive ? "text-emerald-600" : "text-blue-700",
                    )}
                  >
                    Scan
                  </span>
                </button>
              </div>

              {RIGHT_TABS.map((tab) => (
                <NavItem
                  key={tab.href}
                  tab={tab}
                  active={tab.match(pathname)}
                />
              ))}

              {/* More button */}
              <MoreItem onClick={onMoreClick} />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  const t = TONES[tab.tone];
  return (
    <Link
      href={tab.href}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition active:scale-95",
        active ? t.text : "text-slate-500 hover:text-slate-700",
      )}
    >
      {/* bottom indicator dot */}
      <span
        className={cn(
          "pointer-events-none absolute bottom-1 left-1/2 h-1 -translate-x-1/2 rounded-full bg-gradient-to-r transition-all duration-300",
          active
            ? cn("w-5 opacity-100", t.indicator, t.glow)
            : "w-0 opacity-0",
        )}
      />
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-300",
          active
            ? cn("bg-gradient-to-br shadow-inner scale-110", t.iconBg)
            : "text-slate-500 group-hover:bg-slate-100/80",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={cn("transition", active && "font-bold")}>
        {tab.label}
      </span>
    </Link>
  );
}

function MoreItem({ onClick }: { onClick: () => void }) {
  const t = TONES.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold text-slate-500 transition hover:text-slate-700 active:scale-95",
      )}
    >
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-300 group-hover:bg-gradient-to-br group-hover:shadow-inner",
          t.iconBg.replace("text-violet-700", "group-hover:text-violet-700"),
        )}
      >
        <Menu className="h-[18px] w-[18px]" />
      </span>
      <span>More</span>
    </button>
  );
}

function ScanOption({
  onClick,
  icon,
  title,
  subtitle,
  accent,
  badge,
  animDelay,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  badge?: string;
  animDelay?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex animate-fade-up items-center gap-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-3.5 text-left backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.12] active:scale-[0.98]"
      style={{ animationDelay: animDelay }}
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-50 blur-2xl transition group-hover:opacity-80",
          accent,
        )}
      />
      <span
        className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lift ring-1 ring-white/20",
          accent,
        )}
      >
        {icon}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight">{title}</span>
          {badge && (
            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/85 ring-1 ring-white/20">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[11px] text-white/65">
          {subtitle}
        </span>
      </span>
      <span
        aria-hidden
        className="relative text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white"
      >
        →
      </span>
    </button>
  );
}
