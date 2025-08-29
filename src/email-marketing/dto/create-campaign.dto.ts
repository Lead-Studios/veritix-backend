import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsBoolean, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType } from '../entities/email-campaign.entity';

export class CreateCampaignSegmentDto {
  @IsString()
  segmentId: string;

  @IsOptional()
  @IsBoolean()
  isIncluded?: boolean = true;
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CampaignType)
  campaignType: CampaignType;

  @IsString()
  templateId: string;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  preheaderText?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderEmail?: string;

  @IsOptional()
  @IsString()
  replyToEmail?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCampaignSegmentDto)
  segments?: CreateCampaignSegmentDto[];

  @IsOptional()
  @IsObject()
  personalizationData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  trackingSettings?: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    trackUnsubscribes?: boolean;
    googleAnalytics?: boolean;
    customDomain?: string;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  abTestId?: string;
}
