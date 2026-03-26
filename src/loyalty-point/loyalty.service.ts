import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  LoyaltyAccount,
  LoyaltyTier,
  TIER_ORDER,
  calculateTier,
} from '../entities/loyalty-account.entity';
import {
  LoyaltyTransaction,
  LoyaltyTxType,
  RedemptionRewardType,
} from '../entities/loyalty-transaction.entity';
import { EarnRulesService, REDEMPTION_COSTS, FX_RATE_BONUS_PCT } from './earn-rules.service';
import { RedeemPointsDto } from '../dto/redeem-points.dto';

// ── Domain events ─────────────────────────────────────────────────────────────

export class TierChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly previousTier: LoyaltyTier,
    public readonly newTier: LoyaltyTier,
    public readonly isUpgrade: boolean,
  ) {}
}

export class PointsEarnedEvent {
  constructor(
    public readonly userId: string,
    public readonly points: number,
    public readonly sourceTransactionId: string,
  ) {}
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectRepository(LoyaltyAccount)
    private readonly accountRepo: Repository<LoyaltyAccount>,

    @InjectRepository(LoyaltyTransaction)
    private readonly txRepo: Repository<LoyaltyTransaction>,

    private readonly dataSource: DataSource,
    private readonly earnRules: EarnRulesService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Account bootstrap ──────────────────────────────────────────────────────

