import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Commission } from './commission.entity';

export enum DistributionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('payment_distributions')
@Index(['status', 'scheduledDate'])
export class PaymentDistribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  commissionId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  distributionId: string;

  @Column({
    type: 'enum',
    enum: DistributionStatus,
    default: DistributionStatus.PENDING,
  })
  status: DistributionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'date' })
  @Index()
  scheduledDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalTransactionId: string;

  @Column({ type: 'json' })
  paymentMethod: {
    type: 'bank_transfer' | 'paypal' | 'stripe';
    details: Record<string, any>;
  };

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Commission, (commission) => commission.paymentDistribution)
  @JoinColumn({ name: 'commissionId' })
  commission: Commission;
}
