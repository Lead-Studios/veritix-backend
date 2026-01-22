import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_METADATA_KEYS, AuthenticatedUser } from '../types/auth.types';

/** Extended request interface with optional user property */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Guard that ensures the request is made by an authenticated user.
 *
 * This guard checks for the presence of a user object on the request,
 * which should be populated by an authentication middleware or strategy.
 *
 * Usage:
 * ```typescript
 * @UseGuards(AuthenticatedGuard)
 * @Get('protected')
 * getProtectedResource() { ... }
 * ```
 *
 * Or use the @Authenticated() decorator for cleaner syntax.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines if the current request is allowed to proceed.
   * @param context - The execution context
   * @returns Boolean indicating if access is granted
   * @throws UnauthorizedException if user is not authenticated
   */
  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_METADATA_KEYS.IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException(
        'Authentication required to access this resource',
      );
    }

    return true;
  }
}
