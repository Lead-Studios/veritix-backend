import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';
  CreateDateColumn,
} from 'typeorm';

@Entity('verification_logs')
@Index(['eventId', 'verifiedAt'])
@Index(['ticketId'])
export class VerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  eventId: string;

  @Column('uuid')
  ticketId: string;

  @Column({ nullable: true })
  eventId: string;

  @Column()
  status: string;

  @Column()
  markAsUsed: boolean;

  @Column('uuid', { nullable: true })
  verifiedBy: string;

  @Column({ nullable: true })
  scannedBy: string;

  @Column({ type: 'boolean', nullable: true })
  verified: boolean;

  @Column({ nullable: true })
  rejectionReason?: string;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'scannedBy' })
  user: User;
  @CreateDateColumn()
  createdAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  verifiedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
