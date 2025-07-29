import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType, AnnouncementPriority } from '../entities/announcement.entity';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Title of the announcement' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Content of the announcement' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Type of announcement', enum: AnnouncementType })
  @IsEnum(AnnouncementType)
  @IsOptional()
  type?: AnnouncementType;

  @ApiProperty({ description: 'Priority level', enum: AnnouncementPriority })
  @IsEnum(AnnouncementPriority)
  @IsOptional()
  priority?: AnnouncementPriority;

  @ApiProperty({ description: 'Event ID' })
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({ description: 'Whether to send email notifications' })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;

  @ApiPropertyOptional({ description: 'Whether to send in-app notifications' })
  @IsBoolean()
  @IsOptional()
  sendInApp?: boolean;

  @ApiPropertyOptional({ description: 'Scheduled date for publishing' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Whether to publish immediately' })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
} 