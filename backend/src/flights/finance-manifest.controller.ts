import { BadRequestException, Controller, Get, Headers, Query, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

/** Aggregate-only server integration. Never exposes passenger identities. */
@Controller("integrations/finance")
export class FinanceManifestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("manifests")
  async manifests(
    @Headers("authorization") authorization: string | undefined,
    @Query() query: { from?: string; to?: string; airline?: string },
  ) {
    const secret = process.env.FINANCE_INTEGRATION_TOKEN ?? "";
    const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const a = Buffer.from(secret);
    const b = Buffer.from(supplied);
    if (a.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }
    const parse = (value?: string) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("Tanggal harus YYYY-MM-DD.");
      const date = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException("Tanggal tidak valid.");
      return date.getTime();
    };
    const from = parse(query.from);
    const to = parse(query.to);
    if (to < from || to - from > 30 * 86400000) throw new BadRequestException("Rentang maksimal 31 hari.");
    const airline = query.airline?.trim().toUpperCase() ?? "";
    if (!/^[A-Z0-9]{2,3}$/.test(airline)) throw new BadRequestException("Kode maskapai tidak valid.");
    const flights = await this.prisma.flight.findMany({
      where: {
        origin: process.env.HOME_IATA ?? "AAP", airlineCode: airline,
        std: { gte: new Date(from - 8 * 3600000), lt: new Date(to + 86400000 - 8 * 3600000) },
      },
      orderBy: [{ std: "asc" }, { id: "asc" }],
      select: {
        id: true, flightNumber: true, airlineCode: true, std: true, status: true,
        destination: true, _count: { select: { passengers: true } },
      },
    });
    return {
      schemaVersion: 1, timezone: "Asia/Makassar", from: query.from, to: query.to,
      airlineCode: airline, generatedAt: new Date().toISOString(),
      basis: "valid_scans_not_confirmed_boarding",
      flights: flights.map(({ _count, ...f }) => ({ ...f, passengers: _count.passengers })),
    };
  }
}
