import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FxQuote } from './fx-quote.entity';

export enum ConversionStatus {
  COMPLETED = 'COMPLETED',
  FAILED    = 'FAILED',
  REVERSED  = 'REVERSED',
}

/**
 * Immutable record of a completed FX conversion.
 * Written atomically alongside the wallet debit/credit operations.
 */
@Entity('fx_conversions')
@Index(['userId', 'createdAt'])
@Index(['quoteId'], { unique: true }) // one conversion per quote
export class FxConversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** The locked quote that authorised this conversion */
  @Column()
  quoteId: string;

  @ManyToOne(() => FxQuote, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quoteId' })
  quote: FxQuote;

  // ── Money fields (all in minor units) ─────────────────────────────────────

  @Column({ length: 3 })
  fromCurrency: string;

  @Column({ length: 3 })
  toCurrency: string;

  /** Gross source amount including fee (= quote.fromAmount) */
  @Column({ type: 'bigint' })
  fromAmount: number;

  /** Fee deducted from source amount */
  @Column({ type: 'bigint' })
  feeCharged: number;

  /** Net source amount converted (= fromAmount − feeCharged) */
  @Column({ type: 'bigint' })
  netFromAmount: number;

  /** Amount credited to the user in toCurrency */
  @Column({ type: 'bigint' })
  toAmount: number;

  /** Effective rate used (must equal quote.effectiveRate) */
  @Column({ type: 'numeric', precision: 28, scale: 10 })
  rateUsed: string;

  /** Mid-market rate at the time of the quote (informational) */
  @Column({ type: 'numeric', precision: 28, scale: 10 })
  midRateAtQuote: string;

  /** Markup % applied */
  @Column({ type: 'numeric', precision: 10, scale: 6 })
  markupPct: string;

  @Column({ type: 'enum', enum: ConversionStatus, default: ConversionStatus.COMPLETED })
  status: ConversionStatus;

  /** Optional reference for downstream settlement / ledger systems */
  @Column({ nullable: true })
  settlementRef: string | null;

  /** Jurisdiction captured at conversion time for compliance records */
  @Column({ length: 2, nullable: true })
  jurisdiction: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
