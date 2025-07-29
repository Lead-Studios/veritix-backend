import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsObject,
} from 'class-validator';
import {
  FunnelStage,
  FunnelActionType,
} from '../entities/funnel-action.entity';

export class TrackFunnelActionDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  sessionId: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEnum(FunnelStage)
  stage: FunnelStage;

  @IsEnum(FunnelActionType)
  actionType: FunnelActionType;

  @IsString()
  @IsOptional()
  actionName?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  trafficSource?: string;

  @IsString()
  @IsOptional()
  referrerUrl?: string;

  @IsString()
  @IsOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @IsString()
  @IsOptional()
  utmTerm?: string;

  @IsString()
  @IsOptional()
  utmContent?: string;

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  browser?: string;

  @IsString()
  @IsOptional()
  operatingSystem?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsNumber()
  @IsOptional()
  timeOnPage?: number;

  @IsString()
  @IsOptional()
  errorMessage?: string;
}
