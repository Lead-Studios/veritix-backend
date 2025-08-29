import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantFeatureService } from '../tenant-feature.service';
import { TenantFeature, FeatureCategory } from '../../entities/tenant-feature.entity';

describe('TenantFeatureService', () => {
  let service: TenantFeatureService;
  let repository: jest.Mocked<Repository<TenantFeature>>;

  const mockFeature: Partial<TenantFeature> = {
    id: 'feature-1',
    tenantId: 'tenant-1',
    featureKey: 'advanced_analytics',
    featureName: 'Advanced Analytics',
    category: FeatureCategory.ANALYTICS,
    isEnabled: true,
    enabledAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantFeatureService,
        {
          provide: getRepositoryToken(TenantFeature),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantFeatureService>(TenantFeatureService);
    repository = module.get(getRepositoryToken(TenantFeature));
  });

  describe('create', () => {
    const createDto = {
      featureKey: 'advanced_analytics',
      featureName: 'Advanced Analytics',
      category: FeatureCategory.ANALYTICS,
      isEnabled: true,
    };

    it('should create a new feature successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockFeature as TenantFeature);
      repository.save.mockResolvedValue(mockFeature as TenantFeature);

      const result = await service.create('tenant-1', createDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        tenantId: 'tenant-1',
        enabledAt: expect.any(Date),
      });
      expect(result).toEqual(mockFeature);
    });

    it('should throw ConflictException if feature already exists', async () => {
      repository.findOne.mockResolvedValue(mockFeature as TenantFeature);

      await expect(service.create('tenant-1', createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByTenant', () => {
    it('should return all features for tenant', async () => {
      const features = [mockFeature];
      repository.find.mockResolvedValue(features as TenantFeature[]);

      const result = await service.findByTenant('tenant-1');

      expect(result).toEqual(features);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { category: 'ASC', featureName: 'ASC' },
      });
    });
  });

  describe('findEnabledByTenant', () => {
    it('should return only enabled features', async () => {
      const enabledFeatures = [mockFeature];
      repository.find.mockResolvedValue(enabledFeatures as TenantFeature[]);

      const result = await service.findEnabledByTenant('tenant-1');

      expect(result).toEqual(enabledFeatures);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isEnabled: true },
        order: { category: 'ASC', featureName: 'ASC' },
      });
    });
  });

  describe('findByKey', () => {
    it('should return feature by key', async () => {
      repository.findOne.mockResolvedValue(mockFeature as TenantFeature);

      const result = await service.findByKey('tenant-1', 'advanced_analytics');

      expect(result).toEqual(mockFeature);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', featureKey: 'advanced_analytics' },
      });
    });

    it('should throw NotFoundException if feature not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByKey('tenant-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('enable', () => {
    it('should enable feature', async () => {
      const disabledFeature = { ...mockFeature, isEnabled: false, enabledAt: null };
      repository.findOne.mockResolvedValue(disabledFeature as TenantFeature);
      repository.save.mockResolvedValue({ ...disabledFeature, isEnabled: true, enabledAt: new Date() } as TenantFeature);

      const result = await service.enable('tenant-1', 'advanced_analytics', 'admin-user');

      expect(result.isEnabled).toBe(true);
      expect(result.enabledAt).toBeDefined();
      expect(result.enabledBy).toBe('admin-user');
    });
  });

  describe('disable', () => {
    it('should disable feature', async () => {
      repository.findOne.mockResolvedValue(mockFeature as TenantFeature);
      repository.save.mockResolvedValue({ ...mockFeature, isEnabled: false, enabledAt: null } as TenantFeature);

      const result = await service.disable('tenant-1', 'advanced_analytics');

      expect(result.isEnabled).toBe(false);
      expect(result.enabledAt).toBeNull();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled feature', async () => {
      repository.findOne.mockResolvedValue(mockFeature as TenantFeature);

      const result = await service.isFeatureEnabled('tenant-1', 'advanced_analytics');

      expect(result).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      const disabledFeature = { ...mockFeature, isEnabled: false };
      repository.findOne.mockResolvedValue(disabledFeature as TenantFeature);

      const result = await service.isFeatureEnabled('tenant-1', 'advanced_analytics');

      expect(result).toBe(false);
    });

    it('should return false and disable expired feature', async () => {
      const expiredFeature = { 
        ...mockFeature, 
        isEnabled: true, 
        expiresAt: new Date(Date.now() - 1000) 
      };
      repository.findOne.mockResolvedValue(expiredFeature as TenantFeature);
      repository.save.mockResolvedValue({ ...expiredFeature, isEnabled: false } as TenantFeature);

      const result = await service.isFeatureEnabled('tenant-1', 'advanced_analytics');

      expect(result).toBe(false);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should return false for non-existent feature', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.isFeatureEnabled('tenant-1', 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getFeatureConfig', () => {
    it('should return feature config', async () => {
      const featureWithConfig = { 
        ...mockFeature, 
        config: { maxReports: 100, retentionDays: 365 } 
      };
      repository.findOne.mockResolvedValue(featureWithConfig as TenantFeature);

      const result = await service.getFeatureConfig('tenant-1', 'advanced_analytics');

      expect(result).toEqual({ maxReports: 100, retentionDays: 365 });
    });

    it('should return null for disabled feature', async () => {
      const disabledFeature = { ...mockFeature, isEnabled: false };
      repository.findOne.mockResolvedValue(disabledFeature as TenantFeature);

      const result = await service.getFeatureConfig('tenant-1', 'advanced_analytics');

      expect(result).toBeNull();
    });
  });

  describe('bulkEnable', () => {
    it('should enable multiple features', async () => {
      const features = [
        { ...mockFeature, featureKey: 'feature1', isEnabled: false },
        { ...mockFeature, featureKey: 'feature2', isEnabled: false },
      ];
      repository.find.mockResolvedValue(features as TenantFeature[]);
      repository.save.mockResolvedValue(features.map(f => ({ ...f, isEnabled: true, enabledAt: new Date() })) as TenantFeature[]);

      const result = await service.bulkEnable('tenant-1', ['feature1', 'feature2'], 'admin-user');

      expect(result).toHaveLength(2);
      expect(result.every(f => f.isEnabled)).toBe(true);
    });
  });

  describe('bulkDisable', () => {
    it('should disable multiple features', async () => {
      const features = [
        { ...mockFeature, featureKey: 'feature1', isEnabled: true },
        { ...mockFeature, featureKey: 'feature2', isEnabled: true },
      ];
      repository.find.mockResolvedValue(features as TenantFeature[]);
      repository.save.mockResolvedValue(features.map(f => ({ ...f, isEnabled: false, enabledAt: null })) as TenantFeature[]);

      const result = await service.bulkDisable('tenant-1', ['feature1', 'feature2']);

      expect(result).toHaveLength(2);
      expect(result.every(f => !f.isEnabled)).toBe(true);
    });
  });
});
