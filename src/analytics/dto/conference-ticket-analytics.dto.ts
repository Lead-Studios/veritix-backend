import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeFilter {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum ExportFormat {
  XLS = 'xls',
  CSV = 'csv',
}

export class ConferenceTicketAnalyticsFilterDto {
  @ApiPropertyOptional({
    enum: TimeFilter,
    description: 'Time interval filter for analytics data',
  })
  @IsOptional()
  @IsEnum(TimeFilter)
  filter?: TimeFilter;
}

export class ConferenceTicketExportDto {
  @ApiProperty({
    enum: ExportFormat,
    description: 'Export format (xls or csv)',
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;
}

export class TicketAnalyticsDataDto {
  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  ticketCount: number;

  @ApiProperty()
  conferenceId: string;
}

export class ConferenceTicketAnalyticsResponseDto {
  @ApiProperty()
  conferenceId: string;

  @ApiProperty()
  totalTickets: number;

  @ApiProperty()
  filter?: TimeFilter;

  @ApiProperty({ type: [TicketAnalyticsDataDto] })
  data: TicketAnalyticsDataDto[];

  @ApiProperty()
  period: {
    start: string;
    end: string;
  };
}

export class ConferenceTicketTotalResponseDto {
  @ApiProperty()
  conferenceId: string;

  @ApiProperty()
  totalTickets: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  averageTicketPrice: number;
}
