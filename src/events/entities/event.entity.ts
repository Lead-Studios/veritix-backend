import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { EventStatus } from '../../enums/event-status.enum';
import { TicketType } from '../../tickets/entities/ticket-type.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'timestamp' })
  eventClosingDate: Date;

  @Column({ type: 'text' })
  description: string;

  @Column()
  capacity: number;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ default: false })
  isArchived: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => TicketType, (tt) => tt.event)
  ticketTypes: TicketType[];

  @OneToMany(() => Ticket, (t) => t.event)
  tickets: Ticket[];
}
