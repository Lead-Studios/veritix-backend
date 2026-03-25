/** Breakdown of user counts. */
export interface UserStats {
  total: number;
  verified: number;
  byRole: {
    subscriber: number;
    organizer: number;
    admin: number;
  };
}

/** Breakdown of event counts by status. */
export interface EventStats {
  total: number;
  byStatus: {
    draft: number;
    published: number;
    cancelled: number;
    completed: number;
    postponed: number;
  };
}

/** Breakdown of ticket counts by lifecycle status. */
export interface TicketStats {
  total: number;
  issued: number;
  scanned: number;
  refunded: number;
  cancelled: number;
}

/** Breakdown of order counts and revenue. */
export interface OrderStats {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
  /** Sum of totalAmountXLM for PAID orders only. */
  totalRevenueXLM: string;
}

/** Full response shape for GET /admin/stats. */
export class AdminStatsResponseDto {
  users: UserStats;
  events: EventStats;
  tickets: TicketStats;
  orders: OrderStats;
  /** ISO-8601 timestamp of when these stats were generated. */
  generatedAt: string;
}
