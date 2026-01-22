import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

/**
 * Users Module for VeriTix
 *
 * This module handles user identity management and provides services
 * for user-related operations across the VeriTix system.
 *
 * Responsibilities:
 * - User identity management
 * - User profile operations
 * - Ownership verification support
 *
 * The UsersService is exported for use by other modules that need
 * to verify user identity or ownership (e.g., EventsModule, TicketsModule).
 *
 * Usage:
 * ```typescript
 * // In another module that needs user services
 * @Module({
 *   imports: [UsersModule],
 * })
 * export class EventsModule {}
 *
 * // In a service
 * @Injectable()
 * export class EventsService {
 *   constructor(private readonly usersService: UsersService) {}
 *
 *   async verifyOwnership(userId: string, ownerId: string) {
 *     return this.usersService.isOwner(userId, ownerId);
 *   }
 * }
 * ```
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
