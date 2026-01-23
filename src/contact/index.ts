/**
 * Contact Module Barrel Export
 *
 * Re-exports all public contact module components for easy importing.
 */

// Module
export { ContactModule } from './contact.module';

// Service
export { ContactService } from './contact.service';

// Enums (runtime values)
export { ContactStatus, ContactCategory } from './interfaces/contact.interface';

// Types (use export type for interfaces)
export type {
  ContactInquiry,
  ContactSummary,
  CreateContactData,
  UpdateContactData,
  ContactFilterOptions,
} from './interfaces/contact.interface';
