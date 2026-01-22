import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { AUTH_METADATA_KEYS, OwnershipContext } from '../types/auth.types';
import { AuthenticatedGuard } from '../guards/authenticated.guard';
import { RolesGuard } from '../guards/roles.guard';
import { OwnershipGuard } from '../guards/ownership.guard';

/**
 * Decorator to mark a route as public (no authentication required).
 *
 * Usage:
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 * ```
 */
export const Public = () => SetMetadata(AUTH_METADATA_KEYS.IS_PUBLIC, true);

/**
 * Decorator to specify required roles for a route.
 *
 * Usage:
 * ```typescript
 * @Roles('admin', 'moderator')
 * @Get('admin')
 * getAdminData() { ... }
 * ```
 *
 * @param roles - The roles required to access the route
 */
export const Roles = (...roles: string[]) =>
  SetMetadata(AUTH_METADATA_KEYS.ROLES, roles);

/**
 * Decorator to configure ownership-based access control.
 *
 * Usage:
 * ```typescript
 * @Ownership({ resourceType: 'event', ownerField: 'organizerId' })
 * @Patch(':id')
 * updateEvent() { ... }
 * ```
 *
 * @param context - The ownership context configuration
 */
export const Ownership = (context: Omit<OwnershipContext, 'resourceId'>) =>
  SetMetadata(AUTH_METADATA_KEYS.OWNERSHIP, context);

/**
 * Composite decorator that applies AuthenticatedGuard.
 * Ensures the request is made by an authenticated user.
 *
 * Usage:
 * ```typescript
 * @Authenticated()
 * @Get('profile')
 * getProfile() { ... }
 * ```
 */
export const Authenticated = () =>
  applyDecorators(UseGuards(AuthenticatedGuard));

/**
 * Composite decorator that applies AuthenticatedGuard and RolesGuard.
 * Ensures the request is made by an authenticated user with the specified roles.
 *
 * Usage:
 * ```typescript
 * @RequireRoles('admin')
 * @Get('admin-only')
 * adminEndpoint() { ... }
 * ```
 *
 * @param roles - The roles required to access the route
 */
export const RequireRoles = (...roles: string[]) =>
  applyDecorators(Roles(...roles), UseGuards(AuthenticatedGuard, RolesGuard));

/**
 * Composite decorator that applies AuthenticatedGuard and OwnershipGuard.
 * Ensures the request is made by an authenticated user who owns the resource.
 *
 * Usage:
 * ```typescript
 * @RequireOwnership({ resourceType: 'event', ownerField: 'organizerId' })
 * @Patch(':id')
 * updateEvent() { ... }
 * ```
 *
 * @param context - The ownership context configuration
 */
export const RequireOwnership = (
  context: Omit<OwnershipContext, 'resourceId'>,
) =>
  applyDecorators(
    Ownership(context),
    UseGuards(AuthenticatedGuard, OwnershipGuard),
  );

/**
 * Composite decorator for admin-only routes.
 * Shorthand for @RequireRoles('admin').
 *
 * Usage:
 * ```typescript
 * @AdminOnly()
 * @Delete(':id')
 * deleteResource() { ... }
 * ```
 */
export const AdminOnly = () => RequireRoles('admin');
