import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organizer } from 'organizer/entities/organizer.entity';
import { SessionManagementModule } from '../session-management/session-management.module';
import { PassportModule } from '@nestjs/passport';
import { GitHubStrategy } from './strategies/github.strategy';
import { LinkedInStrategy } from './strategies/linkedin.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([Organizer]),
    SessionManagementModule,
    ConfigModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    GitHubStrategy,
    LinkedInStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
