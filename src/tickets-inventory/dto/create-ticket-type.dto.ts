import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, Min, IsISO8601 } from 'class-validator';
import { TicketPriceType } from '../entities/ticket-type.entity';

export class CreateTicketTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TicketPriceType)
  priceType: TicketPriceType;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  totalQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPerPerson?: number;

  @IsOptional()
  @IsISO8601()
  saleStartsAt?: string;

  @IsOptional()
  @IsISO8601()
  saleEndsAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
