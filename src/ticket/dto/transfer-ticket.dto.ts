import { IsString, IsNumber, IsOptional, IsEnum, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransferType } from '../ticket-transfer.entity';

export class TransferTicketDto {
  @ApiProperty({ description: 'ID of the ticket to transfer' })
  @IsUUID()
  ticketId: string;

  @ApiProperty({ description: 'ID of the user receiving the ticket' })
  @IsUUID()
  toUserId: string;

  @ApiProperty({ description: 'Price for the transfer (for resale)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transferPrice?: number;

  @ApiProperty({ description: 'Type of transfer', enum: TransferType })
  @IsEnum(TransferType)
  transferType: TransferType;

  @ApiProperty({ description: 'Reason for transfer', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

