import { IsOptional, IsEnum, IsString, IsNumber, Min } from "class-validator"
import { RefundStatus } from "../entities/refund.entity"

export class UpdateRefundDto {
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus

  @IsOptional()
  @IsString()
  refundTransactionId?: string

  @IsOptional()
  @IsString()
  internalNotes?: string

  @IsOptional()
  @IsString()
  customerMessage?: string

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  processingFee?: number
}
