import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
} from 'typeorm';
import { EventStatus } from '../../enums/event-status.enum';

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
  ticketTypes: any;
}
