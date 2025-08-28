import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LoginAttempt } from './entities/login-attempt.entity';
import { TrustedDevice } from './entities/trusted-device.entity';
import { SecurityNotification } from './entities/security-notification.entity';
import { LoginSecurityService } from './services/login-security.service';
import { GeoIpService } from './services/geo-ip.service';
import { DeviceFingerprintService } from './services/device-fingerprint.service';
import { SecurityNotificationService } from './services/security-notification.service';
import { LoginSecurityController } from './controllers/login-security.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoginAttempt,
      TrustedDevice,
      SecurityNotification,
    ]),
    ConfigModule,
  ],
  controllers: [LoginSecurityController],
  providers: [
    LoginSecurityService,
    GeoIpService,
    DeviceFingerprintService,
    SecurityNotificationService,
  ],
  exports: [
    LoginSecurityService,
    GeoIpService,
    DeviceFingerprintService,
    SecurityNotificationService,
  ],
})
export class LoginSecurityModule {}
