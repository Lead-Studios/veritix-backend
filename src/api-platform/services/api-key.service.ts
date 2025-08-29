import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey, ApiKeyStatus, ApiKeyType, ApiPermission } from '../entities/api-key.entity';

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  type?: ApiKeyType;
  permissions: ApiPermission[];
  scopes?: string[];
  ipWhitelist?: string[];
  domainWhitelist?: string[];
  rateLimit?: number;
  monthlyQuota?: number;
  expiresAt?: Date;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string; // Only returned on creation
  keyPrefix: string;
  type: ApiKeyType;
  status: ApiKeyStatus;
  permissions: ApiPermission[];
  scopes?: string[];
  rateLimit: number;
  monthlyQuota: number;
  expiresAt?: Date;
  createdAt: Date;
}

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(createDto: CreateApiKeyDto): Promise<ApiKeyResponse> {
    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = await this.hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);

    // Check for duplicate names for the same user/tenant
    const existing = await this.apiKeyRepository.findOne({
      where: {
        name: createDto.name,
        ...(createDto.tenantId && { tenantId: createDto.tenantId }),
        ...(createDto.userId && { userId: createDto.userId }),
      },
    });

    if (existing) {
      throw new ConflictException('API key with this name already exists');
    }

    const newApiKey = this.apiKeyRepository.create({
      ...createDto,
      keyHash,
      keyPrefix,
      type: createDto.type || ApiKeyType.PRIVATE,
      rateLimit: createDto.rateLimit || 1000,
      monthlyQuota: createDto.monthlyQuota || 10000,
    });

    const savedKey = await this.apiKeyRepository.save(newApiKey);

    return {
      id: savedKey.id,
      name: savedKey.name,
      key: apiKey, // Only returned on creation
      keyPrefix: savedKey.keyPrefix,
      type: savedKey.type,
      status: savedKey.status,
      permissions: savedKey.permissions,
      scopes: savedKey.scopes,
      rateLimit: savedKey.rateLimit,
      monthlyQuota: savedKey.monthlyQuota,
      expiresAt: savedKey.expiresAt,
      createdAt: savedKey.createdAt,
    };
  }

  async findAll(tenantId?: string, userId?: string): Promise<Omit<ApiKeyResponse, 'key'>[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (userId) where.userId = userId;

    const apiKeys = await this.apiKeyRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      type: key.type,
      status: key.status,
      permissions: key.permissions,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
      monthlyQuota: key.monthlyQuota,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  async findOne(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id },
      relations: ['usage'],
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async validateApiKey(key: string): Promise<ApiKey | null> {
    if (!key || !key.startsWith('vx_')) {
      return null;
    }

    const keyPrefix = key.substring(0, 8);
    const candidates = await this.apiKeyRepository.find({
      where: {
        keyPrefix,
        status: ApiKeyStatus.ACTIVE,
      },
    });

    for (const candidate of candidates) {
      // Check if key is expired
      if (candidate.expiresAt && candidate.expiresAt < new Date()) {
        await this.expire(candidate.id);
        continue;
      }

      // Verify key hash
      const isValid = await bcrypt.compare(key, candidate.keyHash);
      if (isValid) {
        // Update last used timestamp
        await this.apiKeyRepository.update(candidate.id, {
          lastUsedAt: new Date(),
        });
        return candidate;
      }
    }

    return null;
  }

  async update(id: string, updateDto: Partial<CreateApiKeyDto>): Promise<ApiKey> {
    const apiKey = await this.findOne(id);

    // Don't allow updating certain fields
    const { permissions, scopes, rateLimit, monthlyQuota, expiresAt, metadata } = updateDto;
    
    Object.assign(apiKey, {
      ...(permissions && { permissions }),
      ...(scopes && { scopes }),
      ...(rateLimit && { rateLimit }),
      ...(monthlyQuota && { monthlyQuota }),
      ...(expiresAt && { expiresAt }),
      ...(metadata && { metadata }),
    });

    return this.apiKeyRepository.save(apiKey);
  }

  async revoke(id: string): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    apiKey.status = ApiKeyStatus.REVOKED;
    return this.apiKeyRepository.save(apiKey);
  }

  async activate(id: string): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new BadRequestException('Cannot activate expired API key');
    }

    apiKey.status = ApiKeyStatus.ACTIVE;
    return this.apiKeyRepository.save(apiKey);
  }

  async deactivate(id: string): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    apiKey.status = ApiKeyStatus.INACTIVE;
    return this.apiKeyRepository.save(apiKey);
  }

  async regenerate(id: string): Promise<ApiKeyResponse> {
    const existingKey = await this.findOne(id);
    
    // Generate new API key
    const newApiKey = this.generateApiKey();
    const keyHash = await this.hashKey(newApiKey);
    const keyPrefix = newApiKey.substring(0, 8);

    existingKey.keyHash = keyHash;
    existingKey.keyPrefix = keyPrefix;
    existingKey.status = ApiKeyStatus.ACTIVE;

    const savedKey = await this.apiKeyRepository.save(existingKey);

    return {
      id: savedKey.id,
      name: savedKey.name,
      key: newApiKey, // Only returned on regeneration
      keyPrefix: savedKey.keyPrefix,
      type: savedKey.type,
      status: savedKey.status,
      permissions: savedKey.permissions,
      scopes: savedKey.scopes,
      rateLimit: savedKey.rateLimit,
      monthlyQuota: savedKey.monthlyQuota,
      expiresAt: savedKey.expiresAt,
      createdAt: savedKey.createdAt,
    };
  }

  async delete(id: string): Promise<void> {
    const apiKey = await this.findOne(id);
    await this.apiKeyRepository.remove(apiKey);
  }

  async checkPermission(apiKey: ApiKey, permission: ApiPermission): Promise<boolean> {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes(ApiPermission.ADMIN);
  }

  async checkScope(apiKey: ApiKey, endpoint: string): Promise<boolean> {
    if (!apiKey.scopes || apiKey.scopes.length === 0) {
      return true; // No scope restrictions
    }

    return apiKey.scopes.some(scope => {
      // Support wildcard matching
      if (scope.endsWith('*')) {
        return endpoint.startsWith(scope.slice(0, -1));
      }
      return endpoint === scope;
    });
  }

  async checkIpWhitelist(apiKey: ApiKey, ipAddress: string): Promise<boolean> {
    if (!apiKey.ipWhitelist || apiKey.ipWhitelist.length === 0) {
      return true; // No IP restrictions
    }

    return apiKey.ipWhitelist.includes(ipAddress);
  }

  async checkDomainWhitelist(apiKey: ApiKey, domain: string): Promise<boolean> {
    if (!apiKey.domainWhitelist || apiKey.domainWhitelist.length === 0) {
      return true; // No domain restrictions
    }

    return apiKey.domainWhitelist.some(allowedDomain => {
      if (allowedDomain.startsWith('*.')) {
        const baseDomain = allowedDomain.slice(2);
        return domain.endsWith(baseDomain);
      }
      return domain === allowedDomain;
    });
  }

  async getUsageStats(id: string, days = 30): Promise<any> {
    const apiKey = await this.findOne(id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // This would typically query the ApiUsage entity
    // For now, returning mock data structure
    return {
      apiKeyId: id,
      period: { start: startDate, end: new Date() },
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      quotaUsage: {
        used: 0,
        limit: apiKey.monthlyQuota,
        percentage: 0,
      },
      topEndpoints: [],
      dailyUsage: [],
    };
  }

  private async expire(id: string): Promise<void> {
    await this.apiKeyRepository.update(id, {
      status: ApiKeyStatus.EXPIRED,
    });
  }

  private generateApiKey(): string {
    const prefix = 'vx_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }

  private async hashKey(key: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(key, saltRounds);
  }
}
