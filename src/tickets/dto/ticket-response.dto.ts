import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus } from '../interfaces/ticket.interface';

export class TicketResponseDto {
  id: string;

  ticketTypeId: string;

  eventId: string;

  ownerId: string;

  status: TicketStatus;

  ticketCode: string;

  qrCode?: string;

  purchasePrice: number;

  purchaseCurrency: string;

  purchasedAt?: Date;

  usedAt?: Date;

  transactionHash?: string;

  nftTokenId?: string;

  createdAt: Date;

  updatedAt: Date;

  ticketType?: TicketTypeResponseDto;

  event?: EventSummaryDto;

  owner?: UserSummaryDto;
}

export class TicketTypeResponseDto {
  id: string;

  eventId: string;

  name: string;

  description?: string;

  price: number;

  currency: string;

  quantity: number;

  availableQuantity: number;

  maxPerPurchase?: number;

  saleStartDate?: Date;

  saleEndDate?: Date;

  isActive: boolean;

  tier?: string;

  benefits?: string[];

  seatingInfo?: string;

  serviceFee?: number;

  isTransferable: boolean;

  requiresApproval: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export class EventSummaryDto {
  id: string;

  title: string;

  eventDate: Date;

  city?: string;

  countryCode?: string;

  imageUrl?: string;

  status: string;

  isVirtual: boolean;
}

export class UserSummaryDto {
  id: string;

  name?: string;

  email: string;

  avatar?: string;
}

export class TicketSummaryDto {
  id: string;

  ticketCode: string;

  eventId: string;

  ticketTypeName: string;

  status: TicketStatus;

  ownerId: string;

  eventTitle: string;

  eventDate: Date;

  purchasePrice: number;

  purchaseCurrency: string;

  purchasedAt?: Date;

  ownerName?: string;

  ownerEmail?: string;
}
