import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../entities/ticket.entity';

export class TicketResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  id: string;

  @ApiProperty({
    example: 'TKT-QR-ABC123XYZ',
    description: 'Unique QR code value for scanning at the event',
  })
  qrCode: string;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description:
      'Base64 PNG data URI of the QR code image. Render directly in an <img> src attribute. ' +
      'Null if QR generation failed at issuance.',
    nullable: true,
  })
  qrCodeImage: string | null;

  @ApiProperty({ enum: TicketStatus, example: TicketStatus.ISSUED })
  status: TicketStatus;

  @ApiProperty({ example: 'ORD-2025-00123', nullable: true })
  orderReference: string | null;

  @ApiProperty({ example: 'attendee@example.com', nullable: true })
  attendeeEmail: string | null;

  @ApiProperty({ example: 'Alice Johnson', nullable: true })
  attendeeName: string | null;

  @ApiProperty({ example: '{"seat":"A12"}', nullable: true })
  metadata: string | null;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  ticketTypeId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  eventId: string;

  @ApiProperty({
    example: '2025-09-15T10:32:00.000Z',
    nullable: true,
    description: 'Timestamp when the ticket was scanned at entry',
  })
  scannedAt: Date | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Timestamp when a refund was processed',
  })
  refundedAt: Date | null;

  @ApiProperty({ example: '2025-07-20T09:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-09-15T10:32:00.000Z' })
  updatedAt: Date;
}
