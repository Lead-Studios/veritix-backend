import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from './ticket.entity';

@Entity()
@Index(['eventId'])
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, (event) => event.ticketTypes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column('varchar', { length: 120 })
  name: string;

  // Resale/transfer constraints (no logic yet, just fields)
  @Column({ type: 'int', default: 0 })
  maxTransfers: number; // 0 means non-transferable if you enforce later

  @Column({ type: 'boolean', default: true })
  isTransferable: boolean;

  @OneToMany(() => Ticket, (ticket) => ticket.ticketType)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
