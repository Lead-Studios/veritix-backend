import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
  organizerId?: string;
}

@Injectable()
export class WsAuthGuard {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(client: Socket): Promise<boolean> {
    try {
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Check if user is an organizer
      if (payload.role !== 'organizer') {
        throw new UnauthorizedException('Organizer access required');
      }

      // Store user info in socket for later use
      client.data.user = payload as AuthenticatedUser;
      return true;
    } catch (error) {
      client.disconnect();
      return false;
    }
  }

  private extractTokenFromHandshake(client: Socket): string | undefined {
    const token = client.handshake.auth?.token || 
                 client.handshake.headers?.authorization?.replace('Bearer ', '');
    return token;
  }
}