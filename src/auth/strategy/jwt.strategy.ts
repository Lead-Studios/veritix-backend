import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { UserMessages } from '../helper/user-messages';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/event.entity';

interface JwtPayload {
  sub: string;
  email?: string;
  role: string;
  iat?: number;
  exp?: number;
  tokenVersion: number;
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly authService: AuthService,
  ) {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error(UserMessages.ACCESS_TOKEN_SECRET_NOT_SET);
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.authService.retrieveUserById(Number(payload.sub));

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      // Reject if tokenVersion in JWT is stale (session was invalidated)
      if (payload.tokenVersion !== user.) {
        throw new UnauthorizedException(
          'Session expired. Please log in again.',
        );
      }

      // #471 — reject deleted accounts
      // #469 — reject suspended accounts
      this.authService.assertAccountActive(user);
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: payload.role,
      };
    } catch (error) {
      console.log('error validating token', error);
      throw new UnauthorizedException(UserMessages.INVALID_ACCESS_TOKEN);
    }
  }
}
