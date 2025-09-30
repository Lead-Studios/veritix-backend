import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Ticket } from './ticket.entity';

export enum TransferType {
  PURCHASE = 'purchase',
  RESALE = 'resale',
  GIFT = 'gift',
}

@Entity()
export class TicketTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.transfers, { onDelete: 'CASCADE' })
  ticket: Ticket;

  @ManyToOne(() => User, { eager: true })
  fromUser: User;

  @ManyToOne(() => User, { eager: true })
  toUser: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  transferPrice: number;

  @Column({
    type: 'enum',
    enum: TransferType,
    default: TransferType.PURCHASE,
  })
  transferType: TransferType;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  transferDate: Date;
}

