import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Seat } from './seat.entity';
import { User } from '../../user/entities/user.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  TRANSFERRED = 'transferred',
  CANCELLED = 'cancelled',
}

@Entity('seat_assignments')
export class SeatAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.ASSIGNED })
  status: AssignmentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purchaseReference: string; // Reference to payment/purchase system

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  assignedPrice: number; // Price at time of assignment

  @Column({ type: 'timestamp' })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  transferredAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transferReference?: string;

  @OneToOne(() => Seat, (seat) => seat.assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatId' })
  seat: Seat;

  @Column()
  seatId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ nullable: true })
  ticketId: string;

  // Transfer history
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'transferredFromUserId' })
  transferredFromUser: User;

  @Column({ nullable: true })
  transferredFromUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
