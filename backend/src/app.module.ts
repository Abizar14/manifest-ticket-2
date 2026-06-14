import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { FacePhotosModule } from "./face-photos/face-photos.module";
import { FlightsModule } from "./flights/flights.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ScanEventsModule } from "./scan-events/scan-events.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    FlightsModule,
    ScanEventsModule,
    FacePhotosModule,
  ],
})
export class AppModule {}
