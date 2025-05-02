import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Event } from '../../../events/entities/event.entity';
import { PriceAdjustmentType, TriggerCondition } from '../dto/create-pricing-rule.dto';

@Entity()
export class PricingRule {
  @ApiProperty({
    description: 'Unique identifier of the pricing rule',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the pricing rule',
    example: 'Early Bird Discount'
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Event this pricing rule applies to',
    type: () => Event
  })
  @ManyToOne(() => Event, event => event.pricingRules)
  event: Event;

  @ApiProperty({
    description: 'Type of price adjustment',
    enum: PriceAdjustmentType,
    example: PriceAdjustmentType.PERCENTAGE
  })
  @Column({
    type: 'enum',
    enum: PriceAdjustmentType
  })
  adjustmentType: PriceAdjustmentType;

  @ApiProperty({
    description: 'Value of the price adjustment (percentage or fixed amount)',
    example: 15
  })
  @Column('decimal', { precision: 10, scale: 2 })
  adjustmentValue: number;

  @ApiProperty({
    description: 'Condition that triggers the price adjustment',
    enum: TriggerCondition,
    example: TriggerCondition.TIME_BEFORE_EVENT
  })
  @Column({
    type: 'enum',
    enum: TriggerCondition
  })
  triggerCondition: TriggerCondition;

  @ApiProperty({
    description: 'Value that activates the trigger condition',
    example: 30
  })
  @Column('decimal', { precision: 10, scale: 2 })
  triggerValue: number;

  @ApiPropertyOptional({
    description: 'Minimum price after adjustment',
    example: 50
  })
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minimumPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price after adjustment',
    example: 200
  })
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maximumPrice?: number;

  @ApiProperty({
    description: 'Priority of the rule (higher number = higher priority)',
    example: 1
  })
  @Column()
  priority: number;

  @ApiProperty({
    description: 'Whether the rule is currently active',
    example: true
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Description of the pricing rule',
    example: 'Applies 15% discount when event is 30 days away'
  })
  @Column('text', { nullable: true })
  description?: string;

  @ApiPropertyOptional({
    description: 'Specific ticket types this rule applies to',
    example: ['VIP', 'Regular']
  })
  @Column('simple-array', { nullable: true })
  applicableTicketTypes?: string[];

  @ApiPropertyOptional({
    description: 'Additional configuration options for the rule',
    example: {
      stackable: true,
      roundingMethod: 'ceil',
      decimalPlaces: 2
    }
  })
  @Column('json', { nullable: true })
  configuration?: Record<string, any>;

  @ApiProperty({
    description: 'Date and time when the rule was created',
    example: '2025-04-30T10:00:00Z'
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time when the rule was last updated',
    example: '2025-04-30T15:30:00Z'
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the rule was last applied',
    example: '2025-04-30T16:45:00Z'
  })
  @Column({ type: 'timestamp', nullable: true })
  lastAppliedAt?: Date;

  @ApiPropertyOptional({
    description: 'Historical record of price adjustments made by this rule',
    example: [
      {
        appliedAt: '2025-04-30T16:45:00Z',
        originalPrice: 100,
        adjustedPrice: 85,
        ticketType: 'Regular'
      }
    ]
  })
  @Column('json', { nullable: true })
  adjustmentHistory?: Array<{
    appliedAt: string;
    originalPrice: number;
    adjustedPrice: number;
    ticketType: string;
  }>;
}

