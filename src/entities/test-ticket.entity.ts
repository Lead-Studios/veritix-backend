import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { TestEvent } from './test-event.entity';
import { TicketTransfer } from '../../ticket/ticket-transfer.entity';

export enum TicketStatus {
  ACTIVE = 'active',
  TRANSFERRED = 'transferred',
  USED = 'used',
  CANCELLED = 'cancelled',
}

@Entity()
export class TestTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketNumber: string;

  @Column({
    type: 'text',
    default: TicketStatus.ACTIVE,
  })
  status: TicketStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPrice: number;

  @Column({ type: 'datetime' })
  purchaseDate: Date;

  @Column({ type: 'datetime', nullable: true })
  lastTransferDate: Date;

  @Column({ type: 'int', default: 0 })
  transferCount: number;

  @ManyToOne(() => User, { eager: true })
  currentOwner: User;

  @ManyToOne(() => User, { eager: true })
  originalOwner: User;

  @ManyToOne(() => TestEvent, { eager: true })
  event: TestEvent;

  @OneToMany(() => TicketTransfer, (transfer) => transfer.ticket)
  transfers: TicketTransfer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
