/**
 * Verification Interfaces for VeriTix
 *
 * This file defines the core verification abstractions used for
 * ticket verification at events. These interfaces provide a contract
 * for verification data without coupling to specific implementations.
 */

/**
 * Verification result status.
 */
export enum VerificationStatus {
  /** Ticket is valid and can be used */
  VALID = 'valid',

  /** Ticket is invalid (not found, wrong event, etc.) */
  INVALID = 'invalid',

  /** Ticket has already been used */
  ALREADY_USED = 'already_used',

  /** Ticket has been cancelled */
  CANCELLED = 'cancelled',

  /** Ticket has expired */
  EXPIRED = 'expired',

  /** Event has not started yet */
  EVENT_NOT_STARTED = 'event_not_started',

  /** Event has already ended */
  EVENT_ENDED = 'event_ended',
}

/**
 * Verification result interface.
 * Contains the result of a ticket verification attempt.
 */
export interface VerificationResult {
  /** The verification status */
  status: VerificationStatus;

  /** Whether the ticket is valid for entry */
  isValid: boolean;

  /** Human-readable message */
  message: string;

  /** The ticket details (if found) */
  ticket?: VerifiedTicketInfo;

  /** Timestamp of verification */
  verifiedAt: Date;

  /** ID of the staff member who performed verification */
  verifiedBy?: string;
}

/**
 * Verified ticket information.
 * Contains ticket details returned after successful verification.
 */
export interface VerifiedTicketInfo {
  /** Ticket ID */
  ticketId: string;

  /** Ticket code that was verified */
  ticketCode: string;

  /** Event ID */
  eventId: string;

  /** Event title */
  eventTitle: string;

  /** Ticket type name */
  ticketTypeName: string;

  /** Ticket holder's name (if available) */
  holderName?: string;

  /** Seat/section information (if applicable) */
  seatInfo?: string;
}

/**
 * Verification request data.
 */
export interface VerificationRequest {
  /** The ticket code to verify */
  ticketCode: string;

  /** The event ID (optional, for additional validation) */
  eventId?: string;

  /** The ID of the staff member performing verification */
  verifierId?: string;

  /** Whether to mark the ticket as used upon successful verification */
  markAsUsed?: boolean;
}

/**
 * Verification log entry.
 * Records verification attempts for audit purposes.
 */
export interface VerificationLog {
  /** Unique identifier for the log entry */
  id: string;

  /** The ticket code that was verified */
  ticketCode: string;

  /** The ticket ID (if found) */
  ticketId?: string;

  /** The event ID */
  eventId: string;

  /** The verification result status */
  status: VerificationStatus;

  /** ID of the staff member who performed verification */
  verifierId?: string;

  /** Verification timestamp */
  verifiedAt: Date;

  /** Device/location information */
  deviceInfo?: string;
}

/**
 * Verification statistics for an event.
 */
export interface VerificationStats {
  /** Event ID */
  eventId: string;

  /** Total tickets for the event */
  totalTickets: number;

  /** Number of tickets verified/used */
  verifiedCount: number;

  /** Number of remaining valid tickets */
  remainingCount: number;

  /** Percentage of tickets verified */
  verificationRate: number;

  /** Stats calculated at timestamp */
  calculatedAt: Date;
}
