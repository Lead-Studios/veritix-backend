import { Injectable } from '@nestjs/common';
import { LoyaltyTier } from '../../loyalty/entities/loyalty-account.entity';

export interface FeeBreakdown {
  /** Gross source amount (minor units) */
  fromAmount: number;
  /** Mid-market rate (string for precision) */
  midRate: string;
  /** Markup percentage (e.g. "0.50" = 0.5 %) */
  markupPct: string;
  /** Effective rate after markup */
  effectiveRate: string;
  /** Provider/platform fee in minor units of fromCurrency */
  feeAmount: number;
  /** Fee as a percentage of fromAmount */
  feePct: string;
  /** Net amount available for conversion after fee */
  netFromAmount: number;
  /** Expected received amount (minor units of toCurrency) */
  toAmount: number;
  /** Total cost including fee + markup vs a hypothetical zero-cost conversion */
  totalCostPct: string;
}

/**
 * All fee rates are in percent (e.g. 0.5 = 0.5 %).
 * Adjust tiers / add promotional overrides here.
 */
const BASE_MARKUP_PCT = 0.5;
const BASE_PROVIDER_FEE_PCT = 0.2;
const MIN_FEE_MINOR_UNITS = 50;  // minimum fee regardless of amount

/** Loyalty tier discounts on the provider fee */
const TIER_FEE_DISCOUNTS: Record<LoyaltyTier, number> = {
  [LoyaltyTier.BRONZE]:   0,
  [LoyaltyTier.SILVER]:   10,  // 10 % discount on fee
  [LoyaltyTier.GOLD]:     20,
  [LoyaltyTier.PLATINUM]: 35,
};

@Injectable()
export class FeeCalculatorService {
  /**
   * Calculates the complete fee breakdown for a given conversion.
   *
   * @param fromAmount  Gross source amount in minor units
   * @param midRate     Current mid-market rate (fromCurrency → toCurrency)
   * @param tier        User's loyalty tier (affects fee discount)
   * @param feeWaived   True if user has redeemed a fee-waiver loyalty reward
   */
  calculate(
    fromAmount: number,
    midRate: number,
    tier: LoyaltyTier = LoyaltyTier.BRONZE,
    feeWaived: boolean = false,
  ): FeeBreakdown {
    // ── Provider fee ─────────────────────────────────────────────────────────
    const discount     = TIER_FEE_DISCOUNTS[tier] ?? 0;
    const effectiveFeeRate = feeWaived
      ? 0
      : BASE_PROVIDER_FEE_PCT * (1 - discount / 100);

    const rawFee   = Math.floor((fromAmount * effectiveFeeRate) / 100);
    const feeAmount = feeWaived ? 0 : Math.max(MIN_FEE_MINOR_UNITS, rawFee);

    const netFromAmount = fromAmount - feeAmount;

    // ── Rate markup ───────────────────────────────────────────────────────────
    const markupPct    = BASE_MARKUP_PCT;
    const effectiveRate = midRate * (1 - markupPct / 100);
    const toAmount      = Math.floor(netFromAmount * effectiveRate);

    // ── Total cost % (fee + spread vs zero-cost) ──────────────────────────────
    // "What would zero cost look like?"
    const zeroFeeToAmount = Math.floor(fromAmount * midRate);
    const totalCostPct    =
      zeroFeeToAmount > 0
        ? (((zeroFeeToAmount - toAmount) / zeroFeeToAmount) * 100).toFixed(4)
        : '0.0000';

    return {
      fromAmount,
      midRate:      midRate.toFixed(10),
      markupPct:    markupPct.toFixed(6),
      effectiveRate: effectiveRate.toFixed(10),
      feeAmount,
      feePct:       ((feeAmount / fromAmount) * 100).toFixed(4),
      netFromAmount,
      toAmount,
      totalCostPct,
    };
  }

  /**
   * Returns a human-readable breakdown object suitable for GET /fx/fees.
   */
  describeBreakdown(breakdown: FeeBreakdown, fromCurrency: string, toCurrency: string) {
    return {
      fromCurrency,
      toCurrency,
      grossAmount:      breakdown.fromAmount,
      feeAmount:        breakdown.feeAmount,
      feePct:           breakdown.feePct,
      netAmount:        breakdown.netFromAmount,
      midRate:          breakdown.midRate,
      markupPct:        breakdown.markupPct,
      effectiveRate:    breakdown.effectiveRate,
      toAmount:         breakdown.toAmount,
      totalCostPct:     breakdown.totalCostPct,
      costComponents: {
        providerFee:  `${breakdown.feePct}% of gross amount`,
        ratespread:   `${breakdown.markupPct}% margin on mid-market rate`,
        totalImpact:  `${breakdown.totalCostPct}% versus mid-market (fee + spread)`,
      },
    };
  }
}
