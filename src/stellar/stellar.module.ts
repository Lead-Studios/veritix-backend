import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PriceService } from "./price.service";

@Module({
  imports: [HttpModule],
  providers: [PriceService],
  exports: [PriceService],
})
export class StellarModule {}
