import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AdminService } from "./admin.service";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { HashingProvider } from "./hashing-services";
import { CreateAdminDto } from "../dto/create-admin.dto";
import { TokenVerificationProvider } from "./verification.provider";
import { EmailDto } from "../dto/email.dto";
import { SignInDto } from "src/auth/dto/create-auth.dto";
import { GenerateTokenProvider } from "src/common/utils/generate-token.provider";
import { Admin } from "../entities/admin.entity";
import { ChangePasswordDto } from "src/users/dto/update-profile.dto";

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly hashingProvider: HashingProvider,
    private readonly tokenProvider: TokenVerificationProvider,
    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}
  private readonly logger = new Logger(AdminAuthService.name);

  async validateAdmin(email: string, password: string) {
    const admin = await this.adminService.findOneByEmail(email);
    if (!admin) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!admin.isVerified) {
      throw new UnauthorizedException("Email not verified");
    }

    const isPasswordValid = await this.hashingProvider.comparePassword(
      password,
      admin.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return admin;
  }

  async login(signInDto: SignInDto) {
      const { email, password } = signInDto;
      this.logger.log(`User ${email} is attempting to sign in`);
  
      // 1. Retrieve user
      const user = await this.adminService.findOneByEmail(email.trim().toLowerCase());
      if (!user) {
        this.logger.warn(`User not found`)
        throw new UnauthorizedException("Email or password is incorrect.");
      }
  
      // 2. Compare passwords
      let isMatch: boolean;
      try {
        isMatch = await this.hashingProvider.comparePassword(
          password,
          user.password,
        );
      } catch (error) {
        this.logger.error(`Error verifying password: ${error.message}`, error.stack);
        throw new ServiceUnavailableException(
          "Could not verify password. Please try again.",
        );
      }
  
      if (!isMatch) {
        this.logger.warn(`Incorrect password`)
        throw new UnauthorizedException("Email or password is incorrect.");
      }
  
      // 3. Generate tokens
      const tokens = await this.generateTokenProvider.generateTokens(user);
  
      // 4. Return result
      return {
        adminUser: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isVerified: user.isVerified,
        },
        tokens,
      };
    }

  async createAdminUser(createAdminDto: CreateAdminDto): Promise<{ message: string; user: CreateAdminDto, token: string }> {
    const { admin, token } = await this.adminService.createUser(createAdminDto);

    return {
      message: 'User created successfully',
      user: admin,
      token,
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify the refresh token
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_ADMIN_REFRESH_SECRET"),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const admin = await this.adminService.findUserById(payload.sub);
      if (!admin || !admin.refreshToken) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      // Verify stored refresh token
      const isRefreshTokenValid = await this.hashingProvider.comparePassword(
        refreshToken,
        admin.refreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const newPayload = { email: admin.email, sub: admin.id, role: "admin" };
      return {
        accessToken: this.jwtService.sign(newPayload),
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async forgotPassword(email: string) {
    const admin = await this.adminService.findOneByEmail(email);
    if (!admin) {
      return {
        message: "If your email is registered, you will receive a password reset link",
      };
    }

    const resetToken = await this.generateTokenProvider.generatePasswordResetToken(admin);
    this.logger.log(`Password reset token generated for ${admin.email}: ${resetToken}`);

    // Here you would send the reset token via email
    // const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    return {
      message: "If your email is registered, you will receive a password reset link",
    };
  }

  // Upload profile image for admin user
  async uploadProfileImage(email: string, file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const user = await this.adminService.findOneByEmail(email.trim().toLowerCase());
    if (!user) {
      throw new NotFoundException('Admin user not found');
    }
    // Save the file path to the profileImage field
    await this.adminService.updateAdminUser(user.id, { profileImage: file.path });
    return {
      message: 'Profile image uploaded successfully',
      profileImage: file.path,
    };
  }
  async resetPassword(token: string, passwordDto: ChangePasswordDto) {
    try {
      const { email } = await this.tokenProvider.verifyPasswordResetToken(token);
      const admin = await this.adminService.findOneByEmail(email);
      // Check if new password matches current password
      const isSamePassword = await this.hashingProvider.comparePassword(
        passwordDto.newPassword,
        admin.password
      );
      if (isSamePassword) {
        throw new BadRequestException(
          "New password must be different from current password"
        );
      }
      const hashedPassword = await this.hashingProvider.hashPassword(passwordDto.newPassword);
      const updatedUser = await this.adminService.updateAdminUser(admin.id, { password: hashedPassword });
      this.logger.log(`Updated user: ${JSON.stringify(updatedUser, null, 2)}`);
      return { 
        message: "Password updated successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  async sendVerificationEmail(emailDto: EmailDto) {
    return this.tokenProvider.sendToken(emailDto.email);
  }

  async verifyEmail(token: string) {
    return this.tokenProvider.verifyToken(token);
  }

  async getProfile(email: string): Promise<Partial<Admin> | null> {
    const user = await this.adminService.findOneByEmail(email.trim().toLowerCase());
    if (!user) {
      throw new NotFoundException('Account not found');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
