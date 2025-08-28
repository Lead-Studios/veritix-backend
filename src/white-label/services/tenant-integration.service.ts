import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantIntegration, IntegrationType, IntegrationStatus } from '../entities/tenant-integration.entity';

export interface CreateIntegrationDto {
  name: string;
  type: IntegrationType;
  description?: string;
  config?: Record<string, any>;
  credentials?: Record<string, any>;
  endpoints?: Record<string, string>;
  headers?: Record<string, string>;
}

@Injectable()
export class TenantIntegrationService {
  constructor(
    @InjectRepository(TenantIntegration)
    private integrationRepository: Repository<TenantIntegration>,
  ) {}

  async create(tenantId: string, createDto: CreateIntegrationDto): Promise<TenantIntegration> {
    // Encrypt sensitive credentials before storing
    const encryptedCredentials = this.encryptCredentials(createDto.credentials);

    const integration = this.integrationRepository.create({
      ...createDto,
      tenantId,
      credentials: encryptedCredentials,
      status: IntegrationStatus.PENDING,
    });

    const savedIntegration = await this.integrationRepository.save(integration);

    // Test the integration after creation
    await this.testIntegration(savedIntegration.id);

    return this.findOne(savedIntegration.id);
  }

  async findByTenant(tenantId: string): Promise<TenantIntegration[]> {
    const integrations = await this.integrationRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    // Remove sensitive credentials from response
    return integrations.map(integration => ({
      ...integration,
      credentials: this.maskCredentials(integration.credentials),
    }));
  }

  async findByType(tenantId: string, type: IntegrationType): Promise<TenantIntegration[]> {
    const integrations = await this.integrationRepository.find({
      where: { tenantId, type },
      order: { createdAt: 'DESC' },
    });

    return integrations.map(integration => ({
      ...integration,
      credentials: this.maskCredentials(integration.credentials),
    }));
  }

