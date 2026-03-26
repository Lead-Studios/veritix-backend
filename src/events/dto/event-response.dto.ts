import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriceType } from '../../tickets-inventory/entities/ticket-type.entity';

export class TicketTypeSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() price: number;
  @ApiProperty() currency: string;
  @ApiProperty() availableQuantity: number;
  @ApiProperty() isActive: boolean;
}

export class EventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() eventDate: Date;
  @ApiProperty() eventClosingDate: Date;
  @ApiProperty() capacity: number;
  @ApiProperty() status: string;
  @ApiProperty() isArchived: boolean;

  @ApiPropertyOptional() venue?: string;
  @ApiPropertyOptional() address?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() countryCode?: string;
  @ApiPropertyOptional() imageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional() isVirtual?: boolean;
  @ApiPropertyOptional() streamingUrl?: string;
  @ApiPropertyOptional() minTicketPrice?: number;
  @ApiPropertyOptional() maxTicketPrice?: number;
  @ApiPropertyOptional() currency?: string;

  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  @ApiPropertyOptional() totalTicketsSold?: number;
  @ApiPropertyOptional() availableTickets?: number;

  @ApiPropertyOptional({ type: [TicketTypeSummaryDto] })
  ticketTypes?: TicketTypeSummaryDto[];
}

export class EventDetailTicketTypeDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: TicketPriceType }) priceType: TicketPriceType;
  @ApiProperty() price: number;
  @ApiProperty() totalQuantity: number;
  @ApiProperty() soldQuantity: number;
  @ApiProperty() remainingQuantity: number;
  @ApiProperty() isAvailableNow: boolean;
  @ApiPropertyOptional() saleStartsAt?: Date | null;
  @ApiPropertyOptional() saleEndsAt?: Date | null;
}

export class EventDetailResponseDto extends EventResponseDto {
  @ApiProperty({ type: [EventDetailTicketTypeDto] })
  ticketTypes: EventDetailTicketTypeDto[];
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
