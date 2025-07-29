import { IsArray, IsUUID, IsOptional, IsEnum, IsString, IsNumber, Min, Max, IsBoolean } from "class-validator"
import { RefundReason } from "../entities/refund.entity"

export class BulkRefundDto {
  @IsArray()
  @IsUUID(4, { each: true })
  ticketIds: string[]

  @IsUUID()
  processedBy: string

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  refundPercentage?: number

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  processingFee?: number

  @IsEnum(RefundReason)
  reason: RefundReason

  @IsOptional()
  @IsString()
  reasonDescription?: string

  @IsOptional()
  @IsString()
  internalNotes?: string

  @IsOptional()
  @IsString()
  customerMessage?: string

  @IsOptional()
  @IsBoolean()
  autoProcess?: boolean = false
}
