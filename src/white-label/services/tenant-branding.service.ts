import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantBranding, BrandingType } from '../entities/tenant-branding.entity';
import { CreateBrandingDto } from '../dto/create-branding.dto';

@Injectable()
export class TenantBrandingService {
  constructor(
    @InjectRepository(TenantBranding)
    private brandingRepository: Repository<TenantBranding>,
  ) {}

  async create(tenantId: string, createBrandingDto: CreateBrandingDto): Promise<TenantBranding> {
    // Check if branding of this type already exists for tenant
    const existing = await this.brandingRepository.findOne({
      where: { 
        tenantId, 
        type: createBrandingDto.type,
        name: createBrandingDto.name 
      },
    });

    if (existing) {
      throw new ConflictException('Branding with this type and name already exists for tenant');
    }

    const branding = this.brandingRepository.create({
      ...createBrandingDto,
      tenantId,
    });

    return this.brandingRepository.save(branding);
  }

  async findByTenant(tenantId: string): Promise<TenantBranding[]> {
    return this.brandingRepository.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findByTenantAndType(tenantId: string, type: BrandingType): Promise<TenantBranding[]> {
    return this.brandingRepository.find({
      where: { tenantId, type },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<TenantBranding> {
    const branding = await this.brandingRepository.findOne({
      where: { id },
    });

    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    return branding;
  }

  async update(id: string, updateData: Partial<CreateBrandingDto>): Promise<TenantBranding> {
    const branding = await this.findOne(id);
    
    Object.assign(branding, updateData);
    return this.brandingRepository.save(branding);
  }

  async delete(id: string): Promise<void> {
    const branding = await this.findOne(id);
    await this.brandingRepository.remove(branding);
  }

  async getThemeConfig(tenantId: string): Promise<Record<string, any>> {
    const branding = await this.findByTenant(tenantId);
    
    const theme: Record<string, any> = {
      colors: {},
      typography: {},
      assets: {},
      customCss: '',
    };

    for (const item of branding) {
      if (!item.isActive) continue;

      switch (item.type) {
        case BrandingType.LOGO:
          theme.assets.logo = item.fileUrl;
          break;
        case BrandingType.FAVICON:
          theme.assets.favicon = item.fileUrl;
          break;
        case BrandingType.COLOR_SCHEME:
          theme.colors = { ...theme.colors, ...item.config };
          break;
        case BrandingType.TYPOGRAPHY:
          theme.typography = { ...theme.typography, ...item.config };
          break;
        case BrandingType.CUSTOM_CSS:
          theme.customCss += item.value || '';
          break;
      }
    }

    return theme;
  }

  async uploadAsset(tenantId: string, type: BrandingType, file: any): Promise<TenantBranding> {
    // This would integrate with your file upload service
    // For now, creating a placeholder implementation
    
    const fileUrl = `/uploads/tenants/${tenantId}/${type}/${file.filename}`;
    
    const brandingDto: CreateBrandingDto = {
      type,
      name: `${type}_${Date.now()}`,
      fileUrl,
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    return this.create(tenantId, brandingDto);
  }
}
