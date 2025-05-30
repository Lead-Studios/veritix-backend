import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
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

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Event)
  @JoinColumn()
  event: Event;

  @Column()
  eventId: string;

  @Column({
    type: "enum",
    enum: PricingRuleType,
  })
  ruleType: PricingRuleType;

  @Column({
    type: "enum",
    enum: DiscountType,
  })
  discountType: DiscountType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  discountValue: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  // Early bird specific fields
  @Column({ nullable: true })
  daysBeforeEvent: number;

  // Dynamic pricing specific fields
  @Column({ nullable: true })
  salesThreshold: number;

  @Column({ nullable: true, type: "decimal", precision: 10, scale: 2 })
  priceIncreaseAmount: number;

  // Loyalty specific fields
  @Column({ nullable: true })
  minimumPurchases: number;

  // Group discount specific fields
  @Column({ nullable: true })
  minimumTickets: number;

  // Last minute specific fields
  @Column({ nullable: true })
  hoursBeforeEvent: number;

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
