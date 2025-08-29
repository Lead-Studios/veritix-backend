import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessLevel } from '../enums/virtual-event.enum';

export class CreateRecordingDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AccessLevel })
  @IsEnum(AccessLevel)
  accessLevel: AccessLevel;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  availableUntil?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  processingSettings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdById?: string;
}
