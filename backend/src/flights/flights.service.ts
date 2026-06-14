import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFlightDto, ListFlightsQuery, UpdateFlightDto } from "./dto";

@Injectable()
export class FlightsService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListFlightsQuery) {
    const where: Record<string, unknown> = {};
    if (q.station) where.station = q.station;
    if (q.status) where.status = q.status;
    if (q.date) {
      const start = new Date(`${q.date}T00:00:00Z`);
      const end = new Date(`${q.date}T23:59:59.999Z`);
      where.std = { gte: start, lte: end };
    }
    const page = Math.max(1, q.page ?? 1);
    const perPage = Math.min(200, Math.max(1, q.perPage ?? 50));
    const [items, total] = await Promise.all([
      this.prisma.flight.findMany({
        where,
        orderBy: { std: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.flight.count({ where }),
    ]);
    return { items, page, perPage, total };
  }

  async create(dto: CreateFlightDto) {
    return this.prisma.flight.create({
      data: { ...dto, std: new Date(dto.std) },
    });
  }

  async update(id: string, dto: UpdateFlightDto) {
    const exists = await this.prisma.flight.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Flight not found");
    return this.prisma.flight.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.std && { std: new Date(dto.std) }),
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.flight.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Flight not found");
    await this.prisma.flight.delete({ where: { id } });
    return { ok: true };
  }
}
