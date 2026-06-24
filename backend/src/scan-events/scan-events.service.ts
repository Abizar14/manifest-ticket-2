import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "../auth/auth.service";
import { ListScansQuery, PushScanDto } from "./dto";

// F-05: supervisor/admin boleh lintas-station; operator hanya station-nya.
function isPrivileged(role: string): boolean {
  return role === "admin" || role === "supervisor";
}

@Injectable()
export class ScanEventsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Idempotent push. Kalau eventId sudah ada, return existing (HTTP 200) supaya
   * outbox client bisa hapus item dari queue tanpa duplikasi.
   */
  async push(
    operatorId: string,
    dto: PushScanDto,
    facePhotoPath: string | null,
  ) {
    const existing = await this.prisma.scanEvent.findUnique({
      where: { eventId: dto.eventId },
    });
    if (existing) return existing;

    // Resolve flight relation by flightNumber + station + date (best-effort)
    let flightId: string | null = null;
    if (dto.flightNumber) {
      const date = new Date(dto.scannedAt);
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);
      const flight = await this.prisma.flight.findFirst({
        where: {
          station: dto.station,
          flightNumber: dto.flightNumber,
          std: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true },
      });
      flightId = flight?.id ?? null;
    }

    return this.prisma.scanEvent.create({
      data: {
        eventId: dto.eventId,
        rawBarcode: dto.rawBarcode,
        flightNumber: dto.flightNumber ?? null,
        pnr: dto.pnr ?? null,
        ticketNumber: dto.ticketNumber ?? null,
        seat: dto.seat ?? null,
        passengerName: dto.passengerName ?? null,
        resultStatus: dto.resultStatus,
        message: dto.message ?? null,
        scannedAt: new Date(dto.scannedAt),
        station: dto.station,
        facePhotoPath,
        ktpStatus: dto.ktpStatus ?? null,
        ktpName: dto.ktpName ?? null,
        ktpSimilarity: dto.ktpSimilarity ?? null,
        ktpCapturedAt: dto.ktpCapturedAt ? new Date(dto.ktpCapturedAt) : null,
        flightId,
        operatorId,
      },
    });
  }

  async findByEventId(eventId: string, user: JwtPayload) {
    const ev = await this.prisma.scanEvent.findUnique({ where: { eventId } });
    // F-05: operator tak boleh mengakses scan station lain. Balas 404 (bukan 403)
    // agar keberadaan record tidak bisa dienumerasi lintas-station.
    if (!ev) throw new NotFoundException();
    if (!isPrivileged(user.role) && ev.station !== user.station) {
      throw new NotFoundException();
    }
    return ev;
  }

  async list(q: ListScansQuery, user: JwtPayload) {
    const where: Record<string, unknown> = {};
    // F-05: operator dikunci ke station-nya sendiri; filter station dari klien
    // diabaikan untuk operator. Supervisor/admin bebas memilih station.
    if (isPrivileged(user.role)) {
      if (q.station) where.station = q.station;
    } else {
      where.station = user.station ?? "__no_station__";
    }
    if (q.flightNumber) where.flightNumber = q.flightNumber;
    if (q.resultStatus) where.resultStatus = q.resultStatus;
    if (q.date) {
      const start = new Date(`${q.date}T00:00:00Z`);
      const end = new Date(`${q.date}T23:59:59.999Z`);
      where.scannedAt = { gte: start, lte: end };
    }
    const page = Math.max(1, q.page ?? 1);
    const perPage = Math.min(200, Math.max(1, q.perPage ?? 50));
    const [items, total] = await Promise.all([
      this.prisma.scanEvent.findMany({
        where,
        orderBy: { scannedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.scanEvent.count({ where }),
    ]);
    return { items, page, perPage, total };
  }
}
