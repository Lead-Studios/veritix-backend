import { TenantRepositoryModule } from '../../common/database/tenant-repository.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    TenantRepositoryModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.register({}), // Configuration is handled in strategies
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    RefreshTokenService,
    JwtStrategy,
    RefreshJwtStrategy,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
