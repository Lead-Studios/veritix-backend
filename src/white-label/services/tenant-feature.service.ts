import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantFeature, FeatureCategory } from '../entities/tenant-feature.entity';
import { CreateFeatureDto } from '../dto/create-feature.dto';

@Injectable()
export class TenantFeatureService {
  constructor(
    @InjectRepository(TenantFeature)
    private featureRepository: Repository<TenantFeature>,
  ) {}

  async create(tenantId: string, createFeatureDto: CreateFeatureDto): Promise<TenantFeature> {
    // Check if feature already exists for tenant
    const existing = await this.featureRepository.findOne({
      where: { 
        tenantId, 
        featureKey: createFeatureDto.featureKey 
      },
    });

    if (existing) {
      throw new ConflictException('Feature already exists for tenant');
    }

    const feature = this.featureRepository.create({
      ...createFeatureDto,
      tenantId,
      enabledAt: createFeatureDto.isEnabled ? new Date() : null,
    });

    return this.featureRepository.save(feature);
  }

  async findByTenant(tenantId: string): Promise<TenantFeature[]> {
    return this.featureRepository.find({
      where: { tenantId },
      order: { category: 'ASC', featureName: 'ASC' },
    });
  }

  async findEnabledByTenant(tenantId: string): Promise<TenantFeature[]> {
    return this.featureRepository.find({
      where: { tenantId, isEnabled: true },
      order: { category: 'ASC', featureName: 'ASC' },
    });
  }

  async findByCategory(tenantId: string, category: FeatureCategory): Promise<TenantFeature[]> {
    return this.featureRepository.find({
      where: { tenantId, category },
      order: { featureName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<TenantFeature> {
    const feature = await this.featureRepository.findOne({
      where: { id },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return feature;
  }

  async findByKey(tenantId: string, featureKey: string): Promise<TenantFeature> {
    const feature = await this.featureRepository.findOne({
      where: { tenantId, featureKey },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return feature;
  }

  async update(id: string, updateData: Partial<CreateFeatureDto>): Promise<TenantFeature> {
    const feature = await this.findOne(id);
    
    // Update enabledAt timestamp if enabling feature
    if (updateData.isEnabled && !feature.isEnabled) {
      updateData.enabledAt = new Date();
    }

    Object.assign(feature, updateData);
    return this.featureRepository.save(feature);
  }

  async enable(tenantId: string, featureKey: string, enabledBy?: string): Promise<TenantFeature> {
    const feature = await this.findByKey(tenantId, featureKey);
    
    feature.isEnabled = true;
    feature.enabledAt = new Date();
    if (enabledBy) {
      feature.enabledBy = enabledBy;
    }

    return this.featureRepository.save(feature);
  }

  async disable(tenantId: string, featureKey: string): Promise<TenantFeature> {
    const feature = await this.findByKey(tenantId, featureKey);
    
    feature.isEnabled = false;
    feature.enabledAt = null;

    return this.featureRepository.save(feature);
  }

  async delete(id: string): Promise<void> {
    const feature = await this.findOne(id);
    await this.featureRepository.remove(feature);
  }

  async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    try {
      const feature = await this.findByKey(tenantId, featureKey);
      
      // Check if feature is enabled and not expired
      if (!feature.isEnabled) {
        return false;
      }

      if (feature.expiresAt && feature.expiresAt < new Date()) {
        // Auto-disable expired feature
        await this.disable(tenantId, featureKey);
        return false;
      }

      return true;
    } catch (error) {
      // Feature doesn't exist
      return false;
    }
  }

  async getFeatureConfig(tenantId: string, featureKey: string): Promise<Record<string, any> | null> {
    try {
      const feature = await this.findByKey(tenantId, featureKey);
      
      if (!feature.isEnabled) {
        return null;
      }

      return feature.config || {};
    } catch (error) {
      return null;
    }
  }

  async bulkEnable(tenantId: string, featureKeys: string[], enabledBy?: string): Promise<TenantFeature[]> {
    const features = await this.featureRepository.find({
      where: { tenantId, featureKey: featureKeys as any },
    });

    const updatedFeatures = features.map(feature => {
      feature.isEnabled = true;
      feature.enabledAt = new Date();
      if (enabledBy) {
        feature.enabledBy = enabledBy;
      }
      return feature;
    });

    return this.featureRepository.save(updatedFeatures);
  }

  async bulkDisable(tenantId: string, featureKeys: string[]): Promise<TenantFeature[]> {
    const features = await this.featureRepository.find({
      where: { tenantId, featureKey: featureKeys as any },
    });

    const updatedFeatures = features.map(feature => {
      feature.isEnabled = false;
      feature.enabledAt = null;
      return feature;
    });

    return this.featureRepository.save(updatedFeatures);
  }
}
