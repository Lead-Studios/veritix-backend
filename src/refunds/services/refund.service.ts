import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Refund, RefundStatus, RefundReason } from '../entities/refund.entity';
import { TicketingTicket } from '../../ticketing/entities/ticket.entity';
import { TicketStatus } from '../../ticketing/entities/ticket.entity';
import { TicketingEvent } from '../../ticketing/entities/event.entity';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { UpdateRefundDto } from '../dto/update-refund.dto';
import { BulkRefundDto } from '../dto/bulk-refund.dto';
import {
  RefundResponseDto,
  RefundStatsDto,
  BulkRefundResponseDto,
} from '../dto/refund-response.dto';

@Injectable()
export class RefundService {
  constructor(
    private refundRepository: Repository<Refund>,
    private ticketRepository: Repository<TicketingTicket>,
    private eventRepository: Repository<TicketingEvent>,
  ) {}

  /**
   * Create a refund request
   */
  async createRefund(
    createRefundDto: CreateRefundDto,
  ): Promise<RefundResponseDto> {
    const {
      ticketId,
      processedBy,
      refundAmount,
      processingFee = 0,
      reason,
      reasonDescription,
      internalNotes,
      customerMessage,
      autoProcess = false,
      refundPercentage,
    } = createRefundDto;

    // Get ticket with event details
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['event'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify ticket can be refunded
    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Cannot refund a cancelled ticket');
    }

    if (ticket.status === TicketStatus.EXPIRED) {
      throw new BadRequestException('Cannot refund an expired ticket');
    }

    // Check if refund already exists
    const existingRefund = await this.refundRepository.findOne({
      where: { ticketId },
    });

    if (existingRefund) {
      throw new BadRequestException(
        'Refund request already exists for this ticket',
      );
    }

    // Calculate refund amount
    let finalRefundAmount = refundAmount;
    let finalRefundPercentage = 0;

    if (refundPercentage !== undefined) {
      finalRefundAmount = (Number(ticket.pricePaid) * refundPercentage) / 100;
      finalRefundPercentage = refundPercentage;
    } else if (finalRefundAmount === undefined) {
      // Full refund by default
      finalRefundAmount = Number(ticket.pricePaid);
      finalRefundPercentage = 100;
    } else {
      finalRefundPercentage = Math.round(
        (finalRefundAmount / Number(ticket.pricePaid)) * 100,
      );
    }

    // Validate refund amount
    if (finalRefundAmount > Number(ticket.pricePaid)) {
      throw new BadRequestException(
        'Refund amount cannot exceed original ticket price',
      );
    }

    if (finalRefundAmount < 0) {
      throw new BadRequestException('Refund amount cannot be negative');
    }

    // Create refund record
    const refund = this.refundRepository.create({
      ticketId,
      eventId: ticket.eventId,
      organizerId: ticket.event.organizerId,
      purchaserId: ticket.purchaserId,
      originalAmount: Number(ticket.pricePaid),
      refundAmount: finalRefundAmount,
      processingFee,
      reason,
      reasonDescription,
      status: autoProcess ? RefundStatus.APPROVED : RefundStatus.PENDING,
      processedBy,
      processedAt: autoProcess ? new Date() : undefined,
      internalNotes,
      customerMessage,
      isPartialRefund: finalRefundPercentage < 100,
      refundPercentage: finalRefundPercentage,
    });

    const savedRefund = await this.refundRepository.save(refund);

    // If auto-processing, update ticket status
    if (autoProcess) {
      await this.processRefundTicket(ticket, savedRefund);
    }

    return this.mapToResponseDto(savedRefund, ticket);
  }

  /**
   * Process a pending refund
   */
  async processRefund(
    refundId: string,
    updateDto: UpdateRefundDto,
  ): Promise<RefundResponseDto> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['ticket', 'ticket.event'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (
      refund.status !== RefundStatus.PENDING &&
      refund.status !== RefundStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Refund has already been processed or rejected',
      );
    }

    // Update refund details
    Object.assign(refund, updateDto);

