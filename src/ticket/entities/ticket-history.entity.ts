import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Ticket } from './ticket.entity';

@Entity()
export class TicketHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Ticket)
  ticket: Ticket;

  @Column('decimal')
  amount: number;

  @CreateDateColumn()
  purchaseDate: Date;

  @Column()
  transactionId: string;
} 