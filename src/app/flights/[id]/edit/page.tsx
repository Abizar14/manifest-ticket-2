"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plane,
  Save,
  AlertCircle,
  Hash,
  Building2,
  MapPin,
  Calendar,
  Clock,
  DoorOpen,
  Activity,
  Users,
  Sparkles,
  ArrowRight,
  Ticket,
  RotateCcw,
  History,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Flight, FlightStatus } from "@/lib/types";
import {
  getFlights,
  getSession,
  updateFlight,
} from "@/lib/storage";
import { todayDateString, tomorrowDateString, cn, formatDateTime } from "@/lib/utils";
import { canManageFlights } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { AirlineLogo } from "@/components/ui/AirlineLogo";
import { getAirlineMeta } from "@/lib/airlines";

const STATUSES: FlightStatus[] = [
  "DRAFT",
  "OPEN",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
];

const STATUS_TONE: Record<FlightStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-200",
  OPEN: "bg-blue-100 text-blue-700 ring-blue-200",
  ACTIVE: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-amber-100 text-amber-700 ring-amber-200",
  CANCELLED: "bg-rose-100 text-rose-700 ring-rose-200",
};

interface FormState {
  flightNumber: string;
  airlineCode: string;
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  departureTime: string;
  gateOrCheckpoint: string;
  status: FlightStatus;
  expectedPax: string;
}

function flightToForm(f: Flight): FormState {
  return {
    flightNumber: f.flightNumber,
    airlineCode: f.airlineCode,
    originAirport: f.originAirport,
    destinationAirport: f.destinationAirport,
    departureDate: f.departureDate,
    departureTime: f.departureTime,
    gateOrCheckpoint: f.gateOrCheckpoint,
    status: f.status,
    expectedPax:
      typeof f.expectedPax === "number" && f.expectedPax > 0
        ? String(f.expectedPax)
        : "",
  };
}

