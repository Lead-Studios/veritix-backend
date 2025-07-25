export interface TicketStats {
  eventId: string;
  totalTickets: number;
  soldTickets: number;
  availableTickets: number;
  revenue: number;
  salesByType: Record<string, number>;
  recentSales: RecentSale[];
  salesVelocity: number; // tickets per hour
}

export interface RecentSale {
  id: string;
  ticketType: string;
  quantity: number;
  amount: number;
  timestamp: Date;
  buyerEmail?: string;
}

export interface TicketStatsUpdate {
  eventId: string;
  type: 'SALE' | 'REFUND' | 'STATS_UPDATE';
  data: Partial<TicketStats>;
  timestamp: Date;
}
