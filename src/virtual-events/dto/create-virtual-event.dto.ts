import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber, IsDateString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, StreamingPlatform, AccessLevel } from '../enums/virtual-event.enum';

export class CreateVirtualEventDto {
  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ enum: StreamingPlatform })
  @IsEnum(StreamingPlatform)
  streamingPlatform: StreamingPlatform;

  @ApiProperty({ enum: AccessLevel })
  @IsEnum(AccessLevel)
  accessLevel: AccessLevel;

  @ApiProperty()
  @IsString()
  eventId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streamUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streamKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webinarId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  platformCredentials?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  streamingSettings?: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowChat?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowPolls?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowQA?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowBreakoutRooms?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowNetworking?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowRecording?: boolean = false;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  maxAttendees?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  waitingRoomSettings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  moderationSettings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  brandingSettings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStartTime?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEndTime?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowOnDemandAccess?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  onDemandAvailableUntil?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdById?: string;
}
