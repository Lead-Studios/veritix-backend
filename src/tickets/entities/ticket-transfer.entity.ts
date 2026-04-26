import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_transfers')
export class TicketTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ticketId: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column('uuid')
  fromUserId: string;

  @Column('uuid')
  toUserId: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  resalePriceUSD: number | null;

  @Column({ default: 'PENDING' })
  status: string; // PENDING, COMPLETED, CANCELLED

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
