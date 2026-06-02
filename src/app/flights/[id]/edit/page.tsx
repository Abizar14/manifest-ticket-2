"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plane, Save, AlertCircle } from "lucide-react";
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
import { todayDateString, tomorrowDateString } from "@/lib/utils";
import { canManageFlights } from "@/lib/auth";

const STATUSES: FlightStatus[] = [
  "DRAFT",
  "OPEN",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
];

export default function EditFlightPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [flightNumber, setFlightNumber] = useState("");
  const [airlineCode, setAirlineCode] = useState("");
  const [originAirport, setOriginAirport] = useState("");
  const [destinationAirport, setDestinationAirport] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [gateOrCheckpoint, setGateOrCheckpoint] = useState("");
  const [status, setStatus] = useState<FlightStatus>("OPEN");

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
    setFlightNumber(f.flightNumber);
    setAirlineCode(f.airlineCode);
    setOriginAirport(f.originAirport);
    setDestinationAirport(f.destinationAirport);
    setDepartureDate(f.departureDate);
    setDepartureTime(f.departureTime);
    setGateOrCheckpoint(f.gateOrCheckpoint);
    setStatus(f.status);
    setReady(true);
  }, [id, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!id) return;

    const fn = flightNumber.trim().toUpperCase();
    if (!fn) {
      setError("Flight number wajib diisi.");
      return;
    }

    const today = todayDateString();
    const tomorrow = tomorrowDateString();
    if (departureDate !== today && departureDate !== tomorrow) {
      setError("Tanggal hanya boleh hari ini atau besok.");
      return;
    }

    const duplicate = getFlights().some(
      (f) =>
        f.id !== id &&
        f.flightNumber.toUpperCase() === fn &&
        f.departureDate === departureDate,
    );
    if (duplicate) {
      setError("Flight dengan nomor & tanggal yang sama sudah ada.");
      return;
    }

    const patch: Partial<Flight> = {
      flightNumber: fn,
      airlineCode: airlineCode.trim().toUpperCase() || fn.slice(0, 2),
      originAirport: originAirport.trim().toUpperCase(),
      destinationAirport: destinationAirport.trim().toUpperCase(),
      departureDate,
      departureTime,
      gateOrCheckpoint: gateOrCheckpoint.trim(),
      status,
    };
    updateFlight(id, patch);
    router.replace(`/flights/${id}`);
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

  return (
    <AppShell>
      <div className="max-w-3xl space-y-4">
        <Link
          href={`/flights/${id}`}
          className="inline-flex animate-fade-up items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 backdrop-blur transition hover:text-blue-700 hover:ring-blue-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke detail flight
        </Link>

        <Card className="animate-fade-up stagger-1 lift">
          <div className="deco-blob -right-16 -top-16 h-44 w-44 bg-blue-200" />
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                  <Plane className="h-3.5 w-3.5" />
                </span>
                Edit Penerbangan
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={submit} className="space-y-5">
              {error && (
                <div className="flex animate-fade-up items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Flight Number" required>
                  <Input
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="GA123"
                    required
                  />
                </Field>
                <Field label="Airline Code">
                  <Input
                    value={airlineCode}
                    onChange={(e) => setAirlineCode(e.target.value)}
                    placeholder="GA"
                  />
                </Field>

                <Field label="Origin (IATA)">
                  <Input
                    value={originAirport}
                    onChange={(e) => setOriginAirport(e.target.value)}
                    placeholder="CGK"
                  />
                </Field>
                <Field label="Destination (IATA)" required>
                  <Input
                    value={destinationAirport}
                    onChange={(e) => setDestinationAirport(e.target.value)}
                    placeholder="DPS"
                    required
                  />
                </Field>

                <Field label="Departure Date" required>
                  <Input
                    type="date"
                    min={todayDateString()}
                    max={tomorrowDateString()}
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Departure Time" required>
                  <Input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    required
                  />
                </Field>

                <Field label="Gate / Checkpoint" required>
                  <Input
                    value={gateOrCheckpoint}
                    onChange={(e) => setGateOrCheckpoint(e.target.value)}
                    placeholder="Gate A1"
                    required
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as FlightStatus)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Link href={`/flights/${id}`}>
                  <Button type="button" variant="outline">
                    Batal
                  </Button>
                </Link>
                <Button type="submit">
                  <Save className="h-4 w-4" />
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
