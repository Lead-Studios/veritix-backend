import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { TicketType } from '../../ticket-types/entities/ticket-type.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column('uuid')
  ticketTypeId: string;

  @ManyToOne(() => TicketType)
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  @Column('uuid', { nullable: true })
  orderReference: string;

  @ManyToOne(() => Order, (order) => order.tickets, { nullable: true })
  @JoinColumn({ name: 'orderReference' })
  order: Order;

  @Column({ default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
