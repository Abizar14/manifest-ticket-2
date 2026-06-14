import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
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
      role: user.role,
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

  async me(userId: string) {
    const user = await this.prisma.operator.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, station: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
