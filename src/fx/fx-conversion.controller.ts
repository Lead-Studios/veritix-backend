import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { FxConversionService } from '../services/fx-conversion.service';
import {
  ConversionHistoryDto,
  ExecuteConversionDto,
  GetFeesDto,
  GetQuoteDto,
} from '../dto/fx-conversion.dto';
import { LoyaltyTier } from '../../loyalty/entities/loyalty-account.entity';

@UseGuards(JwtAuthGuard)
@Controller('fx')
export class FxConversionController {
  constructor(private readonly fxService: FxConversionService) {}

  /**
   * GET /fx/convert/quote?fromCurrency=USD&toCurrency=NGN&fromAmount=10000
   *
   * Returns:
   *  - quoteId (UUID)
   *  - locked effectiveRate, midRate, markupPct
   *  - feeAmount, netFromAmount, toAmount
   *  - ttlSeconds (60)
   *  - regulatoryDisclosure text for the user's jurisdiction
   */
  @Get('convert/quote')
  async getQuote(@Request() req, @Query() dto: GetQuoteDto) {
    const user = req.user;
    return this.fxService.createQuote(
      user.id,
      {
        fromCurrency: dto.fromCurrency.toUpperCase(),
        toCurrency:   dto.toCurrency.toUpperCase(),
        fromAmount:   dto.fromAmount,
        tier:         dto.tier,
        feeWaived:    dto.feeWaived,
      },
      user.country ?? null,
    );
  }

  /**
   * POST /fx/convert
   * Executes a conversion at the locked rate.
   * Returns 410 Gone if the quote has expired.
   */
  @Post('convert')
  @HttpCode(HttpStatus.CREATED)
  async executeConversion(@Request() req, @Body() dto: ExecuteConversionDto) {
    return this.fxService.executeConversion(req.user.id, dto);
  }

  /**
   * GET /fx/fees?fromCurrency=USD&toCurrency=NGN&fromAmount=10000
   *
   * Returns a complete cost breakdown including:
   *  - midRate, markupPct, effectiveRate
   *  - feeAmount, feePct
   *  - totalCostPct vs mid-market
   *
   * Does NOT lock a quote — purely informational.
   */
  @Get('fees')
  async getFees(@Request() req, @Query() dto: GetFeesDto) {
    return this.fxService.getFeeBreakdown(
      dto.fromCurrency.toUpperCase(),
      dto.toCurrency.toUpperCase(),
      dto.fromAmount,
      dto.tier ?? LoyaltyTier.BRONZE,
    );
  }

  /**
   * GET /fx/convert/history?page=1&limit=20&fromCurrency=USD&toCurrency=NGN
   *
   * Paginated conversion history — newest first.
   */
  @Get('convert/history')
  async getHistory(@Request() req, @Query() dto: ConversionHistoryDto) {
    return this.fxService.getHistory(req.user.id, dto);
  }
}
