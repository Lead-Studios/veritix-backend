import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsUUID, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { PricingRuleType } from "../types/pricing-rule-types.enum";

export enum PriceAdjustmentType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

export enum TriggerCondition {
  TIME_BEFORE_EVENT = "time_before_event",
  TICKETS_SOLD_PERCENTAGE = "tickets_sold_percentage",
  SALES_VELOCITY = "sales_velocity",
  DEMAND_SCORE = "demand_score",
}

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
    description: "Type of price adjustment",
    enum: PriceAdjustmentType,
    example: PriceAdjustmentType.PERCENTAGE,
  })
  @IsEnum(PriceAdjustmentType)
  adjustmentType: PriceAdjustmentType;

  @ApiProperty({
    description: "Value of the price adjustment (percentage or fixed amount)",
    example: 15,
  })
  @IsNumber()
  adjustmentValue: number;

  @ApiProperty({
    description: "Condition that triggers the price adjustment",
    enum: TriggerCondition,
    example: TriggerCondition.TIME_BEFORE_EVENT,
  })
  @IsEnum(TriggerCondition)
  triggerCondition: TriggerCondition;

  @ApiPropertyOptional({
    description: "Number of days before the event to trigger the rule",
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  daysBeforeEvent?: number;

  @ApiPropertyOptional({
    description: "RuleType for specific conditions",
    enum: PricingRuleType,
    example: PricingRuleType.EARLY_BIRD,
  })
  ruleType?: PricingRuleType;

  @ApiPropertyOptional({
    description: "SalesThreshold of tickets sold to trigger the rule",
  })
  @IsNumber()
  salesThreshold?: number;

  @ApiPropertyOptional({
    description: "Price increment to trigger the rule",
    example: 100,
  })
  @IsNumber()
  priceIncreaseAmount?: number;

  @ApiPropertyOptional({
    description: "Minimun tickets for group purchase to trigger the rule",
    example: 50,
  })
  minimumTickets?: number;

  @ApiPropertyOptional({
    description: "Minimun ticket purchase for loyalty to trigger the rule",
    example: 100,
  })
  minimumPurchases?: number;

  @ApiProperty({
    description: "Hours before the event to trigger the rule",
    example: 48,
  })
  hoursBeforeEvent?: number;

  @ApiProperty({
    description: "Value that activates the trigger condition",
    example: 30,
  })
  @IsNumber()
  triggerValue: number;

  @ApiPropertyOptional({
    description: "Minimum price after adjustment",
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @ApiPropertyOptional({
    description: "Maximum price after adjustment",
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumPrice?: number;

  @ApiProperty({
    description: "Priority of the rule (higher number = higher priority)",
    example: 1,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  priority: number;

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

  @ApiPropertyOptional({
    description: "Specific ticket types this rule applies to",
    example: ["VIP", "Regular"],
  })
  @IsOptional()
  @IsString({ each: true })
  applicableTicketTypes?: string[];

  @ApiPropertyOptional({
    description: "Additional configuration options for the rule",
    example: {
      stackable: true,
      roundingMethod: "ceil",
      decimalPlaces: 2,
    },
  })
  @IsOptional()
  configuration?: Record<string, any>;
}

