/**
 * Events Module Barrel Export
 *
 * Re-exports all public events module components for easy importing.
 */

// Module
export { EventsModule } from './events.module';

// Service
export { EventsService } from './events.service';

// Enums (runtime values)
export { EventStatus } from './interfaces/event.interface';

// Types (use export type for interfaces)
export type {
  Event,
  EventSummary,
  CreateEventData,
  UpdateEventData,
  EventFilterOptions,
} from './interfaces/event.interface';