export default function EditFlightPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [original, setOriginal] = useState<Flight | null>(null);
  const [form, setForm] = useState<FormState>({
    flightNumber: "",
    airlineCode: "",
    originAirport: "",
    destinationAirport: "",
    departureDate: "",
    departureTime: "",
    gateOrCheckpoint: "",
    status: "OPEN",
    expectedPax: "",
  });

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canManageFlights(session.role)) {
      router.replace("/dashboard");
      return;
    }

    const f = getFlights().find((x) => x.id === id);
    if (!f) {
      setNotFound(true);
      setReady(true);
      return;
    }
    setOriginal(f);
    setForm(flightToForm(f));
    setReady(true);
  }, [id, router]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const dirty = useMemo(() => {
    if (!original) return false;
    const a = flightToForm(original);
    return (
      a.flightNumber !== form.flightNumber.trim().toUpperCase() ||
      a.airlineCode !== (form.airlineCode.trim().toUpperCase() || form.flightNumber.slice(0, 2).toUpperCase()) ||
      a.originAirport !== form.originAirport.trim().toUpperCase() ||
      a.destinationAirport !== form.destinationAirport.trim().toUpperCase() ||
      a.departureDate !== form.departureDate ||
      a.departureTime !== form.departureTime ||
      a.gateOrCheckpoint !== form.gateOrCheckpoint.trim() ||
      a.status !== form.status ||
      a.expectedPax !== form.expectedPax.trim()
    );
  }, [original, form]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!id || !original) return;

    const fn = form.flightNumber.trim().toUpperCase();
    if (!fn) {
      setError("Flight number wajib diisi.");
      return;
    }

    const today = todayDateString();
    const tomorrow = tomorrowDateString();
    if (form.departureDate !== today && form.departureDate !== tomorrow) {
      setError("Tanggal hanya boleh hari ini atau besok.");
      return;
    }

    const duplicate = getFlights().some(
      (f) =>
        f.id !== id &&
        f.flightNumber.toUpperCase() === fn &&
        f.departureDate === form.departureDate,
    );
    if (duplicate) {
      setError("Flight dengan nomor & tanggal yang sama sudah ada.");
      return;
    }

    let expected: number | undefined;
    const trimmedPax = form.expectedPax.trim();
    if (trimmedPax) {
      const n = Number(trimmedPax);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        setError("Expected PAX harus bilangan bulat positif.");
        return;
      }
      expected = n;
    }

    const patch: Partial<Flight> = {
      flightNumber: fn,
      airlineCode: form.airlineCode.trim().toUpperCase() || fn.slice(0, 2),
      originAirport: form.originAirport.trim().toUpperCase(),
      destinationAirport: form.destinationAirport.trim().toUpperCase(),
      departureDate: form.departureDate,
      departureTime: form.departureTime,
      gateOrCheckpoint: form.gateOrCheckpoint.trim(),
      status: form.status,
      expectedPax: expected,
    };
    updateFlight(id, patch);
    toast.success(`Perubahan ${fn} disimpan.`);
    router.replace(`/flights/${id}`);
  };

  const resetForm = () => {
    if (!original) return;
    setForm(flightToForm(original));
    setError(null);
  };

  if (!ready) return null;

  if (notFound) {
    return (
      <AppShell>
        <div className="max-w-xl">
          <Link
            href="/flights"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 backdrop-blur transition hover:text-blue-700 hover:ring-blue-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>
          <Card className="mt-3 animate-fade-up">
            <CardBody className="py-12 text-center text-sm text-slate-500">
              Flight tidak ditemukan.
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  const previewFn = form.flightNumber.trim().toUpperCase() || "—";
  const previewOrigin = form.originAirport.trim().toUpperCase() || "•••";
  const previewDest = form.destinationAirport.trim().toUpperCase() || "•••";
  const previewAirlineCode =
    (form.airlineCode || form.flightNumber.slice(0, 2) || "").toUpperCase();
  const airlineMeta = getAirlineMeta(previewAirlineCode);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative animate-fade-up overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-6 text-white shadow-lift sm:px-8 sm:py-7">
          <div className="deco-blob -right-10 -top-10 h-44 w-44 bg-white/30" />
          <div className="deco-blob -bottom-12 -left-12 h-56 w-56 bg-amber-300/40" />
          <div className="absolute -right-8 -top-8 h-32 w-32 rotate-12 text-white/10">
            <Plane className="h-full w-full" strokeWidth={1.5} />
          </div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <Link
                href={`/flights/${id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke detail
              </Link>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/95 ring-1 ring-white/25 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Edit Penerbangan
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="rounded-2xl bg-white/95 p-1 ring-1 ring-white/40 shadow-sm">
                  <AirlineLogo code={previewAirlineCode} size="md" mode="rich" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                    {original?.flightNumber ?? "—"}
                  </h2>
                  <p className="text-sm text-white/85">
                    {airlineMeta.name} · {original?.originAirport} →{" "}
                    {original?.destinationAirport}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-white/25 backdrop-blur">
                <History className="h-4 w-4 text-white/80" />
                <div className="text-right text-[11px] leading-tight">
                  <p className="font-semibold uppercase tracking-wider text-white/70">
                    Terakhir diubah
                  </p>
                  <p className="font-mono text-xs">
                    {original ? formatDateTime(original.updatedAt) : "—"}
                  </p>
                </div>
              </div>
              {dirty && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/95 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset perubahan
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Form */}
          <Card className="animate-fade-up stagger-1 lift">
            <div className="deco-blob -right-16 -top-16 h-44 w-44 bg-amber-200" />
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                    <Plane className="h-3.5 w-3.5" />
                  </span>
                  Detail Penerbangan
                </span>
              </CardTitle>
              {dirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Perubahan belum disimpan
                </span>
              )}
            </CardHeader>
            <CardBody>
              <form onSubmit={submit} className="space-y-6">
                {error && (
                  <div className="flex animate-fade-up items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Section
                  number={1}
                  title="Identitas Penerbangan"
                  description="Nomor flight & maskapai operator."
                  tone="blue"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <IconField
                      label="Flight Number"
                      required
                      icon={<Hash className="h-4 w-4" />}
                    >
                      <Input
                        className="pl-9 uppercase tracking-wider"
                        value={form.flightNumber}
                        onChange={(e) => set("flightNumber", e.target.value)}
                        placeholder="GA123"
                        required
                      />
                    </IconField>
                    <IconField
                      label="Airline Code"
                      icon={<Building2 className="h-4 w-4" />}
                    >
                      <Input
                        className="pl-9 uppercase tracking-wider"
                        value={form.airlineCode}
                        onChange={(e) => set("airlineCode", e.target.value)}
                        placeholder="GA"
                      />
                    </IconField>
                  </div>
                </Section>

                <Section
                  number={2}
                  title="Rute"
                  description="Bandara asal dan tujuan (kode IATA 3-huruf)."
                  tone="cyan"
                >
                  <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                    <IconField
                      label="Origin (IATA)"
                      icon={<MapPin className="h-4 w-4" />}
                    >
                      <Input
                        className="pl-9 uppercase tracking-widest"
                        value={form.originAirport}
                        onChange={(e) => set("originAirport", e.target.value)}
                        placeholder="CGK"
                        maxLength={3}
                      />
                    </IconField>
                    <div className="hidden h-10 items-center justify-center pb-0 text-amber-400 sm:flex">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-100">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <IconField
                      label="Destination (IATA)"
                      required
                      icon={<MapPin className="h-4 w-4" />}
                    >
                      <Input
                        className="pl-9 uppercase tracking-widest"
                        value={form.destinationAirport}
                        onChange={(e) =>
                          set("destinationAirport", e.target.value)
                        }
                        placeholder="DPS"
                        maxLength={3}
                        required
                      />
                    </IconField>
                  </div>
                </Section>

                <Section
                  number={3}
                  title="Jadwal & Lokasi"
                  description="Tanggal hanya hari ini / besok pada MVP."
                  tone="violet"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <IconField
                      label="Departure Date"
                      required
                      icon={<Calendar className="h-4 w-4" />}
                    >
                      <Input
                        type="date"
                        className="pl-9"
                        min={todayDateString()}
                        max={tomorrowDateString()}
                        value={form.departureDate}
                        onChange={(e) => set("departureDate", e.target.value)}
                        required
                      />
                    </IconField>
                    <IconField
                      label="Departure Time"
                      required
                      icon={<Clock className="h-4 w-4" />}
                    >
                      <Input
                        type="time"
                        className="pl-9"
                        value={form.departureTime}
                        onChange={(e) => set("departureTime", e.target.value)}
                        required
                      />
                    </IconField>
                    <IconField
                      label="Gate / Checkpoint"
                      required
                      icon={<DoorOpen className="h-4 w-4" />}
                    >
                      <Input
                        className="pl-9"
                        value={form.gateOrCheckpoint}
                        onChange={(e) =>
                          set("gateOrCheckpoint", e.target.value)
                        }
                        placeholder="Gate A1"
                        required
                      />
                    </IconField>
                    <IconField
                      label="Status"
                      icon={<Activity className="h-4 w-4" />}
                    >
                      <Select
                        value={form.status}
                        onChange={(e) =>
                          set("status", e.target.value as FlightStatus)
                        }
                        className="pl-9"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </IconField>
                  </div>
                </Section>

                <Section
                  number={4}
                  title="Kapasitas"
                  description="Opsional — dipakai untuk progres boarding."
                  tone="emerald"
                >
                  <IconField
                    label="Expected PAX"
                    icon={<Users className="h-4 w-4" />}
                  >
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      className="pl-9"
                      value={form.expectedPax}
                      onChange={(e) => set("expectedPax", e.target.value)}
                      placeholder="mis. 180"
                    />
                  </IconField>
                </Section>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/flights/${id}`}>
                    <Button type="button" variant="outline">
                      Batal
                    </Button>
                  </Link>
                  <Button type="submit" disabled={!dirty}>
                    <Save className="h-4 w-4" />
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Preview side panel */}
          <div className="space-y-4">
            <div className="sticky top-20 space-y-4">
              {/* Boarding-pass-style preview */}
              <div className="animate-fade-up stagger-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 p-5 text-white shadow-lift">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/20 blur-2xl" />
                <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-rose-400/20 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                    <span className="inline-flex items-center gap-1.5">
                      <Ticket className="h-3 w-3" />
                      Boarding Pass · Preview
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] ring-1",
                        STATUS_TONE[form.status],
                      )}
                    >
                      {form.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        From
                      </p>
                      <p className="font-mono text-3xl font-bold tracking-tight">
                        {previewOrigin}
                      </p>
                    </div>
                    <div className="flex flex-1 items-center px-2">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                      <Plane className="h-4 w-4 rotate-90 text-white/70" />
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        To
                      </p>
                      <p className="font-mono text-3xl font-bold tracking-tight">
                        {previewDest}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-dashed border-white/20 pt-4 text-[11px]">
                    <DiffCell
                      label="Flight"
                      original={original?.flightNumber}
                      current={previewFn}
                    />
                    <DiffCell
                      label="Date"
                      original={original?.departureDate}
                      current={form.departureDate || "—"}
                    />
                    <DiffCell
                      label="Time"
                      original={original?.departureTime}
                      current={form.departureTime || "—"}
                    />
                    <DiffCell
                      label="Gate"
                      original={original?.gateOrCheckpoint}
                      current={form.gateOrCheckpoint || "—"}
                    />
                    <DiffCell
                      label="Airline"
                      original={original?.airlineCode}
                      current={previewAirlineCode || "—"}
                    />
                    <DiffCell
                      label="PAX"
                      original={
                        original?.expectedPax
                          ? String(original.expectedPax)
                          : "—"
                      }
                      current={form.expectedPax || "—"}
                    />
                  </div>

                  {/* faux barcode */}
                  <div className="mt-4 flex h-9 items-end gap-[2px] rounded-md bg-white/95 px-2 py-1">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-slate-900"
                        style={{
                          width: i % 3 === 0 ? 3 : 1.5,
                          height: `${50 + ((i * 7) % 45)}%`,
                          opacity: i % 5 === 0 ? 0.6 : 1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Diff/help */}
              <Card className="animate-fade-up stagger-3 lift">
                <CardBody className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    Catatan edit
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-amber-500">•</span>
                      Field yang berubah dari nilai awal ditandai pada preview.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-amber-500">•</span>
                      Reset perubahan tersedia di header jika ada draft yang
                      belum disimpan.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-amber-500">•</span>
                      Mengubah status ke CLOSED/CANCELLED memblokir scan untuk
                      penerbangan ini.
                    </li>
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DiffCell({
  label,
  original,
  current,
}: {
  label: string;
  original?: string | null;
  current: string;
}) {
  const o = (original ?? "—").toString();
  const changed = o !== current && o !== "—";
  return (
    <div>
      <p className="font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-sm font-bold",
          changed && "text-amber-300",
        )}
      >
        {current}
      </p>
      {changed && (
        <p className="font-mono text-[10px] text-white/40 line-through">
          {o}
        </p>
      )}
    </div>
  );
}

