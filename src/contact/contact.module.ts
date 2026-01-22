import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';

/**
 * Contact Module for VeriTix
 *
 * This module handles contact inquiry management, providing services
 * for submitting, tracking, and responding to user inquiries.
 *
 * Responsibilities:
 * - Contact form submission handling
 * - Inquiry tracking and status management
 * - Response management
 * - Inquiry assignment to staff
 *
 * The ContactService is exported for use by other modules that may
 * need to create or manage contact inquiries programmatically.
 *
 * Usage:
 * ```typescript
 * // In a controller or service
 * @Injectable()
 * export class SupportService {
 *   constructor(private readonly contactService: ContactService) {}
 *
 *   async submitTicketIssue(userId: string, ticketId: string, issue: string) {
 *     return this.contactService.submit({
 *       name: 'Ticket Issue',
 *       email: 'user@example.com',
 *       subject: `Issue with ticket ${ticketId}`,
 *       message: issue,
 *       category: ContactCategory.SUPPORT,
 *       userId,
 *     });
 *   }
 * }
 * ```
 */
@Module({
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
