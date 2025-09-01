import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionValidationGuard } from './session-validation.guard';
import { SessionManagementService } from '../services/session-management.service';

describe('SessionValidationGuard', () => {
  let guard: SessionValidationGuard;
  let jwtService: jest.Mocked<JwtService>;
  let sessionService: jest.Mocked<SessionManagementService>;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as ExecutionContext;

  const mockRequest = {
    headers: {
      authorization: 'Bearer valid-token',
    },
  };

  const mockSession = {
    id: 'session-1',
    jwtId: 'jwt-1',
    userId: 'user-1',
    isActive: true,
  };

  beforeEach(async () => {
    const mockJwtService = {
      verify: jest.fn(),
    };

    const mockSessionService = {
      isTokenRevoked: jest.fn(),
      validateSession: jest.fn(),
      updateSessionActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionValidationGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SessionManagementService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    guard = module.get<SessionValidationGuard>(SessionValidationGuard);
    jwtService = module.get(JwtService);
    sessionService = module.get(SessionManagementService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access for valid token and session', async () => {
      const payload = { sub: 'user-1', jti: 'jwt-1' };
      
      jwtService.verify.mockReturnValue(payload);
      sessionService.isTokenRevoked.mockResolvedValue(false);
      sessionService.validateSession.mockResolvedValue(mockSession as any);
      sessionService.updateSessionActivity.mockResolvedValue();

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(sessionService.isTokenRevoked).toHaveBeenCalledWith('jwt-1');
      expect(sessionService.validateSession).toHaveBeenCalledWith('jwt-1');
      expect(sessionService.updateSessionActivity).toHaveBeenCalledWith('jwt-1');
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const requestWithoutToken = {
        headers: {},
      };

      const contextWithoutToken = {
        switchToHttp: () => ({
          getRequest: () => requestWithoutToken,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(contextWithoutToken)).rejects.toThrow(
        new UnauthorizedException('No token provided'),
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });

    it('should throw UnauthorizedException when token has no jti', async () => {
      const payloadWithoutJti = { sub: 'user-1' };
      
      jwtService.verify.mockReturnValue(payloadWithoutJti);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token format'),
      );
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      const payload = { sub: 'user-1', jti: 'jwt-1' };
      
      jwtService.verify.mockReturnValue(payload);
      sessionService.isTokenRevoked.mockResolvedValue(true);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Token has been revoked'),
      );
    });

    it('should throw UnauthorizedException when session is invalid', async () => {
      const payload = { sub: 'user-1', jti: 'jwt-1' };
      
      jwtService.verify.mockReturnValue(payload);
      sessionService.isTokenRevoked.mockResolvedValue(false);
      sessionService.validateSession.mockResolvedValue(null);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired session'),
      );
    });

    it('should add user and session info to request', async () => {
      const payload = { sub: 'user-1', jti: 'jwt-1' };
      const request = { headers: { authorization: 'Bearer valid-token' } };
      
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext;

      jwtService.verify.mockReturnValue(payload);
      sessionService.isTokenRevoked.mockResolvedValue(false);
      sessionService.validateSession.mockResolvedValue(mockSession as any);
      sessionService.updateSessionActivity.mockResolvedValue();

      await guard.canActivate(context);

      expect(request).toMatchObject({
        user: payload,
        sessionId: 'session-1',
        jwtId: 'jwt-1',
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract Bearer token correctly', () => {
      const request = {
        headers: {
          authorization: 'Bearer my-token',
        },
      };

      const token = guard['extractTokenFromHeader'](request);
      expect(token).toBe('my-token');
    });

    it('should return undefined for non-Bearer token', () => {
      const request = {
        headers: {
          authorization: 'Basic my-token',
        },
      };

      const token = guard['extractTokenFromHeader'](request);
      expect(token).toBeUndefined();
    });

    it('should return undefined when no authorization header', () => {
      const request = {
        headers: {},
      };

      const token = guard['extractTokenFromHeader'](request);
      expect(token).toBeUndefined();
    });
  });
});
