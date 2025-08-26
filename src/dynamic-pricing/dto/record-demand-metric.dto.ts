import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordDemandMetricDto {
  @ApiProperty({ description: 'Event ID' })
  @IsString()
  eventId: string;

  @ApiProperty({ 
    description: 'Metric type',
    enum: ['page_views', 'ticket_views', 'cart_additions', 'purchases', 'search_queries', 'social_mentions']
  })
  @IsString()
  metricType: string;

  @ApiProperty({ description: 'Metric value', minimum: 0 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Count of occurrences', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  count?: number;

  @ApiProperty({ 
    description: 'Time window for the metric',
    enum: ['1h', '6h', '24h', '7d'],
    default: '1h'
  })
  @IsOptional()
  @IsString()
  timeWindow?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: {
    source?: string;
    userAgent?: string;
    referrer?: string;
    location?: string;
    sessionId?: string;
  };
}
