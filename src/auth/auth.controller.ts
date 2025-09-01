import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../user/dtos/login.dto';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { GoogleAuthDto } from '../user/dtos/google-auth.dto';
import { VerifyEmailDto } from '../user/dtos/verify-email.dto';
import { ForgetPasswordDto } from '../user/dtos/forget-password.dto';
import { ResetPasswordDto } from '../user/dtos/reset-password.dto';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('user')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(@Body() loginDto: LoginDto, @Req() req) {
    return this.authService.login(loginDto, req);
  }

  @Post('create')
  @ApiOperation({ summary: 'User signup' })
  @ApiBody({ type: CreateUserDto })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async signup(@Body() dto: CreateUserDto, @Req() req) {
    return this.authService.signup(dto, req);
  }

  @Post('google-auth')
  @ApiOperation({ summary: 'Google OAuth signup/login' })
  @ApiBody({ type: GoogleAuthDto })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async googleAuth(@Body() dto: GoogleAuthDto, @Req() req) {
    return this.authService.googleAuth(dto.idToken, req);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req) {
    return req.user;
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email' })
  @ApiBody({ type: VerifyEmailDto })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forget/password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgetPasswordDto })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset/password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiBody({ type: ResetPasswordDto })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
