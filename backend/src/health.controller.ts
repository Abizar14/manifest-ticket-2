import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "./prisma/prisma.service";

/** F-13: health-check khusus (publik, tanpa throttle) untuk monitoring/uptime. */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SkipThrottle()
  async check() {
    let db = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      /* DB tidak terjangkau → status degraded */
    }
    return {
      status: db ? "ok" : "degraded",
      db,
      ts: new Date().toISOString(),
    };
  }
}
