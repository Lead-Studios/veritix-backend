import { IsString, IsOptional, IsDate, IsEnum, IsNumber, Min, IsJSON } from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus } from '../entities/ticket.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Unique ticket code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Ticket title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Ticket description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Maximum number of uses', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses: number = 1;

  @ApiProperty({ description: 'Ticket expiry date' })
  @IsDate()
  @Type(() => Date)
  expiresAt: Date;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTicketDto {
  @ApiProperty({ description: 'Ticket title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Ticket description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Ticket status', required: false })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({ description: 'Maximum number of uses', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiProperty({ description: 'Ticket expiry date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty()
  maxUses: number;

  @ApiProperty()
  usageCount: number;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  metadata: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
