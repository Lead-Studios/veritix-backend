import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { HashingProvider } from './hashing-services';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly hashingProvider: HashingProvider,
  ) {}

  async validateAdmin(email: string, password: string) {
    const admin = await this.adminService.findOneByEmail(email);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    const isPasswordValid = await this.hashingProvider.comparePassword(
      password,
      admin.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return admin;
  }

  async login(admin: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const payload = { email: admin.email, sub: admin.id, role: 'admin' };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_ADMIN_REFRESH_EXPIRATION',
        '7d',
      ),
      secret: this.configService.get<string>('JWT_ADMIN_REFRESH_SECRET'),
    });

    // Store refresh token hash in database
    const refreshTokenHash =
      await this.hashingProvider.hashPassword(refreshToken);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.adminService.setRefreshToken(admin.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify the refresh token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_ADMIN_REFRESH_SECRET'),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const admin = await this.adminService.findUserById(payload.sub);
      if (!admin || !admin.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify stored refresh token
      const isRefreshTokenValid = await this.hashingProvider.comparePassword(
        refreshToken,
        admin.refreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { email: admin.email, sub: admin.id, role: 'admin' };
      return {
        accessToken: this.jwtService.sign(newPayload),
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string) {
    const admin = await this.adminService.findOneByEmail(email);
    if (!admin) {
      // For security reasons, we don't disclose whether the email exists
      return {
        message:
          'If your email is registered, you will receive a password reset link',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour

    // Store hashed reset token
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const resetTokenHash = await this.hashingProvider.hashPassword(resetToken);
    await this.adminService.setResetToken(
      admin.id,
      resetTokenHash,
      resetTokenExpiry,
    );

    return {
      message:
        'If your email is registered, you will receive a password reset link',
    };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const admin = await this.adminService.findOneByEmail(email);
    if (!admin || !admin.resetToken || !admin.resetTokenExpiry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (new Date() > admin.resetTokenExpiry) {
      throw new BadRequestException('Reset token has expired');
    }

    // Verify the token
    const isTokenValid = await this.hashingProvider.comparePassword(
      token,
      admin.resetToken,
    );
    if (!isTokenValid) {
      throw new BadRequestException('Invalid reset token');
    }

    // Hash the new password
    const hashedPassword = await this.hashingProvider.hashPassword(newPassword);

    // Update password and clear reset token
    await this.adminService.updatePassword(admin.id, hashedPassword);

    return { message: 'Password updated successfully' };
  }

  async sendVerificationEmail(adminId: number) {
    const admin:any = await this.adminService.findOneById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const verificationToken = uuidv4();
    const tokenHash =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.hashingProvider.hashPassword(verificationToken);
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token valid for 24 hours

    await this.adminService.setVerificationToken(
      admin.id,
      tokenHash,
      tokenExpiry,
    );

    return { message: 'Verification email sent' };
  }

  async verifyEmail(email: string, token: string) {
    const admin = await this.adminService.findOneByEmail(email);
    if (!admin || !admin.verificationToken || !admin.verificationTokenExpiry) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if token is expired
    if (new Date() > admin.verificationTokenExpiry) {
      throw new BadRequestException('Verification token has expired');
    }

    // Verify the token
    const isTokenValid = await this.hashingProvider.comparePassword(
      token,
      admin.verificationToken,
    );
    if (!isTokenValid) {
      throw new BadRequestException('Invalid verification token');
    }

    // Mark email as verified and clear verification token
    await this.adminService.verifyEmail(admin.id);

    return { message: 'Email verified successfully' };
  }
}
