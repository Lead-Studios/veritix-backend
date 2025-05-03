import { ApiPropertyOptional } from "@nestjs/swagger";
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
// import { PriceAdjustmentType, TriggerCondition } from './create-pricing-rule.dto';

export class UpdatePricingRuleDto {
  @ApiPropertyOptional({
    description: "Updated name of the pricing rule",
    example: "Early Bird Special Discount",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Updated event ID this rule applies to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  // @ApiPropertyOptional({
  //   description: 'Updated type of price adjustment',
  //   enum: PriceAdjustmentType,
  //   example: PriceAdjustmentType.PERCENTAGE
  // })
  // @IsOptional()
  // @IsEnum(PriceAdjustmentType)
  // adjustmentType?: PriceAdjustmentType;

  @ApiPropertyOptional({
    description: "Updated value of the price adjustment",
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  adjustmentValue?: number;

  // @ApiPropertyOptional({
  //   description: 'Updated condition that triggers the price adjustment',
  //   enum: TriggerCondition,
  //   example: TriggerCondition.TIME_BEFORE_EVENT
  // })
  // @IsOptional()
  // @IsEnum(TriggerCondition)
  // triggerCondition?: TriggerCondition;

  @ApiPropertyOptional({
    description: "Updated value that activates the trigger condition",
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  triggerValue?: number;

  @ApiPropertyOptional({
    description: "Updated minimum price after adjustment",
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @ApiPropertyOptional({
    description: "Updated maximum price after adjustment",
    example: 250,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumPrice?: number;

  @ApiPropertyOptional({
    description: "Updated priority of the rule",
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({
    description: "Update whether the rule is active",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Updated description of the pricing rule",
    example: "Applies 20% discount when event is 45 days away",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Updated ticket types this rule applies to",
    example: ["VIP", "Regular", "Early Access"],
  })
  @IsOptional()
  @IsString({ each: true })
  applicableTicketTypes?: string[];

  @ApiPropertyOptional({
    description: "Updated configuration options for the rule",
    example: {
      stackable: false,
      roundingMethod: "floor",
      decimalPlaces: 0,
    },
  })
  @IsOptional()
  configuration?: Record<string, any>;
}
