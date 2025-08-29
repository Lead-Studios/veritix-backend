import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantDomainService } from '../tenant-domain.service';
import { TenantDomain, DomainType, DomainStatus } from '../../entities/tenant-domain.entity';

describe('TenantDomainService', () => {
  let service: TenantDomainService;
  let repository: jest.Mocked<Repository<TenantDomain>>;

  const mockDomain: Partial<TenantDomain> = {
    id: 'domain-1',
    tenantId: 'tenant-1',
    domain: 'test.example.com',
    type: DomainType.CUSTOM,
    status: DomainStatus.ACTIVE,
    isPrimary: true,
    sslEnabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantDomainService,
        {
          provide: getRepositoryToken(TenantDomain),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantDomainService>(TenantDomainService);
    repository = module.get(getRepositoryToken(TenantDomain));
  });

  describe('create', () => {
    const createDto = {
      domain: 'test.example.com',
      type: DomainType.CUSTOM,
      isPrimary: true,
    };

    it('should create domain successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockDomain as TenantDomain);
      repository.save.mockResolvedValue(mockDomain as TenantDomain);
      repository.update.mockResolvedValue({} as any);

      const result = await service.create('tenant-1', createDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        tenantId: 'tenant-1',
        status: DomainStatus.PENDING,
        verificationToken: expect.any(String),
      });
      expect(result).toEqual(mockDomain);
    });

    it('should throw ConflictException if domain already exists', async () => {
      repository.findOne.mockResolvedValue(mockDomain as TenantDomain);

      await expect(service.create('tenant-1', createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid domain format', async () => {
      const invalidDto = { ...createDto, domain: 'invalid-domain' };
      repository.findOne.mockResolvedValue(null);

      await expect(service.create('tenant-1', invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should unset other primary domains when setting as primary', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockDomain as TenantDomain);
      repository.save.mockResolvedValue(mockDomain as TenantDomain);
      repository.update.mockResolvedValue({} as any);

      await service.create('tenant-1', createDto);

      expect(repository.update).toHaveBeenCalledWith(
        { tenantId: 'tenant-1', isPrimary: true },
        { isPrimary: false }
      );
    });
  });

  describe('findByTenant', () => {
    it('should return domains for tenant', async () => {
      const domains = [mockDomain];
      repository.find.mockResolvedValue(domains as TenantDomain[]);

      const result = await service.findByTenant('tenant-1');

      expect(result).toEqual(domains);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });
    });
  });

  describe('findByDomain', () => {
    it('should return domain by name', async () => {
      repository.findOne.mockResolvedValue(mockDomain as TenantDomain);

      const result = await service.findByDomain('test.example.com');

      expect(result).toEqual(mockDomain);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { domain: 'test.example.com' },
        relations: ['tenant'],
      });
    });

    it('should throw NotFoundException if domain not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByDomain('non-existent.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setPrimary', () => {
    it('should set domain as primary', async () => {
      const activeDomain = { ...mockDomain, status: DomainStatus.ACTIVE, isPrimary: false };
      repository.findOne.mockResolvedValue(activeDomain as TenantDomain);
      repository.update.mockResolvedValue({} as any);
      repository.save.mockResolvedValue({ ...activeDomain, isPrimary: true } as TenantDomain);

      const result = await service.setPrimary('domain-1');

      expect(result.isPrimary).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(
        { tenantId: activeDomain.tenantId, isPrimary: true },
        { isPrimary: false }
      );
    });

    it('should throw BadRequestException if domain is not active', async () => {
      const pendingDomain = { ...mockDomain, status: DomainStatus.PENDING };
      repository.findOne.mockResolvedValue(pendingDomain as TenantDomain);

      await expect(service.setPrimary('domain-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verify', () => {
    it('should verify domain successfully', async () => {
      repository.findOne.mockResolvedValue(mockDomain as TenantDomain);
      
      // Mock successful DNS verification
      jest.spyOn(service as any, 'performDnsVerification').mockResolvedValue(true);
      
      repository.save.mockResolvedValue({
        ...mockDomain,
        status: DomainStatus.ACTIVE,
        verifiedAt: expect.any(Date),
      } as TenantDomain);

      const result = await service.verify('domain-1');

      expect(result.status).toBe(DomainStatus.ACTIVE);
      expect(result.verifiedAt).toBeDefined();
    });

    it('should handle verification failure', async () => {
      repository.findOne.mockResolvedValue(mockDomain as TenantDomain);
      
      // Mock failed DNS verification
      jest.spyOn(service as any, 'performDnsVerification').mockResolvedValue(false);
      
      repository.save.mockResolvedValue({
        ...mockDomain,
        status: DomainStatus.FAILED,
        errorMessage: 'DNS verification failed',
      } as TenantDomain);

      const result = await service.verify('domain-1');

      expect(result.status).toBe(DomainStatus.FAILED);
      expect(result.errorMessage).toBe('DNS verification failed');
    });
  });

  describe('setupSsl', () => {
    it('should setup SSL for active domain', async () => {
      const activeDomain = { ...mockDomain, status: DomainStatus.ACTIVE, sslEnabled: false };
      repository.findOne.mockResolvedValue(activeDomain as TenantDomain);
      repository.save.mockResolvedValue({
        ...activeDomain,
        sslEnabled: true,
        sslCertificate: expect.any(String),
        sslExpiresAt: expect.any(Date),
      } as TenantDomain);

      const result = await service.setupSsl('domain-1');

      expect(result.sslEnabled).toBe(true);
      expect(result.sslCertificate).toBeDefined();
      expect(result.sslExpiresAt).toBeDefined();
    });

    it('should throw BadRequestException if domain is not active', async () => {
      const pendingDomain = { ...mockDomain, status: DomainStatus.PENDING };
      repository.findOne.mockResolvedValue(pendingDomain as TenantDomain);

      await expect(service.setupSsl('domain-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkSslExpiration', () => {
    it('should return expiring SSL domains', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDomain]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.checkSslExpiration();

      expect(result).toEqual([mockDomain]);
      expect(queryBuilder.where).toHaveBeenCalledWith('domain.sslEnabled = :enabled', { enabled: true });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('domain.sslExpiresAt <= :expirationDate', {
        expirationDate: expect.any(Date),
      });
    });
  });

  describe('delete', () => {
    it('should delete non-primary domain', async () => {
      const nonPrimaryDomain = { ...mockDomain, isPrimary: false };
      repository.findOne.mockResolvedValue(nonPrimaryDomain as TenantDomain);
      repository.remove.mockResolvedValue(nonPrimaryDomain as TenantDomain);

      await service.delete('domain-1');

      expect(repository.remove).toHaveBeenCalledWith(nonPrimaryDomain);
    });

    it('should throw BadRequestException when deleting primary domain', async () => {
      repository.findOne.mockResolvedValue(mockDomain as TenantDomain);

      await expect(service.delete('domain-1')).rejects.toThrow(BadRequestException);
    });
  });
});
