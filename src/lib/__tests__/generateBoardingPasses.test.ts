import { describe, it, expect } from "vitest";
import { buildBoardingPassesFromFlights } from "../generateBoardingPasses";
import { buildPayload } from "../seedBoardingPasses";
import { parseBarcode } from "../barcode";
import type { Flight, FlightStatus } from "../types";

function makeFlight(over: Partial<Flight> = {}): Flight {
  return {
    id: "flt_1",
    flightNumber: "GA123",
    airlineCode: "GA",
    originAirport: "AAP",
    destinationAirport: "CGK",
    departureDate: "2026-06-25",
    departureTime: "08:30",
    gateOrCheckpoint: "Gate A1",
    status: "OPEN" as FlightStatus,
    expectedPax: 180,
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    ...over,
  };
}

describe("buildBoardingPassesFromFlights", () => {
  it("membuat tepat N boarding pass per flight (default 10)", () => {
    const out = buildBoardingPassesFromFlights([makeFlight()], 10);
    expect(out).toHaveLength(10);
    expect(out.every((b) => b.flightNumber === "GA123")).toBe(true);
  });

  it("jumlah per flight bisa diatur", () => {
    const out = buildBoardingPassesFromFlights([makeFlight()], 3);
    expect(out).toHaveLength(3);
  });

  it("melewati flight CANCELLED", () => {
    const out = buildBoardingPassesFromFlights(
      [makeFlight({ status: "CANCELLED" as FlightStatus })],
      10,
    );
    expect(out).toHaveLength(0);
  });

  it("kursi unik per flight", () => {
    const out = buildBoardingPassesFromFlights([makeFlight()], 10);
    const seats = out.map((b) => b.seat);
    expect(new Set(seats).size).toBe(seats.length);
  });

  it("deterministik — hasil sama tiap pemanggilan", () => {
    const a = buildBoardingPassesFromFlights([makeFlight()], 10);
    const b = buildBoardingPassesFromFlights([makeFlight()], 10);
    expect(a).toEqual(b);
  });

  it("payload bisa di-parse ulang oleh parseBarcode", () => {
    const [bp] = buildBoardingPassesFromFlights([makeFlight()], 1);
    const parsed = parseBarcode(buildPayload(bp));
    expect(parsed?.flightNumber).toBe(bp.flightNumber);
    expect(parsed?.seatNumber).toBe(bp.seat);
    expect(parsed?.pnr).toBe(bp.pnr);
  });

  it("gabungan beberapa flight = N × jumlah flight", () => {
    const out = buildBoardingPassesFromFlights(
      [makeFlight(), makeFlight({ id: "flt_2", flightNumber: "JT902" })],
      10,
    );
    expect(out).toHaveLength(20);
  });
});
