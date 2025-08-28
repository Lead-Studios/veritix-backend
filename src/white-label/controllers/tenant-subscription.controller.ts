import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantSubscriptionService, CreateSubscriptionDto } from '../services/tenant-subscription.service';
import { TenantSubscription } from '../entities/tenant-subscription.entity';

@ApiTags('White Label - Subscriptions')
@ApiBearerAuth()
@Controller('white-label/tenants/:tenantId/subscriptions')
export class TenantSubscriptionController {
  constructor(private readonly subscriptionService: TenantSubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create tenant subscription' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Subscription created successfully', type: TenantSubscription })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<TenantSubscription> {
    return this.subscriptionService.create(tenantId, createSubscriptionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscriptions retrieved', type: [TenantSubscription] })
  async findAll(@Param('tenantId') tenantId: string): Promise<TenantSubscription[]> {
    return this.subscriptionService.findByTenant(tenantId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active subscription for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active subscription retrieved', type: TenantSubscription })
  async findActive(@Param('tenantId') tenantId: string): Promise<TenantSubscription | null> {
    return this.subscriptionService.findActiveTenantSubscription(tenantId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get subscription metrics for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription metrics retrieved' })
  async getMetrics(@Param('tenantId') tenantId: string): Promise<any> {
    return this.subscriptionService.getSubscriptionMetrics(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription found', type: TenantSubscription })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  async findOne(@Param('id') id: string): Promise<TenantSubscription> {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription updated successfully', type: TenantSubscription })
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateSubscriptionDto>,
  ): Promise<TenantSubscription> {
    return this.subscriptionService.update(id, updateData);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription cancelled successfully', type: TenantSubscription })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<TenantSubscription> {
    return this.subscriptionService.cancel(id, reason);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend subscription' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription suspended successfully', type: TenantSubscription })
  async suspend(@Param('id') id: string): Promise<TenantSubscription> {
    return this.subscriptionService.suspend(id);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate subscription' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription reactivated successfully', type: TenantSubscription })
  async reactivate(@Param('id') id: string): Promise<TenantSubscription> {
    return this.subscriptionService.reactivate(id);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew subscription' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription renewed successfully', type: TenantSubscription })
  async renew(@Param('id') id: string): Promise<TenantSubscription> {
    return this.subscriptionService.renewSubscription(id);
  }
}

@ApiTags('White Label - Subscription Management')
@ApiBearerAuth()
@Controller('white-label/subscriptions')
export class SubscriptionManagementController {
  constructor(private readonly subscriptionService: TenantSubscriptionService) {}

  @Get('expired-trials')
  @ApiOperation({ summary: 'Get expired trial subscriptions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expired trials retrieved', type: [TenantSubscription] })
  async getExpiredTrials(): Promise<TenantSubscription[]> {
    return this.subscriptionService.checkExpiredTrials();
  }

  @Get('expired')
  @ApiOperation({ summary: 'Get expired subscriptions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expired subscriptions retrieved', type: [TenantSubscription] })
  async getExpiredSubscriptions(): Promise<TenantSubscription[]> {
    return this.subscriptionService.checkExpiredSubscriptions();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get global subscription metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Global metrics retrieved' })
  async getGlobalMetrics(): Promise<any> {
    return this.subscriptionService.getSubscriptionMetrics();
  }
}
