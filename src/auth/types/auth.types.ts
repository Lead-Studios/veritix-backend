/**
 * Authentication Types and Interfaces for VeriTix
 *
 * This file defines the core abstractions for authentication in the VeriTix system.
 * These interfaces provide extensibility for different authentication strategies
 * (JWT, wallet-based, etc.) without coupling to specific implementations.
 */

/**
 * Represents the authenticated user identity in the system.
 * This interface abstracts user identity for use across modules.
 */
export interface AuthenticatedUser {
  /** Unique identifier for the user */
  id: string;

  /** User's email address */
  email?: string;

  /** User's roles for authorization */
  roles?: string[];

  /** Optional wallet address for blockchain-based auth */
  walletAddress?: string;

  /** Additional metadata that may be attached by auth strategies */
  metadata?: Record<string, unknown>;
}

/**
 * Authentication strategy interface.
 * Implement this interface to create custom authentication strategies
 * (e.g., JWT, wallet signature, OAuth).
 */
export interface AuthenticationStrategy {
  /**
   * Validates the provided credentials/token and returns the authenticated user.
   * @param credentials - The credentials to validate (token, signature, etc.)
   * @returns Promise resolving to the authenticated user or null if invalid
   */
  validate(credentials: unknown): Promise<AuthenticatedUser | null>;

  /**
   * Optional method to check if the strategy supports the given credential type.
   * @param credentials - The credentials to check
   * @returns Boolean indicating if this strategy can handle the credentials
   */
  supports?(credentials: unknown): boolean;
}

/**
 * Authorization strategy interface for resource-based access control.
 * Implement this to define custom ownership/access rules.
 */
export interface AuthorizationStrategy {
  /**
   * Checks if the user has access to the specified resource.
   * @param user - The authenticated user
   * @param resource - The resource being accessed
   * @param action - The action being performed (e.g., 'read', 'write', 'delete')
   * @returns Promise resolving to boolean indicating access permission
   */
  canAccess(
    user: AuthenticatedUser,
    resource: unknown,
    action: string,
  ): Promise<boolean>;
}

/**
 * Resource ownership context passed to ownership guards.
 * Contains information about the resource being accessed.
 */
export interface OwnershipContext {
  /** The type of resource (e.g., 'event', 'ticket') */
  resourceType: string;

  /** The ID of the resource */
  resourceId: string;

  /** The field on the resource that contains the owner ID */
  ownerField?: string;
}

/**
 * Auth module configuration options.
 * Used for configuring the authentication module behavior.
 */
export interface AuthModuleOptions {
  /** Whether to enable global guards */
  global?: boolean;

  /** Default roles required for authenticated routes */
  defaultRoles?: string[];

  /** Custom authentication strategies to register */
  strategies?: AuthenticationStrategy[];
}

/**
 * Token payload interface for JWT-based authentication.
 * This is a placeholder for future JWT implementation.
 */
export interface TokenPayload {
  /** Subject - typically the user ID */
  sub: string;

  /** User's email */
  email?: string;

  /** User's roles */
  roles?: string[];

  /** Token issued at timestamp */
  iat?: number;

  /** Token expiration timestamp */
  exp?: number;
}

/**
 * Constants for authentication-related metadata keys.
 * Used by decorators and guards for reflection.
 */
export const AUTH_METADATA_KEYS = {
  /** Metadata key for public routes (no auth required) */
  IS_PUBLIC: 'isPublic',

  /** Metadata key for required roles */
  ROLES: 'roles',

  /** Metadata key for ownership configuration */
  OWNERSHIP: 'ownership',

  /** Metadata key for custom auth strategy */
  AUTH_STRATEGY: 'authStrategy',
} as const;
