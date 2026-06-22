import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Role } from "../common/roles";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  station: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.operator.findUnique({ where: { email } });
    if (!user || !user.active) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
      station: user.station,
    };
    const token = await this.jwt.signAsync(payload);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        station: user.station,
      },
    };
  }

  /**
   * Login cepat via PIN untuk petugas AVSEC. PIN disimpan ter-hash, jadi
   * dibandingkan ke semua operator aktif yang punya pinHash (jumlah operator
   * kecil, aman). Mengembalikan token + user yang sama dengan login biasa.
   */
  async loginPin(pin: string) {
    const candidates = await this.prisma.operator.findMany({
      where: { active: true, pinHash: { not: null } },
    });
    for (const user of candidates) {
      if (user.pinHash && (await bcrypt.compare(pin, user.pinHash))) {
        const payload: JwtPayload = {
          sub: user.id,
          email: user.email,
          role: user.role as Role,
          station: user.station,
        };
        const token = await this.jwt.signAsync(payload);
        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            station: user.station,
          },
        };
      }
    }
    throw new UnauthorizedException("PIN tidak valid");
  }

  async me(userId: string) {
    const user = await this.prisma.operator.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, station: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
