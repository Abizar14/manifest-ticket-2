import { Module } from "@nestjs/common";
import { ScanEventsController } from "./scan-events.controller";
import { ScanEventsService } from "./scan-events.service";

@Module({
  controllers: [ScanEventsController],
  providers: [ScanEventsService],
})
export class ScanEventsModule {}
