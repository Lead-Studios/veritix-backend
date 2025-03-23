import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminService } from './providers/admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminLocalStrategy } from './strategies/admin-local.strategy';
import { Admin } from './entities/admin.entity';
import { AdminAuthService } from './providers/admin-auth.services';
import { BcryptProvider } from './providers/bcrpt-provider';
import { HashingProvider } from './providers/hashing-services';
import { Hash } from 'crypto';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ADMIN_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ADMIN_EXPIRATION', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [
    AdminService,
    AdminAuthService,
    AdminJwtStrategy,
    AdminLocalStrategy,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
  ],
  exports: [AdminService, AdminAuthService, HashingProvider],
})
export class AdminModule {}
