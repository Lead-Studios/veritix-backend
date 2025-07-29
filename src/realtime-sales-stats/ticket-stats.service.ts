import { Injectable, Logger } from '@nestjs/common';
import { TicketStatsGateway } from './ticket-stats.gateway';
import { 
  TicketStatsDto, 
  TicketSaleUpdateDto, 
  TicketPurchaseDto 
} from './dto/ticket-stats.dto';

@Injectable()
export class TicketStatsService {
  private logger: Logger = new Logger('TicketStatsService');
  private eventStats = new Map<string, TicketStatsDto>(); // In-memory cache

  constructor(private ticketStatsGateway: TicketStatsGateway) {
    // Initialize with some mock data
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockStats: TicketStatsDto = {
      eventId: 'event-123',
      totalTickets: 1000,
      soldTickets: 750,
      availableTickets: 250,
      revenue: 75000,
      salesVelocity: 12.5,
      lastUpdated: new Date(),
    };
    this.eventStats.set('event-123', mockStats);
  }

  // This method would be called when a ticket is sold
  async onTicketSold(purchaseData: TicketPurchaseDto) {
    this.logger.log(`Processing ticket sale for event ${purchaseData.eventId}`);

    // Get current stats
    const currentStats = this.eventStats.get(purchaseData.eventId);
    if (!currentStats) {
      throw new Error(`Event ${purchaseData.eventId} not found`);
    }

    // Update stats
    const updatedStats: TicketStatsDto = {
      ...currentStats,
      soldTickets: currentStats.soldTickets + purchaseData.quantity,
      availableTickets: currentStats.availableTickets - purchaseData.quantity,
      revenue: currentStats.revenue + purchaseData.amount,
      salesVelocity: await this.calculateSalesVelocity(purchaseData.eventId),
      lastUpdated: new Date(),
    };

    // Update cache
    this.eventStats.set(purchaseData.eventId, updatedStats);

    // Create sale update payload
    const saleUpdate: TicketSaleUpdateDto = {
      eventId: purchaseData.eventId,
      ticketsSold: purchaseData.quantity,
      revenue: purchaseData.amount,
      timestamp: new Date(),
    };

    // Broadcast the updates
    this.ticketStatsGateway.broadcastTicketSaleUpdate(saleUpdate);
    this.ticketStatsGateway.broadcastStatsUpdate(updatedStats);

    return updatedStats;
  }

  // Get current stats for an event
  async getEventStats(eventId: string): Promise<TicketStatsDto | null> {
    return this.eventStats.get(eventId) || null;
  }

  // Method to calculate sales velocity (tickets per hour)
  private async calculateSalesVelocity(eventId: string): Promise<number> {
    // Mock implementation - in real app, calculate from database
    return Math.random() * 20; // Random velocity between 0-20
  }

  // Periodic stats update (could be called by a cron job)
  async broadcastPeriodicStatsUpdate(eventId: string) {
    const stats = this.eventStats.get(eventId);
    if (stats) {
      // Update velocity and timestamp
      stats.salesVelocity = await this.calculateSalesVelocity(eventId);
      stats.lastUpdated = new Date();
      
      this.ticketStatsGateway.broadcastStatsUpdate(stats);
    }
  }

  // Get all events stats (for testing)
  getAllEventStats(): Map<string, TicketStatsDto> {
    return new Map(this.eventStats);
  }

  // Clear stats (for testing)
  clearAllStats() {
    this.eventStats.clear();
  }
}
