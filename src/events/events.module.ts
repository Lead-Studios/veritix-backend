import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { EventBlockchainHelper } from './helpers/event-blockchain.helper';
import { Event } from './entities/event.entity';

/**
 * Events Module for VeriTix
 *
 * This module handles event lifecycle management and provides services
 * for event-related operations across the VeriTix system.
 *
 * Responsibilities:
 * - Event CRUD operations
 * - Event status management (draft, published, cancelled, completed)
 * - Event ownership verification
 * - Event filtering and discovery
 *
 * The EventsService is exported for use by other modules that need
 * to access event data (e.g., TicketsModule, VerificationModule).
 *
 * Usage:
 * ```typescript
 * // In another module that needs event services
 * @Module({
 *   imports: [EventsModule],
 * })
 * export class TicketsModule {}
 *
 * // In a service
 * @Injectable()
 * export class TicketsService {
 *   constructor(private readonly eventsService: EventsService) {}
 *
 *   async validateEventExists(eventId: string) {
 *     return this.eventsService.exists(eventId);
 *   }
 * }
 * ```
 */
@Module({
  imports: [TypeOrmModule.forFeature([Event]), BlockchainModule],
  controllers: [EventsController],
  providers: [EventsService, EventBlockchainHelper],
  exports: [EventsService, EventBlockchainHelper],
})
export class EventsModule {}
