import { Injectable, Logger } from '@nestjs/common';
import { LoyaltyTier } from '../entities/loyalty-account.entity';

/**
 * Earn-rate configuration.
 *
 * In production these values would come from a ConfigService / database table
 * so admins can tune them without a deploy.  They are centralised here so a
 * single service is the source of truth for all earn calculations.
 */
export interface EarnRateConfig {
  /** Base points per 100 minor-currency units transacted */
  basePointsPer100: number;

  /** Tier multipliers applied on top of the base rate */
  tierMultipliers: Record<LoyaltyTier, number>;

  /** Whether to award bonus points for the user's first transaction */
  firstTransactionBonusPoints: number;

  /** Minimum transaction amount (minor units) that qualifies for points */
  minimumTransactionAmount: number;
}

/** Default live earn-rate config */
const DEFAULT_EARN_RATE: EarnRateConfig = {
  basePointsPer100: 1,            // 1 point per ₦100 / $1 / etc.
  tierMultipliers: {
    [LoyaltyTier.BRONZE]:   1.0,
    [LoyaltyTier.SILVER]:   1.25,
    [LoyaltyTier.GOLD]:     1.5,
    [LoyaltyTier.PLATINUM]: 2.0,
  },
  firstTransactionBonusPoints: 50,
  minimumTransactionAmount: 100,   // 100 minor units
};

/** Redemption cost constants */
export const REDEMPTION_COSTS = {
  FEE_WAIVER:    500,  // 500 points = waive one transaction fee
  FX_RATE_BONUS: 200,  // 200 points = 0.1% better FX rate bonus
};

export const FX_RATE_BONUS_PCT = 0.001; // 0.1 % improvement per redemption

@Injectable()
export class EarnRulesService {
  private readonly logger = new Logger(EarnRulesService.name);
  private config: EarnRateConfig = { ...DEFAULT_EARN_RATE };

  /** Allows runtime override (e.g. from ConfigService) */
  setConfig(partial: Partial<EarnRateConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getConfig(): Readonly<EarnRateConfig> {
    return this.config;
  }

  /**
   * Calculates points to earn for a given transaction.
   *
   * @param transactionAmount  Amount in minor currency units (e.g. kobo, cents)
   * @param tier               Current tier of the user's loyalty account
   * @param isFirstTransaction Whether this is the user's first qualifying transaction
   */
  calculateEarnPoints(
    transactionAmount: number,
    tier: LoyaltyTier,
    isFirstTransaction: boolean = false,
  ): number {
    if (transactionAmount < this.config.minimumTransactionAmount) {
      this.logger.debug(
        `Transaction amount ${transactionAmount} below minimum — 0 points awarded`,
      );
      return 0;
    }

    const base       = Math.floor((transactionAmount / 100) * this.config.basePointsPer100);
    const multiplier = this.config.tierMultipliers[tier] ?? 1;
    const earned     = Math.floor(base * multiplier);
    const bonus      = isFirstTransaction ? this.config.firstTransactionBonusPoints : 0;

    this.logger.debug(
      `Earn calc: amount=${transactionAmount} tier=${tier} base=${base} ` +
      `mult=${multiplier} earned=${earned} bonus=${bonus}`,
    );

    return earned + bonus;
  }

  /**
   * Returns the expiry date for a batch of earned points
   * (12 months from the date they were earned).
   */
  getExpiryDate(earnedAt: Date = new Date()): Date {
    const expiry = new Date(earnedAt);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }
}
