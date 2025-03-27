import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
// import { DatabaseModule } from "./database.module";
import { AuthModule } from "./auth/auth.module";
import { SponsorsModule } from "./sponsors/sponsors.module";
import { UsersModule } from "./users/users.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PdfService } from "./utils/pdf.service";
import { TicketModule } from "./tickets/tickets.module";
import { SpecialGuestModule } from "./special-guests/special-guests.module";
import { NotificationModule } from './notification/notification.module';
import { EventsModule } from "./events/events.module";
import { PostersModule } from "./posters/posters.module";
import databaseConfig from "src/config/database.config";
import jwtConfig from "src/config/jwt.config";
import { EventDashboardModule } from "./dashboard/dashboard.module";
import { EventGalleryModule } from "./event-gallery/event-gallery.module";
import { ContactUsModule } from './contact-us/contact-us.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env.development",
      load: [databaseConfig, jwtConfig], 
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<"postgres">("database.type"),
        host: configService.get<string>("database.host"),
        port: configService.get<number>("database.port"),
        username: configService.get<string>("database.username"),
        password: configService.get<string>("database.password"),
        database: configService.get<string>("database.database"),
        synchronize: configService.get<boolean>("database.synchronize"),
        autoLoadEntities: true,
      }),
    }),
    SponsorsModule,
    UsersModule,
    AuthModule,
    TicketModule,
    SpecialGuestModule,
    EventsModule,
    PostersModule,
    NotificationModule,
    EventDashboardModule,
    EventGalleryModule,
    ContactUsModule
  ],
  controllers: [AppController],
  providers: [AppService, PdfService],
  exports: [PdfService, AppService],
})
export class AppModule {}
