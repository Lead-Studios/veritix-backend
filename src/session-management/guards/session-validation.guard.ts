import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionManagementService } from '../services/session-management.service';

@Injectable()
export class SessionValidationGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private sessionService: SessionManagementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify(token);
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
      request.user = payload;
      request.sessionId = session.id;
      request.jwtId = jwtId;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
