import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { EscrowService } from "./escrow.service";
import { RefundsService } from "./refunds.service";
import { EscrowController } from "./escrow.controller";
import { User } from "./entities/user.entity";
import { Ticket } from "./entities/ticket.entity";
import { Order } from "./entities/order.entity";
import { Payment } from "./entities/payment.entity";
import { Escrow } from "./entities/escrow.entity";
import { Refund } from "./entities/refund.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, Ticket, Order, Payment, Escrow, Refund])],
  providers: [OrdersService, EscrowService, RefundsService],
  controllers: [EscrowController],
})
export class PaymentsModule {}
