import { ApiProperty } from "@nestjs/swagger";

export enum PricingRuleType {
  EARLY_BIRD = "early_bird",
  DEMAND_BASED = "demand_based",
  BULK_PURCHASE = "bulk_purchase",
  LAST_MINUTE = "last_minute",
  LOYALTY = "loyalty",
  GROUP = "group",
}

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
}
