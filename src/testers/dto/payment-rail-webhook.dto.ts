import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentRailSettlementStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class PaymentRailWebhookDto {
  @ApiProperty({ example: 'rail_123456' })
  @IsString()
  reference: string;

  @ApiProperty({ enum: PaymentRailSettlementStatus })
  @IsEnum(PaymentRailSettlementStatus)
  status: PaymentRailSettlementStatus;

  @ApiPropertyOptional({ example: 'Insufficient funds at receiving institution' })
  @IsOptional()
  @IsString()
  failureReason?: string;
}
