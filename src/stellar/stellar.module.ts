import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { Order } from '../orders/orders.entity';
import { StellarCursor } from './entities/stellar-cursor.entity';
import { TicketsModule } from '../tickets-inventory/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, StellarCursor]),
    TicketsModule,
  ],
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule implements OnModuleInit {
  constructor(private readonly stellarService: StellarService) {}

  async onModuleInit() {
    // Start the payment listener when the module initializes
    await this.stellarService.listenForPayments();
  }
}
