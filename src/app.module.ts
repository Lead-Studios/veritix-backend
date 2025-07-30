import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database.module';
// import { AdminModule } from './admin/admin.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalleryImage } from './event/entities/gallery-image.entity';
import { GalleryService } from './event/services/gallery.service';
import { EventController } from './event/controllers/event.controller';
import { GalleryController } from './event/controllers/gallery.controller';
import { EventService } from './event/services/event.service';
import { Event } from './events/entities/event.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TicketModule } from './ticket/ticket.module';
import { AdminModule } from './admin/admin.module';
import { PosterModule } from './poster/poster.module';
import { SponsorModule } from './event/sponsor.module';
import { CollaboratorModule } from './event/collaborator.module';
import { SpecialGuestModule } from './special-guest/special-guest.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationModule } from './notification/notification.module';
import { EventsModule } from './events/events.module';
import { ConferenceModule } from './conference/conference.module';
import { TicketTierModule } from './ticket-tier/ticket-tier.module';
import { BadgeModule } from './badge/badge.module';
// import { MailerModule } from './mailer/mailer.module';
import { AnalyticsEventModule }n from './analytics-event/analytics-event.module';
import { WaitlistEntryModule } from './waitlist-entry/waitlist-entry.module';
import { ConferenceSearchModule } from './conference-search/conference-search.module';
import { FunnelTrackingModule } from './funnel-tracking/funnel-tracking.module';
import { NftTicketsModule } from './nft-tickets/nft-tickets.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { TicketingModule } from './ticketing/ticketing.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RsvpModule } from './rsvp/rsvp.module';
import { MailerModule } from './mailer./mailer..module';

@Module({
  imports: [
    DatabaseModule,
    AdminModule,
    TenantRepositoryModule.forFeature([Event, GalleryImage]),
    AuthModule,
    UserModule,
    TicketModule,
    AdminModule,
    PosterModule,
    SponsorModule,
    CollaboratorModule,
    SpecialGuestModule,
    AnalyticsModule,
    NotificationModule,
    EventsModule,
    ConferenceModule,
    TicketTierModule,
    BadgeModule,
    MailerModule,
    RsvpModule
  ],
  controllers: [AppController, GalleryController, EventController],
  providers: [AppService, GalleryService, EventService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
