import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Repository } from 'typeorm';
import { UserHelper } from './helper/user-helper';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMessages } from './helper/user-messages';
import { UserRole } from './common/enum/user-role-enum';
import { JwtHelper } from './helper/jwt-helper';
import moment from 'moment';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SendPasswordResetOtpDto } from './dto/send-password-reset-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { sendEmail } from '../config/email/email.service';
import { UpdateProfileDto } from 'src/users/dto/user-profile.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import { User } from 'src/users/entities/event.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userHelper: UserHelper,
    private readonly jwtHelper: JwtHelper,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(UserMessages.EMAIL_ALREADY_EXIST);
    }

    const validPassword = this.userHelper.isValidPassword(
      createUserDto.password,
    );
    if (!validPassword) {
      throw new ConflictException(UserMessages.IS_VALID_PASSWORD);
    }
    const hashedPassword = await this.userHelper.hashPassword(
      createUserDto.password,
    );
    const verificationCode = this.userHelper.generateVerificationCode();
    const expiration = moment().add(10, 'minutes').toDate();
    const newUser = this.userRepository.create({
      email: createUserDto.email,
      fullName: createUserDto.fullName,
      password: hashedPassword,
      role: UserRole.SUBSCRIBER,
      verificationCode: verificationCode,
      verificationCodeExpiresAt: expiration,
      isVerified: false,
    });
    await this.userRepository.save(newUser);
    await sendEmail(
      createUserDto.email,
      'Verify Your Account',
      'verification-email',
      {
        fullName: createUserDto.fullName,
        otp1: verificationCode[0],
        otp2: verificationCode[1],
        otp3: verificationCode[2],
        otp4: verificationCode[3],
      },
    );

    return {
      message: UserMessages.USER_CREATED_SUCCESSFULLY,
    };
  }

  async createAdminUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(UserMessages.EMAIL_ALREADY_EXIST);
    }

    const validPassword = this.userHelper.isValidPassword(
      createUserDto.password,
    );
    if (!validPassword) {
      throw new ConflictException(UserMessages.IS_VALID_PASSWORD);
    }
    const hashedPassword = await this.userHelper.hashPassword(
      createUserDto.password,
    );
    const newUser = this.userRepository.create({
      email: createUserDto.email,
      fullName: createUserDto.fullName,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await this.userRepository.save(newUser);
    return {
      message: UserMessages.USER_CREATED_SUCCESSFULLY,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    if (!email) {
      throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
    }

    if (!otp) {
      throw new BadRequestException(UserMessages.OTP_REQUIRED);
    }

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(UserMessages.USER_NOT_FOUND);
    }

    if (user.verificationCode !== otp) {
      throw new UnauthorizedException(UserMessages.INVALID_OTP);
    }

    if (
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(UserMessages.OTP_EXPIRED);
    }

    user.isVerified = true;
    user.verificationCode = '';
    user.verificationCodeExpiresAt = undefined;

    await this.userRepository.save(user);

    const tokens = this.jwtHelper.generateTokens(user);

    return {
      message: UserMessages.VERIFY_OTP_SUCCESS,
      user: this.userHelper.mapToResponseDto(user),
      tokens: tokens,
    };
  }

  async resendVerificationOtp(email: string) {
    try {
      if (!email) {
        throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
      }

      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }

      const verificationCode = this.userHelper.generateVerificationCode();

      user.verificationCode = verificationCode;
      user.verificationCodeExpiresAt = moment().add(10, 'minutes').toDate();
      await this.userRepository.save(user);

      await sendEmail(user.email, 'Verify Your Account', 'verification-email', {
        fullName: user.fullName,
        otp1: verificationCode[0],
        otp2: verificationCode[1],
        otp3: verificationCode[2],
        otp4: verificationCode[3],
      });

      return { message: UserMessages.OTP_SENT };
    } catch (error) {
      throw new InternalServerErrorException(
        error || 'Error resending verification code',
      );
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginUserDto.email },
    });
    if (
      !user ||
      !(await this.userHelper.verifyPassword(
        loginUserDto.password,
        user.password,
      ))
    ) {
      throw new UnauthorizedException(UserMessages.INVALID_CREDENTIALS);
    }

    if (!user.isVerified) {
      await this.resendVerificationOtp(loginUserDto.email);
      return {
        message: UserMessages.EMAIL_NOT_VERIFIED,
        user: this.userHelper.mapToResponseDto(user),
      };
    }
    const tokens = this.jwtHelper.generateTokens(user);
    return {
      user: this.userHelper.mapToResponseDto(user),
      tokens: tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    const validatedRefreshToken =
      this.jwtHelper.validateRefreshToken(refreshToken);
    const userId = Number(validatedRefreshToken);
    const user = await this.userRepository.findOne({
      where: { id: String(userId) },
    });
    if (!user) {
      throw new UnauthorizedException(UserMessages.INVALID_REFRESH_TOKEN);
    }
    const accessToken = this.jwtHelper.generateAccessToken(user);
    return { accessToken };
  }

  async retrieveUserById(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: String(userId) },
    });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return this.userHelper.mapToResponseDto(user);
  }

  // ─── Profile update ────────────────────────────────────────────────────────

  /**
   * Update only the safe profile fields for the authenticated user.
   * Email, password, and role cannot be changed via this method.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(UserMessages.USER_NOT_FOUND);
    }

    // Explicitly pick only the allowed profile fields so that
    // even if UpdateProfileDto validation is bypassed, no sensitive
    // field (email, password, role) can be overwritten.
    const allowedFields: (keyof UpdateProfileDto)[] = [
      'phone',
      'avatarUrl',
      'bio',
      'country',
      'stellarWalletAddress',
    ];

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        (user as Record<string, unknown>)[field] = dto[field];
      }
    }

    const updated = await this.userRepository.save(user);
    return this.userHelper.mapToResponseDto(updated);
  }

  // ─── Password reset flow ────────────────────────────────────────────────────

  async requestResetPasswordOtp(
    sendPasswordResetOtpDto: SendPasswordResetOtpDto,
  ) {
    if (!sendPasswordResetOtpDto.email) {
      throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
    }

    const user = await this.userRepository.findOne({
      where: { email: sendPasswordResetOtpDto.email },
    });

    if (!user) {
      throw new NotFoundException(UserMessages.USER_NOT_FOUND);
    }

    const otp = this.userHelper.generateVerificationCode();

    user.passwordResetCode = otp;
    user.passwordResetCodeExpiresAt = moment().add(10, 'minutes').toDate();
    await this.userRepository.save(user);

    await sendEmail(user.email, 'Password Reset OTP', 'reset-password-email', {
      fullName: user.fullName,
      otp1: otp[0],
      otp2: otp[1],
      otp3: otp[2],
      otp4: otp[3],
    });

    return { message: UserMessages.OTP_SENT };
  }

  async resendResetPasswordVerificationOtp(resendOtpDto: ResendOtpDto) {
    try {
      if (!resendOtpDto.email) {
        throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
      }

      const user = await this.userRepository.findOne({
        where: { email: resendOtpDto.email },
      });
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }

      const otp = this.userHelper.generateVerificationCode();

      user.passwordResetCode = otp;
      user.passwordResetCodeExpiresAt = moment().add(10, 'minutes').toDate();
      await this.userRepository.save(user);

      await sendEmail(
        user.email,
        'Password Reset OTP',
        'reset-password-email',
        {
          fullName: user.fullName,
          otp1: otp[0],
          otp2: otp[1],
          otp3: otp[2],
          otp4: otp[3],
        },
      );

      return { message: UserMessages.OTP_SENT };
    } catch (error) {
      throw new InternalServerErrorException(
        error || 'Error resending verification code',
      );
    }
  }

  async verifyResetPasswordOtp(verifyOtpDto: VerifyOtpDto) {
    if (!verifyOtpDto.email) {
      throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
    }

    if (!verifyOtpDto.otp) {
      throw new BadRequestException(UserMessages.OTP_REQUIRED);
    }

    const user = await this.userRepository.findOne({
      where: { email: verifyOtpDto.email },
    });

    if (!user) {
      throw new NotFoundException(UserMessages.USER_NOT_FOUND);
    }

    if (user.passwordResetCode !== verifyOtpDto.otp) {
      throw new UnauthorizedException(UserMessages.INVALID_OTP);
    }

    if (
      !user.passwordResetCodeExpiresAt ||
      (user.passwordResetCodeExpiresAt instanceof Date &&
        user.passwordResetCodeExpiresAt < new Date())
    ) {
      throw new UnauthorizedException(UserMessages.OTP_EXPIRED);
    }

    await this.userRepository.save(user);

    return { message: UserMessages.OTP_VERIFIED };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { otp, newPassword, confirmNewPassword } = resetPasswordDto;

    const user = await this.userRepository.findOneBy({
      passwordResetCode: otp,
    });

    if (!user) {
      throw new NotFoundException(UserMessages.USER_NOT_FOUND);
    }

    if (
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(UserMessages.OTP_EXPIRED);
    }

    if (!this.userHelper.isValidPassword(newPassword)) {
      throw new BadRequestException(UserMessages.IS_VALID_PASSWORD);
    }

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException(UserMessages.PASSWORDS_DO_NOT_MATCH);
    }
    user.password = await this.userHelper.hashPassword(newPassword);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresAt = undefined;

    await this.userRepository.save(user);

    return {
      message: UserMessages.PASSWORDS_RESET_SUCCESSFUL,
    };
  }
}
