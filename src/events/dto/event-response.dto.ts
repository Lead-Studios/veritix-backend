import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, Length, IsBoolean, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class EventResponseDto {
  id: string;

  title: string;

  description: string;

  eventDate: Date;

  eventClosingDate: Date;

  capacity: number;

  status: string;

  isArchived: boolean;

  venue?: string;

  address?: string;

  city?: string;

  countryCode?: string;

  imageUrl?: string;

  tags?: string[];

  isVirtual?: boolean;

  streamingUrl?: string;

  minTicketPrice?: number;

  maxTicketPrice?: number;

  currency?: string;

  createdAt: Date;

  updatedAt: Date;

  totalTicketsSold?: number;

  availableTickets?: number;

  ticketTypes?: TicketTypeSummaryDto[];
}

export class TicketTypeSummaryDto {
  id: string;

  name: string;

  price: number;

  currency: string;

  availableQuantity: number;

  isActive: boolean;
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

  minTicketPrice?: number;

  maxTicketPrice?: number;

  currency?: string;

  totalTicketsSold?: number;

  availableTickets?: number;
}
