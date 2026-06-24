import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { PrismaService } from "../prisma/prisma.service";

/**
 * F-06: kebijakan retensi data biometrik (UU PDP). Menghapus FILE foto wajah
 * yang lebih lama dari batas retensi (`FACE_RETENTION_DAYS`, default 30) lalu
 * mengosongkan `facePhotoPath`. Record scan tetap utuh untuk audit — hanya
 * biometriknya yang dimusnahkan (prinsip minimisasi & retensi).
 *
 * Tanpa dependensi penjadwal eksternal: jalan sekali ~10 dtk setelah boot, lalu
 * tiap 12 jam (timer di-`unref` agar tidak menahan proses saat shutdown).
 */
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {}

  onModuleInit() {
    setTimeout(() => void this.runSafe(), 10_000).unref();
    this.timer = setInterval(() => void this.runSafe(), 12 * 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private retentionDays(): number {
    const v = Number(this.cfg.get<string>("FACE_RETENTION_DAYS") ?? 30);
    return Number.isFinite(v) && v > 0 ? v : 30;
  }

  private async runSafe() {
    try {
      await this.purgeOldFacePhotos();
    } catch (e) {
      this.logger.error(`Retensi gagal: ${(e as Error).message}`);
    }
  }

  async purgeOldFacePhotos(): Promise<{ deleted: number }> {
    const days = this.retentionDays();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.scanEvent.findMany({
      where: { facePhotoPath: { not: null }, scannedAt: { lt: cutoff } },
      select: { id: true, facePhotoPath: true },
    });
    if (rows.length === 0) return { deleted: 0 };

    let deleted = 0;
    for (const r of rows) {
      if (r.facePhotoPath && existsSync(r.facePhotoPath)) {
        try {
          await unlink(r.facePhotoPath);
        } catch {
          /* file mungkin sudah hilang — tetap kosongkan path di DB */
        }
      }
      deleted++;
    }
    await this.prisma.scanEvent.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { facePhotoPath: null },
    });
    this.logger.log(
      `Retensi: ${deleted} foto wajah >${days} hari dihapus (biometrik dimusnahkan).`,
    );
    return { deleted };
  }
}
