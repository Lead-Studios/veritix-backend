import { Controller, Get, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { JwtAuthGuard } from '../ticket-verification/auth/guards/jwt-auth.guard';
import { UserRole } from '../common/enums/users-roles.enum';

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
    return this.stellarService.getPaymentInstructions(orderId, userId.toString());
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getAccountBalance(@Request() req) {
    const user = req.user;
    if (user.role !== UserRole.Admin) {
      throw new BadRequestException('Admin access required');
    }
    return this.stellarService.getAccountBalance();
  }
}
