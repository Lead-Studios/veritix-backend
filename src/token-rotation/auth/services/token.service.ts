import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import { User } from '../entities/user.entity';
import {
  JwtPayload,
  RefreshTokenPayload,
} from '../interfaces/jwt-payload.interface';
import { RefreshTokenService } from './refresh-token.service';
import { AuthResponseDto } from '../dto/auth.dto';
import jwtConfig from '../config/jwt.config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    @Inject(jwtConfig.KEY)
    private jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async generateTokenPair(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const tokenId = uuidv4();

    // Generate access token
    const accessTokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      jti: uuidv4(),
    };

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: this.jwtConfiguration.accessTokenSecret,
      expiresIn: this.jwtConfiguration.accessTokenExpiresIn,
      issuer: this.jwtConfiguration.issuer,
      audience: this.jwtConfiguration.audience,
    });

    // Generate refresh token
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenId,
    };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.jwtConfiguration.refreshTokenSecret,
      expiresIn: this.jwtConfiguration.refreshTokenExpiresIn,
      issuer: this.jwtConfiguration.issuer,
      audience: this.jwtConfiguration.audience,
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.refreshTokenService.createRefreshToken(
      user,
      tokenId,
      expiresAt,
      userAgent,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(
        this.jwtConfiguration.accessTokenExpiresIn,
      ),
      tokenType: 'Bearer',
    };
  }

  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Verify refresh token
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      refreshToken,
      {
        secret: this.jwtConfiguration.refreshTokenSecret,
        issuer: this.jwtConfiguration.issuer,
        audience: this.jwtConfiguration.audience,
      },
    );

    // Find token in database
    const tokenHash = this.refreshTokenService['hashToken'](payload.tokenId);
    const storedToken =
      await this.refreshTokenService.findByTokenHash(tokenHash);

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresAt < new Date()
    ) {
      // Token is invalid or expired, revoke entire family
      await this.refreshTokenService.revokeTokenFamily(payload.tokenId);
      throw new Error('Invalid refresh token');
    }

    // Generate new token pair
    const newTokenPair = await this.generateTokenPair(
      storedToken.user,
      userAgent,
      ipAddress,
    );

    // Revoke old refresh token
    await this.refreshTokenService.revokeToken(
      payload.tokenId,
      newTokenPair.refreshToken,
    );

    return newTokenPair;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      refreshToken,
      {
        secret: this.jwtConfiguration.refreshTokenSecret,
        issuer: this.jwtConfiguration.issuer,
        audience: this.jwtConfiguration.audience,
      },
    );

    await this.refreshTokenService.revokeToken(payload.tokenId);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900; // 15 minutes default
    }
  }
}
