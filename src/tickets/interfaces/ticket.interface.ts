/**
 * Ticket Interfaces for VeriTix
 *
 * This file defines the core ticket abstractions used across
 * the VeriTix ticketing system. These interfaces provide a contract
 * for ticket data without coupling to specific database implementations.
 */

/**
 * Ticket status enumeration.
 * Defines the lifecycle states of a ticket.
 */
export enum TicketStatus {
  /** Ticket is available for purchase */
  AVAILABLE = 'available',

  /** Ticket has been reserved but not yet paid */
  RESERVED = 'reserved',

  /** Ticket has been purchased */
  PURCHASED = 'purchased',

  /** Ticket has been used/scanned at event */
  USED = 'used',

  /** Ticket has been cancelled/refunded */
  CANCELLED = 'cancelled',

  /** Ticket has expired (event passed without use) */
  EXPIRED = 'expired',
}

/**
 * Ticket type interface.
 * Represents a category of tickets for an event (e.g., VIP, General, Early Bird).
 */
export interface TicketType {
  /** Unique identifier for the ticket type */
  id: string;

  /** ID of the event this ticket type belongs to */
  eventId: string;

  /** Name of the ticket type */
  name: string;

  /** Description of what's included */
  description?: string;

  /** Price in the smallest currency unit (e.g., cents) */
  price: number;

  /** Currency code (e.g., 'USD', 'XLM') */
  currency: string;

  /** Total quantity available */
  quantity: number;

  /** Quantity currently available */
  availableQuantity: number;

  /** Maximum tickets per purchase */
  maxPerPurchase?: number;

  /** Sale start date */
  saleStartDate?: Date;

  /** Sale end date */
  saleEndDate?: Date;

  /** Whether the ticket type is active */
  isActive: boolean;

  /** Creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Core ticket interface.
 * Represents an individual ticket in the VeriTix system.
 */
export interface Ticket {
  /** Unique identifier for the ticket */
  id: string;

  /** ID of the ticket type */
  ticketTypeId: string;

  /** ID of the event */
  eventId: string;

  /** ID of the ticket owner (user) */
  ownerId: string;

  /** Current status of the ticket */
  status: TicketStatus;

  /** Unique ticket code for verification */
  ticketCode: string;

  /** QR code data or URL */
  qrCode?: string;

  /** Purchase price at time of purchase */
  purchasePrice: number;

  /** Currency at time of purchase */
  purchaseCurrency: string;

  /** Purchase timestamp */
  purchasedAt?: Date;

  /** Used/scanned timestamp */
  usedAt?: Date;

  /** Blockchain transaction hash (if applicable) */
  transactionHash?: string;

  /** NFT token ID (if minted as NFT) */
  nftTokenId?: string;

  /** Creation timestamp */
  createdAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Ticket summary for list views.
 */
export interface TicketSummary {
  id: string;
  ticketCode: string;
  eventId: string;
  ticketTypeName: string;
  status: TicketStatus;
  ownerId: string;
}

/**
 * Ticket type creation data.
 */
export interface CreateTicketTypeData {
  eventId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  maxPerPurchase?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
}

/**
 * Ticket type update data.
 */
export interface UpdateTicketTypeData {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  maxPerPurchase?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  isActive?: boolean;
}

/**
 * Ticket purchase request data.
 */
export interface PurchaseTicketData {
  ticketTypeId: string;
  quantity: number;
  buyerId: string;
}

/**
 * Ticket transfer data.
 */
export interface TransferTicketData {
  ticketId: string;
  fromUserId: string;
  toUserId: string;
}
