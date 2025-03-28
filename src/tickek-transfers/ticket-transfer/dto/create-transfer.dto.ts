import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from "class-validator"
import { TransferType } from "../entities/ticket-transfer.entity"

export class CreateTransferDto {
  @IsUUID()
  @IsNotEmpty()
  ticketId: string

  @IsEnum(TransferType)
  @IsNotEmpty()
  type: TransferType

  @IsEmail()
  @IsOptional()
  recipientEmail?: string

  @IsUUID()
  @IsOptional()
  recipientId?: string

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number
}

