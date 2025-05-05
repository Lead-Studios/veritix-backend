import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketId: string;

  @Column()
  userFullName: string;

  @Column()
  userEmail: string;

  @Column()
  conferenceName: string;

  @Column()
  conferenceDate: Date;

  @Column()
  conferenceLocation: string;

  @Column()
  ticketQuantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerTicket: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amountPaid: number;

  @Column()
  transactionDate: Date;

  @ManyToOne(() => Ticket)
  ticket: Ticket;

  @CreateDateColumn()
  createdAt: Date;
} 