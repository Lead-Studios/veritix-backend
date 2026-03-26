import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum QuoteStatus {
  PENDING   = 'PENDING',    // Generated, not yet consumed
  EXECUTED  = 'EXECUTED',   // Used in a conversion
  EXPIRED   = 'EXPIRED',    // TTL elapsed before execution
  CANCELLED = 'CANCELLED',  // Explicitly cancelled
}

/**
 * Persisted snapshot of every quote issued.
 * The authoritative "lock" lives in Redis (60 s TTL).
 * This row is written at quote-generation time and updated when the quote
 * is consumed or expires — providing a full audit trail.
 */
@Entity('fx_quotes')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class FxQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string;          // also used as the Redis key

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** ISO-4217 source currency */
  @Column({ length: 3 })
  fromCurrency: string;

  /** ISO-4217 target currency */
  @Column({ length: 3 })
  toCurrency: string;

  /** Amount to convert, in minor units of fromCurrency */
  @Column({ type: 'bigint' })
  fromAmount: number;

  /** Locked mid-market rate at quote time (18 dp precision stored as string) */
  @Column({ type: 'numeric', precision: 28, scale: 10 })
  midRate: string;

  /** Markup percentage applied on top of mid-rate (e.g. "0.5" = 0.5 %) */
  @Column({ type: 'numeric', precision: 10, scale: 6 })
  markupPct: string;

  /** Effective rate seen by the customer = midRate × (1 - markupPct/100) */
  @Column({ type: 'numeric', precision: 28, scale: 10 })
  effectiveRate: string;

  /** Platform/provider fee in minor units of fromCurrency */
  @Column({ type: 'bigint' })
  feeAmount: number;

  /** Amount available for conversion after fee deduction (minor units) */
  @Column({ type: 'bigint' })
  netFromAmount: number;

  /** Expected received amount in minor units of toCurrency */
  @Column({ type: 'bigint' })
  toAmount: number;

  /** Unix timestamp (ms) when Redis key expires */
  @Column({ type: 'bigint' })
  expiresAt: number;

  /** ISO-3166-1 alpha-2 jurisdiction of the requesting user (for regulatory text) */
  @Column({ length: 2, nullable: true })
  jurisdiction: string | null;

  /** Regulatory disclosure text included in the response */
  @Column({ type: 'text', nullable: true })
  regulatoryDisclosure: string | null;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.PENDING })
  status: QuoteStatus;

  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of status transition (execution / expiry) */
  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
