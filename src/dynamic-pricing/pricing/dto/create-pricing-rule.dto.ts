import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from "class-validator";
import { PricingRuleType, DiscountType } from "../entities/pricing-rule.entity";

export class CreatePricingRuleDto {
  @ApiProperty({
    description: "Name of the pricing rule",
    example: "Early Bird Discount",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "ID of the event this rule applies to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: "Type of the pricing rule",
    enum: PricingRuleType,
    example: PricingRuleType.EARLY_BIRD,
  })
  @IsEnum(PricingRuleType)
  ruleType: PricingRuleType;

  @ApiProperty({
    description: "Type of discount",
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    description: "Value of the discount",
    example: 15,
  })
  @IsNumber()
  discountValue: number;

  @ApiPropertyOptional({
    description: "Days before event",
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  daysBeforeEvent?: number;

  @ApiPropertyOptional({
    description: "Hours before event",
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  hoursBeforeEvent?: number;

  @ApiPropertyOptional({
    description: "Minimum tickets",
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  minimumTickets?: number;

  @ApiPropertyOptional({
    description: "Minimum purchases",
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  minimumPurchases?: number;

  @ApiPropertyOptional({
    description: "Sales threshold",
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  salesThreshold?: number;

  @ApiPropertyOptional({
    description: "Price increase amount",
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  priceIncreaseAmount?: number;

  @ApiPropertyOptional({
    description: "Minimum price after adjustment",
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @ApiProperty({
    description: "Whether the rule is currently active",
    example: true,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    description: "Description of the pricing rule",
    example: "Applies 15% discount when event is 30 days away",
  })
  @IsOptional()
  @IsString()
  description?: string;
}