const SECTION_TONE: Record<
  "blue" | "cyan" | "violet" | "emerald",
  { chip: string; ring: string; bar: string }
> = {
  blue: {
    chip: "bg-blue-100 text-blue-700",
    ring: "ring-blue-200",
    bar: "from-blue-500 to-cyan-400",
  },
  cyan: {
    chip: "bg-cyan-100 text-cyan-700",
    ring: "ring-cyan-200",
    bar: "from-cyan-500 to-sky-400",
  },
  violet: {
    chip: "bg-violet-100 text-violet-700",
    ring: "ring-violet-200",
    bar: "from-violet-500 to-fuchsia-400",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-200",
    bar: "from-emerald-500 to-teal-400",
  },
};

function Section({
  number,
  title,
  description,
  tone,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  tone: "blue" | "cyan" | "violet" | "emerald";
  children: React.ReactNode;
}) {
  const t = SECTION_TONE[tone];
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ring-1",
            t.chip,
            t.ring,
          )}
        >
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description && (
            <p className="text-[11px] text-slate-500">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "ml-auto hidden h-1 w-16 rounded-full bg-gradient-to-r sm:block",
            t.bar,
          )}
        />
      </div>
      <div className="rounded-xl bg-slate-50/50 p-4 ring-1 ring-slate-100">
        {children}
      </div>
    </section>
  );
}

function IconField({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}
