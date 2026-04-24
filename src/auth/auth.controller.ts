import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('auth')
export class AuthController {
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
}
