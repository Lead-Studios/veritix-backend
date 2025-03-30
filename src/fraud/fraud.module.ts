import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { FraudService } from "./fraud.service"
import { FraudController } from "./fraud.controller"
import { Transaction, TransactionSchema } from "./schemas/transaction.schema"
import { FraudLog, FraudLogSchema } from "./schemas/fraud-log.schema"
import { FraudRule, FraudRuleSchema } from "./schemas/fraud-rule.schema"
import { NotificationService } from "../notification/notification.service"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: FraudLog.name, schema: FraudLogSchema },
      { name: FraudRule.name, schema: FraudRuleSchema },
    ]),
  ],
  controllers: [FraudController],
  providers: [FraudService, NotificationService],
  exports: [FraudService],
})
export class FraudModule {}

