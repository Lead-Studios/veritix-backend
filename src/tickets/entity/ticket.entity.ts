import { TicketPurchaseStatus } from '../enums/ticket-purchase-status.enum';
import { Address } from '../interfaces/address.interface';
import { BillingDetails } from '../interfaces/billing-details.interface';

export class TicketPurchase {
  id: string;
  userId: string;
  eventId: string;
  ticketQuantity: number;
  pricePerTicket: number;
  totalPrice: number;
  billingDetails: BillingDetails;
  address: Address;
  paymentConfirmationId: string;
  status: TicketPurchaseStatus;
  transactionDate: Date;
  type?: 'conference' | 'session';
  sessions?: string[] | 'all';
}
