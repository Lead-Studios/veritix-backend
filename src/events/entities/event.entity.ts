import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TicketType } from '../../ticket-types/entities/ticket-type.entity';
import { User } from '../../users/entities/user.entity';
import { EventStatus } from '../enums/event-status.enum';

@Entity('events')
@Index(['status', 'eventDate'])
@Index(['organizerId', 'status'])
@Index(['isArchived', 'status'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ type: 'uuid' })
  organizerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizerId' })
  organizer: User;

  @OneToMany(() => TicketType, (ticketType) => ticketType.event)
  ticketTypes: TicketType[];

  @Column()
  venue: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true, length: 2 })
  countryCode: string;

  @Column({ default: false })
  isVirtual: boolean;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'timestamptz' })
  eventDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  eventClosingDate: Date | null;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @Column('text', { array: true, nullable: true, default: () => "'{}'" })
  tags: string[];

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
