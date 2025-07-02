import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalleryImage } from './event/entities/gallery-image.entity';
import { GalleryService } from './event/services/gallery.service';
import { EventController } from './event/controllers/event.controller';
import { GalleryController } from './event/controllers/gallery.controller';
import { EventService } from './event/services/event.service';
import { Event } from './event/entities/event.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TicketModule } from './ticket/ticket.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Event, GalleryImage]),
    AuthModule,
    UserModule,
    TicketModule,
    AdminModule,
    AnalyticsModule,
  ],
  controllers: [AppController, GalleryController, EventController],
  providers: [AppService, GalleryService, EventService],
})
export class AppModule {}
