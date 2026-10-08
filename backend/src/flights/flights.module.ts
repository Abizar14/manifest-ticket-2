import { Module } from "@nestjs/common";
import { FlightsController } from "./flights.controller";
import { FlightsService } from "./flights.service";
import { FinanceManifestController } from "./finance-manifest.controller";

@Module({
  controllers: [FlightsController, FinanceManifestController],
  providers: [FlightsService],
  exports: [FlightsService],
})
export class FlightsModule {}
