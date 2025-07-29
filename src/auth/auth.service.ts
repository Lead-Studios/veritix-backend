import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { LoginDto } from '../user/dtos/login.dto';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../user/services/email.service';
import { VerifyEmailDto } from '../user/dtos/verify-email.dto';
import { ResetPasswordDto } from '../user/dtos/reset-password.dto';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Organizer } from 'organizer/entities/organizer.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Organizer)
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly organizerRepo: Repository<Organizer>,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private verificationTokens = new Map<string, string>();
  private passwordResetTokens = new Map<string, string>();
  private googleClient: OAuth2Client;

  async validateUser(email: string, pass: string) {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, email: user.email, roles: user.roles };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async signup(dto: CreateUserDto) {
    const user = await this.userService.create(dto);
    const payload = { sub: user.id, email: user.email, roles: user.roles };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async googleAuth(idToken: string) {
    // Verify Google idToken
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email)
      throw new UnauthorizedException('Google account has no email');
    let user = await this.userService.findByEmail(payload.email);
    if (!user) {
      user = await this.userService.create({
        email: payload.email,
        password: Math.random().toString(36).slice(-8), // random password
      });
      await this.userService.update(user.id, {
        googleId: payload.sub,
        isEmailVerified: true,
      });
    }
    const jwtPayload = { sub: user.id, email: user.email, roles: user.roles };
    return {
      accessToken: this.jwtService.sign(jwtPayload),
      user,
    };
  }

  async requestEmailVerification(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    const token = uuidv4();
    this.verificationTokens.set(email, token);
    await this.emailService.sendVerificationEmail(email, token);
    return { message: 'Verification email sent' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const token = this.verificationTokens.get(dto.email);
    if (token !== dto.token) throw new UnauthorizedException('Invalid token');
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('User not found');
    await this.userService.update(user.id, { isEmailVerified: true });
    this.verificationTokens.delete(dto.email);
    return { message: 'Email verified' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    const token = uuidv4();
    this.passwordResetTokens.set(email, token);
    await this.emailService.sendPasswordResetEmail(email, token);
    return { message: 'Password reset email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = this.passwordResetTokens.get(dto.email);
    if (token !== dto.token) throw new UnauthorizedException('Invalid token');
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('User not found');
    await this.userService.update(user.id, {
      password: await bcrypt.hash(dto.newPassword, 10),
    });
    this.passwordResetTokens.delete(dto.email);
    return { message: 'Password reset successful' };
  }

  async validateOAuthLogin(profile: {
    provider: string;
    providerId: string;
    email?: string;
    name?: string;
  }): Promise<Organizer> {
    let organizer = await this.organizerRepo.findOne({
      where: {
        oauthProvider: profile.provider,
        oauthProviderId: profile.providerId,
      },
    });

    if (!organizer && profile.email) {
      // Link to existing email if already registered traditionally
      organizer = await this.organizerRepo.findOne({
        where: { email: profile.email },
      });
    }

    if (!organizer) {
      // Create new organizer
      organizer = this.organizerRepo.create({
        name: profile.name,
        email: profile.email || '',
        oauthProvider: profile.provider,
        oauthProviderId: profile.providerId,
      });
    } else {
      // Ensure OAuth info is saved
      organizer.oauthProvider = profile.provider;
      organizer.oauthProviderId = profile.providerId;
    }

    return this.organizerRepo.save(organizer);
  }
}
