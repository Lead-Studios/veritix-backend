/**
 * Event Interfaces for VeriTix
 *
 * This file defines the core event abstractions used across
 * the VeriTix ticketing system. These interfaces provide a contract
 * for event data without coupling to specific database implementations.
 */

/**
 * Event status enumeration.
 * Defines the lifecycle states of an event.
 */
export enum EventStatus {
  /** Event is being created/edited, not visible to public */
  DRAFT = 'draft',

  /** Event is published and visible to public */
  PUBLISHED = 'published',

  /** Event has been cancelled */
  CANCELLED = 'cancelled',

  /** Event has completed */
  COMPLETED = 'completed',

  /** Event is sold out (all tickets claimed) */
  SOLD_OUT = 'sold_out',
}

/**
 * Core event interface.
 * Represents an event in the VeriTix system.
 */
export interface Event {
  /** Unique identifier for the event */
  id: string;

  /** Event title */
  title: string;

  /** Event description */
  description?: string;

  /** Event venue/location */
  venue: string;

  /** Event start date and time */
  startDate: Date;

  /** Event end date and time */
  endDate?: Date;

  /** Current status of the event */
  status: EventStatus;

  /** ID of the event organizer (user) */
  organizerId: string;

  /** Event cover image URL */
  coverImage?: string;

  /** Maximum capacity for the event */
  capacity?: number;

  /** Event category */
  category?: string;

  /** Event tags for discovery */
  tags?: string[];

  /** Whether the event is featured */
  isFeatured?: boolean;

  /** Event creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Event summary for list views.
 */
export interface EventSummary {
  id: string;
  title: string;
  venue: string;
  startDate: Date;
  status: EventStatus;
  coverImage?: string;
  organizerId: string;
}

/**
 * Event creation data transfer object interface.
 */
export interface CreateEventData {
  title: string;
  description?: string;
  venue: string;
  startDate: Date;
  endDate?: Date;
  organizerId: string;
  coverImage?: string;
  capacity?: number;
  category?: string;
  tags?: string[];
}

/**
 * Event update data transfer object interface.
 */
export interface UpdateEventData {
  title?: string;
  description?: string;
  venue?: string;
  startDate?: Date;
  endDate?: Date;
  coverImage?: string;
  capacity?: number;
  category?: string;
  tags?: string[];
  status?: EventStatus;
}

/**
 * Event filter options for querying.
 */
export interface EventFilterOptions {
  status?: EventStatus;
  organizerId?: string;
  category?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  isFeatured?: boolean;
  tags?: string[];
}
