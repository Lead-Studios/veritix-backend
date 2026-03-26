import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

type SocketUser = {
  id: string;
  email?: string;
  fullName?: string;
  role?: string;
};

type SocketWithUser = Socket & {
  data: {
    user?: SocketUser;
    [key: string]: unknown;
  };
};

type JwtPayload = {
  sub?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  role?: string;
};

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<SocketWithUser>();
    this.authenticateClient(client);
    return true;
  }

  authenticateClient(client: SocketWithUser): SocketUser {
    if (client.data?.user) {
      return client.data.user;
    }

    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Missing websocket token');
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new UnauthorizedException('ACCESS_TOKEN_SECRET is not configured');
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret,
    });

    const id = payload.sub ?? payload.userId;
    if (!id) {
      throw new UnauthorizedException('Invalid websocket token payload');
    }

    const user: SocketUser = {
      id,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };

    client.data.user = user;
    return user;
  }

  private extractToken(client: Socket): string | undefined {
    const token = client.handshake.query?.token;

    if (Array.isArray(token)) {
      return token[0];
    }

    return typeof token === 'string' ? token : undefined;
  }
}
