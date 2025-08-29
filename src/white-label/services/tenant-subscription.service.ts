import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSubscription, SubscriptionStatus, BillingCycle } from '../entities/tenant-subscription.entity';

export interface CreateSubscriptionDto {
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  amount: number;
  currency?: string;
  features?: string[];
  limits?: Record<string, number>;
  quantity?: number;
  discountPercent?: number;
  discountAmount?: number;
  couponCode?: string;
  trialDays?: number;
}

@Injectable()
export class TenantSubscriptionService {
  constructor(
    @InjectRepository(TenantSubscription)
    private subscriptionRepository: Repository<TenantSubscription>,
  ) {}

  async create(tenantId: string, createDto: CreateSubscriptionDto): Promise<TenantSubscription> {
    // Cancel any existing active subscriptions
    await this.cancelActiveSubscriptions(tenantId);

    const now = new Date();
    const currentPeriodStart = new Date(now);
    const currentPeriodEnd = this.calculatePeriodEnd(currentPeriodStart, createDto.billingCycle);

    let trialStart: Date | null = null;
    let trialEnd: Date | null = null;
    let status = SubscriptionStatus.ACTIVE;

    if (createDto.trialDays && createDto.trialDays > 0) {
      trialStart = new Date(now);
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + createDto.trialDays);
      status = SubscriptionStatus.TRIAL;
    }

    const subscription = this.subscriptionRepository.create({
      tenantId,
      planId: createDto.planId,
      planName: createDto.planName,
      status,
      billingCycle: createDto.billingCycle,
      amount: createDto.amount,
      currency: createDto.currency || 'USD',
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      features: createDto.features || [],
      limits: createDto.limits || {},
      quantity: createDto.quantity || 1,
      discountPercent: createDto.discountPercent,
      discountAmount: createDto.discountAmount,
      couponCode: createDto.couponCode,
    });

    return this.subscriptionRepository.save(subscription);
  }

  async findByTenant(tenantId: string): Promise<TenantSubscription[]> {
    return this.subscriptionRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    return this.subscriptionRepository.findOne({
      where: { 
        tenantId, 
        status: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] as any 
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TenantSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async update(id: string, updateData: Partial<CreateSubscriptionDto>): Promise<TenantSubscription> {
    const subscription = await this.findOne(id);
    
    Object.assign(subscription, updateData);
    return this.subscriptionRepository.save(subscription);
  }

  async cancel(id: string, reason?: string): Promise<TenantSubscription> {
    const subscription = await this.findOne(id);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;

    return this.subscriptionRepository.save(subscription);
  }

  async suspend(id: string): Promise<TenantSubscription> {
    const subscription = await this.findOne(id);

    subscription.status = SubscriptionStatus.SUSPENDED;
    return this.subscriptionRepository.save(subscription);
  }

  async reactivate(id: string): Promise<TenantSubscription> {
    const subscription = await this.findOne(id);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Cannot reactivate cancelled subscription');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    return this.subscriptionRepository.save(subscription);
  }

  async renewSubscription(id: string): Promise<TenantSubscription> {
    const subscription = await this.findOne(id);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be renewed');
    }

    const newPeriodStart = subscription.currentPeriodEnd;
    const newPeriodEnd = this.calculatePeriodEnd(newPeriodStart, subscription.billingCycle);

    subscription.currentPeriodStart = newPeriodStart;
    subscription.currentPeriodEnd = newPeriodEnd;

    return this.subscriptionRepository.save(subscription);
  }

  async checkExpiredTrials(): Promise<TenantSubscription[]> {
    const now = new Date();
    
    const expiredTrials = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.TRIAL,
      },
    });

    const expired = expiredTrials.filter(sub => 
      sub.trialEnd && sub.trialEnd < now
    );

    // Update expired trials
    for (const subscription of expired) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(subscription);
    }

    return expired;
  }

  async checkExpiredSubscriptions(): Promise<TenantSubscription[]> {
    const now = new Date();
    
    const activeSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const expired = activeSubscriptions.filter(sub => 
      sub.currentPeriodEnd < now
    );

    // Update expired subscriptions
    for (const subscription of expired) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(subscription);
    }

    return expired;
  }

  async getSubscriptionMetrics(tenantId?: string): Promise<any> {
    const queryBuilder = this.subscriptionRepository.createQueryBuilder('subscription');

    if (tenantId) {
      queryBuilder.where('subscription.tenantId = :tenantId', { tenantId });
    }

    const total = await queryBuilder.getCount();
    
    const statusCounts = await queryBuilder
      .select('subscription.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('subscription.status')
      .getRawMany();

    const revenueData = await queryBuilder
      .select('SUM(subscription.amount * subscription.quantity)', 'totalRevenue')
      .addSelect('AVG(subscription.amount * subscription.quantity)', 'avgRevenue')
      .getRawOne();

    return {
      total,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      revenue: {
        total: parseFloat(revenueData.totalRevenue) || 0,
        average: parseFloat(revenueData.avgRevenue) || 0,
      },
    };
  }

  private async cancelActiveSubscriptions(tenantId: string): Promise<void> {
    await this.subscriptionRepository.update(
      { 
        tenantId, 
        status: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] as any 
      },
      { 
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Replaced by new subscription',
      }
    );
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);

    switch (cycle) {
      case BillingCycle.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        end.setMonth(end.getMonth() + 3);
        break;
      case BillingCycle.YEARLY:
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1); // Default to monthly
    }

    return end;
  }
}
