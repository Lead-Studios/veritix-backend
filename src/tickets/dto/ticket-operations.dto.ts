import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus } from '../interfaces/ticket.interface';

export class PurchaseTicketDto {
  @IsString()
  ticketTypeId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  quantity: number;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  promoCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  attendeeNames?: string[];

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  specialRequests?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsBoolean()
  savePaymentMethod?: boolean = false;
}

export class TransferTicketDto {
  @IsString()
  ticketId: string;

  @IsString()
  @Length(1, 255)
  recipientEmail: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  message?: string;

  @IsOptional()
  @IsDateString()
  scheduledTransferDate?: string;
}

export class TicketQueryDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  ticketCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['createdAt', 'purchasedAt', 'eventDate', 'ticketCode'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ValidateTicketDto {
  @IsString()
  @Length(1, 100)
  ticketCode: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  verifierId?: string;

  @IsOptional()
  @IsBoolean()
  markAsUsed?: boolean = true;
}
