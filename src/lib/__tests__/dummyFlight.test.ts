import { describe, it, expect, vi, afterEach } from "vitest";
import {
  activeTestFlight,
  departureTimeSoon,
  planTestFlight,
  testFlightsEnabled,
  DUMMY_GATE,
} from "../dummyFlight";
import type { Flight } from "../types";

const now = new Date(2026, 8, 28, 15, 20); // 28 Sep 2026 15:20
const BP = "M1RACHMI/DHEA ANGGRAENEINBTXL AAPSUBIU 0653 157Y018F0020 100";

function flight(p: Partial<Flight>): Flight {
  return {
    id: "f1",
    flightNumber: "IU653",
    airlineCode: "IU",
    originAirport: "AAP",
    destinationAirport: "SUB",
    departureDate: "2026-09-28",
    departureTime: "08:00",
    gateOrCheckpoint: "Gate A1",
    status: "CLOSED",
    createdAt: "",
    updatedAt: "",
    ...p,
  };
}

describe("departureTimeSoon", () => {
  it("sekarang + 45 menit", () => {
    expect(departureTimeSoon(now)).toBe("16:05");
  });
  it("dibatasi 23:59 bila melewati tengah malam", () => {
    expect(departureTimeSoon(new Date(2026, 8, 28, 23, 30))).toBe("23:59");
  });
});

describe("planTestFlight", () => {
  it("belum ada flight hari ini → buat penerbangan uji dari BCBP", () => {
    const plan = planTestFlight(BP, [], now, "flt_x");
    expect(plan?.kind).toBe("create");
    expect(plan?.flight).toMatchObject({
      id: "flt_x",
      flightNumber: "IU653",
      airlineCode: "IU",
      originAirport: "AAP",
      destinationAirport: "SUB",
      departureDate: "2026-09-28",
      gateOrCheckpoint: DUMMY_GATE,
      status: "OPEN",
      isTest: true,
    });
  });

  it("flight TERJADWAL hari ini → conflict (flight riil tak dijadikan uji)", () => {
    const plan = planTestFlight(BP, [flight({})], now, "baru");
    expect(plan?.kind).toBe("conflict");
    expect(plan?.flight.id).toBe("f1");
    expect(plan?.flight.isTest).toBeUndefined();
  });

  it("flight UJI hari ini berstatus CLOSED → reopen (buka lagi)", () => {
    const plan = planTestFlight(BP, [flight({ isTest: true })], now, "baru");
    expect(plan?.kind).toBe("reopen");
    expect(plan && plan.kind === "reopen" ? plan.patch : null).toEqual({
      status: "OPEN",
    });
    expect(plan?.flight.id).toBe("f1");
  });

  it("flight UJI hari ini sudah OPEN → reopen tanpa perubahan", () => {
    const plan = planTestFlight(
      BP,
      [flight({ isTest: true, status: "OPEN" })],
      now,
      "baru",
    );
    expect(plan && plan.kind === "reopen" ? plan.patch : null).toEqual({});
  });

  it("flight bernomor sama di tanggal lain tidak dihitung", () => {
    const plan = planTestFlight(
      BP,
      [flight({ departureDate: "2026-06-06" })],
      now,
      "baru",
    );
    expect(plan?.kind).toBe("create");
  });

  it("barcode tak dikenal → null", () => {
    expect(planTestFlight("ngawur", [], now, "f")).toBeNull();
  });
});

describe("testFlightsEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("default: nyala di luar produksi", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_FLIGHTS", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(testFlightsEnabled()).toBe(true);
  });
  it("default: MATI di produksi", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_FLIGHTS", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(testFlightsEnabled()).toBe(false);
  });
  it("flag env memaksa nyala/mati", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_FLIGHTS", "true");
    expect(testFlightsEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_FLIGHTS", "false");
    expect(testFlightsEnabled()).toBe(false);
  });
});

describe("activeTestFlight", () => {
  afterEach(() => vi.unstubAllEnvs());
  const today = "2026-09-28";

  it("flight uji hari ini → berlaku", () => {
    const t = flight({ isTest: true });
    expect(activeTestFlight([t], "iu653", today)).toBe(t);
  });
  it("ada flight terjadwal bernomor sama hari ini → flight uji diabaikan", () => {
    const t = flight({ id: "t", isTest: true });
    expect(activeTestFlight([t, flight({})], "IU653", today)).toBeNull();
  });
  it("flight uji hari lain → tidak berlaku", () => {
    const t = flight({ isTest: true, departureDate: "2026-09-27" });
    expect(activeTestFlight([t], "IU653", today)).toBeNull();
  });
  it("fitur mati → tidak berlaku", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_FLIGHTS", "false");
    expect(
      activeTestFlight([flight({ isTest: true })], "IU653", today),
    ).toBeNull();
  });
});
