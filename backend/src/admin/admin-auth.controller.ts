import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Get,
} from '@nestjs/common';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminLocalAuthGuard } from './guards/admin-local-auth.guard';
import { AdminAuthService } from './providers/admin-auth.services';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @UseGuards(AdminLocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Request() req: { user: any }) {
    return this.adminAuthService.login(req.user);
  }

  @Post('refresh-token')
  @HttpCode(200)
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.adminAuthService.refreshToken(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body('email') email: string) {
    return this.adminAuthService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body('email') email: string,
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.adminAuthService.resetPassword(email, token, newPassword);
  }

  @Post('send-verification')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(200)
  async sendVerification(@Request() req: { user: { id: number } }) {
    return this.adminAuthService.sendVerificationEmail(req.user.id);
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body('email') email: string,
    @Body('token') token: string,
  ) {
    return this.adminAuthService.verifyEmail(email, token);
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  getProfile(@Request() req: { user: any }): any {
    return req.user;
  }
}
