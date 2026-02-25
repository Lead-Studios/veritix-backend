import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import { User } from 'src/users/entities/event.entity';

@Injectable()
export class UserHelper {
  public async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Maps a User entity to a safe response DTO that excludes all
   * sensitive fields (password, verificationCode, passwordResetCode, etc.).
   */
  public mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isVerified: user.isVerified,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      country: user.country ?? null,
      stellarWalletAddress: user.stellarWalletAddress ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * @deprecated Use mapToResponseDto instead — this omits new profile fields.
   * Kept temporarily so existing callers (login, verifyOtp) compile without changes.
   */
  public formatUserResponse(user: User) {
    return this.mapToResponseDto(user);
  }

  public isValidPassword(password: string) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigits = /\d/.test(password);

    return (
      password.length >= minLength && hasUpperCase && hasLowerCase && hasDigits
    );
  }

  public generateVerificationCode(digits: number = 4): string {
    const max = Math.pow(10, digits) - 1;
    const min = Math.pow(10, digits - 1);

    return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
  }
}
