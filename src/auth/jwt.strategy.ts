import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../common/enums/users-roles.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      userName: payload.userName,
      role: payload.role as UserRole,
      isActive: payload.isActive,
      iss: payload.iss,
      aud: payload.aud,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}