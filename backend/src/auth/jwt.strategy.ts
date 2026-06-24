import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // F-01: gagal-cepat bila JWT_SECRET tidak di-set / lemah. TANPA fallback
    // "dev-secret" (yang publik & bisa dipakai memalsukan token admin).
    const secret = cfg.get<string>("JWT_SECRET");
    if (!secret || secret.length < 32) {
      throw new Error(
        "JWT_SECRET wajib di-set & minimal 32 karakter acak (lihat AUDIT-KEAMANAN F-01).",
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // F-11: cek status akun tiap request — operator yang dinonaktifkan/dihapus
  // langsung kehilangan akses (tanpa harus menunggu token kedaluwarsa).
  async validate(payload: JwtPayload) {
    const op = await this.prisma.operator.findUnique({
      where: { id: payload.sub },
      select: { active: true },
    });
    if (!op || !op.active) {
      throw new UnauthorizedException("Akun nonaktif atau tidak ditemukan.");
    }
    return payload; // attached as req.user
  }
}
