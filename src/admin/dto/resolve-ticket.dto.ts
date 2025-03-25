import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveTicketDto {
  @ApiProperty({ description: 'Ticket ID' })
  @IsUUID()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({ description: 'Resolution details' })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  notes?: string;
} 