import { Module, Logger, OnModuleInit } from "@nestjs/common";
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
import { NotificationModule } from "./notification/notification.module";
import { EventsModule } from "./events/events.module";
import { PostersModule } from "./posters/posters.module";
import databaseConfig from "src/config/database.config";
import jwtConfig from "src/config/jwt.config";
import { EventDashboardModule } from "./dashboard/dashboard.module";
import { EventGalleryModule } from "./event-gallery/event-gallery.module";
import { ContactUsModule } from "./contact-us/contact-us.module";
import { ConferenceModule } from "./conference/conference.module";
import { ContactModule } from "./contact/contact.module";
import { ConferenceSponsorsModule } from "./conference-sponsors/conference-sponsors.module";
import { SpecialSpeakerModule } from "./special-speaker/special-speaker.module";
import { CacheModule } from "@nestjs/cache-manager";
import { ConferencePosterManagementModule } from "./conference-poster-management/conference-poster-management.module";
import { ConferenceGalleryModule } from "./conference-gallery/conference-gallery.module";
import { PromoCodeModule } from './promo-code/promo-code.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      load: [databaseConfig, jwtConfig],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes
      max: 100, // maximum number of items in cache
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<"postgres">("database.type"),
        url: configService.get<string>("database.url"),
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
    ContactUsModule,
    ConferenceModule,
    ContactModule,
    ConferenceSponsorsModule,
    ConferencePosterManagementModule,
    SpecialSpeakerModule,
    ConferenceGalleryModule,
    PromoCodeModule,
  ],
  controllers: [AppController],
  providers: [AppService, PdfService],
  exports: [PdfService, AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    const dbType = this.configService.get("database.type");
    const dbHost = this.configService.get("database.host");
    const dbUrl = this.configService.get("database.url");
    this.logger.log(`Database Type: ${dbType}`);
    this.logger.log(`Database Host: ${dbHost}`);
    this.logger.log(`Database URL: ${dbUrl}`);
    this.logger.log(
      `Connection to ${dbType} database established successfully through ${dbUrl}.`,
    );
  }
}
