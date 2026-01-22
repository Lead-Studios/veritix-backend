/**
 * Tickets Module Barrel Export
 *
 * Re-exports all public tickets module components for easy importing.
 */

// Module
export { TicketsModule } from './tickets.module';

// Service
export { TicketsService } from './tickets.service';

// Enums (runtime values)
export { TicketStatus } from './interfaces/ticket.interface';

// Types (use export type for interfaces)
export type {
  Ticket,
  TicketType,
  TicketSummary,
  CreateTicketTypeData,
  UpdateTicketTypeData,
  PurchaseTicketData,
  TransferTicketData,
} from './interfaces/ticket.interface';
