import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Event } from "../../../events/entities/event.entity";


export enum PricingRuleType {
  EARLY_BIRD = "EARLY_BIRD",
  LAST_MINUTE = "LAST_MINUTE",
  GROUP = "GROUP",
  LOYALTY = "LOYALTY",
  DYNAMIC = "DYNAMIC",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

@Entity()
export class PricingRule {
  @ApiProperty({
    description: "Unique identifier of the pricing rule",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    description: "Name of the pricing rule",
    example: "Early Bird Discount",
  })
  @Column()
  name: string;

  @ApiProperty({
    description: "Type of the pricing rule",
    enum: PricingRuleType,
    example: PricingRuleType.EARLY_BIRD,
  })
  @Column({ type: "enum", enum: PricingRuleType })
  ruleType: PricingRuleType;

  @ApiProperty({
    description: "Type of discount",
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @Column({ type: "enum", enum: DiscountType, nullable: true })
  discountType: DiscountType;

  @ApiProperty({
    description: "Value of the discount",
    example: 15,
  })
  @Column({ nullable: true })
  discountValue: number;

  @ApiProperty({
    description: "Days before event",
    example: 30,
  })
  @Column({ nullable: true })
  daysBeforeEvent: number;

  @ApiProperty({
    description: "Hours before event",
    example: 24,
  })
  @Column({ nullable: true })
  hoursBeforeEvent: number;

  @ApiProperty({
    description: "Minimum tickets",
    example: 10,
  })
  @Column({ nullable: true })
  minimumTickets: number;

  @ApiProperty({
    description: "Minimum purchases",
    example: 5,
  })
  @Column({ nullable: true })
  minimumPurchases: number;

  @ApiProperty({
    description: "Sales threshold",
    example: 100,
  })
  @Column({ nullable: true })
  salesThreshold: number;

  @ApiProperty({
    description: "Price increase amount",
    example: 10,
  })
  @Column({ nullable: true })
  priceIncreaseAmount: number;

  @ApiProperty({
    description: "Minimum price after adjustment",
    example: 50,
  })
  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  minimumPrice?: number;

  @ApiProperty({
    description: "Event this pricing rule applies to",
    type: () => Event,
  })
  @ManyToOne(() => Event, (event) => event.pricingRules)
  event: Event;

  @ApiProperty({
    description: "Whether the rule is currently active",
    example: true,
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: "Date and time when the rule was created",
    example: "2025-04-30T10:00:00Z",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: "Date and time when the rule was last updated",
    example: "2025-04-30T15:30:00Z",
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: "Date and time when the rule was last applied",
    example: "2025-04-30T16:45:00Z",
  })
  @Column({ type: "timestamp", nullable: true })
  lastAppliedAt?: Date;

  @ApiPropertyOptional({
    description: "Historical record of price adjustments made by this rule",
    example: [
      {
        appliedAt: "2025-04-30T16:45:00Z",
        originalPrice: 100,
        adjustedPrice: 85,
        ticketType: "Regular",
      },
    ],
  })
  @Column("json", { nullable: true })
  adjustmentHistory?: Array<{
    appliedAt: string;
    originalPrice: number;
    adjustedPrice: number;
    ticketType: string;
  }>;
}
