import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsUUID, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { PricingRuleType, DiscountType } from '../entities/pricing-rule.entity';

export class UpdatePricingRuleDto {
  @ApiPropertyOptional({
    description: 'Updated name of the pricing rule',
    example: 'Early Bird Special Discount'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated event ID this rule applies to',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Updated type of the pricing rule',
    enum: PricingRuleType,
    example: PricingRuleType.EARLY_BIRD
  })
  @IsOptional()
  @IsEnum(PricingRuleType)
  ruleType?: PricingRuleType;

  @ApiPropertyOptional({
    description: 'Updated type of discount',
    enum: DiscountType,
    example: DiscountType.PERCENTAGE
  })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({
    description: 'Updated value of the discount',
    example: 20
  })
  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({
    description: 'Updated days before event',
    example: 45
  })
  @IsOptional()
  @IsNumber()
  daysBeforeEvent?: number;

  @ApiPropertyOptional({
    description: 'Updated hours before event',
    example: 12
  })
  @IsOptional()
  @IsNumber()
  hoursBeforeEvent?: number;

  @ApiPropertyOptional({
    description: 'Updated minimum tickets',
    example: 15
  })
  @IsOptional()
  @IsNumber()
  minimumTickets?: number;

  @ApiPropertyOptional({
    description: 'Updated minimum purchases',
    example: 8
  })
  @IsOptional()
  @IsNumber()
  minimumPurchases?: number;

  @ApiPropertyOptional({
    description: 'Updated sales threshold',
    example: 150
  })
  @IsOptional()
  @IsNumber()
  salesThreshold?: number;

  @ApiPropertyOptional({
    description: 'Updated price increase amount',
    example: 15
  })
  @IsOptional()
  @IsNumber()
  priceIncreaseAmount?: number;

  @ApiPropertyOptional({
    description: 'Updated minimum price after adjustment',
    example: 45
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @ApiPropertyOptional({
    description: 'Update whether the rule is active',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Updated description of the pricing rule',
    example: 'Applies 20% discount when event is 45 days away'
  })
  @IsOptional()
  @IsString()
  description?: string;
}