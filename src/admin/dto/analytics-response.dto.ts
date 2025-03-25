import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsResponseDto {
  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total number of active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Total number of events' })
  totalEvents: number;

  @ApiProperty({ description: 'Total number of tickets sold' })
  totalTicketsSold: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total number of unresolved tickets' })
  unresolvedTickets: number;

  @ApiProperty({ 
    description: 'Recent campaign statistics',
    type: 'object',
    additionalProperties: false,
    properties: {
      totalCampaigns: { type: 'number' },
      sentCampaigns: { type: 'number' },
      scheduledCampaigns: { type: 'number' }
    }
  })
  campaignStats: {
    totalCampaigns: number;
    sentCampaigns: number;
    scheduledCampaigns: number;
  };

  @ApiProperty({ description: 'Timestamp when analytics were generated' })
  generatedAt: Date;
} 