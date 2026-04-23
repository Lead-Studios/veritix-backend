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
  description: string;
  location: string;
  eventDate: Date;
  status: EventStatus;
  capacity: number;
  isArchived: boolean;
  organizerId: string;
  organizer: { id: string; fullName: string; email: string };
  ticketTypes: TicketTypeResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
