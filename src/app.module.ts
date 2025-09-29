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

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...(await configService.get('database')),
        autoLoadEntities: true,
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
        logging: true,
      }),
    }),
    HealthModule,
    UsersModule,
    TicketsModule,
  ],
  providers: [AppService, OrganizerService],
  controllers: [AppController, OrganizerController],
})
export class AppModule {}
