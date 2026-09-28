import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Flight } from "../types";

let flights: Flight[] = [];
vi.mock("../storage", () => ({
  getFlights: () => flights,
  getScanEvents: () => [],
  addScanEvent: vi.fn(),
  updateScanEvent: vi.fn(),
  upsertManifestPax: vi.fn(),
}));

const pushes = vi.hoisted(() => ({
  enqueueValidScan: vi.fn(),
  enqueueScanPush: vi.fn(),
}));
vi.mock("../sikerenOutbox", () => ({
  enqueueValidScan: pushes.enqueueValidScan,
  flushOutbox: vi.fn(() => Promise.resolve()),
}));
vi.mock("../api/outbox", () => ({
  enqueueScanPush: pushes.enqueueScanPush,
  attachFaceToQueued: vi.fn(),
  flushApiOutbox: vi.fn(() => Promise.resolve()),
}));

import { processScan, validateBarcode } from "../scanService";

// Boarding pass asli bertanggal 6 Juni (hari ke-157).
const BP = "M1RACHMI/DHEA ANGGRAENEINBTXL AAPSUBIU 0653 157Y018F0020 100";

function flight(p: Partial<Flight>): Flight {
  return {
    id: "f1",
    flightNumber: "IU653",
    airlineCode: "IU",
    originAirport: "AAP",
    destinationAirport: "SUB",
    departureDate: "2026-09-28",
    departureTime: "02:00", // jauh di luar jendela boarding
    gateOrCheckpoint: "TEST",
    status: "OPEN",
    createdAt: "",
    updatedAt: "",
    ...p,
  };
}

describe("validateBarcode — penerbangan uji", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 15, 20));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("flight biasa: boarding pass tanggal lampau tetap ditolak", () => {
    flights = [flight({})];
    expect(validateBarcode(BP).status).toBe("FLIGHT_NOT_TODAY");
  });

  it("flight uji hari ini: boarding pass asli VALID (tanggal & jam diabaikan)", () => {
    flights = [flight({ isTest: true })];
    const r = validateBarcode(BP);
    expect(r.status).toBe("VALID_FLIGHT");
    expect(r.message).toContain("PENERBANGAN UJI");
    expect(r.message).toContain("2026-06-06");
  });

  it("flight uji tapi status CLOSED manual → tetap ditolak", () => {
    flights = [flight({ isTest: true, status: "CLOSED" })];
    expect(validateBarcode(BP).status).toBe("FLIGHT_NOT_ACTIVE");
  });

  it("flight uji dari hari lain tidak berlaku (dianggap tidak ada)", () => {
    flights = [flight({ isTest: true, departureDate: "2026-09-27" })];
    expect(validateBarcode(BP).status).toBe("UNKNOWN_FLIGHT");
  });

  it("ada flight terjadwal bernomor sama hari ini → flight uji diabaikan", () => {
    flights = [flight({ id: "t", isTest: true }), flight({ id: "real" })];
    const r = validateBarcode(BP);
    expect(r.status).toBe("FLIGHT_NOT_TODAY");
    expect(r.flight?.id).toBe("real");
  });

  it("fitur dimatikan → flight uji dianggap tidak ada", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_FLIGHTS", "false");
    flights = [flight({ isTest: true })];
    expect(validateBarcode(BP).status).toBe("UNKNOWN_FLIGHT");
  });
});

describe("processScan — penerbangan uji tidak dikirim ke server", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 15, 20));
    pushes.enqueueValidScan.mockClear();
    pushes.enqueueScanPush.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("scan VALID pada flight uji: ditandai isTest, tanpa Sikeren & backend", () => {
    flights = [flight({ isTest: true })];
    const { outcome, event } = processScan(BP, "petugas@test");
    expect(outcome.status).toBe("VALID_FLIGHT");
    expect(event.isTest).toBe(true);
    expect(pushes.enqueueValidScan).not.toHaveBeenCalled();
    expect(pushes.enqueueScanPush).not.toHaveBeenCalled();
  });

  it("scan pada flight riil tetap dikirim ke backend", () => {
    flights = [flight({})];
    const { event } = processScan(BP, "petugas@test");
    expect(event.isTest).toBeUndefined();
    expect(pushes.enqueueScanPush).toHaveBeenCalledTimes(1);
  });
});
