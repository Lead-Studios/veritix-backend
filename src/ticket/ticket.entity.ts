import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Event } from '../modules/event/event.entity';
import { TicketTransfer } from './ticket-transfer.entity';

export enum TicketStatus {
  ACTIVE = 'active',
  TRANSFERRED = 'transferred',
  USED = 'used',
  CANCELLED = 'cancelled',
}

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketNumber: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.ACTIVE,
  })
  status: TicketStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPrice: number;

  @Column({ type: 'timestamp' })
  purchaseDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastTransferDate: Date;

  @Column({ type: 'int', default: 0 })
  transferCount: number;

  @ManyToOne(() => User, { eager: true })
  currentOwner: User;

  @ManyToOne(() => User, { eager: true })
  originalOwner: User;

  @ManyToOne(() => Event, { eager: true })
  event: Event;

  @OneToMany(() => TicketTransfer, (transfer) => transfer.ticket)
  transfers: TicketTransfer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

