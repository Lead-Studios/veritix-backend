import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { Webhook, WebhookStatus, WebhookEvent } from '../entities/webhook.entity';
import { WebhookDelivery, DeliveryStatus } from '../entities/webhook-delivery.entity';

export interface CreateWebhookDto {
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  timeoutMs?: number;
  verifySSL?: boolean;
  filters?: Record<string, any>;
  tenantId?: string;
  apiKeyId?: string;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: any;
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
    private httpService: HttpService,
  ) {}

  async create(createDto: CreateWebhookDto): Promise<Webhook> {
    // Validate webhook URL
    if (!this.isValidUrl(createDto.url)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    // Generate secret if not provided
    const secret = createDto.secret || this.generateSecret();

    const webhook = this.webhookRepository.create({
      ...createDto,
      secret,
      maxRetries: createDto.maxRetries || 3,
      timeoutMs: createDto.timeoutMs || 30000,
      verifySSL: createDto.verifySSL !== false,
    });

    const savedWebhook = await this.webhookRepository.save(webhook);

    // Test webhook after creation
    await this.testWebhook(savedWebhook.id);

    return savedWebhook;
  }

  async findAll(tenantId?: string, apiKeyId?: string): Promise<Webhook[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (apiKeyId) where.apiKeyId = apiKeyId;

    return this.webhookRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id },
      relations: ['deliveries'],
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async update(id: string, updateDto: Partial<CreateWebhookDto>): Promise<Webhook> {
    const webhook = await this.findOne(id);

    if (updateDto.url && !this.isValidUrl(updateDto.url)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    Object.assign(webhook, updateDto);
    return this.webhookRepository.save(webhook);
  }

  async delete(id: string): Promise<void> {
    const webhook = await this.findOne(id);
    await this.webhookRepository.remove(webhook);
  }

  async activate(id: string): Promise<Webhook> {
    const webhook = await this.findOne(id);
    webhook.status = WebhookStatus.ACTIVE;
    return this.webhookRepository.save(webhook);
  }

  async deactivate(id: string): Promise<Webhook> {
    const webhook = await this.findOne(id);
    webhook.status = WebhookStatus.INACTIVE;
    return this.webhookRepository.save(webhook);
  }

  async testWebhook(id: string): Promise<{ success: boolean; message: string; delivery?: WebhookDelivery }> {
    const webhook = await this.findOne(id);

    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: WebhookEvent.CUSTOM,
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook delivery',
      },
      tenantId: webhook.tenantId,
    };

    try {
      const delivery = await this.deliverWebhook(webhook, testPayload, 'webhook.test');
      return {
        success: delivery.status === DeliveryStatus.SUCCESS,
        message: delivery.status === DeliveryStatus.SUCCESS ? 'Webhook test successful' : delivery.errorMessage || 'Test failed',
        delivery,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async triggerWebhook(
    event: WebhookEvent,
    eventId: string,
    data: any,
    tenantId?: string,
    userId?: string,
  ): Promise<void> {
    const webhooks = await this.getActiveWebhooksForEvent(event, tenantId);

    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
      tenantId,
      userId,
    };

    // Deliver webhooks asynchronously
    const deliveryPromises = webhooks.map(webhook => 
      this.deliverWebhook(webhook, payload, eventId).catch(error => {
        console.error(`Webhook delivery failed for ${webhook.id}:`, error);
      })
    );

    await Promise.allSettled(deliveryPromises);
  }

  async retryFailedDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
      relations: ['webhook'],
    });

    if (!delivery) {
      throw new NotFoundException('Webhook delivery not found');
    }

    if (delivery.status === DeliveryStatus.SUCCESS) {
      throw new BadRequestException('Delivery already succeeded');
    }

    if (delivery.attemptCount >= delivery.webhook.maxRetries) {
      throw new BadRequestException('Maximum retry attempts exceeded');
    }

    return this.executeDelivery(delivery.webhook, delivery);
  }

  async getDeliveryHistory(
    webhookId?: string,
    tenantId?: string,
    status?: DeliveryStatus,
    limit = 50,
  ): Promise<WebhookDelivery[]> {
    const queryBuilder = this.deliveryRepository.createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.webhook', 'webhook')
      .orderBy('delivery.createdAt', 'DESC')
      .limit(limit);

    if (webhookId) {
      queryBuilder.where('delivery.webhookId = :webhookId', { webhookId });
    }

    if (tenantId) {
      queryBuilder.andWhere('webhook.tenantId = :tenantId', { tenantId });
    }

    if (status) {
      queryBuilder.andWhere('delivery.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  async getWebhookStats(webhookId: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
    successRate: number;
    recentDeliveries: WebhookDelivery[];
  }> {
    const deliveries = await this.deliveryRepository.find({
      where: { webhookId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const totalDeliveries = deliveries.length;
    const successfulDeliveries = deliveries.filter(d => d.status === DeliveryStatus.SUCCESS).length;
    const failedDeliveries = totalDeliveries - successfulDeliveries;
    
    const responseTimes = deliveries
      .filter(d => d.responseTime)
      .map(d => Number(d.responseTime));
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      averageResponseTime,
      successRate,
      recentDeliveries: deliveries.slice(0, 10),
    };
  }

  private async getActiveWebhooksForEvent(event: WebhookEvent, tenantId?: string): Promise<Webhook[]> {
    const queryBuilder = this.webhookRepository.createQueryBuilder('webhook')
      .where('webhook.status = :status', { status: WebhookStatus.ACTIVE })
      .andWhere(':event = ANY(webhook.events)', { event });

    if (tenantId) {
      queryBuilder.andWhere('webhook.tenantId = :tenantId', { tenantId });
    }

    return queryBuilder.getMany();
  }

  private async deliverWebhook(
    webhook: Webhook,
    payload: WebhookPayload,
    eventId: string,
  ): Promise<WebhookDelivery> {
    // Check if webhook should be triggered based on filters
    if (!this.shouldTriggerWebhook(webhook, payload)) {
      return null;
    }

    const delivery = this.deliveryRepository.create({
      webhookId: webhook.id,
      eventType: payload.event,
      eventId,
      payload: payload.data,
      status: DeliveryStatus.PENDING,
    });

    const savedDelivery = await this.deliveryRepository.save(delivery);
    return this.executeDelivery(webhook, eventType, payload);
  }

  async executeDelivery(webhook: Webhook, delivery: WebhookDelivery): Promise<WebhookDelivery> {
    const startTime = Date.now();
    
    try {
      delivery.attemptCount += 1;
      delivery.status = DeliveryStatus.RETRYING;

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Veritix-Webhooks/1.0',
        'X-Webhook-ID': webhook.id,
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Timestamp': new Date().toISOString(),
        ...webhook.headers,
      };

      // Add signature if secret is provided
      if (webhook.secret) {
        const signature = this.generateSignature(delivery.payload, webhook.secret);
        headers['X-Webhook-Signature'] = signature;
        delivery.signature = signature;
      }

      delivery.requestHeaders = headers;

      // Make HTTP request
      const response = await this.httpService.axiosRef.post(
        webhook.url,
        delivery.payload,
        {
          headers,
          timeout: webhook.timeoutMs,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        }
      );

      const responseTime = Date.now() - startTime;

      // Update delivery record
      delivery.status = response.status < 400 ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED;
      delivery.httpStatus = response.status;
      delivery.responseTime = BigInt(responseTime);
      delivery.response = JSON.stringify(response.data).substring(0, 10000); // Limit response size
      delivery.responseHeaders = response.headers;
      delivery.deliveredAt = new Date();

      if (delivery.status === DeliveryStatus.SUCCESS) {
        // Update webhook success count
        webhook.successCount += 1;
        webhook.lastTriggeredAt = new Date();
      } else {
        delivery.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        webhook.failureCount += 1;
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      delivery.status = DeliveryStatus.FAILED;
      delivery.responseTime = BigInt(responseTime);
      delivery.errorMessage = error.message;
      webhook.failureCount += 1;

      // Schedule retry if attempts remaining
      if (delivery.attemptCount < webhook.maxRetries) {
        delivery.nextRetryAt = this.calculateNextRetry(delivery.attemptCount);
      }
    }

    // Save updates
    await Promise.all([
      this.deliveryRepository.save(delivery),
      this.webhookRepository.save(webhook),
    ]);

    return delivery;
  }

  shouldTriggerWebhook(webhook: Webhook, eventType: string, payload: any): boolean {
    if (!webhook.filters) {
      return true;
    }

    // Simple filter matching - can be extended for complex conditions
    for (const [key, expectedValue] of Object.entries(webhook.filters)) {
      const actualValue = this.getNestedValue(payload, key);
      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  generateSignature(payload: any, secret: string): string {
    const body = JSON.stringify(payload);
    return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private calculateNextRetry(attemptCount: number): Date {
    // Exponential backoff: 2^attempt minutes
    const delayMinutes = Math.pow(2, attemptCount);
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
