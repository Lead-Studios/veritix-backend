import { TicketStatus } from '../entities/ticket.entity';

export class TicketResponseDto {
  id: string;
  qrCode: string;
  status: TicketStatus;
  orderReference: string | null;
  attendeeEmail: string | null;
  attendeeName: string | null;
  metadata: string | null;
  ticketTypeId: string;
  eventId: string;
  scannedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
