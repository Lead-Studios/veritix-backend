import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { LoyaltyService } from '../services/loyalty.service';
import { RedeemPointsDto } from '../dto/redeem-points.dto';

/**
 * Loyalty & Rewards controller.
 *
 * All routes are protected by JWT — the authenticated user's ID is taken
 * from `req.user.id` (set by JwtAuthGuard).
 */
@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /**
   * GET /loyalty
   * Returns the authenticated user's loyalty dashboard:
   *   - current balance, tier, lifetime stats
   *   - progress to next tier
   *   - last 20 point transactions
   *   - available redemption costs
   */
  @Get()
  async getDashboard(@Request() req) {
    // Auto-provision account on first visit
    await this.loyaltyService.getOrCreateAccount(req.user.id);
    return this.loyaltyService.getDashboard(req.user.id);
  }

  /**
   * POST /loyalty/redeem
   * Exchange points for a reward (FEE_WAIVER or FX_RATE_BONUS).
   * Returns the updated balance, the loyalty transaction record,
   * and a description of the reward that was applied.
   */
  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  async redeem(@Request() req, @Body() dto: RedeemPointsDto) {
    return this.loyaltyService.redeemPoints(req.user.id, dto);
  }
}
