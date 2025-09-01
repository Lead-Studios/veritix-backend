import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserSession } from './entities/user-session.entity';
import { SessionManagementService } from './services/session-management.service';
import { GeoLocationService } from './services/geo-location.service';
import { SessionTrackingService } from './services/session-tracking.service';
import { SessionManagementController } from './controllers/session-management.controller';
import { SessionValidationGuard } from './guards/session-validation.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [SessionManagementController],
  providers: [
    SessionManagementService,
    GeoLocationService,
    SessionTrackingService,
    SessionValidationGuard,
  ],
  exports: [
    SessionManagementService,
    GeoLocationService,
    SessionTrackingService,
    SessionValidationGuard,
  ],
})
export class SessionManagementModule {}
