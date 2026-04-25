import { Controller, Get, Post, Delete, UseGuards, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFile, UnsupportedMediaTypeException, PayloadTooLargeException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterOrganizerDto } from './dto/register-organizer.dto';
import { AuthService } from './auth.service';

const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any): Promise<UserResponseDto> {
    // Map the user object to UserResponseDto, excluding sensitive fields
    const userResponse = new UserResponseDto({
      id: user.userId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isVerified: user.isVerified,
      organizationName: user.organizationName,
      createdAt: user.createdAt,
    });

    return userResponse;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.authService.register(registerDto);
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isVerified: user.isVerified,
      organizationName: user.organizationName,
      createdAt: user.createdAt,
    });
  }

  @Post('register-organizer')
  @HttpCode(HttpStatus.CREATED)
  async registerOrganizer(@Body() registerOrganizerDto: RegisterOrganizerDto): Promise<UserResponseDto> {
    const user = await this.authService.registerOrganizer(registerOrganizerDto);
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isVerified: user.isVerified,
      organizationName: user.organizationName,
      createdAt: user.createdAt,
    });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
    // Always return success to prevent user enumeration
    return { message: 'If an account with that email exists, a password reset OTP has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otp,
      resetPasswordDto.newPassword,
    );
    return { message: 'Password has been reset successfully. Please login with your new password.' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: any,
    @Body() deleteAccountDto: DeleteAccountDto,
  ): Promise<void> {
    await this.authService.deleteAccount(user.userId, deleteAccountDto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file || !ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Only PNG and JPG images are allowed');
    }
    if (file.size > MAX_AVATAR_SIZE) {
      throw new PayloadTooLargeException('Avatar must be 2MB or less');
    }
    return this.authService.uploadAvatar(user.userId, file);
  }
}
