import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../common/email/email.service';

export interface DeleteAccountInput {
  password: string;
}

@Injectable()
export class AuthService {
  private readonly OTP_EXPIRY_MINUTES = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generate a 6-digit OTP and send password reset email
   * @param email - Email of the user requesting password reset
   * Note: Returns 200 always to prevent user enumeration
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiry time (10 minutes)
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + this.OTP_EXPIRY_MINUTES);

    await this.userRepository.update(user.id, {
      passwordResetCode: otp,
      passwordResetCodeExpiresAt: expiryTime,
    });

    // Send password reset email with OTP
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #f4f4f4;">
              <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background-color: #2196F3; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Reset Your Password</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="font-size: 16px; color: #333333; line-height: 1.6;">Hello ${user.fullName},</p>
                    <p style="font-size: 16px; color: #333333; line-height: 1.6;">We received a request to reset your password. Use the OTP code below to reset your password:</p>
                    <table role="presentation" style="margin: 30px 0; width: 100%; text-align: center;">
                      <tr>
                        <td>
                          <p style="font-size: 14px; color: #999999; margin: 0; margin-bottom: 10px;">Your OTP Code:</p>
                          <p style="font-size: 32px; color: #2196F3; font-weight: bold; letter-spacing: 5px; margin: 0;">${otp}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 14px; color: #999999; line-height: 1.6; margin-top: 30px;">This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
                    <p style="font-size: 14px; color: #999999; line-height: 1.6;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
                    <p style="font-size: 12px; color: #999999; margin: 0;">For security reasons, never share your OTP code with anyone.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Reset Your Password - Veritix',
      html,
    });
  }

  /**
   * Reset password using OTP
   * @param email - Email of the user
   * @param otp - 6-digit OTP code
   * @param newPassword - New password
   * @throws BadRequestException if OTP is invalid or expired
   * @throws NotFoundException if user doesn't exist
   */
  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if OTP exists
    if (!user.passwordResetCode) {
      throw new BadRequestException('No password reset request found. Please request a password reset first.');
    }

    // Check if OTP matches
    if (user.passwordResetCode !== otp) {
      throw new BadRequestException('Invalid OTP code.');
    }

    // Check if OTP has expired
    if (!user.passwordResetCodeExpiresAt || new Date() > user.passwordResetCodeExpiresAt) {
      throw new BadRequestException('OTP code has expired. Please request a new password reset.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password, clear OTP fields, and increment token version
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
      tokenVersion: user.tokenVersion + 1,
    });
  }

  /**
   * Clear the refresh token hash for a user (logout)
   * @param userId - ID of the user to logout
   * @throws NotFoundException if user doesn't exist
   */
  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, {
      currentRefreshTokenHash: null,
    });
  }

  /**
   * Delete a user account with soft delete and PII anonymisation
   * @param userId - ID of the user to delete
   * @param input - Contains password for confirmation
   * @throws ForbiddenException if password is incorrect
   * @throws NotFoundException if user doesn't exist
   */
  async deleteAccount(userId: string, input: DeleteAccountInput): Promise<void> {
    // Find the user
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid password');
    }

    // Anonymise PII and perform soft delete
    await this.userRepository.update(userId, {
      email: `deleted_${userId}@veritix.io`,
      fullName: 'Deleted User',
      deletedAt: new Date(),
      tokenVersion: user.tokenVersion + 1,
    });
  }
}
