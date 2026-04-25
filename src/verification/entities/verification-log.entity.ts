import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';

@Entity('verification_logs')
export class VerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ticketId: string;

  @Column()
  status: string;

  @Column()
  markAsUsed: boolean;

  @Column('uuid', { nullable: true })
  verifiedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
  @Column()
  eventId: string;

  @Column()
  ticketId: string;

  @Column()
  scannedBy: string; // User ID who performed the scan

  @Column({ type: 'boolean' })
  verified: boolean; // Whether the ticket was verified as valid

  @Column({ nullable: true })
  rejectionReason?: string; // Reason if verification failed

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'scannedBy' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  verifiedAt: Date;
}
