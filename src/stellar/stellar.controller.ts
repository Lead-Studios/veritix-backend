import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { StellarService } from './stellar.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';

export class WebhookPaymentDto {
  txHash: string;
  from: string;
  memo: string;
  amount: string;
}

@Controller('stellar')
export class StellarController {
  constructor(
    private readonly stellarService: StellarService,
    private readonly configService: ConfigService,
  ) {}

  @Get('payment-address/:orderId')
  @UseGuards(JwtAuthGuard)
  async getPaymentInstructions(@Param('orderId') orderId: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new BadRequestException('User ID not found in request');
    return this.stellarService.getPaymentInstructions(orderId, userId.toString());
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }
    return { address: this.stellarService.getReceivingAddress(), memo: this.stellarService.generateMemo(orderId) };
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getAccountBalance(@Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
    const user = req.user;
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Admin access required');
    }
    const address = this.stellarService.getReceivingAddress();
    if (!address) throw new BadRequestException('STELLAR_RECEIVING_ADDRESS not configured');
    const account = await this.stellarService.getServer().loadAccount(address);
    return { balances: account.balances };
  }

  @Post('webhook/payment')
  @HttpCode(200)
  async handleWebhookPayment(
    @Headers('x-stellar-signature') signature: string,
    @Body() body: WebhookPaymentDto,
  ) {
    const secret = this.configService.get<string>('STELLAR_WEBHOOK_SECRET');
    if (!secret) throw new UnauthorizedException('Webhook not configured');

    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    const sigBuffer = Buffer.from(signature ?? '', 'hex');
    const expBuffer = Buffer.from(expected, 'hex');

    if (
      sigBuffer.length !== expBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expBuffer)
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.stellarService.processConfirmedPayment(
      body.txHash,
      body.from,
      body.memo,
      body.amount,
    );

    return { received: true };
  }
}
