import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes, randomInt } from "crypto";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { pinLookupHash } from "../common/pin-lookup";
import {
  CreateOperatorDto,
  ListOperatorsQuery,
  SetPinDto,
  UpdateOperatorDto,
} from "./dto";

// Field publik — JANGAN pernah ekspos passwordHash / pinHash.
const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  station: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Tambahan: tandai apakah operator punya PIN (untuk badge di UI), tanpa bocorkan hash.
const SELECT_WITH_PIN_FLAG = { ...SAFE_SELECT, pinHash: true } as const;

type WithPinHash = { pinHash: string | null };

function withHasPin<T extends WithPinHash>(op: T) {
  const { pinHash, ...rest } = op;
  return { ...rest, hasPin: Boolean(pinHash) };
}

@Injectable()
export class OperatorsService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListOperatorsQuery) {
    const where: Record<string, unknown> = {};
    if (q.station) where.station = q.station;
    if (q.role) where.role = q.role;
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { email: { contains: q.q, mode: "insensitive" } },
      ];
    }
    const items = await this.prisma.operator.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: SELECT_WITH_PIN_FLAG,
    });
    return { items: items.map(withHasPin) };
  }

  async create(dto: CreateOperatorDto) {
    const email = (dto.email ?? this.emailFromName(dto.name)).toLowerCase();
    const existing = await this.prisma.operator.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email sudah dipakai.");

    // PIN: pakai input atau generate acak yang belum bentrok dengan petugas aktif.
    const pin = dto.pin ?? (await this.generateUniquePin());
    if (dto.pin) {
      this.assertPinStrong(dto.pin);
      await this.assertPinFree(dto.pin);
    }
    const password = dto.password ?? this.generatePassword();

    const created = await this.prisma.operator.create({
      data: {
        email,
        name: dto.name,
        role: dto.role ?? "operator",
        station: dto.station ?? null,
        passwordHash: await bcrypt.hash(password, 10),
        pinHash: await bcrypt.hash(pin, 10),
        pinLookup: pinLookupHash(pin), // P-05/P-06: lookup O(1)
        active: true,
      },
      select: SELECT_WITH_PIN_FLAG,
    });
    // PIN (dan password bila digenerate) hanya dikembalikan SEKALI di sini.
    return {
      operator: withHasPin(created),
      pin,
      ...(dto.password ? {} : { password }),
    };
  }

  async update(id: string, dto: UpdateOperatorDto) {
    const op = await this.prisma.operator.findUnique({ where: { id } });
    if (!op) throw new NotFoundException("Petugas tidak ditemukan.");

    if (dto.email && dto.email.toLowerCase() !== op.email) {
      const clash = await this.prisma.operator.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (clash) throw new ConflictException("Email sudah dipakai.");
    }

    const updated = await this.prisma.operator.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.station !== undefined && { station: dto.station || null }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      select: SELECT_WITH_PIN_FLAG,
    });
    return withHasPin(updated);
  }

  async setPin(id: string, dto: SetPinDto) {
    const op = await this.prisma.operator.findUnique({ where: { id } });
    if (!op) throw new NotFoundException("Petugas tidak ditemukan.");

    const pin = dto.pin ?? (await this.generateUniquePin(id));
    if (dto.pin) {
      this.assertPinStrong(dto.pin);
      await this.assertPinFree(dto.pin, id);
    }

    await this.prisma.operator.update({
      where: { id },
      data: {
        pinHash: await bcrypt.hash(pin, 10),
        pinLookup: pinLookupHash(pin), // P-05/P-06: lookup O(1)
      },
    });
    return { pin };
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException("Tidak bisa menghapus akun sendiri.");
    }
    const op = await this.prisma.operator.findUnique({ where: { id } });
    if (!op) throw new NotFoundException("Petugas tidak ditemukan.");

    // FK: ScanEvent.operatorId wajib. Punya riwayat scan → jangan hard-delete,
    // arahkan ke nonaktifkan supaya jejak audit tetap utuh.
    const scans = await this.prisma.scanEvent.count({ where: { operatorId: id } });
    if (scans > 0) {
      throw new BadRequestException(
        `Petugas punya ${scans} riwayat scan — nonaktifkan saja (jangan hapus) agar audit tetap utuh.`,
      );
    }
    await this.prisma.operator.delete({ where: { id } });
    return { ok: true };
  }

  // ─────────────────────────── Helpers ───────────────────────────

  private emailFromName(name: string): string {
    const slug =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .slice(0, 24) || "petugas";
    const suffix = randomInt(1000, 9999);
    return `${slug}.${suffix}@afvs.local`;
  }

  private generatePassword(): string {
    return `Pw-${randomBytes(9).toString("base64url")}`;
  }

  /** PIN 6-digit acak yang belum dipakai petugas aktif lain. */
  private async generateUniquePin(excludeId?: string): Promise<string> {
    for (let i = 0; i < 50; i++) {
      const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
      if (await this.isPinFree(pin, excludeId)) return pin;
    }
    throw new ConflictException("Gagal membuat PIN unik, coba lagi.");
  }

  /**
   * Tolak PIN yang terlalu gampang ditebak. Penting karena login-PIN
   * mencocokkan ke SEMUA petugas aktif — PIN lemah bisa dipakai orang lain
   * masuk sebagai petugas itu. Hanya berlaku untuk PIN pilihan sendiri
   * (PIN acak sistem sudah pasti tak berpola).
   */
  private assertPinStrong(pin: string) {
    const allSame = /^(\d)\1+$/.test(pin); // 0000, 111111, dst
    const asc = "0123456789";
    const desc = "9876543210";
    const sequential = asc.includes(pin) || desc.includes(pin); // 1234, 6543, dst
    if (allSame || sequential) {
      throw new BadRequestException(
        "PIN terlalu mudah ditebak (angka sama atau berurutan). Pakai kombinasi lain.",
      );
    }
  }

  private async assertPinFree(pin: string, excludeId?: string) {
    if (!(await this.isPinFree(pin, excludeId))) {
      throw new ConflictException("PIN sudah dipakai petugas lain.");
    }
  }

  /**
   * PIN disimpan ter-hash, jadi bandingkan ke setiap petugas aktif yang punya
   * PIN (jumlah kecil). loginPin mencocokkan PIN→petugas, jadi PIN harus unik.
   */
  private async isPinFree(pin: string, excludeId?: string): Promise<boolean> {
    const lookup = pinLookupHash(pin);
    // O(1): operator aktif lain dengan pinLookup sama → PIN sudah dipakai.
    const clash = await this.prisma.operator.findFirst({
      where: {
        active: true,
        pinLookup: lookup,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash) return false;
    // Legacy: operator PIN lama (pinLookup belum diisi) → fallback bcrypt
    // (jumlah menyusut seiring login/reset; akhirnya 0).
    const legacy = await this.prisma.operator.findMany({
      where: {
        active: true,
        pinHash: { not: null },
        pinLookup: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { pinHash: true },
    });
    for (const o of legacy) {
      if (o.pinHash && (await bcrypt.compare(pin, o.pinHash))) return false;
    }
    return true;
  }
}
