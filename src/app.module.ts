import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { TicketsModule } from './ticket/ticket.module';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware.js';
import { WinstonLoggerService } from './logger/winston-logger.service.js';
import { AbuseLogModule } from './abuse-log/abuse-log.module';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { LoggingThrottlerGuard } from './common/guards/logging-throttler.guard';
import { AbuseLogService } from './abuse-log/abuse-log.service';

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
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),
    AbuseLogModule,
  ],
  providers: [
    AppService,
    WinstonLoggerService,
    {
      provide: APP_GUARD,
      useFactory: (
        options: ThrottlerModuleOptions,
        storage: ThrottlerStorage,
        reflector: Reflector,
        abuseLogService: AbuseLogService,
      ) =>
        new LoggingThrottlerGuard(options, storage, reflector, abuseLogService),
      inject: [
        'THROTTLER_OPTIONS',
        ThrottlerStorage,
        Reflector,
        AbuseLogService,
      ],
    },
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
