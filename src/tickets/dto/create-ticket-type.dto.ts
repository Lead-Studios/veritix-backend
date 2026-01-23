import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, Min, Max, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketTypeDto {
  @IsString()
  eventId: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(999999)
  price: number;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @IsNumber()
  @Min(1)
  @Max(100000)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxPerPurchase?: number;

  @IsOptional()
  @IsDateString()
  saleStartDate?: string;

  @IsOptional()
  @IsDateString()
  saleEndDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  tier?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsString()
  @Length(1, 500)
  seatingInfo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceFee?: number;

  @IsOptional()
  @IsBoolean()
  isTransferable?: boolean = true;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean = false;
}
