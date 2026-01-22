import { Injectable } from '@nestjs/common';
import {
  AuthenticatedUser,
  AuthenticationStrategy,
  TokenPayload,
} from './types/auth.types';

/**
 * Authentication Service for VeriTix
 *
 * This service provides the core authentication logic and acts as the primary
 * interface for authentication operations. It is designed to be extensible
 * for different authentication strategies (JWT, wallet-based, OAuth, etc.).
 *
 * Note: This is a foundational structure. Actual authentication logic
 * (token generation, password validation, etc.) will be implemented
 * when specific authentication providers are integrated.
 */
@Injectable()
export class AuthService {
  private strategies: Map<string, AuthenticationStrategy> = new Map();

  /**
   * Registers an authentication strategy.
   * @param name - The name/identifier for the strategy
   * @param strategy - The strategy implementation
   */
  registerStrategy(name: string, strategy: AuthenticationStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Validates credentials using the specified strategy.
   * @param strategyName - The name of the strategy to use
   * @param credentials - The credentials to validate
   * @returns Promise resolving to the authenticated user or null
   */
  async validateWithStrategy(
    strategyName: string,
    credentials: unknown,
  ): Promise<AuthenticatedUser | null> {
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      return null;
    }

    return strategy.validate(credentials);
  }

  /**
   * Validates a user's credentials.
   * Placeholder for future implementation.
   *
   * @param _credentials - The user credentials to validate
   * @returns Promise resolving to the authenticated user or null
   */
  validateUser(_credentials: unknown): Promise<AuthenticatedUser | null> {
    // TODO: Implement when authentication providers are integrated
    // This will typically validate password/token and return user
    return Promise.resolve(null);
  }

  /**
   * Extracts user information from a token payload.
   * Placeholder for JWT integration.
   *
   * @param payload - The token payload
   * @returns The authenticated user extracted from the payload
   */
  extractUserFromPayload(payload: TokenPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
    };
  }

  /**
   * Checks if a user has a specific role.
   * @param user - The authenticated user
   * @param role - The role to check
   * @returns Boolean indicating if the user has the role
   */
  hasRole(user: AuthenticatedUser, role: string): boolean {
    return user.roles?.includes(role) ?? false;
  }

  /**
   * Checks if a user has any of the specified roles.
   * @param user - The authenticated user
   * @param roles - The roles to check
   * @returns Boolean indicating if the user has any of the roles
   */
  hasAnyRole(user: AuthenticatedUser, roles: string[]): boolean {
    if (!user.roles) return false;
    return roles.some((role) => user.roles!.includes(role));
  }

  /**
   * Checks if a user has all of the specified roles.
   * @param user - The authenticated user
   * @param roles - The roles to check
   * @returns Boolean indicating if the user has all of the roles
   */
  hasAllRoles(user: AuthenticatedUser, roles: string[]): boolean {
    if (!user.roles) return false;
    return roles.every((role) => user.roles!.includes(role));
  }
}
