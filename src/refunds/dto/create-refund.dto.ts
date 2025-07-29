import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { RefundReason } from '../entities/refund.entity';

export class CreateRefundDto {
  @IsUUID()
  ticketId: string;

  @IsUUID()
  processedBy: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  refundAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  processingFee?: number;

  @IsEnum(RefundReason)
  reason: RefundReason;

  @IsOptional()
  @IsString()
  reasonDescription?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  customerMessage?: string;

  @IsOptional()
  @IsBoolean()
  autoProcess?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercentage?: number;
}
