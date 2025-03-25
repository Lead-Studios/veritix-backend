import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignEmailDto {
  @ApiProperty({ description: 'Email subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Email content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Target audience for the email' })
  @IsString()
  @IsOptional()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Whether the email has been sent', default: false })
  @IsBoolean()
  @IsOptional()
  isSent?: boolean;

  @ApiPropertyOptional({ description: 'Scheduled date for sending the email' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: Date;
} 