import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { StellarController } from './stellar.controller';
import { Order } from '../orders/entities/orders.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../common/email/email.module';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Order, Ticket, User]), EmailModule],
  providers: [StellarService],
  controllers: [StellarController],
  exports: [StellarService],
})
export class StellarModule {}
