"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  Plane,
  History,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onMoreClick: () => void;
}

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (p: string) => boolean;
}

const TABS: Tab[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    match: (p) => p.startsWith("/dashboard"),
  },
  {
    href: "/flights",
    label: "Flights",
    icon: Plane,
    match: (p) => p === "/flights" || p.startsWith("/flights/"),
  },
  {
    href: "/scan",
    label: "Scan",
    icon: ScanLine,
    match: (p) => p === "/scan",
  },
  {
    href: "/scan-events",
    label: "Events",
    icon: History,
    match: (p) => p.startsWith("/scan-events"),
  },
];

export function BottomNav({ onMoreClick }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/95 backdrop-blur-md shadow-[0_-4px_18px_-6px_rgba(15,23,42,0.12)] lg:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          // Scan tab is the prominent center action
          const isCenter = tab.href === "/scan";
          if (isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center justify-center py-1.5"
              >
                <span
                  className={cn(
                    "-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lift transition-all",
                    active
                      ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white scale-105"
                      : "bg-gradient-to-br from-blue-500 to-cyan-400 text-white",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[10px] font-semibold transition",
                    active ? "text-blue-700" : "text-slate-500",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition",
                active
                  ? "text-blue-700"
                  : "text-slate-500 hover:text-blue-600",
              )}
            >
              <span
                className={cn(
                  "relative flex h-6 w-6 items-center justify-center",
                )}
              >
                <Icon className="h-5 w-5" />
                {active && (
                  <span className="absolute -top-1 h-1 w-1 rounded-full bg-blue-600" />
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold text-slate-500 transition hover:text-blue-600"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
