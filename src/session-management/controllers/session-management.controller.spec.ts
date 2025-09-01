import { Test, TestingModule } from '@nestjs/testing';
import { SessionManagementController } from './session-management.controller';
import { SessionManagementService } from '../services/session-management.service';
import { SessionResponseDto } from '../dto/session-response.dto';

describe('SessionManagementController', () => {
  let controller: SessionManagementController;
  let service: jest.Mocked<SessionManagementService>;

  const mockSessionResponse: SessionResponseDto = {
    id: 'session-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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
    loginMethod: 'password',
    isCurrentSession: true,
    createdAt: new Date(),
  };

  const mockRequest = {
    user: { sub: 'user-1' },
    sessionId: 'session-1',
  };

  beforeEach(async () => {
    const mockService = {
      getUserSessions: jest.fn(),
      getSessionById: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionManagementController],
      providers: [
        {
          provide: SessionManagementService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SessionManagementController>(SessionManagementController);
    service = module.get(SessionManagementService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserSessions', () => {
    it('should return user sessions', async () => {
      service.getUserSessions.mockResolvedValue([mockSessionResponse]);

      const result = await controller.getUserSessions(mockRequest);

      expect(service.getUserSessions).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockSessionResponse]);
    });
  });

  describe('getSession', () => {
    it('should return specific session', async () => {
      const sessionId = 'session-1';
      service.getSessionById.mockResolvedValue(mockSessionResponse);

      const result = await controller.getSession(sessionId, mockRequest);

      expect(service.getSessionById).toHaveBeenCalledWith(sessionId, 'user-1');
      expect(result).toEqual(mockSessionResponse);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const sessionId = 'session-1';
      const reason = 'User requested';
      service.revokeSession.mockResolvedValue();

      await controller.revokeSession(sessionId, mockRequest, reason);

      expect(service.revokeSession).toHaveBeenCalledWith(
        sessionId,
        'user-1',
        'user',
        reason,
      );
    });

    it('should revoke session without reason', async () => {
      const sessionId = 'session-1';
      service.revokeSession.mockResolvedValue();

      await controller.revokeSession(sessionId, mockRequest);

      expect(service.revokeSession).toHaveBeenCalledWith(
        sessionId,
        'user-1',
        'user',
        undefined,
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions except current', async () => {
      service.revokeAllSessions.mockResolvedValue(3);

      const result = await controller.revokeAllSessions(mockRequest, true);

      expect(service.revokeAllSessions).toHaveBeenCalledWith(
        'user-1',
        'session-1',
        'user',
      );
      expect(result).toEqual({ revokedCount: 3 });
    });

    it('should revoke all sessions including current', async () => {
      service.revokeAllSessions.mockResolvedValue(4);

      const result = await controller.revokeAllSessions(mockRequest, false);

      expect(service.revokeAllSessions).toHaveBeenCalledWith(
        'user-1',
        undefined,
        'user',
      );
      expect(result).toEqual({ revokedCount: 4 });
    });
  });

  describe('revokeAllSessionsAlternative', () => {
    it('should revoke all sessions via DELETE endpoint', async () => {
      const reason = 'Security concern';
      service.revokeAllSessions.mockResolvedValue(2);

      await controller.revokeAllSessionsAlternative(mockRequest, true, reason);

      expect(service.revokeAllSessions).toHaveBeenCalledWith(
        'user-1',
        'session-1',
        'user',
      );
    });
  });
});
