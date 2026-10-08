import { FinanceManifestController } from "./finance-manifest.controller";

describe("Finance manifest integration", () => {
  const findMany = jest.fn();
  const controller = new FinanceManifestController({ flight: { findMany } } as never);
  const token = "integration-test-token-at-least-32-characters";
  const previous = process.env.FINANCE_INTEGRATION_TOKEN;
  beforeEach(() => { process.env.FINANCE_INTEGRATION_TOKEN = token; findMany.mockReset().mockResolvedValue([]); });
  afterAll(() => { if (previous === undefined) delete process.env.FINANCE_INTEGRATION_TOKEN; else process.env.FINANCE_INTEGRATION_TOKEN = previous; });
  it("fails closed without a configured token and rejects wrong credentials", async () => {
    await expect(controller.manifests("Bearer wrong", {})).rejects.toThrow("Unauthorized");
    delete process.env.FINANCE_INTEGRATION_TOKEN;
    await expect(controller.manifests(undefined, {})).rejects.toThrow("Unauthorized");
    expect(findMany).not.toHaveBeenCalled();
  });
  it("validates real dates, airline and bounded ranges", async () => {
    for (const q of [
      { from: "2026-02-30", to: "2026-03-01", airline: "GA" },
      { from: "2026-10-07", to: "2026-10-06", airline: "GA" },
      { from: "2026-01-01", to: "2026-02-01", airline: "GA" },
      { from: "2026-10-07", to: "2026-10-07", airline: "" },
    ]) await expect(controller.manifests(`Bearer ${token}`, q)).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
  });
  it("uses inclusive WITA days, scopes the airline and returns aggregate data", async () => {
    findMany.mockResolvedValue([{ id: "f1", flightNumber: "GA1", _count: { passengers: 42 } }]);
    const result = await controller.manifests(`Bearer ${token}`, { from: "2026-10-07", to: "2026-10-07", airline: "ga" });
    expect(findMany.mock.calls[0][0].where).toMatchObject({ airlineCode: "GA", std: {
      gte: new Date("2026-10-06T16:00:00Z"), lt: new Date("2026-10-07T16:00:00Z"),
    }});
    expect(result.flights).toEqual([{ id: "f1", flightNumber: "GA1", passengers: 42 }]);
    expect(result.basis).toBe("valid_scans_not_confirmed_boarding");
  });
});
