import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repository: Repository<RefreshToken>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedpassword',
    isActive: true,
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    repository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefreshToken', () => {
    it('should create a new refresh token', async () => {
      const tokenId = 'token-123';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const mockToken = { id: 'refresh-1', tokenHash: 'hash', userId: 'user-1' };

      mockRepository.count.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue({ affected: 0 });
      mockRepository.create.mockReturnValue(mockToken);
      mockRepository.save.mockResolvedValue(mockToken);

      const result = await service.createRefreshToken(mockUser, tokenId, expiresAt);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockToken);
    });

    it('should enforce token limit per user', async () => {
      const tokenCount = 6; // Exceeds limit of 5
      mockRepository.count.mockResolvedValue(tokenCount);
      mockRepository.find.mockResolvedValue([
        { tokenHash: 'old-token-1' },
        { tokenHash: 'old-token-2' },
      ]);

      const tokenId = 'new-token';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await service.createRefreshToken(mockUser, tokenId, expiresAt);

      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('findByTokenHash', () => {
    it('should find token by hash', async () => {
      const tokenHash = 'valid-hash';
      const mockToken = { tokenHash, isRevoked: false, user: mockUser };

      mockRepository.findOne.mockResolvedValue(mockToken);

      const result = await service.findByTokenHash(tokenHash);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash, isRevoked: false },
        relations: ['user'],
      });
      expect(result).toEqual(mockToken);
    });

    it('should return null if token not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByTokenHash('invalid-hash');

      expect(result).toBeNull();
    });
  });

  describe('revokeToken', () => {
    it('should revoke a token', async () => {
      const tokenId = 'token-to-revoke';
      const replacedBy = 'new-token';

      await service.revokeToken(tokenId, replacedBy);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { tokenHash: expect.any(String) },
        {
          isRevoked: true,
          revokedAt: expect.any(Date),
          replacedByToken: replacedBy,
        },
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = 'user-1';

      await service.revokeAllUserTokens(userId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { userId, isRevoked: false },
        {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      );
    });
  });

  describe('revokeTokenFamily', () => {
    it('should revoke entire token family', async () => {
      const tokenId = 'compromised-token';
      const mockToken = { tokenHash: 'hash', userId: 'user-1' };

      mockRepository.findOne.mockResolvedValue(mockToken);

      await service.revokeTokenFamily(tokenId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRevoked: false },
        {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      );
    });
  });
});

// src/auth/services/token.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { RefreshTokenService } from './refresh-token.service';
import jwtConfig from '../config/jwt.config';
import { User } from '../entities/user.entity';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedpassword',
    isActive: true,
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJwtConfig = {
    accessTokenSecret: 'access-secret',
    refreshTokenSecret: 'refresh-secret',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'test-app',
    audience: 'test-users',
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    findByTokenHash: jest.fn(),
    revokeToken: jest.fn(),
    revokeTokenFamily: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    hashToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: jwtConfig.KEY,
          useValue: mockJwtConfig,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-123';

      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);
      mockRefreshTokenService.createRefreshToken.mockResolvedValue({});

      const result = await service.generateTokenPair(mockUser);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
        tokenType: 'Bearer',
      });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const oldRefreshToken = 'old-refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      const payload = { sub: 'user-1', tokenId: 'token-123' };
      const storedToken = {
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        user: mockUser,
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockRefreshTokenService.findByTokenHash.mockResolvedValue(storedToken);
      mockJwtService.signAsync
        .mockResolvedValueOnce(newAccessToken)
        .mockResolvedValueOnce(newRefreshToken);
      mockRefreshTokenService.createRefreshToken.mockResolvedValue({});

      const result = await service.refreshTokens(oldRefreshToken);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        oldRefreshToken,
        expect.objectContaining({
          secret: mockJwtConfig.refreshTokenSecret,
        }),
      );
      expect(mockRefreshTokenService.revokeToken).toHaveBeenCalled();
      expect(result.accessToken).toBe(newAccessToken);
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', tokenId: 'token-123' });
      mockRefreshTokenService.findByTokenHash.mockResolvedValue(null);

      await expect(service.refreshTokens(invalidToken)).rejects.toThrow();
      expect(mockRefreshTokenService.revokeTokenFamily).toHaveBeenCalled();
    });

    it('should revoke token family for expired token', async () => {
      const expiredToken = 'expired-token';
      const payload = { sub: 'user-1', tokenId: 'token-123' };
      const storedToken = {
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: mockUser,
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockRefreshTokenService.findByTokenHash.mockResolvedValue(storedToken);

      await expect(service.refreshTokens(expiredToken)).rejects.toThrow();
      expect(mockRefreshTokenService.revokeTokenFamily).toHaveBeenCalled();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token', async () => {
      const refreshToken = 'token-to-revoke';
      const payload = { sub: 'user-1', tokenId: 'token-123' };

      mockJwtService.verifyAsync.mockResolvedValue(payload);

      await service.revokeRefreshToken(refreshToken);

      expect(mockRefreshTokenService.revokeToken).toHaveBeenCalledWith('token-123');
    });
  });
});
