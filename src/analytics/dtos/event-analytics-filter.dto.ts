import { IsUUID, IsOptional, IsString } from 'class-validator';

export class EventAnalyticsFilterDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsString()
  filter?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}
