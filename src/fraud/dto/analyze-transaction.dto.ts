import { IsString, IsNumber, IsObject, IsOptional, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

class CardDetailsDto {
  @IsString()
  last4: string

  @IsString()
  bin: string
}

export class AnalyzeTransactionDto {
  @IsString()
  userId: string

  @IsString()
  ip: string

  @IsObject()
  @ValidateNested()
  @Type(() => CardDetailsDto)
  cardDetails: CardDetailsDto

  @IsNumber()
  amount: number

  @IsNumber()
  ticketCount: number

  @IsString()
  eventId: string

  @IsString()
  @IsOptional()
  userAgent?: string

  @IsString()
  @IsOptional()
  deviceId?: string
}