  /** Lazily creates a loyalty account on first use. */
  async getOrCreateAccount(userId: string): Promise<LoyaltyAccount> {
    let account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) {
      account = this.accountRepo.create({ userId });
      account = await this.accountRepo.save(account);
      this.logger.log(`Loyalty account created for user ${userId}`);
    }
    return account;
  }

  // ── Earn ───────────────────────────────────────────────────────────────────

  /**
   * Awards points for a completed FX transaction.
   *
   * IDEMPOTENT — duplicate calls with the same `sourceTransactionId` are
   * silently ignored (the unique DB index + conflict guard handles this).
   *
   * @param userId              Owner of the loyalty account
   * @param transactionId       Unique ID of the FX transaction (idempotency key)
   * @param transactionAmount   Amount in minor currency units
   */
  async earnPoints(
    userId: string,
    transactionId: string,
    transactionAmount: number,
  ): Promise<LoyaltyTransaction | null> {
    // Idempotency check — if we already recorded an earn for this tx, skip
    const existing = await this.txRepo.findOne({
      where: { sourceTransactionId: transactionId, type: LoyaltyTxType.EARN },
    });
    if (existing) {
      this.logger.debug(`Earn already recorded for transaction ${transactionId} — skipping`);
      return null;
    }

    return this.dataSource.transaction(async (em) => {
      const account = await em
        .getRepository(LoyaltyAccount)
        .findOneOrFail({ where: { userId } });

      const isFirst = account.lifetimeEarned === 0;
      const points  = this.earnRules.calculateEarnPoints(
        transactionAmount,
        account.tier,
        isFirst,
      );

      if (points === 0) return null;

      const previousTier    = account.tier;
      account.pointsBalance += points;
      account.lifetimeEarned += points;
      const newTier          = calculateTier(account.lifetimeEarned);
      account.tier           = newTier;

      await em.save(account);

      const loyaltyTx = em.getRepository(LoyaltyTransaction).create({
        accountId:           account.id,
        type:                LoyaltyTxType.EARN,
        points,
        balanceAfter:        account.pointsBalance,
        sourceTransactionId: transactionId,
        expiresAt:           this.earnRules.getExpiryDate(),
        note:                `Earned on transaction ${transactionId}`,
      });
      await em.save(loyaltyTx);

      this.events.emit('loyalty.points.earned', new PointsEarnedEvent(userId, points, transactionId));

      if (newTier !== previousTier) {
        const isUpgrade = TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(previousTier);
        this.events.emit(
          'loyalty.tier.changed',
          new TierChangedEvent(userId, previousTier, newTier, isUpgrade),
        );
        this.logger.log(
          `User ${userId} tier ${isUpgrade ? 'upgraded' : 'downgraded'}: ${previousTier} → ${newTier}`,
        );
      }

      return loyaltyTx;
    });
  }

  // ── Redeem ─────────────────────────────────────────────────────────────────

  /**
   * Exchanges points for a reward (fee waiver or FX rate bonus).
   *
   * ATOMIC — the points debit and reward record are written in one transaction.
   * Expired points are excluded from the spendable balance.
   */
  async redeemPoints(userId: string, dto: RedeemPointsDto): Promise<RedemptionResult> {
    const cost = REDEMPTION_COSTS[dto.rewardType];
    if (!cost) {
      throw new BadRequestException(`Unknown reward type: ${dto.rewardType}`);
    }

    return this.dataSource.transaction(async (em) => {
      // Lock the row to prevent race conditions
      const account = await em
        .getRepository(LoyaltyAccount)
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.userId = :userId', { userId })
        .getOne();

      if (!account) throw new NotFoundException('Loyalty account not found');

      // Validate spendable balance (balance already excludes expired points — see expiry job)
      if (account.pointsBalance < cost) {
        throw new BadRequestException(
          `Insufficient points: need ${cost}, have ${account.pointsBalance}`,
        );
      }

      account.pointsBalance -= cost;
      account.totalRedeemed  += cost;
      await em.save(account);

      const loyaltyTx = em.getRepository(LoyaltyTransaction).create({
        accountId:           account.id,
        type:                LoyaltyTxType.REDEEM,
        points:              -cost,
        balanceAfter:        account.pointsBalance,
        rewardType:          dto.rewardType,
        targetTransactionId: dto.targetTransactionId ?? null,
        note:                `Redeemed for ${dto.rewardType}`,
      });
      await em.save(loyaltyTx);

      const reward = this.buildReward(dto.rewardType);
      this.logger.log(`User ${userId} redeemed ${cost} pts for ${dto.rewardType}`);

      return { loyaltyTx, reward, newBalance: account.pointsBalance };
    });
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard(userId: string): Promise<LoyaltyDashboard> {
    const account = await this.accountRepo.findOne({ where: { userId } });
    if (!account) throw new NotFoundException('Loyalty account not found');

    const recentTxs = await this.txRepo.find({
      where: { accountId: account.id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const nextTierIndex = TIER_ORDER.indexOf(account.tier) + 1;
    const nextTier      = nextTierIndex < TIER_ORDER.length ? TIER_ORDER[nextTierIndex] : null;

    return {
      pointsBalance:    account.pointsBalance,
      lifetimeEarned:   account.lifetimeEarned,
      totalRedeemed:    account.totalRedeemed,
      totalExpired:     account.totalExpired,
      tier:             account.tier,
      tierProgress:     account.tierProgress,
      pointsToNextTier: account.pointsToNextTier,
      nextTier,
      recentTransactions: recentTxs,
      redemptionCosts:  REDEMPTION_COSTS,
    };
  }

  // ── Expiry (called by cron job) ────────────────────────────────────────────

  /**
   * Expires all EARN rows whose `expiresAt` has passed and that have
   * not already been marked expired.
   *
   * Returns the count of accounts affected.
   */
  async runPointsExpiry(): Promise<{ expiredRows: number; accountsAffected: number }> {
    const now = new Date();

    const expiredTxs = await this.txRepo
      .createQueryBuilder('tx')
      .where('tx.type = :type', { type: LoyaltyTxType.EARN })
      .andWhere('tx.isExpired = false')
      .andWhere('tx.expiresAt <= :now', { now })
      .getMany();

    if (expiredTxs.length === 0) {
      this.logger.log('Points expiry run: nothing to expire');
      return { expiredRows: 0, accountsAffected: 0 };
    }

    // Group by account
    const byAccount = new Map<string, { accountId: string; totalPoints: number; txIds: string[] }>();
    for (const tx of expiredTxs) {
      const key = tx.accountId;
      if (!byAccount.has(key)) byAccount.set(key, { accountId: key, totalPoints: 0, txIds: [] });
      const entry = byAccount.get(key)!;
      entry.totalPoints += tx.points;  // EARN rows have positive points
      entry.txIds.push(tx.id);
    }

    await this.dataSource.transaction(async (em) => {
      for (const { accountId, totalPoints, txIds } of byAccount.values()) {
        // Mark earn rows as expired
        await em
          .getRepository(LoyaltyTransaction)
          .createQueryBuilder()
          .update()
          .set({ isExpired: true })
          .whereInIds(txIds)
          .execute();

        // Write one EXPIRE debit row
        const account = await em
          .getRepository(LoyaltyAccount)
          .createQueryBuilder('a')
          .setLock('pessimistic_write')
          .where('a.id = :id', { id: accountId })
          .getOneOrFail();

        const deduction       = Math.min(totalPoints, account.pointsBalance);
        account.pointsBalance  = Math.max(0, account.pointsBalance - deduction);
        account.totalExpired  += deduction;
        await em.save(account);

        const expireTx = em.getRepository(LoyaltyTransaction).create({
          accountId,
          type:        LoyaltyTxType.EXPIRE,
          points:      -deduction,
          balanceAfter: account.pointsBalance,
          note:        `${txIds.length} earn batch(es) expired`,
        });
        await em.save(expireTx);
      }
    });

    const result = { expiredRows: expiredTxs.length, accountsAffected: byAccount.size };
    this.logger.log(`Points expiry complete: ${JSON.stringify(result)}`);
    return result;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildReward(rewardType: RedemptionRewardType): RewardDetail {
    if (rewardType === RedemptionRewardType.FEE_WAIVER) {
      return { type: RedemptionRewardType.FEE_WAIVER, description: 'Transaction fee waived' };
    }
    return {
      type:        RedemptionRewardType.FX_RATE_BONUS,
      description: `FX rate improved by ${FX_RATE_BONUS_PCT * 100}%`,
      bonusPct:    FX_RATE_BONUS_PCT,
    };
  }
}

// ── Result / view types ───────────────────────────────────────────────────────

export interface RewardDetail {
  type: RedemptionRewardType;
  description: string;
  bonusPct?: number;
}

export interface RedemptionResult {
  loyaltyTx: LoyaltyTransaction;
  reward: RewardDetail;
  newBalance: number;
}

export interface LoyaltyDashboard {
  pointsBalance:      number;
  lifetimeEarned:     number;
  totalRedeemed:      number;
  totalExpired:       number;
  tier:               LoyaltyTier;
  tierProgress:       number;
  pointsToNextTier:   number;
  nextTier:           LoyaltyTier | null;
  recentTransactions: LoyaltyTransaction[];
  redemptionCosts:    typeof REDEMPTION_COSTS;
}
