"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  ShieldCheck,
  LogIn,
  AlertCircle,
  Sparkles,
  ScanLine,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ensureSeed, getSession } from "@/lib/storage";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@airport.test");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ensureSeed();
    const s = getSession();
    if (s) router.replace("/dashboard");
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace("/dashboard");
  };

  const quick = (e: string) => {
    setEmail(e);
    setPassword("password");
  };

  return (
    <div className="flex min-h-screen items-stretch">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-12 text-white lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute right-10 top-1/3 h-64 w-64 rounded-full bg-white/10 blur-2xl animate-float" />
        <div className="relative z-10 flex w-full flex-col justify-between">
          <div className="flex items-center gap-3 animate-fade-up">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25">
              <ShieldCheck className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-blue-700" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                AFVS
              </p>
              <p className="text-lg font-bold tracking-tight">
                Airport Flight Validation
              </p>
            </div>
          </div>

          <div className="space-y-6 animate-fade-up stagger-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Pos Validasi Real-time
            </div>
            <div className="flex items-center gap-3 text-white/95">
              <Plane className="h-7 w-7 animate-float" />
              <h2 className="text-4xl font-bold tracking-tight leading-tight">
                Validasi Boarding Pass
                <br />
                <span className="bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                  Cepat & Aman
                </span>
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/80">
              Scan barcode boarding pass — sistem akan mengecek apakah kode
              penerbangan terdaftar di jadwal hari ini, statusnya aktif, dan
              belum pernah di-scan sebelumnya.
            </p>

            <div className="grid max-w-md grid-cols-3 gap-3">
              {[
                { v: "5", k: "Flight aktif", icon: Plane },
                { v: "100%", k: "Offline-ready", icon: ScanLine },
                { v: "<1s", k: "Validasi", icon: Zap },
              ].map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.k}
                    className="relative overflow-hidden rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 animate-fade-up"
                    style={{ animationDelay: `${300 + idx * 100}ms` }}
                  >
                    <Icon className="absolute -bottom-2 -right-2 h-12 w-12 text-white/10" />
                    <p className="text-2xl font-bold">{s.v}</p>
                    <p className="text-[11px] text-white/80">{s.k}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} AFVS — Internal Operation Tool.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lift">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700/80">
                AFVS
              </p>
              <p className="text-sm font-bold text-slate-800">
                Flight Validation
              </p>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Masuk
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan akun petugas Anda untuk mengakses panel operasi.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@airport.test"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1.5"
              />
            </div>

            {error && (
              <div className="flex animate-fade-up items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>

          <div className="mt-6 relative overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-card animate-fade-up stagger-2">
            <div className="deco-blob -right-8 -top-8 h-24 w-24 bg-blue-200 opacity-40" />
            <div className="relative z-[1]">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                <Sparkles className="h-3 w-3" />
                Akun Demo
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Klik untuk mengisi otomatis. Password:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-700 ring-1 ring-slate-200">
                  password
                </code>
              </p>
              <div className="mt-3 grid gap-2">
                {[
                  { e: "admin@airport.test", r: "Admin" },
                  { e: "supervisor@airport.test", r: "Supervisor" },
                  { e: "security@airport.test", r: "Security" },
                ].map((u) => (
                  <button
                    key={u.e}
                    type="button"
                    onClick={() => quick(u.e)}
                    className="flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 text-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:ring-blue-300 hover:shadow-card"
                  >
                    <span className="font-medium text-slate-700">{u.e}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                      {u.r}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
