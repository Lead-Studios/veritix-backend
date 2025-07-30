import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  CreateAdminDto,
  LoginAdminDto,
  ForgetPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  // In-memory store for demonstration. Replace with DB logic.
  private admins = [];
  private resetTokens = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  async createAdmin(dto: CreateAdminDto) {
    // ...validate and create admin logic...
    return { message: 'Admin created (mock)' };
  }

  async login(dto: LoginAdminDto) {
    // ...validate and login logic...
    return { accessToken: 'mock', refreshToken: 'mock' };
  }

  async forgetPassword(dto: ForgetPasswordDto) {
    // ...send reset token logic...
    return { message: 'Reset token sent (mock)' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // ...reset password logic...
    return { message: 'Password reset (mock)' };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // ...refresh token logic...
    return { accessToken: 'mock' };
  }

  async getProfile(user: any) {
    // ...get profile logic...
    return { user: 'mock profile' };
  }

  async uploadProfileImage(user: any, file: any) {
    // ...upload logic...
    return { message: 'Profile image uploaded (mock)' };
  }
}
