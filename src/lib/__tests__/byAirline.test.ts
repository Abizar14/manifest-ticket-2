import { describe, it, expect } from "vitest";
import { buildByAirlineReport } from "../reports/byAirline";
import type { Flight } from "../types";

function flt(o: Partial<Flight>): Flight {
  return {
    id: o.id ?? "f",
    flightNumber: o.flightNumber ?? "XX000",
    airlineCode: o.airlineCode ?? "XX",
    originAirport: "AAP",
    destinationAirport: "CGK",
    departureDate: o.departureDate ?? "2026-07-03",
    departureTime: o.departureTime ?? "08:00",
    gateOrCheckpoint: "A1",
    status: "OPEN",
    createdAt: "",
    updatedAt: "",
    ...o,
  } as Flight;
}

const flights: Flight[] = [
  flt({ id: "f1", airlineCode: "GA", flightNumber: "GA1", departureDate: "2026-07-03", departureTime: "07:00" }),
  flt({ id: "f2", airlineCode: "GA", flightNumber: "GA2", departureDate: "2026-07-03", departureTime: "09:00" }),
  flt({ id: "f3", airlineCode: "ID", flightNumber: "ID1", departureDate: "2026-07-03", departureTime: "08:00" }),
  flt({ id: "f4", airlineCode: "JT", flightNumber: "JT1", departureDate: "2026-07-02", departureTime: "08:00" }), // kemarin
];

const paxCounts = new Map<string, number>([
  ["f1", 30],
  ["f2", 20],
  ["f3", 40],
  // f4 tidak ada entri → 0
]);

describe("buildByAirlineReport", () => {
  it("agregasi pax per maskapai untuk 1 tanggal, urut pax desc", () => {
    const r = buildByAirlineReport(flights, paxCounts, "2026-07-03", "2026-07-03");
    expect(r.totals.passengers).toBe(90); // 30+20+40
    expect(r.totals.flights).toBe(3); // f4 di luar tanggal
    expect(r.totals.airlines).toBe(2); // GA, ID
    expect(r.airlines[0].airlineCode).toBe("GA"); // 50 tertinggi (30+20)
    expect(r.airlines[0].passengers).toBe(50);
    expect(r.airlines[0].flights).toBe(2);
    expect(r.airlines[1].airlineCode).toBe("ID");
    expect(r.airlines[1].passengers).toBe(40);
  });

  it("flight tanpa pax dihitung 0, maskapai tetap muncul", () => {
    const r = buildByAirlineReport(flights, paxCounts, "2026-07-02", "2026-07-02");
    expect(r.totals.passengers).toBe(0);
    expect(r.totals.flights).toBe(1);
    expect(r.airlines[0].airlineCode).toBe("JT");
    expect(r.airlines[0].passengers).toBe(0);
  });

  it("rentang lintas-tanggal menggabungkan semua", () => {
    const r = buildByAirlineReport(flights, paxCounts, "2026-07-02", "2026-07-03");
    expect(r.totals.flights).toBe(4);
    expect(r.totals.airlines).toBe(3); // GA, ID, JT
  });

  it("flightsDetail terurut tanggal lalu jam", () => {
    const r = buildByAirlineReport(flights, paxCounts, "2026-07-03", "2026-07-03");
    const ga = r.airlines.find((a) => a.airlineCode === "GA")!;
    expect(ga.flightsDetail.map((f) => f.flightNumber)).toEqual(["GA1", "GA2"]);
  });
});