  async findOne(id: string): Promise<TenantIntegration> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return {
      ...integration,
      credentials: this.maskCredentials(integration.credentials),
    };
  }

  async update(id: string, updateData: Partial<CreateIntegrationDto>): Promise<TenantIntegration> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Encrypt new credentials if provided
    if (updateData.credentials) {
      updateData.credentials = this.encryptCredentials(updateData.credentials);
    }

    Object.assign(integration, updateData);
    await this.integrationRepository.save(integration);

    // Test integration after update
    await this.testIntegration(id);

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    await this.integrationRepository.remove(integration);
  }

  async testIntegration(id: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    try {
      const result = await this.performIntegrationTest(integration);
      
      if (result.success) {
        integration.status = IntegrationStatus.ACTIVE;
        integration.lastSuccessAt = new Date();
        integration.retryCount = 0;
        integration.lastError = null;
      } else {
        integration.status = IntegrationStatus.ERROR;
        integration.lastErrorAt = new Date();
        integration.lastError = result.message;
        integration.retryCount += 1;
      }

      await this.integrationRepository.save(integration);
      return result;
    } catch (error) {
      integration.status = IntegrationStatus.ERROR;
      integration.lastErrorAt = new Date();
      integration.lastError = error.message;
      integration.retryCount += 1;

      await this.integrationRepository.save(integration);
      return { success: false, message: error.message };
    }
  }

  async executeWebhook(tenantId: string, event: string, payload: any): Promise<void> {
    const webhooks = await this.integrationRepository.find({
      where: { 
        tenantId, 
        type: IntegrationType.WEBHOOK,
        status: IntegrationStatus.ACTIVE,
      },
    });

    for (const webhook of webhooks) {
      try {
        await this.sendWebhookRequest(webhook, event, payload);
        
        webhook.lastSuccessAt = new Date();
        webhook.retryCount = 0;
        await this.integrationRepository.save(webhook);
      } catch (error) {
        webhook.lastErrorAt = new Date();
        webhook.lastError = error.message;
        webhook.retryCount += 1;

        if (webhook.retryCount >= 3) {
          webhook.status = IntegrationStatus.ERROR;
        }

        await this.integrationRepository.save(webhook);
      }
    }
  }

  async getIntegrationMetrics(tenantId?: string): Promise<any> {
    const queryBuilder = this.integrationRepository.createQueryBuilder('integration');

    if (tenantId) {
      queryBuilder.where('integration.tenantId = :tenantId', { tenantId });
    }

    const total = await queryBuilder.getCount();
    
    const statusCounts = await queryBuilder
      .select('integration.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('integration.status')
      .getRawMany();

    const typeCounts = await queryBuilder
      .select('integration.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('integration.type')
      .getRawMany();

    const errorRate = await queryBuilder
      .select('AVG(integration.retryCount)', 'avgRetries')
      .addSelect('COUNT(CASE WHEN integration.status = :errorStatus THEN 1 END)', 'errorCount')
      .setParameter('errorStatus', IntegrationStatus.ERROR)
      .getRawOne();

    return {
      total,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      typeBreakdown: typeCounts.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      errorRate: {
        averageRetries: parseFloat(errorRate.avgRetries) || 0,
        errorCount: parseInt(errorRate.errorCount) || 0,
        errorPercentage: total > 0 ? (parseInt(errorRate.errorCount) / total) * 100 : 0,
      },
    };
  }

  private async performIntegrationTest(integration: TenantIntegration): Promise<{ success: boolean; message: string }> {
    const decryptedCredentials = this.decryptCredentials(integration.credentials);

    switch (integration.type) {
      case IntegrationType.WEBHOOK:
        return this.testWebhook(integration, decryptedCredentials);
      
      case IntegrationType.API_KEY:
        return this.testApiKey(integration, decryptedCredentials);
      
      case IntegrationType.OAUTH:
        return this.testOAuth(integration, decryptedCredentials);
      
      case IntegrationType.SSO:
        return this.testSSO(integration, decryptedCredentials);
      
      default:
        return { success: true, message: 'Integration type does not require testing' };
    }
  }

  private async testWebhook(integration: TenantIntegration, credentials: any): Promise<{ success: boolean; message: string }> {
    try {
      const testPayload = { test: true, timestamp: new Date().toISOString() };
      await this.sendWebhookRequest(integration, 'test', testPayload);
      return { success: true, message: 'Webhook test successful' };
    } catch (error) {
      return { success: false, message: `Webhook test failed: ${error.message}` };
    }
  }

  private async testApiKey(integration: TenantIntegration, credentials: any): Promise<{ success: boolean; message: string }> {
    // Simulate API key validation
    if (!credentials?.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    // In real implementation, this would make an actual API call to validate the key
    return { success: true, message: 'API key is valid' };
  }

  private async testOAuth(integration: TenantIntegration, credentials: any): Promise<{ success: boolean; message: string }> {
    // Simulate OAuth token validation
    if (!credentials?.accessToken) {
      return { success: false, message: 'OAuth access token is required' };
    }

    // In real implementation, this would validate the OAuth token
    return { success: true, message: 'OAuth token is valid' };
  }

  private async testSSO(integration: TenantIntegration, credentials: any): Promise<{ success: boolean; message: string }> {
    // Simulate SSO configuration validation
    if (!credentials?.ssoUrl || !credentials?.certificate) {
      return { success: false, message: 'SSO URL and certificate are required' };
    }

    // In real implementation, this would validate SSO configuration
    return { success: true, message: 'SSO configuration is valid' };
  }

  private async sendWebhookRequest(webhook: TenantIntegration, event: string, payload: any): Promise<void> {
    const url = webhook.endpoints?.webhook;
    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    // In real implementation, this would use a proper HTTP client
    // For now, we'll simulate the request
    console.log(`Sending webhook to ${url}:`, { event, payload });
  }

  private encryptCredentials(credentials: Record<string, any> | undefined): Record<string, any> | undefined {
    if (!credentials) return undefined;

    // In real implementation, this would use proper encryption
    // For now, we'll just return the credentials as-is (NOT SECURE)
    return credentials;
  }

  private decryptCredentials(credentials: Record<string, any> | undefined): Record<string, any> | undefined {
    if (!credentials) return undefined;

    // In real implementation, this would decrypt the credentials
    // For now, we'll just return the credentials as-is
    return credentials;
  }

  private maskCredentials(credentials: Record<string, any> | undefined): Record<string, any> | undefined {
    if (!credentials) return undefined;

    const masked: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && value.length > 4) {
        masked[key] = value.substring(0, 4) + '*'.repeat(value.length - 4);
      } else {
        masked[key] = '****';
      }
    }

    return masked;
  }
}
