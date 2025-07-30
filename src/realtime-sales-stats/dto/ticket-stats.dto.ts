export interface TicketStatsDto {
  eventId: string;
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  revenue: number;
  salesVelocity: number; // tickets per hour
  lastUpdated: Date;
}

export interface TicketSaleUpdateDto {
  eventId: string;
  ticketsSold: number;
  revenue: number;
  timestamp: Date;
}

export interface EventSubscriptionDto {
  eventId: string;
}

export interface TicketPurchaseDto {
  eventId: string;
  quantity: number;
  amount: number;
  userId: string;
}
