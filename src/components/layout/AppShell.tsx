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
} from "lucide-react";
import { SessionUser, UserRole } from "@/lib/types";
import { ensureSeed, getSession } from "@/lib/storage";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "supervisor", "security"],
  },
  {
    href: "/flights",
    label: "Jadwal Penerbangan",
    icon: Plane,
    roles: ["admin", "supervisor", "security"],
  },
  {
    href: "/scan",
    label: "Scan Boarding Pass",
    icon: ScanLine,
    roles: ["admin", "supervisor", "security"],
  },
  {
    href: "/scan-events",
    label: "Riwayat Scan",
    icon: History,
    roles: ["admin", "supervisor", "security"],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSeed();
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

  if (!ready || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-5 py-3 text-sm text-slate-600 shadow-card ring-1 ring-slate-200 backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          Memuat sesi…
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => n.roles.includes(session.role));
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
          "fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r border-slate-200/60 bg-white/85 shadow-soft backdrop-blur-md transition-transform lg:static lg:translate-x-0",
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

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item, idx) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 animate-fade-up",
                  active
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lift"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                )}
                style={{ animationDelay: `${idx * 40}ms` }}
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
                <span>{item.label}</span>
                {active && (
                  <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
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
                Keluar
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600/80">
                Operasional Bandara
              </p>
              <h1 className="text-base font-semibold tracking-tight text-slate-800">
                {currentTitle(pathname)}
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 backdrop-blur">
              <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function currentTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname === "/flights") return "Jadwal Penerbangan";
  if (pathname.startsWith("/flights/create")) return "Tambah Penerbangan";
  if (pathname.startsWith("/flights/")) return "Detail Penerbangan";
  if (pathname.startsWith("/scan-events")) return "Riwayat Scan";
  if (pathname.startsWith("/scan")) return "Scan Boarding Pass";
  return "AFVS";
}
