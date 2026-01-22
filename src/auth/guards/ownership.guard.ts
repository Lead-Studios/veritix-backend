import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  AUTH_METADATA_KEYS,
  AuthenticatedUser,
  OwnershipContext,
} from '../types/auth.types';

/** Extended request interface with user and ownership properties */
interface OwnershipRequest extends Request {
  user?: AuthenticatedUser;
  ownershipContext?: OwnershipContext & { userId: string };
}

/**
 * Guard that enforces resource ownership-based access control.
 *
 * This guard verifies that the authenticated user owns or has access to
 * the resource being requested. It works with the @Ownership() decorator
 * to define ownership rules.
 *
 * Usage:
 * ```typescript
 * @UseGuards(AuthenticatedGuard, OwnershipGuard)
 * @Ownership({ resourceType: 'event', ownerField: 'organizerId' })
 * @Patch(':id')
 * updateEvent(@Param('id') id: string) { ... }
 * ```
 *
 * Note: This is a structural placeholder. The actual ownership verification
 * logic should be implemented when the resource services are available.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines if the current user owns the requested resource.
   * @param context - The execution context
   * @returns Boolean indicating if access is granted
   * @throws ForbiddenException if user doesn't own the resource
   */
  canActivate(context: ExecutionContext): boolean {
    const ownershipConfig = this.reflector.getAllAndOverride<OwnershipContext>(
      AUTH_METADATA_KEYS.OWNERSHIP,
      [context.getHandler(), context.getClass()],
    );

    // If no ownership config is set, skip ownership check
    if (!ownershipConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest<OwnershipRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    // Extract resource ID from request params
    const paramId =
      request.params?.id ||
      request.params?.[`${ownershipConfig.resourceType}Id`];
    const resourceId = Array.isArray(paramId) ? paramId[0] : paramId;

    if (!resourceId) {
      // No resource ID in request, allow through
      // (might be a create operation or list operation)
      return true;
    }

    // Store ownership context for use by controllers/services if needed
    request.ownershipContext = {
      ...ownershipConfig,
      resourceId,
      userId: user.id,
    };

    /**
     * Placeholder for actual ownership verification.
     *
     * In a full implementation, this would:
     * 1. Inject the appropriate service based on resourceType
     * 2. Fetch the resource by ID
     * 3. Compare the owner field with the user ID
     *
     * For now, we return true and leave the verification to be
     * implemented when services are connected.
     *
     * Example future implementation:
     * ```typescript
     * const service = this.getServiceForResource(ownershipConfig.resourceType);
     * const resource = await service.findById(resourceId);
     * const ownerField = ownershipConfig.ownerField || 'ownerId';
     * return resource[ownerField] === user.id;
     * ```
     */

    // Admins bypass ownership check
    if (user.roles?.includes('admin')) {
      return true;
    }

    // TODO: Implement actual ownership verification when services are available
    // For now, return true to allow the request through
    return true;
  }
}
