import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { StellarController } from './stellar.controller';
import { StellarCursor } from './entities/stellar-cursor.entity';
import { TicketPurchase } from '../tickets/entities/ticket-pruchase';
import { User } from '../users/entities/user.entity';
import { TicketModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StellarCursor, TicketPurchase, User]),
    TicketModule,
  ],
  controllers: [StellarController],
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule implements OnModuleInit {
  constructor(private readonly stellarService: StellarService) {}

  async onModuleInit() {
    await this.stellarService.startPaymentListener();
  }
}
