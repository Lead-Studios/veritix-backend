import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { EngagementType } from '../entities/event-engagement.entity';

export class TrackEngagementDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(EngagementType)
  engagementType: EngagementType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  trafficSource?: string;

  @IsOptional()
  @IsString()
  deviceType?: string;
}
