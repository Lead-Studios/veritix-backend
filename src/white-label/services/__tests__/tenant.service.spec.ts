import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantService } from '../tenant.service';
import { Tenant, TenantStatus, TenantTier } from '../../entities/tenant.entity';
import { TenantBranding } from '../../entities/tenant-branding.entity';
import { TenantFeature } from '../../entities/tenant-feature.entity';
import { TenantSubscription } from '../../entities/tenant-subscription.entity';
import { TenantDomain } from '../../entities/tenant-domain.entity';

describe('TenantService', () => {
  let service: TenantService;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;
  let brandingRepository: jest.Mocked<Repository<TenantBranding>>;
  let featureRepository: jest.Mocked<Repository<TenantFeature>>;
  let subscriptionRepository: jest.Mocked<Repository<TenantSubscription>>;
  let domainRepository: jest.Mocked<Repository<TenantDomain>>;

  const mockTenant: Partial<Tenant> = {
    id: 'tenant-1',
    name: 'Test Tenant',
    slug: 'test-tenant',
    contactEmail: 'test@example.com',
    tier: TenantTier.PROFESSIONAL,
    status: TenantStatus.TRIAL,
    maxUsers: 100,
    maxEvents: 50,
    maxTickets: 10000,
    maxStorage: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantBranding),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantFeature),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantSubscription),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantDomain),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    tenantRepository = module.get(getRepositoryToken(Tenant));
    brandingRepository = module.get(getRepositoryToken(TenantBranding));
    featureRepository = module.get(getRepositoryToken(TenantFeature));
    subscriptionRepository = module.get(getRepositoryToken(TenantSubscription));
    domainRepository = module.get(getRepositoryToken(TenantDomain));
  });

  describe('create', () => {
    const createDto = {
      name: 'Test Tenant',
      slug: 'test-tenant',
      contactEmail: 'test@example.com',
      tier: TenantTier.PROFESSIONAL,
    };

    it('should create a new tenant successfully', async () => {
      tenantRepository.findOne.mockResolvedValue(null);
      tenantRepository.create.mockReturnValue(mockTenant as Tenant);
      tenantRepository.save.mockResolvedValue(mockTenant as Tenant);
      featureRepository.create.mockReturnValue({} as TenantFeature);
      featureRepository.save.mockResolvedValue([]);
      domainRepository.create.mockReturnValue({} as TenantDomain);
      domainRepository.save.mockResolvedValue({} as TenantDomain);

      // Mock findOne for the final return
      tenantRepository.findOne.mockResolvedValueOnce(null); // First call for existence check
      tenantRepository.findOne.mockResolvedValueOnce({
        ...mockTenant,
        branding: [],
        features: [],
        subscriptions: [],
        domains: [],
      } as Tenant); // Second call for final return

      const result = await service.create(createDto);

      expect(tenantRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: TenantStatus.TRIAL,
        trialEndsAt: expect.any(Date),
      });
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if slug already exists', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return tenant if found', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);

      const result = await service.findOne('tenant-1');

      expect(result).toEqual(mockTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        relations: ['branding', 'features', 'subscriptions', 'domains'],
      });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return tenant by slug', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);

      const result = await service.findBySlug('test-tenant');

      expect(result).toEqual(mockTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-tenant' },
        relations: ['branding', 'features', 'subscriptions', 'domains'],
      });
    });
  });

  describe('findByDomain', () => {
    it('should return tenant by domain', async () => {
      const mockDomain = {
        tenant: mockTenant,
      };
      domainRepository.findOne.mockResolvedValue(mockDomain as any);

      const result = await service.findByDomain('test.example.com');

      expect(result).toEqual(mockTenant);
      expect(domainRepository.findOne).toHaveBeenCalledWith({
        where: { domain: 'test.example.com' },
        relations: ['tenant', 'tenant.branding', 'tenant.features'],
      });
    });
  });

  describe('update', () => {
    it('should update tenant successfully', async () => {
      const updateDto = { name: 'Updated Tenant' };
      const updatedTenant = { ...mockTenant, ...updateDto };

      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepository.save.mockResolvedValue(updatedTenant as Tenant);

      const result = await service.update('tenant-1', updateDto);

      expect(result).toEqual(updatedTenant);
      expect(tenantRepository.save).toHaveBeenCalled();
    });

    it('should check slug uniqueness when updating slug', async () => {
      const updateDto = { slug: 'new-slug' };

      tenantRepository.findOne
        .mockResolvedValueOnce(mockTenant as Tenant) // findOne call
        .mockResolvedValueOnce(null); // slug uniqueness check

      tenantRepository.save.mockResolvedValue({ ...mockTenant, ...updateDto } as Tenant);

      await service.update('tenant-1', updateDto);

      expect(tenantRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('suspend', () => {
    it('should suspend tenant', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepository.save.mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
        suspendedAt: expect.any(Date),
        suspensionReason: 'Test reason',
      } as Tenant);

      const result = await service.suspend('tenant-1', 'Test reason');

      expect(result.status).toBe(TenantStatus.SUSPENDED);
      expect(result.suspensionReason).toBe('Test reason');
    });
  });

  describe('activate', () => {
    it('should activate tenant', async () => {
      const suspendedTenant = {
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspensionReason: 'Test reason',
      };

      tenantRepository.findOne.mockResolvedValue(suspendedTenant as Tenant);
      tenantRepository.save.mockResolvedValue({
        ...suspendedTenant,
        status: TenantStatus.ACTIVE,
        suspendedAt: null,
        suspensionReason: null,
      } as Tenant);

      const result = await service.activate('tenant-1');

      expect(result.status).toBe(TenantStatus.ACTIVE);
      expect(result.suspendedAt).toBeNull();
      expect(result.suspensionReason).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete tenant', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);
      tenantRepository.softDelete.mockResolvedValue({} as any);

      await service.delete('tenant-1');

      expect(tenantRepository.softDelete).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('checkLimits', () => {
    it('should return true when within limits', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);
      
      // Mock getUsageStats
      jest.spyOn(service, 'getUsageStats').mockResolvedValue({
        currentUsers: 50,
        currentEvents: 25,
        currentTickets: 5000,
        storageUsed: 2500,
      });

      const result = await service.checkLimits('tenant-1', 'users', 10);

      expect(result).toBe(true);
    });

    it('should return false when exceeding limits', async () => {
      tenantRepository.findOne.mockResolvedValue(mockTenant as Tenant);
      
      jest.spyOn(service, 'getUsageStats').mockResolvedValue({
        currentUsers: 95,
        currentEvents: 25,
        currentTickets: 5000,
        storageUsed: 2500,
      });

      const result = await service.checkLimits('tenant-1', 'users', 10);

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return paginated tenants', async () => {
      const tenants = [mockTenant];
      tenantRepository.findAndCount.mockResolvedValue([tenants as Tenant[], 1]);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({ tenants, total: 1 });
      expect(tenantRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: ['branding', 'features', 'subscriptions', 'domains'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply filters', async () => {
      const filters = { status: TenantStatus.ACTIVE, tier: TenantTier.ENTERPRISE };
      tenantRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, filters);

      expect(tenantRepository.findAndCount).toHaveBeenCalledWith({
        where: filters,
        relations: ['branding', 'features', 'subscriptions', 'domains'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });
});
