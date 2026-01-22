import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core domain modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { VerificationModule } from './verification/verification.module';
import { ContactModule } from './contact/contact.module';

/**
 * Root Application Module for VeriTix Backend
 *
 * This module serves as the entry point for the VeriTix ticketing system.
 * It imports and registers all core domain modules.
 *
 * Modules:
 * - AuthModule: Authentication and authorization foundation
 * - UsersModule: User identity and profile management
 * - EventsModule: Event lifecycle management
 * - TicketsModule: Ticket and ticket type management
 * - VerificationModule: Ticket verification at events
 * - ContactModule: Contact inquiry handling
 *
 * Architecture:
 * - Each module follows NestJS best practices
 * - Services contain domain logic
 * - Controllers are structural placeholders (no business logic)
 * - Guards and decorators provide reusable auth concerns
 * - Explicit cross-module communication via exports
 */
@Module({
  imports: [
    // Authentication foundation - provides guards, decorators, and auth service
    AuthModule,

    // User identity management - provides user service for ownership verification
    UsersModule,

    // Event management - event CRUD and lifecycle
    EventsModule,

    // Ticket management - tickets and ticket types
    TicketsModule,

    // Ticket verification - check-in and verification operations
    VerificationModule,

    // Contact handling - user inquiries and support
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
