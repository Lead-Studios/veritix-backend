import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  Length,
  Matches,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyTicketDto {
  @ApiProperty({
    description: 'Unique ticket code to verify',
    minLength: 1,
    maxLength: 100,
    example: 'TICK-ABC-123',
  })
  @IsString()
  @Length(1, 100)
  ticketCode: string;

  @ApiPropertyOptional({
    description: 'Event UUID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Verifier UUID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @ApiPropertyOptional({
    description: 'Mark ticket as used after verification',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  markAsUsed?: boolean = true;

  @ApiPropertyOptional({
    description: 'Device information used for verification',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  deviceInfo?: string;

  @ApiPropertyOptional({
    description: 'Verification location name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  location?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: '6.5244',
  })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: '3.3792',
  })
  @IsOptional()
  @IsString()
  longitude?: string;
}

export class CheckInDto {
  @ApiProperty({
    description: 'Ticket code',
    example: 'TICK-ABC-123',
  })
  @IsString()
  @Length(1, 100)
  ticketCode: string;

  @ApiPropertyOptional({
    description: 'Verifier UUID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  verifierId?: string;
}

export class BulkVerifyTicketsDto {
  @ApiProperty({
    description: 'Array of ticket codes',
    type: [String],
    example: ['TICK-001', 'TICK-002'],
  })
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  ticketCodes: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  markAsUsed?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}

export class VerificationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticketCode?: string;

  @ApiPropertyOptional({ example: 'VERIFIED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-01-31' })
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ default: 'verifiedAt' })
  @IsOptional()
  sortBy?: string = 'verifiedAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ManualVerificationDto {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  ticketCode: string;

  @ApiProperty({
    description: 'Reason for manual verification',
  })
  @IsString()
  @Length(1, 500)
  reason: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
