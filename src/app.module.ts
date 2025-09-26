import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TicketsModule } from './ticket/ticket.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    UsersModule,
    TicketsModule,
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
  providers: [AppService],
  controllers: [AppController],
})
export class AppModule {}
