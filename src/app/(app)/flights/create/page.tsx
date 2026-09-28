"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Wand2,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Flight, FlightStatus } from "@/lib/types";
import { addFlight, getFlights, getSession } from "@/lib/storage";
import { todayDateString, tomorrowDateString, uid, cn } from "@/lib/utils";
import { canManageFlights } from "@/lib/auth";
import { LargeTitle } from "@/components/mobile/LargeTitle";
import { ListSection } from "@/components/mobile/GroupedList";
import {
  FormFieldRow,
  FieldInput,
  FieldSelect,
} from "@/components/mobile/FormFieldRow";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";

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

export default function CreateFlightPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [flightNumber, setFlightNumber] = useState("");
  const [airlineCode, setAirlineCode] = useState("");
  const [originAirport, setOriginAirport] = useState("CGK");
  const [destinationAirport, setDestinationAirport] = useState("");
  const [departureDate, setDepartureDate] = useState(todayDateString());
  const [departureTime, setDepartureTime] = useState("08:00");
  const [gateOrCheckpoint, setGateOrCheckpoint] = useState("Gate A1");
  const [status, setStatus] = useState<FlightStatus>("OPEN");
  const [expectedPax, setExpectedPax] = useState("");

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
    setReady(true);
  }, [router]);

  const completion = useMemo(() => {
    const fields = [
      flightNumber,
      originAirport,
      destinationAirport,
      departureDate,
      departureTime,
      gateOrCheckpoint,
    ];
    const filled = fields.filter((v) => v.trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [
    flightNumber,
    originAirport,
    destinationAirport,
    departureDate,
    departureTime,
    gateOrCheckpoint,
  ]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const today = todayDateString();
    const tomorrow = tomorrowDateString();
    if (departureDate !== today && departureDate !== tomorrow) {
      setError("Tanggal hanya boleh hari ini atau besok untuk MVP ini.");
      return;
    }

    const fn = flightNumber.trim().toUpperCase();
    if (!fn) {
      setError("Flight number wajib diisi.");
      return;
    }

    const exists = getFlights().some(
      (f) =>
        f.flightNumber.toUpperCase() === fn &&
        f.departureDate === departureDate,
    );
    if (exists) {
      setError("Flight dengan nomor & tanggal yang sama sudah ada.");
      return;
    }

    let expected: number | undefined;
    const trimmedPax = expectedPax.trim();
    if (trimmedPax) {
      const n = Number(trimmedPax);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        setError("Expected PAX harus bilangan bulat positif.");
        return;
      }
      expected = n;
    }

    const now = new Date().toISOString();
    const newFlight: Flight = {
      id: uid("flt"),
      flightNumber: fn,
      airlineCode: airlineCode.trim().toUpperCase() || fn.slice(0, 2),
      originAirport: originAirport.trim().toUpperCase(),
      destinationAirport: destinationAirport.trim().toUpperCase(),
      departureDate,
      departureTime,
      gateOrCheckpoint: gateOrCheckpoint.trim(),
      status,
      expectedPax: expected,
      createdAt: now,
      updatedAt: now,
    };

    addFlight(newFlight);
    router.replace("/flights");
  };

  const fillDemo = () => {
    setFlightNumber("GA420");
    setAirlineCode("GA");
    setOriginAirport("CGK");
    setDestinationAirport("DPS");
    setDepartureDate(todayDateString());
    setDepartureTime("14:30");
    setGateOrCheckpoint("Gate B7");
    setStatus("OPEN");
    setExpectedPax("180");
  };

  if (!ready) return null;

  const previewFn = flightNumber.trim().toUpperCase() || "—";
  const previewOrigin = originAirport.trim().toUpperCase() || "•••";
  const previewDest = destinationAirport.trim().toUpperCase() || "•••";

  return (
    <>
      {/* ============ MOBILE — iOS-native form ============ */}
      <form
        onSubmit={submit}
        className="space-y-4 lg:hidden"
        style={{ paddingBottom: "5rem" }}
      >
        <LargeTitle
          eyebrow="Penerbangan Baru"
          title="Tambah Flight"
          subtitle={`${completion}% terisi`}
          trailing={
            <Link
              href="/flights"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 ring-1 ring-hairline active:scale-95"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4 text-ink" />
            </Link>
          }
        />

        {/* progress bar */}
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-hairline">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 ring-1 ring-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <ListSection header="Identitas">
          <FormFieldRow
            icon={<Hash className="h-4 w-4" />}
            label="Flight #"
            required
          >
            <FieldInput
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="GA123"
              autoCapitalize="characters"
              required
            />
          </FormFieldRow>
          <FormFieldRow
            icon={<Building2 className="h-4 w-4" />}
            label="Airline"
          >
            <FieldInput
              value={airlineCode}
              onChange={(e) => setAirlineCode(e.target.value)}
              placeholder="GA"
              autoCapitalize="characters"
            />
          </FormFieldRow>
        </ListSection>

        <ListSection header="Rute">
          <FormFieldRow
            icon={<MapPin className="h-4 w-4" />}
            label="Asal (IATA)"
          >
            <FieldInput
              value={originAirport}
              onChange={(e) => setOriginAirport(e.target.value)}
              placeholder="CGK"
              maxLength={3}
              autoCapitalize="characters"
            />
          </FormFieldRow>
          <FormFieldRow
            icon={<MapPin className="h-4 w-4" />}
            label="Tujuan (IATA)"
            required
          >
            <FieldInput
              value={destinationAirport}
              onChange={(e) => setDestinationAirport(e.target.value)}
              placeholder="DPS"
              maxLength={3}
              autoCapitalize="characters"
              required
            />
          </FormFieldRow>
        </ListSection>

        <ListSection header="Jadwal & Lokasi">
          <FormFieldRow
            icon={<Calendar className="h-4 w-4" />}
            label="Tanggal"
            required
          >
            <FieldInput
              type="date"
              min={todayDateString()}
              max={tomorrowDateString()}
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              required
            />
          </FormFieldRow>
          <FormFieldRow
            icon={<Clock className="h-4 w-4" />}
            label="Waktu"
            required
          >
            <FieldInput
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              required
            />
          </FormFieldRow>
          <FormFieldRow
            icon={<DoorOpen className="h-4 w-4" />}
            label="Gate"
            required
          >
            <FieldInput
              value={gateOrCheckpoint}
              onChange={(e) => setGateOrCheckpoint(e.target.value)}
              placeholder="Gate A1"
              required
            />
          </FormFieldRow>
          <FormFieldRow
            icon={<Activity className="h-4 w-4" />}
            label="Status"
          >
            <FieldSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as FlightStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FieldSelect>
          </FormFieldRow>
        </ListSection>

        <ListSection
          header="Kapasitas"
          caption="Opsional — dipakai untuk progres boarding."
        >
          <FormFieldRow
            icon={<Users className="h-4 w-4" />}
            label="Expected PAX"
          >
            <FieldInput
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={expectedPax}
              onChange={(e) => setExpectedPax(e.target.value)}
              placeholder="180"
            />
          </FormFieldRow>
        </ListSection>

        <button
          type="button"
          onClick={fillDemo}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] font-semibold text-ink-muted ring-1 ring-hairline active:bg-hairline/40"
        >
          <Wand2 className="h-4 w-4" />
          Isi data contoh
        </button>

        <StickyActionBar>
          <Link
            href="/flights"
            className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-surface-2 text-[14px] font-semibold text-ink-muted ring-1 ring-hairline active:bg-hairline/40"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="flex h-11 flex-[2] items-center justify-center gap-1.5 rounded-2xl bg-blue-600 text-[14px] font-semibold text-white shadow-lift active:scale-[0.98] disabled:opacity-60"
            disabled={
              !flightNumber.trim() || !destinationAirport.trim()
            }
          >
            <Save className="h-4 w-4" />
            Simpan
          </button>
        </StickyActionBar>
      </form>

      {/* ============ DESKTOP — original layout ============ */}
      <div className="hidden lg:block space-y-6">
        {/* Hero header */}
        <div className="relative animate-fade-up overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 px-6 py-6 text-white shadow-lift sm:px-8 sm:py-7">
          <div className="deco-blob -right-10 -top-10 h-44 w-44 bg-white/30" />
          <div className="deco-blob -bottom-12 -left-12 h-56 w-56 bg-cyan-300/40" />
          <div className="absolute -right-8 -top-8 h-32 w-32 rotate-12 text-white/10">
            <Plane className="h-full w-full" strokeWidth={1.5} />
          </div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/flights"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke daftar
              </Link>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/95 ring-1 ring-white/25 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Penerbangan Baru
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Tambah Penerbangan
              </h2>
              <p className="mt-1 max-w-md text-sm text-white/85">
                Lengkapi detail jadwal — preview di kanan akan terbarui otomatis.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-white/25 backdrop-blur">
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                    Progres
                  </p>
                  <p className="text-lg font-bold leading-none">{completion}%</p>
                </div>
                <div className="h-10 w-24 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-200 transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/95 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Isi contoh
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Form */}
          <Card className="animate-fade-up stagger-1 lift">
            <div className="deco-blob -right-16 -top-16 h-44 w-44 bg-blue-200" />
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                    <Plane className="h-3.5 w-3.5" />
                  </span>
                  Detail Penerbangan
                </span>
              </CardTitle>
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
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
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
                        value={airlineCode}
                        onChange={(e) => setAirlineCode(e.target.value)}
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
                        value={originAirport}
                        onChange={(e) => setOriginAirport(e.target.value)}
                        placeholder="CGK"
                        maxLength={3}
                      />
                    </IconField>
                    <div className="hidden h-10 items-center justify-center pb-0 text-blue-400 sm:flex">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100">
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
                        value={destinationAirport}
                        onChange={(e) => setDestinationAirport(e.target.value)}
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
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
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
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
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
                        value={gateOrCheckpoint}
                        onChange={(e) => setGateOrCheckpoint(e.target.value)}
                        placeholder="Gate A1"
                        required
                      />
                    </IconField>
                    <IconField
                      label="Status"
                      icon={<Activity className="h-4 w-4" />}
                    >
                      <Select
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as FlightStatus)
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
                      value={expectedPax}
                      onChange={(e) => setExpectedPax(e.target.value)}
                      placeholder="mis. 180"
                    />
                  </IconField>
                </Section>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <Link href="/flights">
                    <Button type="button" variant="outline">
                      Batal
                    </Button>
                  </Link>
                  <Button type="submit">
                    <Save className="h-4 w-4" />
                    Simpan Penerbangan
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Preview side panel */}
          <div className="space-y-4">
            <div className="sticky top-20 space-y-4">
              {/* Boarding-pass-style preview */}
              <div className="animate-fade-up stagger-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-lift">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" />
                <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                    <span className="inline-flex items-center gap-1.5">
                      <Ticket className="h-3 w-3" />
                      Boarding Pass · Preview
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] ring-1",
                        STATUS_TONE[status],
                      )}
                    >
                      {status}
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
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-white/50">
                        Flight
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold">
                        {previewFn}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-white/50">
                        Date
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold">
                        {departureDate || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-white/50">
                        Time
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold">
                        {departureTime || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-white/50">
                        Gate
                      </p>
                      <p className="mt-0.5 text-sm font-bold">
                        {gateOrCheckpoint || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-white/50">
                        Airline
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-bold">
                        {(airlineCode || previewFn.slice(0, 2)).toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-white/50">
                        PAX
                      </p>
                      <p className="mt-0.5 text-sm font-bold">
                        {expectedPax || "—"}
                      </p>
                    </div>
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

              {/* Tips */}
              <Card className="animate-fade-up stagger-3 lift">
                <CardBody className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                    Tips cepat
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-blue-500">•</span>
                      Status <strong>OPEN/ACTIVE</strong> dapat divalidasi.
                      DRAFT/CLOSED/CANCELLED diblokir scan.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-blue-500">•</span>
                      <em>Expected PAX</em> mengaktifkan progres boarding di
                      dashboard.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-blue-500">•</span>
                      Kode IATA 3-huruf seperti CGK, DPS, SUB.
                    </li>
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
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
