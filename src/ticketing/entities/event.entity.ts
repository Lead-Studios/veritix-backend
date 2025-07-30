import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TicketingTicket } from './ticket.entity';

export enum TicketType {
  QR = 'qr',
  NFT = 'nft',
  HYBRID = 'hybrid',
}

@Entity('ticketing_events')
export class TicketingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'uuid' })
  organizerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ticketPrice: number;

  @Column({ type: 'int', default: 0 })
  maxCapacity: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: TicketType,
    default: TicketType.QR,
  })
  ticketType: TicketType;

  @Column({ type: 'boolean', default: false })
  nftEnabled: boolean;

  @OneToMany(() => TicketingTicket, (ticket) => ticket.event)
  ticketingTickets: TicketingTicket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
