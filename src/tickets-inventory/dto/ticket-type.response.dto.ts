import { TicketPriceType } from '../entities/ticket-type.entity';

export class TicketTypeResponseDto {
  id: string;
  name: string;
  description: string;
  priceType: TicketPriceType;
  price: number;
  totalQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  maxPerPerson: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  isActive: boolean;
  isAvailableNow: boolean;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
}
