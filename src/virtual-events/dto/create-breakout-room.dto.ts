import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBreakoutRoomDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  virtualEventId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  maxParticipants?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  roomSettings?: Record<string, any>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean = false;

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
  createdById?: string;
}
