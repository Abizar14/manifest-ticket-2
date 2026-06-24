import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { existsSync } from "node:fs";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("face-photos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("face-photos")
export class FacePhotosController {
  constructor(private prisma: PrismaService) {}

  @Get(":eventId")
  async serve(
    @Req() req: { user: JwtPayload },
    @Param("eventId") eventId: string,
    @Res() res: Response,
  ) {
    const ev = await this.prisma.scanEvent.findUnique({
      where: { eventId },
      select: { facePhotoPath: true, station: true },
    });
    // F-05: operator hanya boleh foto wajah station-nya sendiri (biometrik/PII).
    // 404 (bukan 403) agar eventId tidak bisa dienumerasi lintas-station.
    const privileged =
      req.user.role === "admin" || req.user.role === "supervisor";
    if (
      !ev?.facePhotoPath ||
      (!privileged && ev.station !== req.user.station) ||
      !existsSync(ev.facePhotoPath)
    ) {
      throw new NotFoundException();
    }
    return res.sendFile(ev.facePhotoPath, { root: "." });
  }
}
