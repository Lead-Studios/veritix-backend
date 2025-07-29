import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PricingStrategy } from '../enums/pricing-strategy.enum';

export class PriceThresholdDto {
  @IsNumber()
  @Min(0)
  soldPercentage: number;

  @IsNumber()
  @Min(1)
  priceMultiplier: number;
}

export class PricingConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  demandMultiplier?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceThresholdDto)
  thresholds?: PriceThresholdDto[];
}

export class CreateTicketTierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  benefits?: string;

  @IsEnum(PricingStrategy)
  @IsOptional()
  pricingStrategy?: PricingStrategy;

  @IsOptional()
  @ValidateNested()
  @Type(() => PricingConfigDto)
  pricingConfig?: PricingConfigDto;
}
