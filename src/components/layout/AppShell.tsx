"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Plane,
  ScanLine,
  History,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CalendarDays,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  ChevronRight,
  Bell,
  Wifi,
  WifiOff,
  Clock as ClockIcon,
} from "lucide-react";
import { SessionUser, UserRole } from "@/lib/types";
import { archiveOldScanEvents, ensureSeed, getSession } from "@/lib/storage";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/lib/useT";
import { BottomNav } from "./BottomNav";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

interface NavSection {
  labelKey: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "nav.section.operations",
    items: [
      {
        href: "/dashboard",
        labelKey: "nav.dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "supervisor", "security"],
      },
      {
        href: "/scan",
        labelKey: "nav.scan",
        icon: ScanLine,
        roles: ["admin", "supervisor", "security"],
      },
      {
        href: "/passengers",
        labelKey: "nav.passengers",
        icon: Users,
        roles: ["admin", "supervisor", "security"],
      },
    ],
  },
  {
    labelKey: "nav.section.data",
    items: [
      {
        href: "/flights",
        labelKey: "nav.flights",
        icon: Plane,
        roles: ["admin", "supervisor", "security"],
      },
      {
        href: "/scan-events",
        labelKey: "nav.scanEvents",
        icon: History,
        roles: ["admin", "supervisor", "security"],
      },
      {
        href: "/analytics",
        labelKey: "nav.analytics",
        icon: BarChart3,
        roles: ["admin", "supervisor"],
      },
    ],
  },
  {
    labelKey: "nav.section.system",
    items: [
      {
        href: "/settings",
        labelKey: "nav.settings",
        icon: SettingsIcon,
        roles: ["admin", "supervisor", "security"],
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellInner>{children}</AppShellInner>;
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const locale = useLocale();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    ensureSeed();
    archiveOldScanEvents(1);
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setReady(true);
  }, [router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (!ready || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-5 py-3 text-sm text-slate-600 shadow-card ring-1 ring-slate-200 backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          {t("common.loading")}
        </div>
      </div>
    );
  }

  const visibleSections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((n) => n.roles.includes(session.role)),
  })).filter((sec) => sec.items.length > 0);
  const roleLabel: Record<UserRole, string> = {
    admin: "Administrator",
    supervisor: "Supervisor",
    security: "Security",
  };
  const roleTone: Record<UserRole, string> = {
    admin: "bg-blue-100 text-blue-700 ring-blue-200",
    supervisor: "bg-violet-100 text-violet-700 ring-violet-200",
    security: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r border-slate-200/60 bg-white/85 shadow-soft backdrop-blur-md transition-transform lg:static lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lift">
              <ShieldCheck className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight text-slate-800">
                AFVS
              </p>
              <p className="text-[11px] text-slate-500">Flight Validation</p>
            </div>
          </div>
          <button
            className="text-slate-500 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleSections.map((section, sIdx) => (
            <div
              key={section.labelKey}
              className={cn(sIdx > 0 && "mt-5")}
            >
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {t(section.labelKey)}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200 animate-fade-up",
                        active
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lift"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                      )}
                      style={{ animationDelay: `${(sIdx * 3 + idx) * 30}ms` }}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg transition",
                          active
                            ? "bg-white/15 text-white ring-1 ring-white/20"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 group-hover:bg-white group-hover:text-blue-700 group-hover:ring-blue-200",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{t(item.labelKey)}</span>
                      {active && (
                        <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-3 shadow-card">
            <div className="deco-blob -right-6 -top-6 h-20 w-20 bg-blue-300 opacity-40" />
            <div className="relative z-[1]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white shadow-sm ring-2 ring-white">
                  {session.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {session.name}
                  </p>
                  <span
                    className={cn(
                      "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                      roleTone[session.role],
                    )}
                  >
                    {roleLabel[session.role]}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("common.logout")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden print:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-gradient-to-r from-white/85 via-white/75 to-blue-50/70 backdrop-blur-md print:hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
          />
          <div className="flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600/80">
                  <span className="inline-flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    {t("topbar.operational")}
                  </span>
                  <ChevronRight className="h-3 w-3 text-slate-300" />
                  <span className="truncate text-slate-500">
                    {breadcrumbTail(pathname, t)}
                  </span>
                </div>
                <h1 className="truncate bg-gradient-to-r from-slate-900 via-slate-800 to-blue-700 bg-clip-text text-base font-bold tracking-tight text-transparent sm:text-lg">
                  {currentTitle(pathname, t)}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Online indicator */}
              <div
                className={cn(
                  "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 backdrop-blur sm:inline-flex",
                  online
                    ? "bg-emerald-50/80 text-emerald-700 ring-emerald-200"
                    : "bg-rose-50/80 text-rose-700 ring-rose-200",
                )}
                title={online ? "Online" : "Offline"}
              >
                {online ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {online ? "Online" : "Offline"}
              </div>

              {/* Live clock */}
              <div className="hidden items-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 backdrop-blur md:inline-flex">
                <ClockIcon className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-mono tabular-nums tracking-tight text-slate-800">
                  {now
                    ? now.toLocaleTimeString(
                        locale === "id" ? "id-ID" : "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        },
                      )
                    : "--:--:--"}
                </span>
              </div>

              {/* Date */}
              <div className="hidden items-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 backdrop-blur lg:inline-flex">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                {(now ?? new Date()).toLocaleDateString(
                  locale === "id" ? "id-ID" : "en-US",
                  {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  },
                )}
              </div>

              {/* Bell */}
              <button
                className="relative hidden h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-600 ring-1 ring-slate-200 backdrop-blur transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200 sm:inline-flex"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {/* User chip */}
              <div className="hidden items-center gap-2 rounded-xl bg-white/80 px-2 py-1 ring-1 ring-slate-200 backdrop-blur sm:inline-flex">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-[11px] font-bold text-white ring-2 ring-white">
                  {session.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden pr-1 leading-tight md:block">
                  <p className="text-[11px] font-semibold text-slate-800">
                    {session.name}
                  </p>
                  <p className="text-[10px] capitalize text-slate-500">
                    {session.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 sm:px-6 sm:pt-6 print:p-0 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-6">
          {children}
        </main>
      </div>

      <BottomNav onMoreClick={() => setOpen(true)} />
    </div>
  );
}

function breadcrumbTail(pathname: string, t: (k: string) => string) {
  if (pathname.startsWith("/dashboard")) return t("nav.dashboard");
  if (pathname.startsWith("/flights/create")) return "Tambah";
  if (pathname.startsWith("/flights/") && pathname.endsWith("/edit"))
    return "Edit";
  if (pathname.startsWith("/flights/")) return "Detail";
  if (pathname === "/flights") return t("nav.flights");
  if (pathname.startsWith("/scan-events")) return t("nav.scanEvents");
  if (pathname.startsWith("/scan")) return t("nav.scan");
  if (pathname.startsWith("/passengers")) return t("nav.passengers");
  if (pathname.startsWith("/analytics")) return t("nav.analytics");
  if (pathname.startsWith("/settings")) return t("nav.settings");
  return "Home";
}

function currentTitle(pathname: string, t: (k: string) => string) {
  if (pathname.startsWith("/dashboard")) return t("nav.dashboard");
  if (pathname === "/flights") return t("nav.flights");
  if (pathname.startsWith("/flights/create")) return "Tambah Penerbangan";
  if (pathname.startsWith("/flights/")) return "Detail Penerbangan";
  if (pathname.startsWith("/scan-events")) return t("nav.scanEvents");
  if (pathname.startsWith("/scan")) return t("nav.scan");
  if (pathname.startsWith("/passengers")) return t("nav.passengers");
  if (pathname.startsWith("/analytics")) return t("nav.analytics");
  if (pathname.startsWith("/settings")) return t("nav.settings");
  return "AFVS";
}
