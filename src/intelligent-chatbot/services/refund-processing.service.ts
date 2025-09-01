import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund, RefundStatus, RefundReason } from '../../refunds/entities/refund.entity';
import { TicketingTicket } from '../../ticketing/entities/ticket.entity';

export interface RefundResult {
  success: boolean;
  amount?: number;
  reason?: string;
  refundId?: string;
  estimatedProcessingTime?: string;
}

export interface RefundEligibility {
  eligible: boolean;
  reason?: string;
  maxRefundAmount?: number;
  processingFee?: number;
}

@Injectable()
export class RefundProcessingService {
  constructor(
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(TicketingTicket)
    private ticketRepository: Repository<TicketingTicket>,
  ) {}

  async processAutomatedRefund(ticketId: string, userId?: string): Promise<RefundResult> {
    try {
      // Check refund eligibility
      const eligibility = await this.checkRefundEligibility(ticketId, userId);
      
      if (!eligibility.eligible) {
        return {
          success: false,
          reason: eligibility.reason,
        };
      }

      // Get ticket information
      const ticket = await this.ticketRepository.findOne({
        where: { id: ticketId },
        relations: ['event', 'purchaser'],
      });

      if (!ticket) {
        return {
          success: false,
          reason: 'Ticket not found',
        };
      }

      // Validate user ownership
      if (userId && ticket.purchaser?.id !== userId) {
        return {
          success: false,
          reason: 'You can only request refunds for your own tickets',
        };
      }

      // Create refund record
      const refund = await this.createRefundRecord(ticket, eligibility);

      // Process refund automatically if eligible
      if (this.isAutoProcessable(ticket, refund)) {
        await this.processRefund(refund.id);
        
        return {
          success: true,
          amount: refund.refundAmount,
          refundId: refund.id,
          estimatedProcessingTime: '3-5 business days',
        };
      }

      return {
        success: false,
        reason: 'Refund requires manual review. A team member will contact you within 24 hours.',
      };
    } catch (error) {
      console.error('Automated refund processing failed:', error);
      return {
        success: false,
        reason: 'Unable to process refund at this time. Please try again later.',
      };
    }
  }

  async checkRefundEligibility(ticketId: string, userId?: string): Promise<RefundEligibility> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['event'],
    });

    if (!ticket) {
      return {
        eligible: false,
        reason: 'Ticket not found',
      };
    }

    // Check if event hasn't started yet
    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
      return {
        eligible: false,
        reason: 'Refunds are not available within 24 hours of the event',
      };
    }

    // Check if already refunded
    const existingRefund = await this.refundRepository.findOne({
      where: { ticketId, status: RefundStatus.PROCESSED },
    });

    if (existingRefund) {
      return {
        eligible: false,
        reason: 'This ticket has already been refunded',
      };
    }

    // Calculate refund amount based on policy
    const refundPercentage = this.calculateRefundPercentage(hoursUntilEvent);
    const processingFee = this.calculateProcessingFee(ticket.price);
    const maxRefundAmount = (ticket.price * refundPercentage) - processingFee;

    return {
      eligible: true,
      maxRefundAmount,
      processingFee,
    };
  }

  private async createRefundRecord(ticket: any, eligibility: RefundEligibility): Promise<Refund> {
    const refund = this.refundRepository.create({
      ticketId: ticket.id,
      eventId: ticket.event.id,
      organizerId: ticket.event.organizer?.id,
      purchaserId: ticket.purchaser?.id,
      originalAmount: ticket.price,
      refundAmount: eligibility.maxRefundAmount,
      processingFee: eligibility.processingFee,
      reason: RefundReason.CUSTOMER_REQUEST,
      status: RefundStatus.PENDING,
      paymentMethod: ticket.paymentMethod || 'card',
    });

    return this.refundRepository.save(refund);
  }

  private isAutoProcessable(ticket: any, refund: Refund): boolean {
    // Auto-process if:
    // 1. Refund amount is under $500
    // 2. Event is more than 7 days away
    // 3. No previous refund requests from this user in last 30 days
    
    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return refund.refundAmount <= 500 && daysUntilEvent >= 7;
  }

  private async processRefund(refundId: string): Promise<void> {
    await this.refundRepository.update(refundId, {
      status: RefundStatus.PROCESSED,
      processedAt: new Date(),
      processedBy: 'system',
    });
  }

  private calculateRefundPercentage(hoursUntilEvent: number): number {
    if (hoursUntilEvent >= 168) return 1.0; // 7+ days: 100%
    if (hoursUntilEvent >= 72) return 0.8;  // 3-7 days: 80%
    if (hoursUntilEvent >= 24) return 0.5;  // 1-3 days: 50%
    return 0; // Less than 24 hours: 0%
  }

  private calculateProcessingFee(ticketPrice: number): number {
    // $5 processing fee or 5% of ticket price, whichever is lower
    return Math.min(5, ticketPrice * 0.05);
  }

  async getRefundStatus(ticketId: string, userId?: string): Promise<Refund | null> {
    const whereCondition: any = { ticketId };
    if (userId) {
      whereCondition.purchaserId = userId;
    }

    return this.refundRepository.findOne({
      where: whereCondition,
      relations: ['ticket'],
    });
  }

  async estimateRefundAmount(ticketId: string): Promise<{ amount: number; fee: number; percentage: number }> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['event'],
    });

    if (!ticket) {
      return { amount: 0, fee: 0, percentage: 0 };
    }

    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const percentage = this.calculateRefundPercentage(hoursUntilEvent);
    const fee = this.calculateProcessingFee(ticket.price);
    const amount = (ticket.price * percentage) - fee;

    return { amount: Math.max(0, amount), fee, percentage };
  }
}
