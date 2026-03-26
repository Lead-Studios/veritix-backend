import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LoyaltyTransaction } from './loyalty-transaction.entity';

export enum LoyaltyTier {
  BRONZE   = 'BRONZE',
  SILVER   = 'SILVER',
  GOLD     = 'GOLD',
  PLATINUM = 'PLATINUM',
}

/** Tier thresholds (lifetime earned points) */
export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  [LoyaltyTier.BRONZE]:   0,
  [LoyaltyTier.SILVER]:   1_000,
  [LoyaltyTier.GOLD]:     5_000,
  [LoyaltyTier.PLATINUM]: 20_000,
};

/** Ordered list for comparison helpers */
export const TIER_ORDER: LoyaltyTier[] = [
  LoyaltyTier.BRONZE,
  LoyaltyTier.SILVER,
  LoyaltyTier.GOLD,
  LoyaltyTier.PLATINUM,
];

export function calculateTier(lifetimeEarned: number): LoyaltyTier {
  if (lifetimeEarned >= TIER_THRESHOLDS[LoyaltyTier.PLATINUM]) return LoyaltyTier.PLATINUM;
  if (lifetimeEarned >= TIER_THRESHOLDS[LoyaltyTier.GOLD])     return LoyaltyTier.GOLD;
  if (lifetimeEarned >= TIER_THRESHOLDS[LoyaltyTier.SILVER])   return LoyaltyTier.SILVER;
  return LoyaltyTier.BRONZE;
}

@Entity('loyalty_accounts')
@Index(['userId'], { unique: true })
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Spendable points balance (excludes expired points) */
  @Column({ type: 'int', default: 0 })
  pointsBalance: number;

  /** Sum of all points ever earned (drives tier calculation — never decremented) */
  @Column({ type: 'int', default: 0 })
  lifetimeEarned: number;

  /** Sum of all points redeemed */
  @Column({ type: 'int', default: 0 })
  totalRedeemed: number;

  /** Sum of all points expired */
  @Column({ type: 'int', default: 0 })
  totalExpired: number;

  @Column({ type: 'enum', enum: LoyaltyTier, default: LoyaltyTier.BRONZE })
  tier: LoyaltyTier;

  @OneToMany(() => LoyaltyTransaction, (tx) => tx.account, { cascade: true })
  transactions: LoyaltyTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Computed helpers ────────────────────────────────────────────────────────

  /** Points needed to reach the next tier (0 if already PLATINUM) */
  get pointsToNextTier(): number {
    const nextTierIndex = TIER_ORDER.indexOf(this.tier) + 1;
    if (nextTierIndex >= TIER_ORDER.length) return 0;
    const nextTier = TIER_ORDER[nextTierIndex];
    return Math.max(0, TIER_THRESHOLDS[nextTier] - this.lifetimeEarned);
  }

  /** Progress percentage within current tier band (0–100) */
  get tierProgress(): number {
    const currentIndex = TIER_ORDER.indexOf(this.tier);
    const nextIndex    = currentIndex + 1;
    if (nextIndex >= TIER_ORDER.length) return 100;

    const currentThreshold = TIER_THRESHOLDS[TIER_ORDER[currentIndex]];
    const nextThreshold    = TIER_THRESHOLDS[TIER_ORDER[nextIndex]];
    const earned = this.lifetimeEarned - currentThreshold;
    const band   = nextThreshold - currentThreshold;
    return Math.round((earned / band) * 100);
  }
}
