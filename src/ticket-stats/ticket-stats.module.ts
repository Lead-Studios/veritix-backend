import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TicketStatsGateway } from '../gateways/ticket-stats.gateway';
import { TicketStatsService } from '../services/ticket-stats.service';
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';
import { Purchase } from '../entities/purchase.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Ticket, Purchase]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [TicketStatsGateway, TicketStatsService],
  exports: [TicketStatsService],
})
export class TicketStatsModule {}
