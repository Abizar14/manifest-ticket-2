import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateFlightDto,
  ListFlightsQuery,
  SyncFlightsDto,
  UpdateFlightDto,
} from "./dto";

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

  /**
   * Snapshot jadwal harian (mis. tarik FIDS): upsert massal by kunci unik
   * [station, flightNumber, std]. Aman dipanggil berulang — record yang sudah
   * ada di-update (status/rute), yang baru dibuat. Tidak menghapus apa pun,
   * sehingga jadwal hari/tanggal lampau tetap tersimpan sebagai riwayat.
   */
  async bulkUpsert(dto: SyncFlightsDto) {
    // Dedupe input by kunci unik supaya tak ada bentrok create dalam 1 batch.
    const byKey = new Map<string, CreateFlightDto>();
    for (const f of dto.flights) {
      const stdIso = new Date(f.std).toISOString();
      byKey.set(`${f.station}__${f.flightNumber}__${stdIso}`, f);
    }
    const unique = Array.from(byKey.values());

    const ops = unique.map((f) => {
      const std = new Date(f.std);
      return this.prisma.flight.upsert({
        where: {
          station_flightNumber_std: {
            station: f.station,
            flightNumber: f.flightNumber,
            std,
          },
        },
        create: { ...f, std },
        update: {
          airlineCode: f.airlineCode,
          origin: f.origin,
          destination: f.destination,
          status: f.status,
        },
      });
    });

    await this.prisma.$transaction(ops);
    return { ok: true, synced: unique.length };
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
