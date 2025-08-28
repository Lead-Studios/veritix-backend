import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WebhookService } from '../services/webhook.service';
import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { RequireApiPermissions, ApiAdmin, ApiWrite } from '../decorators/api-decorators';
import { ApiPermission } from '../entities/api-key.entity';

export class CreateWebhookDto {
  url: string;
  events: string[];
  description?: string;
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  filters?: Record<string, any>;
  tenantId: string;
  userId?: string;
}

export class UpdateWebhookDto {
  url?: string;
  events?: string[];
  description?: string;
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  filters?: Record<string, any>;
}

export class TestWebhookDto {
  eventType: string;
  payload: Record<string, any>;
}

@ApiTags('API Platform - Webhooks')
@ApiBearerAuth()
@Controller('api/v1/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @ApiWrite()
  @ApiOperation({ summary: 'Create new webhook' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Webhook created successfully' })
  async create(@Body() createWebhookDto: CreateWebhookDto): Promise<Webhook> {
    return this.webhookService.create(createWebhookDto);
  }

  @Get()
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhooks retrieved successfully' })
  async findAll(
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
  ): Promise<Webhook[]> {
    return this.webhookService.findAll(tenantId, userId);
  }

  @Get(':id')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Webhook not found' })
  async findOne(@Param('id') id: string): Promise<Webhook> {
    return this.webhookService.findOne(id);
  }

  @Patch(':id')
  @ApiWrite()
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ): Promise<Webhook> {
    return this.webhookService.update(id, updateWebhookDto);
  }

  @Post(':id/activate')
  @ApiWrite()
  @ApiOperation({ summary: 'Activate webhook' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook activated successfully' })
  async activate(@Param('id') id: string): Promise<Webhook> {
    return this.webhookService.activate(id);
  }

  @Post(':id/deactivate')
  @ApiWrite()
  @ApiOperation({ summary: 'Deactivate webhook' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook deactivated successfully' })
  async deactivate(@Param('id') id: string): Promise<Webhook> {
    return this.webhookService.deactivate(id);
  }

  @Post(':id/test')
  @ApiWrite()
  @ApiOperation({ summary: 'Test webhook delivery' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook test initiated' })
  async test(
    @Param('id') id: string,
    @Body() testWebhookDto: TestWebhookDto,
  ): Promise<WebhookDelivery> {
    return this.webhookService.test(id, testWebhookDto.eventType, testWebhookDto.payload);
  }

  @Get(':id/deliveries')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get webhook delivery history' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery history retrieved' })
  async getDeliveries(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<WebhookDelivery[]> {
    return this.webhookService.getDeliveries(id, limit || 50, offset || 0);
  }

  @Get(':id/stats')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook statistics retrieved' })
  async getStats(
    @Param('id') id: string,
    @Query('days') days?: number,
  ): Promise<any> {
    return this.webhookService.getStats(id, days ? parseInt(days.toString()) : 30);
  }

  @Post(':id/deliveries/:deliveryId/retry')
  @ApiWrite()
  @ApiOperation({ summary: 'Retry failed webhook delivery' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery retry initiated' })
  async retryDelivery(
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<WebhookDelivery> {
    const webhook = await this.webhookService.findOne(id);
    const delivery = await this.webhookService.findDelivery(deliveryId);
    return this.webhookService.executeDelivery(webhook, delivery.eventType, delivery.payload);
  }

  @Delete(':id')
  @ApiAdmin()
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Webhook deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.webhookService.delete(id);
  }
}
