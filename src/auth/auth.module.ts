import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { RolesGuard } from './guards/roles.guard';
import { OwnershipGuard } from './guards/ownership.guard';

/**
 * Authentication Module for VeriTix
 *
 * This module provides the authentication and authorization foundation for
 * the VeriTix ticketing system. It includes:
 *
 * - **Guards**: AuthenticatedGuard, RolesGuard, OwnershipGuard
 * - **Decorators**: @Authenticated(), @Roles(), @Ownership(), @Public(), @CurrentUser()
 * - **Service**: AuthService for authentication logic
 * - **Types**: AuthenticatedUser, AuthenticationStrategy interfaces
 *
 * The module is designed for extensibility, allowing future integration of:
 * - JWT-based authentication
 * - Wallet/blockchain-based authentication (Stellar/Soroban)
 * - OAuth providers
 *
 * Usage:
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [AuthModule],
 * })
 * export class AppModule {}
 *
 * // In a controller
 * @Controller('events')
 * export class EventsController {
 *   @Authenticated()
 *   @Get()
 *   getEvents(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 *   @RequireOwnership({ resourceType: 'event', ownerField: 'organizerId' })
 *   @Patch(':id')
 *   updateEvent() { ... }
 * }
 * ```
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthenticatedGuard, RolesGuard, OwnershipGuard],
  exports: [AuthService, AuthenticatedGuard, RolesGuard, OwnershipGuard],
})
export class AuthModule {}
