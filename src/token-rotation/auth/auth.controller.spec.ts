import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const ipAddress = '127.0.0.1';
      const userAgent = 'TestAgent';
      const expectedResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto, ipAddress, userAgent);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        ...loginDto,
        ipAddress,
        userAgent,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with correct parameters', async () => {
      const refreshTokenDto = { refreshToken: 'refresh-token' };
      const ipAddress = '127.0.0.1';
      const userAgent = 'TestAgent';
      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };

      mockAuthService.refresh.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto, ipAddress, userAgent);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        'refresh-token',
        userAgent,
        ipAddress,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      const refreshTokenDto = { refreshToken: 'refresh-token' };

      await controller.logout(refreshTokenDto);

      expect(mockAuthService.logout).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('logoutAll', () => {
    it('should call authService.logoutAll', async () => {
      const req = { user: { userId: 'user-1' } };

      await controller.logoutAll(req);

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', async () => {
      const req = {
        user: {
          userId: 'user-1',
          email: 'test@example.com',
          jti: 'jwt-id',
        },
      };

      const result = await controller.getProfile(req);

      expect(result).toEqual(req.user);
    });
  });
});