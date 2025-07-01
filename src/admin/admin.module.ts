import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEmail } from './entities/campaign-email.entity';
import { DashboardService } from './services/dashboard.service';
import { TicketService } from './services/ticket.service';
import { CampaignEmailService } from './services/campaign-email.service';
import { DashboardController } from './controllers/dashboard.controller';
import { TicketController } from './controllers/ticket.controller';
import { CampaignEmailController } from './controllers/campaign-email.controller';
import { Event } from '../event/entities/event.entity';
import { EventService } from './services/event.service';
import { ReportService } from './services/report.service';
import { EventController } from './controllers/event.controller';
import { ReportController } from './controllers/report.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignEmail, Event])],
  providers: [DashboardService, TicketService, CampaignEmailService, EventService, ReportService],
  controllers: [DashboardController, TicketController, CampaignEmailController, EventController, ReportController],
})
export class AdminModule {} 