import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GithubOAuthGuard } from './guards/github-oauth.guard';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../common/email/email.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EmailModule,
    StorageModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'ACCESS_TOKEN_EXPIRATION',
          ) as any,
        },
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    GoogleOAuthGuard,
    GithubOAuthGuard,
    AuthService,
  ],
  controllers: [AuthController],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
