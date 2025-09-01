import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserSession } from '../entities/user-session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';
import { SessionResponseDto } from '../dto/session-response.dto';
import { JwtService } from '@nestjs/jwt';
// import { UAParser } from 'ua-parser-js'; // Will be installed separately

@Injectable()
export class SessionManagementService {
  private revokedTokens = new Set<string>(); // In-memory store for revoked JWTs

  constructor(
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    private jwtService: JwtService,
  ) {}

  async createSession(
    userId: string,
    sessionData: CreateSessionDto,
    currentJwtId?: string,
  ): Promise<UserSession> {
    // Parse user agent for device information
    const deviceInfo = this.parseDeviceInfo(sessionData.userAgent);

    // Mark previous sessions as not current
    if (currentJwtId) {
      await this.sessionRepository.update(
        { userId, isCurrentSession: true },
        { isCurrentSession: false },
      );
    }

    const session = this.sessionRepository.create({
      ...sessionData,
      ...deviceInfo,
      userId,
      lastActivityAt: new Date(),
      isCurrentSession: true,
    });

    return this.sessionRepository.save(session);
  }

  async getUserSessions(userId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepository.find({
      where: { 
        userId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastActivityAt: 'DESC' },
    });

    return sessions.map(session => this.mapToResponseDto(session));
  }

  async revokeSession(
    sessionId: string,
    userId: string,
    revokedBy: string = 'user',
    reason?: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId, isActive: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Add JWT to revoked tokens list
    this.revokedTokens.add(session.jwtId);

    // Update session in database
    await this.sessionRepository.update(sessionId, {
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
      revokedReason: reason || 'User revoked',
    });
  }

  async revokeAllSessions(
    userId: string,
    exceptSessionId?: string,
    revokedBy: string = 'user',
  ): Promise<number> {
    const whereCondition: any = { userId, isActive: true };
    
    if (exceptSessionId) {
      whereCondition.id = { $ne: exceptSessionId };
    }

    const sessions = await this.sessionRepository.find({
      where: whereCondition,
    });

    // Add all JWT IDs to revoked tokens list
    sessions.forEach(session => {
      this.revokedTokens.add(session.jwtId);
    });

    // Update all sessions
    const result = await this.sessionRepository.update(whereCondition, {
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
      revokedReason: 'Bulk revocation',
    });

    return result.affected || 0;
  }

  async updateSessionActivity(jwtId: string): Promise<void> {
    await this.sessionRepository.update(
      { jwtId, isActive: true },
      { lastActivityAt: new Date() },
    );
  }

  async isTokenRevoked(jwtId: string): Promise<boolean> {
    return this.revokedTokens.has(jwtId);
  }

  async validateSession(jwtId: string): Promise<UserSession | null> {
    if (this.isTokenRevoked(jwtId)) {
      return null;
    }

    const session = await this.sessionRepository.findOne({
      where: {
        jwtId,
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    return session;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.update(
      {
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: 'system',
        revokedReason: 'Expired',
      },
    );

    return result.affected || 0;
  }

  async getSessionById(sessionId: string, userId: string): Promise<SessionResponseDto> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.mapToResponseDto(session);
  }

  private parseDeviceInfo(userAgent?: string): Partial<UserSession> {
    if (!userAgent) {
      return {
        deviceType: 'unknown',
        browser: 'unknown',
        operatingSystem: 'unknown',
      };
    }

    // Simple user agent parsing
    const deviceType = this.detectDeviceType(userAgent);
    const browser = this.detectBrowser(userAgent);
    const os = this.detectOS(userAgent);
    
    return {
      deviceType,
      browser: browser.name,
      browserVersion: browser.version,
      operatingSystem: os.name,
      osVersion: os.version,
    };
  }

  private detectDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad/i.test(userAgent)) return 'tablet';
      return 'mobile';
    }
    return 'desktop';
  }

  private detectBrowser(userAgent: string): { name: string; version?: string } {
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/([0-9.]+)/ },
      { name: 'Firefox', regex: /Firefox\/([0-9.]+)/ },
      { name: 'Safari', regex: /Safari\/([0-9.]+)/ },
      { name: 'Edge', regex: /Edge\/([0-9.]+)/ },
      { name: 'Opera', regex: /Opera\/([0-9.]+)/ },
    ];

    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      if (match) {
        return { name: browser.name, version: match[1] };
      }
    }

    return { name: 'unknown' };
  }

  private detectOS(userAgent: string): { name: string; version?: string } {
    const systems = [
      { name: 'Windows', regex: /Windows NT ([0-9.]+)/ },
      { name: 'macOS', regex: /Mac OS X ([0-9._]+)/ },
      { name: 'Linux', regex: /Linux/ },
      { name: 'Android', regex: /Android ([0-9.]+)/ },
      { name: 'iOS', regex: /OS ([0-9._]+)/ },
    ];

    for (const system of systems) {
      const match = userAgent.match(system.regex);
      if (match) {
        return { name: system.name, version: match[1]?.replace(/_/g, '.') };
      }
    }

    return { name: 'unknown' };
  }

  private mapToResponseDto(session: UserSession): SessionResponseDto {
    return {
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceType: session.deviceType,
      browser: session.browser,
      browserVersion: session.browserVersion,
      operatingSystem: session.operatingSystem,
      osVersion: session.osVersion,
      deviceName: session.deviceName,
      country: session.country,
      region: session.region,
      city: session.city,
      timezone: session.timezone,
      isActive: session.isActive,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      loginMethod: session.loginMethod,
      isCurrentSession: session.isCurrentSession,
      createdAt: session.createdAt,
      revokedAt: session.revokedAt,
      revokedBy: session.revokedBy,
      revokedReason: session.revokedReason,
    };
  }
}
