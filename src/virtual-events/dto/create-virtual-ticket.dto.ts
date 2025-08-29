import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessLevel } from '../enums/virtual-event.enum';

export class CreateVirtualTicketDto {
  @ApiProperty()
  @IsString()
  virtualEventId: string;

  @ApiProperty({ enum: AccessLevel })
  @IsEnum(AccessLevel)
  accessLevel: AccessLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streamingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: Date;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowRecordingAccess?: boolean = false;

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
  allowQA?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowPolls?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowChat?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVIP?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canModerate?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canPresent?: boolean = false;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  maxConcurrentSessions?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}
