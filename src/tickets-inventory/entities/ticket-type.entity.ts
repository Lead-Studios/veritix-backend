import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from './ticket.entity';

export enum TicketPriceType {
  FREE = 'free',
  PAID = 'paid',
}

@Entity('ticket_types')
@Index(['eventId', 'name'], { unique: true })
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketPriceType,
    default: TicketPriceType.FREE,
  })
  priceType: TicketPriceType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Price in cents or major currency unit',
  })
  price: number;

  @Column({
    type: 'int',
    comment: 'Total quantity available for this ticket type',
  })
  totalQuantity: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of tickets sold/issued',
  })
  soldQuantity: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Max tickets per person. NULL = unlimited',
  })
  maxPerPerson: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When ticket sales start. NULL = immediately available',
  })
  saleStartsAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When ticket sales end. NULL = until event date',
  })
  saleEndsAt: Date;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this ticket type is currently available',
  })
  isActive: boolean;

  @Column()
  eventId: string;

  @ManyToOne(() => Event, (event) => event.ticketTypes, {
    onDelete: 'CASCADE',
  })
  event: Event;

  @OneToMany(() => Ticket, (ticket) => ticket.ticketType, {
    cascade: true,
    eager: false,
  })
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Calculated property: remaining inventory
   */
  getRemainingQuantity(): number {
    return this.totalQuantity - this.soldQuantity;
  }

  /**
   * Check if ticket type is currently available for purchase
   */
  isAvailableNow(): boolean {
    if (!this.isActive) return false;

    const now = new Date();

    if (this.saleStartsAt && now < this.saleStartsAt) {
      return false;
    }

    if (this.saleEndsAt && now > this.saleEndsAt) {
      return false;
    }

    return this.getRemainingQuantity() > 0;
  }

  /**
   * Check if purchase quantity is valid
   */
  canPurchase(quantity: number): boolean {
    return this.getRemainingQuantity() >= quantity;
  }
}
