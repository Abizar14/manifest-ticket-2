import { FlightsService } from "./flights.service";

function makePrisma() {
  return {
    flight: { upsert: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

const flight = (over: Record<string, unknown> = {}) => ({
  flightNumber: "GA1",
  airlineCode: "GA",
  origin: "AAP",
  destination: "CGK",
  std: "2026-06-25T08:00:00.000Z",
  status: "OPEN",
  station: "AAP",
  ...over,
});

describe("FlightsService.bulkUpsert (snapshot FIDS)", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let svc: FlightsService;

  beforeEach(() => {
    prisma = makePrisma();
    svc = new FlightsService(prisma as never);
  });

  it("dedup input berdasarkan station+flightNumber+std (idempotent)", async () => {
    const dto = { flights: [flight(), flight(), flight({ flightNumber: "JT2" })] };
    const res = await svc.bulkUpsert(dto as never);
    expect(res).toEqual({ ok: true, synced: 2 });
    expect(prisma.flight.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("array kosong → synced 0, tanpa upsert", async () => {
    const res = await svc.bulkUpsert({ flights: [] } as never);
    expect(res).toEqual({ ok: true, synced: 0 });
    expect(prisma.flight.upsert).not.toHaveBeenCalled();
  });

  it("upsert memakai kunci komposit station_flightNumber_std + std jadi Date", async () => {
    await svc.bulkUpsert({ flights: [flight()] } as never);
    const arg = prisma.flight.upsert.mock.calls[0][0] as {
      where: { station_flightNumber_std: { station: string; flightNumber: string; std: unknown } };
      create: { std: unknown };
    };
    expect(arg.where.station_flightNumber_std).toMatchObject({
      station: "AAP",
      flightNumber: "GA1",
    });
    expect(arg.where.station_flightNumber_std.std).toBeInstanceOf(Date);
    expect(arg.create.std).toBeInstanceOf(Date);
  });
});
