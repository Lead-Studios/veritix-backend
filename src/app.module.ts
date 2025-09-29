import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizerController } from './organizer/organizer.controller';
import { OrganizerService } from './organizer/organizer.service';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TicketsModule } from './ticket/ticket.module';
import { EventModule } from './modules/event/event.module';

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
    type: 'postgres',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.database'),
    synchronize: configService.get<boolean>('database.synchronize') || false,
    autoLoadEntities: true,
    migrations: ['dist/migrations/*.js'],
    migrationsRun: true, 
    logging: true,       
  }),
}),


    SponsorsModule,
    UsersModule,
    AuthModule,
    TicketModule,
    WebhookModule,
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
    AuditLogModule,
    ConfigModule,
    HealthModule,
    UsersModule,
    TicketsModule,
    EventModule,
   
  ],
  providers: [AppService, OrganizerService],
  controllers: [AppController, OrganizerController],
})
export class AppModule {}
