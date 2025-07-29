import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let tokenService: TokenService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedpassword',
    isActive: true,
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockTokenService = {
    generateTokenPair: jest.fn(),
    refreshTokens: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
        userAgent: 'TestAgent',
        ipAddress: '127.0.0.1',
      };

      const tokenPair = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenService.generateTokenPair.mockResolvedValue(tokenPair);

      const result = await service.login(loginDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', isActive: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
        mockUser,
        'TestAgent',
        '127.0.0.1',
      );
      expect(result).toEqual(tokenPair);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
        userAgent: 'TestAgent',
        ipAddress: '127.0.0.1',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
        userAgent: 'TestAgent',
        ipAddress: '127.0.0.1',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
        userAgent: 'TestAgent',
        ipAddress: '127.0.0.1',
      };

      mockUserRepository.findOne.mockResolvedValue(null); // Query filters inactive users

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const newTokenPair = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      };

      mockTokenService.refreshTokens.mockResolvedValue(newTokenPair);

      const result = await service.refresh(refreshToken, 'TestAgent', '127.0.0.1');

      expect(mockTokenService.refreshTokens).toHaveBeenCalledWith(
        refreshToken,
        'TestAgent',
        '127.0.0.1',
      );
      expect(result).toEqual(newTokenPair);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      mockTokenService.refreshTokens.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refresh(invalidToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      mockTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout(refreshToken);

      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('logoutAll', () => {
    it('should logout all devices successfully', async () => {
      const userId = 'user-1';

      mockTokenService.revokeAllUserTokens.mockResolvedValue(undefined);

      await service.logoutAll(userId);

      expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(userId);
    });
  });
});
