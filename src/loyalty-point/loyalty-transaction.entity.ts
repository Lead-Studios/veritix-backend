import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LoyaltyAccount } from './loyalty-account.entity';

export enum LoyaltyTxType {
  EARN       = 'EARN',       // Points credited on FX transaction
  REDEEM     = 'REDEEM',     // Points spent on fee waiver / FX bonus
  EXPIRE     = 'EXPIRE',     // Points voided by monthly cron
  ADJUSTMENT = 'ADJUSTMENT', // Manual admin correction
}

export enum RedemptionRewardType {
  FEE_WAIVER  = 'FEE_WAIVER',   // Waive transaction fee
  FX_RATE_BONUS = 'FX_RATE_BONUS', // Better FX rate applied
}

@Entity('loyalty_transactions')
@Index(['account', 'createdAt'])
@Index(['sourceTransactionId'], { unique: true, where: '"type" = \'EARN\'' })
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LoyaltyAccount, (acc) => acc.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: LoyaltyAccount;

  @Column()
  accountId: string;

  @Column({ type: 'enum', enum: LoyaltyTxType })
  type: LoyaltyTxType;

  /** Positive = credit; negative = debit */
  @Column({ type: 'int' })
  points: number;

  /** Running balance after this transaction */
  @Column({ type: 'int' })
  balanceAfter: number;

  /**
   * ID of the originating FX transaction (for EARN rows).
   * Unique per EARN row — ensures idempotency.
   */
  @Column({ nullable: true })
  sourceTransactionId: string | null;

  /** For REDEEM rows — what reward was applied */
  @Column({ type: 'enum', enum: RedemptionRewardType, nullable: true })
  rewardType: RedemptionRewardType | null;

  /**
   * For REDEEM rows — the ID of the FX transaction the reward was applied to.
   * Stored so the fee/rate adjustment can be verified later.
   */
  @Column({ nullable: true })
  targetTransactionId: string | null;

  /** Human-readable note (shown in /loyalty dashboard) */
  @Column({ type: 'text', nullable: true })
  note: string | null;

  /**
   * Expiry timestamp — set at earn-time (earn date + 12 months).
   * Null for non-EARN rows.
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  /** Marks whether this row has already been expired by the cron */
  @Column({ default: false })
  isExpired: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
