import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Tenant, TenantStatus, TenantTier } from '../entities/tenant.entity';
import { TenantBranding } from '../entities/tenant-branding.entity';
import { TenantFeature } from '../entities/tenant-feature.entity';
import { TenantSubscription } from '../entities/tenant-subscription.entity';
import { TenantDomain } from '../entities/tenant-domain.entity';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantBranding)
    private tenantBrandingRepository: Repository<TenantBranding>,
    @InjectRepository(TenantFeature)
    private tenantFeatureRepository: Repository<TenantFeature>,
    @InjectRepository(TenantSubscription)
    private tenantSubscriptionRepository: Repository<TenantSubscription>,
    @InjectRepository(TenantDomain)
    private tenantDomainRepository: Repository<TenantDomain>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Check if slug already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { slug: createTenantDto.slug },
    });

    if (existingTenant) {
      throw new ConflictException('Tenant with this slug already exists');
    }

    // Set trial end date (30 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      status: TenantStatus.TRIAL,
      trialEndsAt,
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Initialize default features based on tier
    await this.initializeDefaultFeatures(savedTenant.id, savedTenant.tier);

    // Create default subdomain
    await this.createDefaultDomain(savedTenant);

    return this.findOne(savedTenant.id);
  }

  async findAll(page = 1, limit = 20, filters?: any): Promise<{ tenants: Tenant[]; total: number }> {
    const where: FindOptionsWhere<Tenant> = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.tier) {
      where.tier = filters.tier;
    }

    const [tenants, total] = await this.tenantRepository.findAndCount({
      where,
      relations: ['branding', 'features', 'subscriptions', 'domains'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { tenants, total };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['branding', 'features', 'subscriptions', 'domains'],
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug },
      relations: ['branding', 'features', 'subscriptions', 'domains'],
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findByDomain(domain: string): Promise<Tenant> {
    const tenantDomain = await this.tenantDomainRepository.findOne({
      where: { domain },
      relations: ['tenant', 'tenant.branding', 'tenant.features'],
    });

    if (!tenantDomain) {
      throw new NotFoundException('Tenant not found for domain');
    }

    return tenantDomain.tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Check slug uniqueness if being updated
    if (updateTenantDto.slug && updateTenantDto.slug !== tenant.slug) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { slug: updateTenantDto.slug },
      });

      if (existingTenant) {
        throw new ConflictException('Tenant with this slug already exists');
      }
    }

    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async suspend(id: string, reason: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    
    tenant.status = TenantStatus.SUSPENDED;
    tenant.suspendedAt = new Date();
    tenant.suspensionReason = reason;

    return this.tenantRepository.save(tenant);
  }

  async activate(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    
    tenant.status = TenantStatus.ACTIVE;
    tenant.suspendedAt = null;
    tenant.suspensionReason = null;

    return this.tenantRepository.save(tenant);
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantRepository.softDelete(id);
  }

  async getUsageStats(id: string): Promise<any> {
    const tenant = await this.findOne(id);

    // This would typically query various usage metrics
    // For now, returning mock data structure
    return {
      tenantId: id,
      currentUsers: 0, // Would query User table
      currentEvents: 0, // Would query Event table
      currentTickets: 0, // Would query Ticket table
      storageUsed: 0, // Would calculate from file uploads
      limits: {
        maxUsers: tenant.maxUsers,
        maxEvents: tenant.maxEvents,
        maxTickets: tenant.maxTickets,
        maxStorage: tenant.maxStorage,
      },
      utilization: {
        users: 0,
        events: 0,
        tickets: 0,
        storage: 0,
      },
    };
  }

  async checkLimits(tenantId: string, resource: string, increment = 1): Promise<boolean> {
    const tenant = await this.findOne(tenantId);
    const stats = await this.getUsageStats(tenantId);

    switch (resource) {
      case 'users':
        return stats.currentUsers + increment <= tenant.maxUsers;
      case 'events':
        return stats.currentEvents + increment <= tenant.maxEvents;
      case 'tickets':
        return stats.currentTickets + increment <= tenant.maxTickets;
      case 'storage':
        return stats.storageUsed + increment <= tenant.maxStorage;
      default:
        return true;
    }
  }

  private async initializeDefaultFeatures(tenantId: string, tier: TenantTier): Promise<void> {
    const defaultFeatures = this.getDefaultFeaturesByTier(tier);

    const features = defaultFeatures.map(feature => 
      this.tenantFeatureRepository.create({
        tenantId,
        ...feature,
        isEnabled: true,
        enabledAt: new Date(),
      })
    );

    await this.tenantFeatureRepository.save(features);
  }

  private getDefaultFeaturesByTier(tier: TenantTier): any[] {
    const baseFeatures = [
      {
        featureKey: 'basic_events',
        featureName: 'Basic Event Management',
        description: 'Create and manage events',
        category: 'core',
      },
      {
        featureKey: 'basic_ticketing',
        featureName: 'Basic Ticketing',
        description: 'Sell and manage tickets',
        category: 'core',
      },
    ];

    switch (tier) {
      case TenantTier.PROFESSIONAL:
        return [
          ...baseFeatures,
          {
            featureKey: 'advanced_analytics',
            featureName: 'Advanced Analytics',
            description: 'Detailed event and sales analytics',
            category: 'analytics',
          },
          {
            featureKey: 'custom_branding',
            featureName: 'Custom Branding',
            description: 'Customize platform appearance',
            category: 'customization',
          },
        ];

      case TenantTier.ENTERPRISE:
        return [
          ...baseFeatures,
          {
            featureKey: 'advanced_analytics',
            featureName: 'Advanced Analytics',
            description: 'Detailed event and sales analytics',
            category: 'analytics',
          },
          {
            featureKey: 'custom_branding',
            featureName: 'Custom Branding',
            description: 'Customize platform appearance',
            category: 'customization',
          },
          {
            featureKey: 'api_access',
            featureName: 'API Access',
            description: 'Full API access for integrations',
            category: 'api',
          },
          {
            featureKey: 'sso_integration',
            featureName: 'SSO Integration',
            description: 'Single sign-on integration',
            category: 'security',
          },
          {
            featureKey: 'priority_support',
            featureName: 'Priority Support',
            description: '24/7 priority customer support',
            category: 'support',
          },
        ];

      default:
        return baseFeatures;
    }
  }

  private async createDefaultDomain(tenant: Tenant): Promise<void> {
    const domain = this.tenantDomainRepository.create({
      tenantId: tenant.id,
      domain: `${tenant.slug}.veritix.com`,
      type: 'subdomain',
      status: 'active',
      isPrimary: true,
      sslEnabled: true,
      verifiedAt: new Date(),
    });

    await this.tenantDomainRepository.save(domain);
  }
}
