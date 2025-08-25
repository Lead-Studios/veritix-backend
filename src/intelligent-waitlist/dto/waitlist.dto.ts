import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsNumber, 
  IsEnum, 
  IsBoolean, 
  IsArray, 
  IsObject, 
  ValidateNested, 
  Min, 
  Max,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { NotificationChannel, NotificationTiming } from '../entities/waitlist-notification-preference.entity';

// Basic Waitlist Operations

export class JoinWaitlistDto {
  @ApiProperty({ description: 'Event ID to join waitlist for' })
  @IsString()
  eventId: string;

  @ApiPropertyOptional({ description: 'Maximum price willing to pay' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPriceWilling?: number;

  @ApiPropertyOptional({ description: 'Number of tickets desired', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  ticketQuantity?: number;

  @ApiPropertyOptional({ description: 'Seat preferences' })
  @IsOptional()
  @IsObject()
  seatPreferences?: {
    section?: string;
    priceRange?: { min: number; max: number };
    accessibility?: boolean;
    proximity?: 'stage' | 'center' | 'aisle';
    groupSeating?: boolean;
  };

  @ApiPropertyOptional({ description: 'Priority level', enum: WaitlistPriority })
  @IsOptional()
  @IsEnum(WaitlistPriority)
  priority?: WaitlistPriority;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateWaitlistEntryDto {
  @ApiPropertyOptional({ description: 'Maximum price willing to pay' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPriceWilling?: number;

  @ApiPropertyOptional({ description: 'Number of tickets desired' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  ticketQuantity?: number;

  @ApiPropertyOptional({ description: 'Updated seat preferences' })
  @IsOptional()
  @IsObject()
  seatPreferences?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Notification Preferences

export class NotificationPreferenceDto {
  @ApiProperty({ description: 'Notification channel', enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional({ description: 'Whether notifications are enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Notification timing', enum: NotificationTiming })
  @IsOptional()
  @IsEnum(NotificationTiming)
  timing?: NotificationTiming;

  @ApiPropertyOptional({ description: 'Custom delay in minutes for custom timing' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customDelayMinutes?: number;

  @ApiPropertyOptional({ description: 'Quiet hours configuration' })
  @IsOptional()
  @IsObject()
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
    timezone?: string;
  };

  @ApiPropertyOptional({ description: 'Types of notifications to receive' })
  @IsOptional()
  @IsObject()
  notificationTypes?: {
    ticketAvailable?: boolean;
    positionUpdate?: boolean;
    priceChange?: boolean;
    reminderBeforeExpiry?: boolean;
    eventUpdates?: boolean;
  };

  @ApiPropertyOptional({ description: 'Channel-specific configuration' })
  @IsOptional()
  @IsObject()
  channelConfig?: {
    email?: {
      address?: string;
      format?: 'html' | 'text';
    };
    sms?: {
      phoneNumber?: string;
    };
    push?: {
      deviceTokens?: string[];
      sound?: boolean;
      badge?: boolean;
    };
    inApp?: {
      priority?: 'high' | 'normal' | 'low';
    };
  };
}

export class SetNotificationPreferencesDto {
  @ApiProperty({ description: 'Array of notification preferences', type: [NotificationPreferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences: NotificationPreferenceDto[];
}

// Ticket Release Management

export class TicketReleaseResponseDto {
  @ApiProperty({ description: 'Response to ticket offer', enum: ['accept', 'decline'] })
  @IsEnum(['accept', 'decline'])
  response: 'accept' | 'decline';

  @ApiPropertyOptional({ description: 'Optional reason for declining' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// VIP Management

export class VipUpgradeDto {
  @ApiProperty({ description: 'VIP tier or priority level' })
  @IsString()
  tier: string;

  @ApiPropertyOptional({ description: 'Reason for upgrade' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Bulk Operations

export class BulkFilterDto {
  @ApiPropertyOptional({ description: 'Event IDs to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventIds?: string[];

  @ApiPropertyOptional({ description: 'User IDs to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ description: 'Priority levels to filter by', enum: WaitlistPriority, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WaitlistPriority, { each: true })
  priorities?: WaitlistPriority[];

  @ApiPropertyOptional({ description: 'Statuses to filter by', enum: WaitlistStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WaitlistStatus, { each: true })
  statuses?: WaitlistStatus[];

  @ApiPropertyOptional({ description: 'Position range filter' })
  @IsOptional()
  @IsObject()
  positionRange?: {
    min?: number;
    max?: number;
  };

  @ApiPropertyOptional({ description: 'Join date range filter' })
  @IsOptional()
  @IsObject()
  joinDateRange?: {
    start: Date;
    end: Date;
  };

  @ApiPropertyOptional({ description: 'Wait time range filter (in hours)' })
  @IsOptional()
  @IsObject()
  waitTimeRange?: {
    min?: number;
    max?: number;
  };

  @ApiPropertyOptional({ description: 'Price range filter' })
  @IsOptional()
  @IsObject()
  priceRange?: {
    min?: number;
    max?: number;
  };

  @ApiPropertyOptional({ description: 'Filter by presence of notification preferences' })
  @IsOptional()
  @IsBoolean()
  hasNotificationPreferences?: boolean;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkUpdateDataDto {
  @ApiPropertyOptional({ description: 'New priority level', enum: WaitlistPriority })
  @IsOptional()
  @IsEnum(WaitlistPriority)
  priority?: WaitlistPriority;

  @ApiPropertyOptional({ description: 'New status', enum: WaitlistStatus })
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;

  @ApiPropertyOptional({ description: 'New maximum price willing to pay' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPriceWilling?: number;

  @ApiPropertyOptional({ description: 'New ticket quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  ticketQuantity?: number;

  @ApiPropertyOptional({ description: 'New seat preferences' })
  @IsOptional()
  @IsObject()
  seatPreferences?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({ description: 'New tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkOperationOptionsDto {
  @ApiPropertyOptional({ description: 'Perform dry run without making changes', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ description: 'Batch size for processing', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Send notifications to affected users', default: true })
  @IsOptional()
  @IsBoolean()
  notifyUsers?: boolean;

  @ApiPropertyOptional({ description: 'Skip duplicate entries during import', default: true })
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @ApiPropertyOptional({ description: 'Send welcome notifications during import', default: true })
  @IsOptional()
  @IsBoolean()
  sendWelcome?: boolean;
}

export class BulkUpdateDto {
  @ApiProperty({ description: 'Filter criteria for bulk update', type: BulkFilterDto })
  @ValidateNested()
  @Type(() => BulkFilterDto)
  filter: BulkFilterDto;

  @ApiProperty({ description: 'Data to update', type: BulkUpdateDataDto })
  @ValidateNested()
  @Type(() => BulkUpdateDataDto)
  updateData: BulkUpdateDataDto;

  @ApiPropertyOptional({ description: 'Operation options', type: BulkOperationOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkOperationOptionsDto)
  options?: BulkOperationOptionsDto;
}

export class BulkOperationDto {
  @ApiProperty({ description: 'Filter criteria for bulk operation', type: BulkFilterDto })
  @ValidateNested()
  @Type(() => BulkFilterDto)
  filter: BulkFilterDto;

  @ApiPropertyOptional({ description: 'Reason for the operation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Operation options', type: BulkOperationOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkOperationOptionsDto)
  options?: BulkOperationOptionsDto;
}

export class BulkImportUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Priority level', enum: WaitlistPriority })
  @IsOptional()
  @IsEnum(WaitlistPriority)
  priority?: WaitlistPriority;

  @ApiPropertyOptional({ description: 'Maximum price willing to pay' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPriceWilling?: number;

  @ApiPropertyOptional({ description: 'Number of tickets desired' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  ticketQuantity?: number;

  @ApiPropertyOptional({ description: 'Seat preferences' })
  @IsOptional()
  @IsObject()
  seatPreferences?: any;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkImportDto {
  @ApiProperty({ description: 'Array of users to import', type: [BulkImportUserDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportUserDto)
  userData: BulkImportUserDto[];

  @ApiPropertyOptional({ description: 'Import options', type: BulkOperationOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkOperationOptionsDto)
  options?: BulkOperationOptionsDto;
}

// Campaign Management

export class CampaignTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Campaign type' })
  @IsEnum(['position_update', 'ticket_available', 'price_drop', 'event_reminder', 'custom'])
  type: 'position_update' | 'ticket_available' | 'price_drop' | 'event_reminder' | 'custom';

  @ApiProperty({ description: 'Notification channels', enum: NotificationChannel, isArray: true })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiProperty({ description: 'Campaign content' })
  @IsObject()
  content: {
    subject?: string;
    emailTemplate?: string;
    smsTemplate?: string;
    pushTitle?: string;
    pushBody?: string;
    variables?: string[];
  };

  @ApiPropertyOptional({ description: 'Targeting criteria' })
  @IsOptional()
  @IsObject()
  targeting?: {
    priorities?: string[];
    positions?: { min?: number; max?: number };
    waitTime?: { min?: number; max?: number };
    priceRange?: { min?: number; max?: number };
  };

  @ApiPropertyOptional({ description: 'Scheduling options' })
  @IsOptional()
  @IsObject()
  scheduling?: {
    immediate?: boolean;
    delay?: number;
    quietHours?: boolean;
    timezone?: string;
  };
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Event ID for the campaign' })
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Campaign template', type: CampaignTemplateDto })
  @ValidateNested()
  @Type(() => CampaignTemplateDto)
  template: CampaignTemplateDto;
}

// Analytics DTOs

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Time period for analytics', enum: ['hourly', 'daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'])
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Start date for custom range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for custom range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Include detailed breakdown' })
  @IsOptional()
  @IsBoolean()
  detailed?: boolean;
}

// Response DTOs

export class WaitlistPositionResponseDto {
  @ApiProperty({ description: 'Current position in waitlist' })
  position: number;

  @ApiProperty({ description: 'Estimated wait time in hours' })
  estimatedWaitTime: number;

  @ApiProperty({ description: 'Total users ahead in queue' })
  totalAhead: number;

  @ApiProperty({ description: 'Priority level', enum: WaitlistPriority })
  priority: WaitlistPriority;

  @ApiProperty({ description: 'Last position update timestamp' })
  lastUpdate: Date;
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Total entries processed' })
  processed: number;

  @ApiProperty({ description: 'Successfully updated entries' })
  succeeded: number;

  @ApiProperty({ description: 'Failed entries' })
  failed: number;

  @ApiProperty({ description: 'Error details for failed entries' })
  errors: Array<{ id: string; error: string }>;

  @ApiProperty({ description: 'Operation summary' })
  summary: string;
}

export class AnalyticsOverviewDto {
  @ApiProperty({ description: 'Total users on waitlist' })
  totalWaitlisted: number;

  @ApiProperty({ description: 'Active waitlist entries' })
  activeWaitlisted: number;

  @ApiProperty({ description: 'Total converted users' })
  totalConverted: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  conversionRate: number;

  @ApiProperty({ description: 'Average wait time in hours' })
  averageWaitTime: number;

  @ApiProperty({ description: 'Peak waitlist size' })
  peakWaitlistSize: number;
}

export class QueueMetricsDto {
  @ApiProperty({ description: 'Total active entries' })
  totalActive: number;

  @ApiProperty({ description: 'Average wait time in hours' })
  averageWaitTime: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  conversionRate: number;

  @ApiProperty({ description: 'Position movement rate' })
  positionMovement: number;

  @ApiProperty({ description: 'Estimated processing time in hours' })
  estimatedProcessingTime: number;
}
