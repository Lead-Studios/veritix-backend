import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserMessages } from './user-messages';
import { JwtPayload } from '../interface/user.interface';
import { User } from '../entities/user.entity';

type JwtExpiry = `${number}${'s' | 'm' | 'h' | 'd'}` | number;

@Injectable()
export class JwtHelper {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const accessSecret = this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET');

    if (accessSecret.length < 32) {
      throw new Error('ACCESS_TOKEN_SECRET must be at least 32 characters long');
    }
    if (refreshSecret.length < 32) {
      throw new Error('REFRESH_TOKEN_SECRET must be at least 32 characters long');
    }
  }

  public validateRefreshToken(refreshToken: string): JwtPayload {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      });

      if (!payload?.userId) {
        throw new UnauthorizedException(UserMessages.INVALID_REFRESH_TOKEN);
      }

      return payload;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('JWT verification failed:', error.message);
      } else {
        console.error('JWT verification failed:', error);
      }
      throw new UnauthorizedException(UserMessages.INVALID_REFRESH_TOKEN);
    }
  }

  public generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>('ACCESS_TOKEN_EXPIRATION') ?? '1h') as JwtExpiry,
    });
  }

  public generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>('REFRESH_TOKEN_EXPIRATION') ?? '7d') as JwtExpiry,
    });
  }

  public generateTokens(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
}
