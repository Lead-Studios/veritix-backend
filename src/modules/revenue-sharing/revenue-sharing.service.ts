import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevenueShareRule, RevenueShareType } from './revenue-sharing.entity';
import { Event } from '../event/event.entity';
import { User } from '../../user/user.entity';

export interface RevenueDistribution {
  stakeholderId: string;
  stakeholderEmail: string;
  amount: number;
  shareType: RevenueShareType;
  shareValue: number;
}

export interface RevenueBreakdown {
  eventId: string;
  eventName: string;
  totalRevenue: number;
  distributions: RevenueDistribution[];
}

@Injectable()
export class RevenueSharingService {
  private readonly logger = new Logger(RevenueSharingService.name);

  constructor(
    @InjectRepository(RevenueShareRule)
    private revenueShareRuleRepository: Repository<RevenueShareRule>,
  ) {}

  /**
   * Define revenue split rules for an event
   */
  async defineRevenueSplit(
    eventId: string,
    splits: { stakeholderId: string; shareType: RevenueShareType; shareValue: number }[],
  ): Promise<RevenueShareRule[]> {
    // First, deactivate existing rules for this event
    await this.revenueShareRuleRepository.update(
      { event: { id: eventId } },
      { isActive: false },
    );

    // Create new rules
    const rules = splits.map(split => {
      const rule = new RevenueShareRule();
      rule.event = { id: eventId } as Event;
      rule.stakeholder = { id: split.stakeholderId } as User;
      rule.shareType = split.shareType;
      rule.shareValue = split.shareValue;
      rule.isActive = true;
      return rule;
    });

    return this.revenueShareRuleRepository.save(rules);
  }

  /**
   * Calculate revenue distribution based on defined rules
   */
  async calculateRevenueDistribution(eventId: string, totalRevenue: number): Promise<RevenueBreakdown> {
    const rules = await this.revenueShareRuleRepository.find({
      where: { 
        event: { id: eventId },
        isActive: true,
      },
      relations: ['stakeholder'],
    });

    const distributions: RevenueDistribution[] = [];
    let distributedAmount = 0;

    for (const rule of rules) {
      let amount = 0;
      
      if (rule.shareType === RevenueShareType.PERCENTAGE) {
        amount = (totalRevenue * rule.shareValue) / 100;
      } else if (rule.shareType === RevenueShareType.FIXED_AMOUNT) {
        amount = rule.shareValue;
      }

      // Ensure we don't distribute more than the total revenue
      if (distributedAmount + amount > totalRevenue) {
        amount = totalRevenue - distributedAmount;
      }

      distributions.push({
        stakeholderId: rule.stakeholder.id,
        stakeholderEmail: rule.stakeholder.email,
        amount,
        shareType: rule.shareType,
        shareValue: rule.shareValue,
      });

      distributedAmount += amount;

      // Stop if we've distributed the full amount
      if (distributedAmount >= totalRevenue) {
        break;
      }
    }

    // If there's remaining revenue, it could be assigned to the event organizer by default
    // This would depend on business requirements

    return {
      eventId,
      eventName: '', // This would be populated with actual event data in a real implementation
      totalRevenue,
      distributions,
    };
  }

  /**
   * Distribute revenue automatically after ticket sales
   */
  async distributeRevenue(eventId: string, totalRevenue: number): Promise<RevenueBreakdown> {
    this.logger.log(`Distributing revenue for event ${eventId}, total: $${totalRevenue}`);
    
    const breakdown = await this.calculateRevenueDistribution(eventId, totalRevenue);
    
    // In a real implementation, this would integrate with a payment system
    // to actually transfer funds to stakeholders
    this.logger.log(`Revenue distribution completed for event ${eventId}`);
    
    return breakdown;
  }

  /**
   * Get revenue breakdown for dashboard
   */
  async getRevenueBreakdown(eventId: string): Promise<RevenueBreakdown> {
    // This would typically retrieve actual sales data from the database
    // For now, we'll return a mock response
    const mockTotalRevenue = 10000; // This would come from actual sales data
    
    return this.calculateRevenueDistribution(eventId, mockTotalRevenue);
  }
}