import { IsString, IsNumber, IsDate, IsOptional, IsObject, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PricingRuleType, PricingRuleStatus } from '../entities/pricing-rule.entity';

export class CreatePricingRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Rule type', enum: PricingRuleType })
  @IsEnum(PricingRuleType)
  type: PricingRuleType;

  @ApiProperty({ description: 'Rule status', enum: PricingRuleStatus, default: PricingRuleStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PricingRuleStatus)
  status?: PricingRuleStatus;

  @ApiProperty({ description: 'Event ID' })
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Rule conditions (JSON object)' })
  @IsObject()
  conditions: {
    timeRanges?: Array<{
      startDate: string;
      endDate: string;
      multiplier: number;
    }>;
    demandThresholds?: Array<{
      minDemand: number;
      maxDemand: number;
      multiplier: number;
    }>;
    inventoryThresholds?: Array<{
      minInventory: number;
      maxInventory: number;
      multiplier: number;
    }>;
    competitorPriceRanges?: Array<{
      minPrice: number;
      maxPrice: number;
      multiplier: number;
    }>;
    seasonalFactors?: Array<{
      month: number;
      multiplier: number;
    }>;
  };

  @ApiProperty({ description: 'Base price for calculations', minimum: 0 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Minimum multiplier', minimum: 0.1, maximum: 1.0, default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  minMultiplier?: number;

  @ApiProperty({ description: 'Maximum multiplier', minimum: 1.0, maximum: 5.0, default: 3.0 })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  maxMultiplier?: number;

  @ApiProperty({ description: 'Rule priority (higher = more important)', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  priority?: number;

  @ApiProperty({ description: 'Whether the rule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Rule start date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ description: 'Rule end date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}
