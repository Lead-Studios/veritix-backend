import { Module } from "@nestjs/common";
import { FraudDetectionController } from "./fraud-detection.controller";
import { FraudDetectionService } from "./fraud-detection.service";
import { FraudRuleService } from "./fraud-rule.service";

@Module({
  controllers: [FraudDetectionController],
  providers: [FraudDetectionService, FraudRuleService],
  exports: [FraudDetectionService],
})
export class FraudDetectionModule {}
