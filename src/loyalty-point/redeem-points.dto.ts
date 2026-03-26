import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RedemptionRewardType } from '../entities/loyalty-transaction.entity';

export class RedeemPointsDto {
  @IsEnum(RedemptionRewardType)
  rewardType: RedemptionRewardType;

  /**
   * Optional — the FX transaction ID to apply the reward to.
   * Required for FX_RATE_BONUS; optional for FEE_WAIVER (waiver can be
   * applied to the next qualifying transaction if not specified).
   */
  @IsOptional()
  @IsUUID()
  targetTransactionId?: string;
}
