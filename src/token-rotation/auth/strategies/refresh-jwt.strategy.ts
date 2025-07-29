import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import { RefreshTokenPayload } from '../interfaces/jwt-payload.interface';
import jwtConfig from '../config/jwt.config';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(jwtConfig.KEY)
    private jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: jwtConfiguration.refreshTokenSecret,
      issuer: jwtConfiguration.issuer,
      audience: jwtConfiguration.audience,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: RefreshTokenPayload) {
    return {
      userId: payload.sub,
      tokenId: payload.tokenId,
      refreshToken: req.body.refreshToken,
    };
  }
}
