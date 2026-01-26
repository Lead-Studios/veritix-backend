import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketType } from './entities/ticket-type.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { TicketBlockchainHelper } from './helpers/ticket-blockchain.helper';

/**
 * Tickets Module for VeriTix
 *
 * This module handles ticket and ticket type management, providing
 * services for ticket-related operations across the VeriTix system.
 *
 * Responsibilities:
 * - Ticket type CRUD operations
 * - Ticket purchase and management
 * - Ticket ownership tracking
 * - Ticket code generation and validation
 * - Ticket transfer handling
 *
 * The TicketsService is exported for use by other modules that need
 * to access ticket data (e.g., VerificationModule).
 *
 * Usage:
 * ```typescript
 * // In another module that needs ticket services
 * @Module({
 *   imports: [TicketsModule],
 * })
 * export class VerificationModule {}
 *
 * // In a service
 * @Injectable()
 * export class VerificationService {
 *   constructor(private readonly ticketsService: TicketsService) {}
 *
 *   async verifyTicket(ticketCode: string) {
 *     return this.ticketsService.validateTicketCode(ticketCode);
 *   }
 * }
 * ```
 */
@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketType]), BlockchainModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketBlockchainHelper],
  exports: [TicketsService, TicketBlockchainHelper],
})
export class TicketsModule {}
