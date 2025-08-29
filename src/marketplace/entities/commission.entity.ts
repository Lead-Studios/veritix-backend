import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { ServiceBooking } from './service-booking.entity';
import { PaymentDistribution } from './payment-distribution.entity';

export enum CommissionStatus {
  PENDING = 'pending',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export enum CommissionType {
  BOOKING = 'booking',
  SUBSCRIPTION = 'subscription',
  FEATURED_LISTING = 'featured_listing',
  ADVERTISING = 'advertising',
  PREMIUM_PLACEMENT = 'premium_placement',
}

@Entity('commissions')
@Index(['vendorId', 'status'])
@Index(['status', 'dueDate'])
@Index(['commissionType', 'createdAt'])
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  commissionNumber: string;

  @Column({ type: 'uuid' })
  @Index()
  vendorId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  bookingId: string;

  @Column({
    type: 'enum',
    enum: CommissionType,
  })
  commissionType: CommissionType;

  @Column({
    type: 'enum',
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  status: CommissionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  bookingAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  vendorPayout: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  processingFee: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  platformFee: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'date' })
  @Index()
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  calculatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  breakdown: {
    baseCommission: number;
    bonusCommission?: number;
    penalties?: number;
    adjustments?: {
      type: string;
      amount: number;
      reason: string;
    }[];
  };

  @Column({ type: 'json', nullable: true })
  paymentDetails: {
    method: string;
    accountInfo: Record<string, any>;
    transactionId?: string;
    reference?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Vendor, (vendor) => vendor.commissions)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @OneToOne(() => ServiceBooking, (booking) => booking.commission, {
    nullable: true,
  })
  @JoinColumn({ name: 'bookingId' })
  booking: ServiceBooking;

  @OneToOne(() => PaymentDistribution, (distribution) => distribution.commission)
  paymentDistribution: PaymentDistribution;
}
