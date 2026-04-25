import { Controller, Get, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('stellar')
export class StellarController {
  constructor(private readonly stellarService: StellarService) {}

  @Get('payment-address/:orderId')
  @UseGuards(JwtAuthGuard)
  async getPaymentInstructions(@Param('orderId') orderId: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }
    return { address: this.stellarService.getReceivingAddress(), memo: this.stellarService.generateMemo(orderId) };
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getAccountBalance(@Request() req) {
    const user = req.user;
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Admin access required');
    }
    const address = this.stellarService.getReceivingAddress();
    if (!address) throw new BadRequestException('STELLAR_RECEIVING_ADDRESS not configured');
    const account = await this.stellarService.getServer().loadAccount(address);
    return { balances: account.balances };
  }
}
