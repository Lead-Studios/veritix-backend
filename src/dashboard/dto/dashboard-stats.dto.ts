import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportPeriodEnum } from 'src/common/enums/report-period.enum';

export class EventPerformanceStats {
  @ApiProperty({
    description: 'ID of the event',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  eventId: string;

  @ApiProperty({
    description: 'Name of the event',
    example: 'Tech Conference 2025'
  })
  eventName: string;

  @ApiProperty({
    description: 'Total number of tickets sold',
    example: 850
  })
  ticketsSold: number;

  @ApiProperty({
    description: 'Total revenue generated',
    example: 85000
  })
  revenue: number;

  @ApiProperty({
    description: 'Percentage of tickets sold',
    example: 85
  })
  occupancyRate: number;
}

export class TicketSalesStats {
  @ApiProperty({
    description: 'Total number of tickets sold',
    example: 5000
  })
  totalSold: number;

  @ApiProperty({
    description: 'Revenue from ticket sales',
    example: 500000
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Average ticket price',
    example: 100
  })
  averagePrice: number;

  @ApiProperty({
    description: 'Sales trend over time',
    example: [
      { date: '2025-04-01', sales: 100 },
      { date: '2025-04-02', sales: 150 }
    ]
  })
  salesTrend: Array<{ date: string; sales: number }>;
}

export class RevenueStats {
  @ApiProperty({
    description: 'Total revenue for the period',
    example: 750000
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Revenue from ticket sales',
    example: 500000
  })
  ticketRevenue: number;

  @ApiProperty({
    description: 'Revenue from other sources (e.g., merchandise)',
    example: 250000
  })
  otherRevenue: number;

  @ApiProperty({
    description: 'Revenue trend over time',
    example: [
      { date: '2025-04-01', revenue: 25000 },
      { date: '2025-04-02', revenue: 35000 }
    ]
  })
  revenueTrend: Array<{ date: string; revenue: number }>;
}

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Time period for the statistics',
    enum: ReportPeriodEnum,
    example: ReportPeriodEnum.MONTH
  })
  period: ReportPeriodEnum;

  @ApiPropertyOptional({
    description: 'Start date for custom period',
    example: '2025-04-01T00:00:00Z'
  })
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for custom period',
    example: '2025-04-30T23:59:59Z'
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Total number of events',
    example: 25
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Total number of active users',
    example: 5000
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Revenue statistics',
    type: RevenueStats
  })
  revenue: RevenueStats;

  @ApiProperty({
    description: 'Ticket sales statistics',
    type: TicketSalesStats
  })
  ticketSales: TicketSalesStats;

  @ApiProperty({
    description: 'Performance statistics for top events',
    type: [EventPerformanceStats]
  })
  topEvents: EventPerformanceStats[];

  @ApiProperty({
    description: 'Statistics by event category',
    example: {
      'Technology': { events: 10, revenue: 300000 },
      'Music': { events: 8, revenue: 250000 },
      'Business': { events: 7, revenue: 200000 }
    }
  })
  categoryStats: Record<string, { events: number; revenue: number }>;

  @ApiProperty({
    description: 'Date and time when the statistics were generated',
    example: '2025-04-30T12:00:00Z'
  })
  generatedAt: Date;
}