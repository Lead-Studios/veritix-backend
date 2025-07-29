import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly maxTokensPerUser = 5; // Limit concurrent sessions

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async createRefreshToken(
    user: User,
    tokenId: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<RefreshToken> {
    // Clean up old tokens first
    await this.cleanupExpiredTokens();
    await this.enforceTokenLimit(user.id);

    const tokenHash = this.hashToken(tokenId);

    const refreshToken = this.refreshTokenRepository.create({
      tokenHash,
      userId: user.id,
      user,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return await this.refreshTokenRepository.save(refreshToken);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return await this.refreshTokenRepository.findOne({
      where: { tokenHash, isRevoked: false },
      relations: ['user'],
    });
  }

  async revokeToken(tokenId: string, replacedByToken?: string): Promise<void> {
    const tokenHash = this.hashToken(tokenId);
    await this.refreshTokenRepository.update(
      { tokenHash },
      {
        isRevoked: true,
        revokedAt: new Date(),
        replacedByToken,
      },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
    );
  }

  async revokeTokenFamily(tokenId: string): Promise<void> {
    // Revoke entire token family if rotation is compromised
    const tokenHash = this.hashToken(tokenId);
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (token) {
      // Find and revoke all tokens in the family
      await this.revokeAllUserTokens(token.userId);
      this.logger.warn(
        `Revoked token family for user ${token.userId} due to potential compromise`,
      );
    }
  }

  private async cleanupExpiredTokens(): Promise<void> {
    const deleted = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (deleted.affected && deleted.affected > 0) {
      this.logger.log(`Cleaned up ${deleted.affected} expired refresh tokens`);
    }
  }

  private async enforceTokenLimit(userId: string): Promise<void> {
    const tokenCount = await this.refreshTokenRepository.count({
      where: { userId, isRevoked: false },
    });

    if (tokenCount >= this.maxTokensPerUser) {
      // Remove oldest tokens
      const oldestTokens = await this.refreshTokenRepository.find({
        where: { userId, isRevoked: false },
        order: { createdAt: 'ASC' },
        take: tokenCount - this.maxTokensPerUser + 1,
      });

      for (const token of oldestTokens) {
        await this.revokeToken(token.tokenHash);
      }
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
