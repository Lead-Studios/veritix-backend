/**
 * Auth Module Barrel Export
 *
 * Re-exports all public auth module components for easy importing.
 *
 * Usage:
 * ```typescript
 * import {
 *   AuthModule,
 *   AuthService,
 *   Authenticated,
 *   CurrentUser,
 *   Roles,
 * } from './auth';
 * ```
 */

// Module
export { AuthModule } from './auth.module';

// Service
export { AuthService } from './auth.service';

// Guards
export { AuthenticatedGuard, RolesGuard, OwnershipGuard } from './guards';

// Decorators
export {
  Public,
  Roles,
  Ownership,
  Authenticated,
  RequireRoles,
  RequireOwnership,
  AdminOnly,
  CurrentUser,
} from './decorators';

// Types (use export type for interfaces)
export type {
  AuthenticatedUser,
  AuthenticationStrategy,
  AuthorizationStrategy,
  OwnershipContext,
  AuthModuleOptions,
  TokenPayload,
} from './types/auth.types';

// Constants
export { AUTH_METADATA_KEYS } from './types/auth.types';
