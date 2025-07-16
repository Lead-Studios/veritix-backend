import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEmail } from './entities/campaign-email.entity';
import { DashboardService } from './services/dashboard.service';
import { TicketService } from './services/ticket.service';
import { CampaignEmailService } from './services/campaign-email.service';
import { DashboardController } from './controllers/dashboard.controller';
import { TicketController } from './controllers/ticket.controller';
import { CampaignEmailController } from './controllers/campaign-email.controller';
import { Event } from '../events/entities/event.entity';
import { EventService } from './services/event.service';
import { ReportService } from './services/report.service';
import { EventController } from './controllers/event.controller';
import { ReportController } from './controllers/report.controller';
import { User } from '../user/entities/user.entity';
import { UserService } from './services/user.service';
import { UserReportService } from './services/user-report.service';
import { UserController } from './controllers/user.controller';
import { UserReportController } from './controllers/user-report.controller';
import { TicketHistory } from 'src/ticket/entities/ticket-history.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { GalleryImage } from '../event/entities/gallery-image.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: 'your_jwt_secret',
      signOptions: { expiresIn: '1h' },
    }),
    TypeOrmModule.forFeature([CampaignEmail, Event, User, TicketHistory, Ticket, GalleryImage])
  ],
  controllers: [
    AdminController,
    DashboardController, 
    TicketController, 
    CampaignEmailController, 
    EventController, 
    ReportController, 
    UserController, 
    UserReportController
  ],
  providers: [
    AdminService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: RolesGuard },
    DashboardService, 
    TicketService, 
    CampaignEmailService, 
    EventService, 
    ReportService, 
    UserService, 
    UserReportService
  ],
})
export class AdminModule {} 

