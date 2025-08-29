import { SetMetadata } from '@nestjs/common';
import { ApiPermission } from '../entities/api-key.entity';

export const API_PERMISSIONS_KEY = 'api_permissions';
export const API_SCOPES_KEY = 'api_scopes';
export const SKIP_API_AUTH_KEY = 'skip_api_auth';

/**
 * Decorator to specify required API permissions for an endpoint
 */
export const RequireApiPermissions = (...permissions: ApiPermission[]) =>
  SetMetadata(API_PERMISSIONS_KEY, permissions);

/**
 * Decorator to specify required API scopes for an endpoint
 */
export const RequireApiScopes = (...scopes: string[]) =>
  SetMetadata(API_SCOPES_KEY, scopes);

/**
 * Decorator to skip API authentication for an endpoint
 */
export const SkipApiAuth = () => SetMetadata(SKIP_API_AUTH_KEY, true);

/**
 * Decorator for read-only endpoints
 */
export const ApiReadOnly = () => RequireApiPermissions(ApiPermission.READ);

/**
 * Decorator for write endpoints
 */
export const ApiWrite = () => RequireApiPermissions(ApiPermission.WRITE);

/**
 * Decorator for admin endpoints
 */
export const ApiAdmin = () => RequireApiPermissions(ApiPermission.ADMIN);

/**
 * Decorator for delete endpoints
 */
export const ApiDelete = () => RequireApiPermissions(ApiPermission.DELETE);
