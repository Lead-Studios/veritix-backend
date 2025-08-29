import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyService } from '../api-key.service';
import { ApiKey, ApiKeyStatus, ApiKeyType, ApiPermission } from '../../entities/api-key.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let repository: Repository<ApiKey>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    repository = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));

    // Reset mocks
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('create', () => {
    it('should create a new API key', async () => {
      const createDto = {
        name: 'Test API Key',
        type: ApiKeyType.STANDARD,
        permissions: [ApiPermission.READ],
        scopes: ['users:read'],
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const mockApiKey = {
        id: '1',
        ...createDto,
        keyHash: 'hashed-key',
        prefix: 'vx_test',
        status: ApiKeyStatus.ACTIVE,
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockApiKey);
      mockRepository.save.mockResolvedValue(mockApiKey);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          type: createDto.type,
          permissions: createDto.permissions,
          scopes: createDto.scopes,
          tenantId: createDto.tenantId,
          userId: createDto.userId,
          status: ApiKeyStatus.ACTIVE,
        })
      );
      expect(result.key).toBeDefined();
      expect(result.apiKey).toEqual(mockApiKey);
    });
  });

  describe('validateApiKey', () => {
    it('should validate a correct API key', async () => {
      const keyValue = 'vx_test_1234567890abcdef';
      const mockApiKey = {
        id: '1',
        keyHash: await bcrypt.hash('1234567890abcdef', 10),
        prefix: 'vx_test',
        status: ApiKeyStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      };

      mockRepository.findOne.mockResolvedValue(mockApiKey);

      const result = await service.validateApiKey(keyValue);

      expect(result).toEqual(mockApiKey);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { prefix: 'vx_test', status: ApiKeyStatus.ACTIVE },
      });
    });

    it('should return null for invalid API key', async () => {
      const keyValue = 'invalid_key';
      
      const result = await service.validateApiKey(keyValue);

      expect(result).toBeNull();
    });

    it('should return null for expired API key', async () => {
      const keyValue = 'vx_test_1234567890abcdef';
      const mockApiKey = {
        id: '1',
        keyHash: await bcrypt.hash('1234567890abcdef', 10),
        prefix: 'vx_test',
        status: ApiKeyStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      };

      mockRepository.findOne.mockResolvedValue(mockApiKey);

      const result = await service.validateApiKey(keyValue);

      expect(result).toBeNull();
    });
  });

  describe('checkPermission', () => {
    it('should return true for valid permission', async () => {
      const apiKey = {
        permissions: [ApiPermission.READ, ApiPermission.WRITE],
      } as ApiKey;

      const result = await service.checkPermission(apiKey, ApiPermission.READ);

      expect(result).toBe(true);
    });

    it('should return false for invalid permission', async () => {
      const apiKey = {
        permissions: [ApiPermission.READ],
      } as ApiKey;

      const result = await service.checkPermission(apiKey, ApiPermission.ADMIN);

      expect(result).toBe(false);
    });
  });

  describe('checkScope', () => {
    it('should return true for valid scope', async () => {
      const apiKey = {
        scopes: ['users:read', 'events:write'],
      } as ApiKey;

      const result = await service.checkScope(apiKey, 'users:read');

      expect(result).toBe(true);
    });

    it('should return true for wildcard scope', async () => {
      const apiKey = {
        scopes: ['users:*'],
      } as ApiKey;

      const result = await service.checkScope(apiKey, 'users:read');

      expect(result).toBe(true);
    });

    it('should return false for invalid scope', async () => {
      const apiKey = {
        scopes: ['users:read'],
      } as ApiKey;

      const result = await service.checkScope(apiKey, 'events:write');

      expect(result).toBe(false);
    });
  });

  describe('revoke', () => {
    it('should revoke an API key', async () => {
      const mockApiKey = {
        id: '1',
        status: ApiKeyStatus.ACTIVE,
      } as ApiKey;

      mockRepository.findOne.mockResolvedValue(mockApiKey);
      mockRepository.save.mockResolvedValue({
        ...mockApiKey,
        status: ApiKeyStatus.REVOKED,
      });

      const result = await service.revoke('1');

      expect(result.status).toBe(ApiKeyStatus.REVOKED);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.revoke('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerate', () => {
    it('should regenerate an API key', async () => {
      const mockApiKey = {
        id: '1',
        name: 'Test Key',
        status: ApiKeyStatus.ACTIVE,
      } as ApiKey;

      mockRepository.findOne.mockResolvedValue(mockApiKey);
      mockRepository.save.mockResolvedValue(mockApiKey);

      const result = await service.regenerate('1');

      expect(result.key).toBeDefined();
      expect(result.apiKey).toEqual(mockApiKey);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all API keys', async () => {
      const mockApiKeys = [
        { id: '1', name: 'Key 1' },
        { id: '2', name: 'Key 2' },
      ] as ApiKey[];

      mockQueryBuilder.getMany.mockResolvedValue(mockApiKeys);

      const result = await service.findAll();

      expect(result).toEqual(mockApiKeys);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by tenantId', async () => {
      const mockApiKeys = [{ id: '1', name: 'Key 1', tenantId: 'tenant-1' }] as ApiKey[];

      mockQueryBuilder.getMany.mockResolvedValue(mockApiKeys);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(mockApiKeys);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('apiKey.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const mockApiKey = { id: '1', name: 'Test Key' } as ApiKey;
      mockRepository.findOne.mockResolvedValue(mockApiKey);

      const mockStats = {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 150,
      };

      // Mock the query builder for usage stats
      mockQueryBuilder.getOne.mockResolvedValue(mockStats);

      const result = await service.getUsageStats('1', 30);

      expect(result).toBeDefined();
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
