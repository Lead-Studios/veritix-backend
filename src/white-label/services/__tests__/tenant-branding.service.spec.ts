import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantBrandingService } from '../tenant-branding.service';
import { TenantBranding, BrandingType } from '../../entities/tenant-branding.entity';

describe('TenantBrandingService', () => {
  let service: TenantBrandingService;
  let repository: jest.Mocked<Repository<TenantBranding>>;

  const mockBranding: Partial<TenantBranding> = {
    id: 'branding-1',
    tenantId: 'tenant-1',
    type: BrandingType.LOGO,
    name: 'Company Logo',
    fileUrl: '/uploads/logo.png',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantBrandingService,
        {
          provide: getRepositoryToken(TenantBranding),
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

    service = module.get<TenantBrandingService>(TenantBrandingService);
    repository = module.get(getRepositoryToken(TenantBranding));
  });

  describe('create', () => {
    const createDto = {
      type: BrandingType.LOGO,
      name: 'Company Logo',
      fileUrl: '/uploads/logo.png',
    };

    it('should create branding successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockBranding as TenantBranding);
      repository.save.mockResolvedValue(mockBranding as TenantBranding);

      const result = await service.create('tenant-1', createDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        tenantId: 'tenant-1',
      });
      expect(result).toEqual(mockBranding);
    });

    it('should throw ConflictException if branding already exists', async () => {
      repository.findOne.mockResolvedValue(mockBranding as TenantBranding);

      await expect(service.create('tenant-1', createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByTenant', () => {
    it('should return branding items for tenant', async () => {
      const branding = [mockBranding];
      repository.find.mockResolvedValue(branding as TenantBranding[]);

      const result = await service.findByTenant('tenant-1');

      expect(result).toEqual(branding);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    });
  });

  describe('findByTenantAndType', () => {
    it('should return branding items by type', async () => {
      const branding = [mockBranding];
      repository.find.mockResolvedValue(branding as TenantBranding[]);

      const result = await service.findByTenantAndType('tenant-1', BrandingType.LOGO);

      expect(result).toEqual(branding);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', type: BrandingType.LOGO },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    });
  });

  describe('getThemeConfig', () => {
    it('should compile theme configuration', async () => {
      const brandingItems = [
        { ...mockBranding, type: BrandingType.LOGO, fileUrl: '/logo.png' },
        { ...mockBranding, type: BrandingType.COLOR_SCHEME, config: { primary: '#007bff' } },
        { ...mockBranding, type: BrandingType.CUSTOM_CSS, value: '.custom { color: red; }' },
      ];
      repository.find.mockResolvedValue(brandingItems as TenantBranding[]);

      const result = await service.getThemeConfig('tenant-1');

      expect(result).toEqual({
        colors: { primary: '#007bff' },
        typography: {},
        assets: { logo: '/logo.png' },
        customCss: '.custom { color: red; }',
      });
    });
  });

  describe('uploadAsset', () => {
    it('should upload and create branding asset', async () => {
      const file = {
        filename: 'logo.png',
        size: 1024,
        mimetype: 'image/png',
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockBranding as TenantBranding);
      repository.save.mockResolvedValue(mockBranding as TenantBranding);

      const result = await service.uploadAsset('tenant-1', BrandingType.LOGO, file);

      expect(repository.create).toHaveBeenCalledWith({
        type: BrandingType.LOGO,
        name: expect.stringContaining('logo_'),
        fileUrl: expect.stringContaining('/uploads/tenants/tenant-1/logo/logo.png'),
        fileName: 'logo.png',
        fileSize: 1024,
        mimeType: 'image/png',
        tenantId: 'tenant-1',
      });
      expect(result).toEqual(mockBranding);
    });
  });

  describe('update', () => {
    it('should update branding item', async () => {
      const updateData = { name: 'Updated Logo' };
      const updatedBranding = { ...mockBranding, ...updateData };

      repository.findOne.mockResolvedValue(mockBranding as TenantBranding);
      repository.save.mockResolvedValue(updatedBranding as TenantBranding);

      const result = await service.update('branding-1', updateData);

      expect(result).toEqual(updatedBranding);
    });

    it('should throw NotFoundException if branding not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete branding item', async () => {
      repository.findOne.mockResolvedValue(mockBranding as TenantBranding);
      repository.remove.mockResolvedValue(mockBranding as TenantBranding);

      await service.delete('branding-1');

      expect(repository.remove).toHaveBeenCalledWith(mockBranding);
    });
  });
});
