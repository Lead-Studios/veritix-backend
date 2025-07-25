mport { Injectable } from '@nestjs/common';
import { TicketStatsService } from './ticket-stats.service';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly ticketStatsService: TicketStatsService,
    // ... other dependencies
  ) {}

  async completePurchase(purchaseData: any): Promise<any> {
    // Your existing purchase logic
    const purchase = await this.createPurchase(purchaseData);
    
    // Trigger real-time update
    await this.ticketStatsService.handleTicketSale(
      purchase.ticket.eventId,
      purchase.id,
    );
    
    return purchase;
  }

  async refundPurchase(purchaseId: string): Promise<any> {
    // Your existing refund logic
    const purchase = await this.processPurchaseRefund(purchaseId);
    
    // Trigger real-time update
    await this.ticketStatsService.handleTicketRefund(
      purchase.ticket.eventId,
      purchaseId,
    );
    
    return purchase;
  }

  // Your existing methods...
  private async createPurchase(data: any) {
    // Implementation
  }

  private async processPurchaseRefund(id: string) {
    // Implementation
  }
}