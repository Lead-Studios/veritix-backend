import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserHelper } from './helper/user-helper';
import { JwtHelper } from './helper/jwt-helper';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from './guard/roles.guard';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { EmailService } from './helper/email-sender';
import { WsJwtGuard } from './guard/ws-jwt.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserHelper,
    JwtHelper,
    JwtStrategy,
    RolesGuard,
    WsJwtGuard,
    EmailService,
  ],
  exports: [AuthService, RolesGuard, WsJwtGuard, JwtModule],
})
export class AuthModule {}
