import {
  IsEnum,
  IsInt,
  IsISO4217CurrencyCode,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoyaltyTier } from '../../loyalty/entities/loyalty-account.entity';

export class GetQuoteDto {
  @IsISO4217CurrencyCode()
  fromCurrency: string;

  @IsISO4217CurrencyCode()
  toCurrency: string;

  /** Gross amount to convert in minor currency units (e.g. kobo, cents) */
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  fromAmount: number;

  @IsOptional()
  @IsEnum(LoyaltyTier)
  tier?: LoyaltyTier;

  /** True if user has redeemed a fee-waiver loyalty reward */
  @IsOptional()
  feeWaived?: boolean;
}

export class ExecuteConversionDto {
  @IsUUID()
  quoteId: string;
}

export class GetFeesDto {
  @IsISO4217CurrencyCode()
  fromCurrency: string;

  @IsISO4217CurrencyCode()
  toCurrency: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  fromAmount: number;

  @IsOptional()
  @IsEnum(LoyaltyTier)
  tier?: LoyaltyTier;
}

export class ConversionHistoryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsISO4217CurrencyCode()
  fromCurrency?: string;

  @IsOptional()
  @IsISO4217CurrencyCode()
  toCurrency?: string;
}
