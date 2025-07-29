import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { TokenService } from './services/token.service';
import { LoginDto, AuthResponseDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tokenService: TokenService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password, userAgent, ipAddress } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return await this.tokenService.generateTokenPair(user, userAgent, ipAddress);
  }

  async refresh(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    try {
      return await this.tokenService.refreshTokens(refreshToken, userAgent, ipAddress);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.tokenService.revokeRefreshToken(refreshToken);
    } catch (error) {
      throw new BadRequestException('Invalid refresh token');
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }
}
