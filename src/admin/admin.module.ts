import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEmail } from './entities/campaign-email.entity';
import { DashboardService } from './services/dashboard.service';
import { TicketService } from './services/ticket.service';
import { CampaignEmailService } from './services/campaign-email.service';
import { DashboardController } from './controllers/dashboard.controller';
import { TicketController } from './controllers/ticket.controller';
import { CampaignEmailController } from './controllers/campaign-email.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignEmail])],
  providers: [DashboardService, TicketService, CampaignEmailService],
  controllers: [DashboardController, TicketController, CampaignEmailController],
})
export class AdminModule {} 