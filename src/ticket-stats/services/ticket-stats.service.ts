import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketStats, RecentSale, TicketStatsUpdate } from '../types/ticket-stats.types';
import { TicketStatsGateway } from '../gateways/ticket-stats.gateway';

// Assuming you have these entities
import { Event } from '../entities/event.entity';
import { Ticket } from '../entities/ticket.entity';
import { Purchase } from '../entities/purchase.entity';

@Injectable()
export class TicketStatsService {
  private readonly logger = new Logger(TicketStatsService.name);

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    private ticketStatsGateway: TicketStatsGateway,
  ) {}

  async verifyOrganizerAccess(userId: string, eventId: string): Promise<boolean> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId: userId },
    });
    return !!event;
  }

  async getTicketStats(eventId: string): Promise<TicketStats> {
    // Get basic event info
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['tickets'],
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Calculate total tickets
    const totalTickets = event.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);

    // Get sold tickets count
    const soldTicketsQuery = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.ticket', 'ticket')
      .where('ticket.eventId = :eventId', { eventId })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .select('SUM(purchase.quantity)', 'soldCount')
      .addSelect('SUM(purchase.totalAmount)', 'totalRevenue')
      .getRawOne();

    const soldTickets = parseInt(soldTicketsQuery.soldCount) || 0;
    const revenue = parseFloat(soldTicketsQuery.totalRevenue) || 0;

    // Get sales by ticket type
    const salesByType = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.ticket', 'ticket')
      .where('ticket.eventId = :eventId', { eventId })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .select('ticket.name', 'ticketType')
      .addSelect('SUM(purchase.quantity)', 'count')
      .groupBy('ticket.name')
      .getRawMany();

    const salesByTypeMap = salesByType.reduce((acc, item) => {
      acc[item.ticketType] = parseInt(item.count);
      return acc;
    }, {});

    // Get recent sales (last 10)
    const recentSales = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.ticket', 'ticket')
      .leftJoin('purchase.user', 'user')
      .where('ticket.eventId = :eventId', { eventId })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .select([
        'purchase.id',
        'ticket.name',
        'purchase.quantity',
        'purchase.totalAmount',
        'purchase.createdAt',
        'user.email',
      ])
      .orderBy('purchase.createdAt', 'DESC')
      .limit(10)
      .getMany();

    const recentSalesFormatted: RecentSale[] = recentSales.map(purchase => ({
      id: purchase.id,
      ticketType: purchase.ticket.name,
      quantity: purchase.quantity,
      amount: purchase.totalAmount,
      timestamp: purchase.createdAt,
      buyerEmail: purchase.user?.email,
    }));

    // Calculate sales velocity (tickets per hour in last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSalesCount = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoin('purchase.ticket', 'ticket')
      .where('ticket.eventId = :eventId', { eventId })
      .andWhere('purchase.status = :status', { status: 'completed' })
      .andWhere('purchase.createdAt >= :since', { since: twentyFourHoursAgo })
      .select('SUM(purchase.quantity)', 'count')
      .getRawOne();

    const salesVelocity = (parseInt(recentSalesCount.count) || 0) / 24;

    return {
      eventId,
      totalTickets,
      soldTickets,
      availableTickets: totalTickets - soldTickets,
      revenue,
      salesByType: salesByTypeMap,
      recentSales: recentSalesFormatted,
      salesVelocity: Math.round(salesVelocity * 100) / 100,
    };
  }

  async handleTicketSale(eventId: string, purchaseId: string) {
    try {
      // Get updated stats
      const stats = await this.getTicketStats(eventId);
      
      // Get the specific purchase details
      const purchase = await this.purchaseRepository.findOne({
        where: { id: purchaseId },
        relations: ['ticket', 'user'],
      });

      if (!purchase) {
        this.logger.error(`Purchase ${purchaseId} not found`);
        return;
      }

      // Create update payload
      const update: TicketStatsUpdate = {
        eventId,
        type: 'SALE',
        data: {
          soldTickets: stats.soldTickets,
          availableTickets: stats.availableTickets,
          revenue: stats.revenue,
          recentSales: stats.recentSales,
          salesVelocity: stats.salesVelocity,
        },
        timestamp: new Date(),
      };

      // Broadcast to all connected clients
      await this.ticketStatsGateway.broadcastStatsUpdate(eventId, update);
      this.logger.log(`Ticket sale update broadcasted for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Error handling ticket sale: ${error.message}`);
    }
  }

  async handleTicketRefund(eventId: string, purchaseId: string) {
    try {
      const stats = await this.getTicketStats(eventId);
      
      const update: TicketStatsUpdate = {
        eventId,
        type: 'REFUND',
        data: {
          soldTickets: stats.soldTickets,
          availableTickets: stats.availableTickets,
          revenue: stats.revenue,
          recentSales: stats.recentSales,
          salesVelocity: stats.salesVelocity,
        },
        timestamp: new Date(),
      };

      await this.ticketStatsGateway.broadcastStatsUpdate(eventId, update);
      this.logger.log(`Ticket refund update broadcasted for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Error handling ticket refund: ${error.message}`);
    }
  }
}