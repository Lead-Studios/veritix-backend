import { EventStatus } from '../enums/event-status.enum';

export class TicketTypeResponseDto {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
}

export class EventDetailResponseDto {
  id: string;
  title: string;
  description?: string;
  venue: string;
  city?: string;
  countryCode?: string;
  isVirtual: boolean;
  imageUrl?: string;
  eventDate: Date;
  eventClosingDate?: Date;
  capacity: number;
  tags?: string[];
  isArchived: boolean;
  status: EventStatus;
  organizerId: string;
  organizer: { id: string; fullName: string; email: string };
  ticketTypes?: TicketTypeResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