    if (updateDto.status === RefundStatus.PROCESSED) {
      refund.processedAt = new Date();
      await this.processRefundTicket(refund.ticket, refund);
    } else if (updateDto.status === RefundStatus.REJECTED) {
      refund.processedAt = new Date();
    }

    const updatedRefund = await this.refundRepository.save(refund);
    return this.mapToResponseDto(updatedRefund, refund.ticket);
  }

  /**
   * Process bulk refunds
   */
  async processBulkRefunds(
    bulkRefundDto: BulkRefundDto,
  ): Promise<BulkRefundResponseDto> {
    const {
      ticketIds,
      processedBy,
      refundPercentage = 100,
      processingFee = 0,
      reason,
      reasonDescription,
      internalNotes,
      customerMessage,
      autoProcess = false,
    } = bulkRefundDto;

    const processedRefunds: RefundResponseDto[] = [];
    const failedRefunds: Array<{ ticketId: string; error: string }> = [];
    let totalAmount = 0;

    for (const ticketId of ticketIds) {
      try {
        const refundDto: CreateRefundDto = {
          ticketId,
          processedBy,
          refundPercentage,
          processingFee,
          reason,
          reasonDescription,
          internalNotes,
          customerMessage,
          autoProcess,
        };

        const refund = await this.createRefund(refundDto);
        processedRefunds.push(refund);
        totalAmount += refund.refundAmount;
      } catch (error) {
        failedRefunds.push({
          ticketId,
          error: error.message,
        });
      }
    }

    return {
      success: failedRefunds.length === 0,
      message: `Processed ${processedRefunds.length} refunds, ${failedRefunds.length} failed`,
      processedRefunds,
      failedRefunds,
      totalAmount,
    };
  }

  /**
   * Get refund by ID
   */
  async getRefund(refundId: string): Promise<RefundResponseDto> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['ticket', 'ticket.event'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return this.mapToResponseDto(refund, refund.ticket);
  }

  /**
   * Get refunds by event (for organizers)
   */
  async getRefundsByEvent(
    eventId: string,
    organizerId: string,
  ): Promise<RefundResponseDto[]> {
    // Verify organizer owns the event
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
    });

    if (!event) {
      throw new ForbiddenException(
        "You don't have permission to view refunds for this event",
      );
    }

    const refunds = await this.refundRepository.find({
      where: { eventId },
      relations: ['ticket', 'ticket.event'],
      order: { createdAt: 'DESC' },
    });

    return refunds.map((refund) =>
      this.mapToResponseDto(refund, refund.ticket),
    );
  }

  /**
   * Get refunds by purchaser
   */
  async getRefundsByPurchaser(
    purchaserId: string,
  ): Promise<RefundResponseDto[]> {
    const refunds = await this.refundRepository.find({
      where: { purchaserId },
      relations: ['ticket', 'ticket.event'],
      order: { createdAt: 'DESC' },
    });

    return refunds.map((refund) =>
      this.mapToResponseDto(refund, refund.ticket),
    );
  }

  /**
   * Get refund statistics for an event
   */
  async getRefundStats(
    eventId: string,
    organizerId: string,
  ): Promise<RefundStatsDto> {
    // Verify organizer owns the event
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
    });

    if (!event) {
      throw new ForbiddenException(
        "You don't have permission to view refund stats for this event",
      );
    }

    const refunds = await this.refundRepository.find({
      where: { eventId },
    });

    const totalRefunds = refunds.length;
    const totalRefundAmount = refunds.reduce(
      (sum, refund) => sum + Number(refund.refundAmount),
      0,
    );
    const pendingRefunds = refunds.filter(
      (r) => r.status === RefundStatus.PENDING,
    ).length;
    const processedRefunds = refunds.filter(
      (r) => r.status === RefundStatus.PROCESSED,
    ).length;
    const rejectedRefunds = refunds.filter(
      (r) => r.status === RefundStatus.REJECTED,
    ).length;
    const averageRefundAmount =
      totalRefunds > 0 ? totalRefundAmount / totalRefunds : 0;

    // Group by reason
    const refundsByReason = refunds.reduce(
      (acc, refund) => {
        acc[refund.reason] = (acc[refund.reason] || 0) + 1;
        return acc;
      },
      {} as Record<RefundReason, number>,
    );

    // Group by status
    const refundsByStatus = refunds.reduce(
      (acc, refund) => {
        acc[refund.status] = (acc[refund.status] || 0) + 1;
        return acc;
      },
      {} as Record<RefundStatus, number>,
    );

    return {
      totalRefunds,
      totalRefundAmount,
      pendingRefunds,
      processedRefunds,
      rejectedRefunds,
      averageRefundAmount,
      refundsByReason,
      refundsByStatus,
    };
  }

  /**
   * Cancel a refund request (only if pending)
   */
  async cancelRefund(
    refundId: string,
    requesterId: string,
  ): Promise<{ success: boolean; message: string }> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['ticket', 'ticket.event'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    // Only organizer or purchaser can cancel
    if (
      refund.purchaserId !== requesterId &&
      refund.ticket.event.organizerId !== requesterId
    ) {
      throw new ForbiddenException(
        "You don't have permission to cancel this refund",
      );
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending refund requests');
    }

    await this.refundRepository.remove(refund);

    return {
      success: true,
      message: 'Refund request cancelled successfully',
    };
  }

  /**
   * Process refund for event cancellation
   */
  async processEventCancellationRefunds(
    eventId: string,
    organizerId: string,
    refundPercentage = 100,
    processingFee = 0,
  ): Promise<BulkRefundResponseDto> {
    // Verify organizer owns the event
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
    });

    if (!event) {
      throw new ForbiddenException(
        "You don't have permission to process refunds for this event",
      );
    }

    // Get all active tickets for the event
    const tickets = await this.ticketRepository.find({
      where: { eventId, status: TicketStatus.ACTIVE },
    });

    if (tickets.length === 0) {
      return {
        success: true,
        message: 'No active tickets found for refund',
        processedRefunds: [],
        failedRefunds: [],
        totalAmount: 0,
      };
    }

    const ticketIds = tickets.map((ticket) => ticket.id);

    return await this.processBulkRefunds({
      ticketIds,
      processedBy: organizerId,
      refundPercentage,
      processingFee,
      reason: RefundReason.EVENT_CANCELLED,
      reasonDescription: `Event "${event.name}" has been cancelled`,
      customerMessage: `We apologize for the inconvenience. Your ticket for "${event.name}" has been refunded due to event cancellation.`,
      autoProcess: true,
    });
  }

  /**
   * Helper method to process ticket status after refund
   */
  private async processRefundTicket(
    ticket: TicketingTicket,
    refund: Refund,
  ): Promise<void> {
    // Mark ticket as cancelled if full refund, or keep as refunded for partial
    if (refund.refundPercentage === 100) {
      ticket.status = TicketStatus.CANCELLED;
    }
    // Note: We could add a REFUNDED status to TicketStatus enum if needed

    await this.ticketRepository.save(ticket);
  }

  /**
   * Helper method to map refund entity to response DTO
   */
  private mapToResponseDto(
    refund: Refund,
    ticket: TicketingTicket,
  ): RefundResponseDto {
    return {
      id: refund.id,
      ticketId: refund.ticketId,
      ticketNumber: ticket.ticketNumber,
      eventId: refund.eventId,
      eventName: ticket.event?.name || 'Unknown Event',
      purchaserId: refund.purchaserId,
      purchaserName: ticket.purchaserName,
      purchaserEmail: ticket.purchaserEmail,
      originalAmount: Number(refund.originalAmount),
      refundAmount: Number(refund.refundAmount),
      processingFee: Number(refund.processingFee),
      reason: refund.reason,
      reasonDescription: refund.reasonDescription,
      status: refund.status,
      processedBy: refund.processedBy,
      processedAt: refund.processedAt,
      refundTransactionId: refund.refundTransactionId,
      internalNotes: refund.internalNotes,
      customerMessage: refund.customerMessage,
      isPartialRefund: refund.isPartialRefund,
      refundPercentage: refund.refundPercentage,
      createdAt: refund.createdAt,
    };
  }
}
