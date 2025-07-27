import { Module } from "@nestjs/common";
import { RevenueForecastController } from "./revenue-forecast.controller";
import { RevenueForecastService } from "./revenue-forecast.service";

@Module({
  controllers: [RevenueForecastController],
  providers: [RevenueForecastService],
  exports: [RevenueForecastService],
})
export class RevenueForecastModule {}
