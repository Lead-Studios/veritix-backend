import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_METADATA_KEYS, AuthenticatedUser } from '../types/auth.types';

/** Extended request interface with optional user property */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Guard that enforces role-based access control (RBAC).
 *
 * This guard checks if the authenticated user has at least one of the
 * required roles specified via the @Roles() decorator.
 *
 * Usage:
 * ```typescript
 * @UseGuards(AuthenticatedGuard, RolesGuard)
 * @Roles('admin', 'moderator')
 * @Get('admin-only')
 * getAdminResource() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines if the current user has the required roles.
   * @param context - The execution context
   * @returns Boolean indicating if access is granted
   * @throws ForbiddenException if user lacks required roles
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      AUTH_METADATA_KEYS.ROLES,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    const userRoles = user.roles || [];
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
