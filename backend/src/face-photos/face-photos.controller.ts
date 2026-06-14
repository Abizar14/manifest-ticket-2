import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { existsSync } from "node:fs";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("face-photos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("face-photos")
export class FacePhotosController {
  constructor(private prisma: PrismaService) {}

  @Get(":eventId")
  async serve(@Param("eventId") eventId: string, @Res() res: Response) {
    const ev = await this.prisma.scanEvent.findUnique({
      where: { eventId },
      select: { facePhotoPath: true },
    });
    if (!ev?.facePhotoPath || !existsSync(ev.facePhotoPath)) {
      throw new NotFoundException();
    }
    return res.sendFile(ev.facePhotoPath, { root: "." });
  }
}
