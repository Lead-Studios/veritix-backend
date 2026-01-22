import { Controller } from '@nestjs/common';

/**
 * Authentication Controller for VeriTix
 *
 * This controller handles authentication-related HTTP endpoints.
 * Currently a placeholder as per the issue scope (no login/registration
 * endpoints are part of this implementation).
 *
 * Future endpoints to be implemented:
 * - POST /auth/login - User login
 * - POST /auth/register - User registration
 * - POST /auth/refresh - Token refresh
 * - POST /auth/logout - User logout
 * - POST /auth/wallet - Wallet-based authentication
 *
 * Note: Endpoint implementations are out of scope for Issue #390.
 * This controller serves as a structural placeholder.
 */
@Controller('auth')
export class AuthController {
  // Endpoint implementations will be added in future issues
  // No business logic in controllers - per architectural requirements
}
