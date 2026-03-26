import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { UserMessages } from '../helper/user-messages';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { JwtPayload } from '../interface/user.interface';

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
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.authService.retrieveUserById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      // Reject if tokenVersion in JWT is stale (session was invalidated)
      if (user.tokenVersion !== (payload.tokenVersion ?? 0)) {
        throw new UnauthorizedException(
          'Session expired. Please log in again.',
        );
      }

      // #471 — reject deleted accounts
      // #469 — reject suspended accounts
      this.authService.assertAccountActive(user);

      if (user.isSuspended) {
        throw new UnauthorizedException(UserMessages.INVALID_ACCESS_TOKEN);
      }

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      console.log('error validating token', error);
      throw new UnauthorizedException(UserMessages.INVALID_ACCESS_TOKEN);
    }
  }
}
