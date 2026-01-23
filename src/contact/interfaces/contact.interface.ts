/**
 * Contact Interfaces for VeriTix
 *
 * This file defines the core contact/inquiry abstractions used for
 * handling user inquiries, support requests, and contact submissions
 * in the VeriTix system.
 */

/**
 * Contact inquiry status.
 */
export enum ContactStatus {
  /** New inquiry, not yet reviewed */
  NEW = 'new',

  /** Inquiry has been reviewed but not responded */
  REVIEWED = 'reviewed',

  /** Response has been sent */
  RESPONDED = 'responded',

  /** Inquiry has been resolved */
  RESOLVED = 'resolved',

  /** Inquiry has been closed without resolution */
  CLOSED = 'closed',
}

/**
 * Contact inquiry category.
 */
export enum ContactCategory {
  /** General inquiry */
  GENERAL = 'general',

  /** Support request */
  SUPPORT = 'support',

  /** Feedback */
  FEEDBACK = 'feedback',

  /** Bug report */
  BUG_REPORT = 'bug_report',

  /** Feature request */
  FEATURE_REQUEST = 'feature_request',

  /** Billing/payment related */
  BILLING = 'billing',

  /** Event organizer inquiry */
  ORGANIZER = 'organizer',

  /** Partnership inquiry */
  PARTNERSHIP = 'partnership',
}

/**
 * Contact inquiry interface.
 * Represents a contact submission in the VeriTix system.
 */
export interface ContactInquiry {
  /** Unique identifier for the inquiry */
  id: string;

  /** Submitter's name */
  name: string;

  /** Submitter's email address */
  email: string;

  /** Inquiry subject */
  subject: string;

  /** Inquiry message body */
  message: string;

  /** Inquiry category */
  category: ContactCategory;

  /** Current status */
  status: ContactStatus;

  /** Associated user ID (if logged in) */
  userId?: string;

  /** Associated event ID (if event-related) */
  eventId?: string;

  /** ID of staff member assigned to handle */
  assignedTo?: string;

  /** Staff response */
  response?: string;

  /** Response timestamp */
  respondedAt?: Date;

  /** Creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Contact inquiry summary for list views.
 */
export interface ContactSummary {
  id: string;
  name: string;
  email: string;
  subject: string;
  category: ContactCategory;
  status: ContactStatus;
  createdAt?: Date;
}

/**
 * Contact submission data (create).
 */
export interface CreateContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: ContactCategory;
  userId?: string;
  eventId?: string;
}

/**
 * Contact update data.
 */
export interface UpdateContactData {
  status?: ContactStatus;
  assignedTo?: string;
  response?: string;
}

/**
 * Contact filter options.
 */
export interface ContactFilterOptions {
  status?: ContactStatus;
  category?: ContactCategory;
  assignedTo?: string;
  userId?: string;
  eventId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
