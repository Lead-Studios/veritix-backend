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

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    UsersModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
  ],
  providers: [AppService, OrganizerService],
  controllers: [AppController, OrganizerController],
})
export class AppModule {}
