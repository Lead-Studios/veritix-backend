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
  IsNotEmpty,
  IsDate,
} from "class-validator";
import { PricingRuleType, DiscountType } from "../entities/pricing-rule.entity";
import { Type } from "class-transformer";

export class CreatePricingRuleDto {
  @ApiProperty({
    description: "Name of the pricing rule",
    example: "Early Bird Discount",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "ID of the event this rule applies to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  @IsNotEmpty()
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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  // Early bird specific fields
  @IsNumber()
  @IsOptional()
  daysBeforeEvent?: number;

  // Dynamic pricing specific fields
  @IsNumber()
  @IsOptional()
  salesThreshold?: number;

  @IsNumber()
  @IsOptional()
  priceIncreaseAmount?: number;

  // Loyalty specific fields
  @IsNumber()
  @IsOptional()
  minimumPurchases?: number;

  // Group discount specific fields
  @IsNumber()
  @IsOptional()
  minimumTickets?: number;

  // Last minute specific fields
  @IsNumber()
  @IsOptional()
  hoursBeforeEvent?: number;
}
