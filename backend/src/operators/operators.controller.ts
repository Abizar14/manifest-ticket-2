import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { diskStorage } from "multer";
import { existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/auth.service";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  CreateOperatorDto,
  ListOperatorsQuery,
  SetPinDto,
  UpdateOperatorDto,
} from "./dto";
import { OperatorsService } from "./operators.service";

// Foto petugas disimpan di UPLOAD_DIR/operators (default ./uploads/operators),
// nama file = <operatorId><ext> agar idempotent (upload ulang menimpa entri lama).
const operatorPhotoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const root = process.env.UPLOAD_DIR ?? "./uploads";
    const dir = join(root, "operators");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const id = (req.params as Record<string, string>).id ?? `unknown-${Date.now()}`;
    cb(null, `${id}${extname(file.originalname) || ".jpg"}`);
  },
});

@ApiTags("operators")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@Controller("operators")
export class OperatorsController {
  constructor(private svc: OperatorsService) {}

  @Get()
  list(@Query() q: ListOperatorsQuery) {
    return this.svc.list(q);
  }

  @Post()
  create(@Body() dto: CreateOperatorDto) {
    return this.svc.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateOperatorDto) {
    return this.svc.update(id, dto);
  }

  @Post(":id/pin")
  setPin(@Param("id") id: string, @Body() dto: SetPinDto) {
    return this.svc.setPin(id, dto);
  }

  @Post(":id/photo")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: operatorPhotoStorage,
      limits: { fileSize: Number(process.env.OPERATOR_PHOTO_MAX_SIZE ?? 2_097_152) }, // 2MB
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
          return cb(new Error("Format foto harus JPEG/PNG/WebP"), false);
        }
        cb(null, true);
      },
    }),
  )
  setPhoto(@Param("id") id: string, @UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new NotFoundException("File foto tidak ditemukan.");
    return this.svc.setPhoto(id, photo);
  }

  @Get(":id/photo")
  async servePhoto(@Param("id") id: string, @Res() res: Response) {
    const path = await this.svc.getPhotoPath(id);
    if (!path) throw new NotFoundException();
    return res.sendFile(path, { root: "." });
  }

  @Delete(":id/photo")
  clearPhoto(@Param("id") id: string) {
    return this.svc.clearPhoto(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: { user: JwtPayload }) {
    return this.svc.remove(id, req.user.sub);
  }
}
