import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionManagementService } from '../services/session-management.service';

@Injectable()
export class SessionJwtStrategy extends PassportStrategy(Strategy, 'session-jwt') {
  constructor(
    private configService: ConfigService,
    private sessionService: SessionManagementService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const jwtId = payload.jti;
    
    if (!jwtId) {
      throw new UnauthorizedException('Invalid token format');
    }

    // Check if token is revoked
    if (await this.sessionService.isTokenRevoked(jwtId)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Validate session exists and is active
    const session = await this.sessionService.validateSession(jwtId);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Update session activity
    await this.sessionService.updateSessionActivity(jwtId);

    // Add session info to request
    req.sessionId = session.id;
    req.jwtId = jwtId;

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      sessionId: session.id,
    };
  }
}
