import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, MoreThan } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SessionManagementService } from './session-management.service';
import { UserSession } from '../entities/user-session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  let repository: jest.Mocked<Repository<UserSession>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserSession: UserSession = {
    id: 'session-1',
    jwtId: 'jwt-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    deviceType: 'desktop',
    browser: 'Chrome',
    browserVersion: '91.0',
    operatingSystem: 'Windows',
    osVersion: '10.0',
    deviceName: null,
    country: 'US',
    region: 'California',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    isActive: true,
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    metadata: {},
    loginMethod: 'password',
    isCurrentSession: true,
    userId: 'user-1',
    user: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: null,
    revokedBy: null,
    revokedReason: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionManagementService,
        {
          provide: getRepositoryToken(UserSession),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<SessionManagementService>(SessionManagementService);
    repository = module.get(getRepositoryToken(UserSession));
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const userId = 'user-1';
      const sessionData: CreateSessionDto = {
        jwtId: 'jwt-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        loginMethod: 'password',
      };

      repository.create.mockReturnValue(mockUserSession);
      repository.save.mockResolvedValue(mockUserSession);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      const result = await service.createSession(userId, sessionData);

      expect(repository.update).toHaveBeenCalledWith(
        { userId, isCurrentSession: true },
        { isCurrentSession: false },
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sessionData,
          userId,
          deviceType: 'desktop',
          browser: 'Chrome',
          operatingSystem: 'Windows',
          isCurrentSession: true,
        }),
      );
      expect(repository.save).toHaveBeenCalledWith(mockUserSession);
      expect(result).toEqual(mockUserSession);
    });

    it('should parse device information from user agent', async () => {
      const userId = 'user-1';
      const sessionData: CreateSessionDto = {
        jwtId: 'jwt-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      repository.create.mockReturnValue(mockUserSession);
      repository.save.mockResolvedValue(mockUserSession);

      await service.createSession(userId, sessionData);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'mobile',
          operatingSystem: 'iOS',
        }),
      );
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions', async () => {
      const userId = 'user-1';
      repository.find.mockResolvedValue([mockUserSession]);

      const result = await service.getUserSessions(userId);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          expiresAt: MoreThan(expect.any(Date)),
        },
        order: { lastActivityAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockUserSession.id,
        ipAddress: mockUserSession.ipAddress,
        isActive: mockUserSession.isActive,
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session successfully', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      
      repository.findOne.mockResolvedValue(mockUserSession);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.revokeSession(sessionId, userId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: sessionId, userId, isActive: true },
      });
      expect(repository.update).toHaveBeenCalledWith(sessionId, {
        isActive: false,
        revokedAt: expect.any(Date),
        revokedBy: 'user',
        revokedReason: 'User revoked',
      });
    });

    it('should throw NotFoundException when session not found', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      
      repository.findOne.mockResolvedValue(null);

      await expect(service.revokeSession(sessionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions except current', async () => {
      const userId = 'user-1';
      const exceptSessionId = 'session-current';
      
      repository.find.mockResolvedValue([mockUserSession]);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      const result = await service.revokeAllSessions(userId, exceptSessionId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId, isActive: true, id: { $ne: exceptSessionId } },
      });
      expect(result).toBe(1);
    });
  });

  describe('isTokenRevoked', () => {
    it('should return true for revoked token', async () => {
      const jwtId = 'jwt-1';
      
      // Simulate revoking a session first
      repository.findOne.mockResolvedValue(mockUserSession);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      await service.revokeSession('session-1', 'user-1');

      const result = await service.isTokenRevoked(jwtId);
      expect(result).toBe(true);
    });

    it('should return false for non-revoked token', async () => {
      const jwtId = 'jwt-new';
      
      const result = await service.isTokenRevoked(jwtId);
      expect(result).toBe(false);
    });
  });

  describe('validateSession', () => {
    it('should return session when valid', async () => {
      const jwtId = 'jwt-1';
      
      repository.findOne.mockResolvedValue(mockUserSession);

      const result = await service.validateSession(jwtId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          jwtId,
          isActive: true,
          expiresAt: MoreThan(expect.any(Date)),
        },
        relations: ['user'],
      });
      expect(result).toEqual(mockUserSession);
    });

    it('should return null when token is revoked', async () => {
      const jwtId = 'jwt-1';
      
      // Simulate revoking a session first
      repository.findOne.mockResolvedValue(mockUserSession);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
      await service.revokeSession('session-1', 'user-1');

      const result = await service.validateSession(jwtId);
      expect(result).toBeNull();
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity', async () => {
      const jwtId = 'jwt-1';
      
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.updateSessionActivity(jwtId);

      expect(repository.update).toHaveBeenCalledWith(
        { jwtId, isActive: true },
        { lastActivityAt: expect.any(Date) },
      );
    });
  });

  describe('device detection', () => {
    it('should detect mobile device', () => {
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)';
      const result = service['detectDeviceType'](mobileUA);
      expect(result).toBe('mobile');
    });

    it('should detect tablet device', () => {
      const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)';
      const result = service['detectDeviceType'](tabletUA);
      expect(result).toBe('tablet');
    });

    it('should detect desktop device', () => {
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const result = service['detectDeviceType'](desktopUA);
      expect(result).toBe('desktop');
    });

    it('should detect Chrome browser', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const result = service['detectBrowser'](chromeUA);
      expect(result).toEqual({ name: 'Chrome', version: '91.0.4472.124' });
    });

    it('should detect Windows OS', () => {
      const windowsUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const result = service['detectOS'](windowsUA);
      expect(result).toEqual({ name: 'Windows', version: '10.0' });
    });
  });
});
