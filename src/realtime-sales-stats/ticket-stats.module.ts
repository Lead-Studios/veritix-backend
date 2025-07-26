import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TicketStatsGateway } from './ticket-stats.gateway';
import { TicketStatsService } from './ticket-stats.service';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { TicketController } from './ticket.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    TicketStatsGateway,
    TicketStatsService,
    WsAuthGuard,
  ],
  controllers: [TicketController],
  exports: [TicketStatsService],
})
export class TicketStatsModule {}
