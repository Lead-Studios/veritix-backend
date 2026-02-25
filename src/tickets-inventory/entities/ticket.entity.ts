import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TicketType } from './ticket-type.entity';
import { Event } from '../../events/entities/event.entity';

export enum TicketStatus {
  ISSUED = 'issued',
  SCANNED = 'scanned',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('tickets')
@Index(['ticketTypeId', 'status'])
@Index(['eventId', 'status'])
@Index(['orderReference'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    unique: true,
    generated: 'uuid',
    comment: 'Unique QR code identifier for scanning',
  })
  qrCode: string;

  @Column({
    type: 'text',
    nullable: true,
    comment:
      'Base64 PNG data URI of the QR code image (data:image/png;base64,...). ' +
      'Generated at issuance; null if generation failed.',
  })
  qrCodeImage: string | null;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.ISSUED,
  })
  status: TicketStatus;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Reference to order/transaction if purchased',
  })
  orderReference: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Attendee email or contact info',
  })
  attendeeEmail: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Attendee name',
  })
  attendeeName: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Additional metadata as JSON',
  })
  metadata: string;

  @Column()
  ticketTypeId: string;

  @Column()
  eventId: string;

  @ManyToOne(() => TicketType, (ticketType) => ticketType.tickets, {
    onDelete: 'CASCADE',
  })
  ticketType: TicketType;

  @ManyToOne(() => Event, {
    onDelete: 'CASCADE',
  })
  event: Event;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When ticket was scanned/used',
  })
  scannedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When ticket was refunded',
  })
  refundedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Check if ticket can be scanned
   */
  canBeScanned(): boolean {
    return this.status === TicketStatus.ISSUED;
  }

  /**
   * Mark ticket as scanned
   */
  markAsScanned(): void {
    if (!this.canBeScanned()) {
      throw new Error(`Cannot scan ticket with status: ${this.status}`);
    }
    this.status = TicketStatus.SCANNED;
    this.scannedAt = new Date();
  }

  /**
   * Mark ticket as refunded
   */
  markAsRefunded(): void {
    this.status = TicketStatus.REFUNDED;
    this.refundedAt = new Date();
  }
}
