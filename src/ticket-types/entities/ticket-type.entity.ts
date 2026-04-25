import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, VirtualColumn, Index } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('ticket_types')
@Index(['eventId', 'isActive'])
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  totalQuantity: number;

  @Column()
  soldQuantity: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  saleStartsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  saleEndsAt: Date;

  @VirtualColumn({
    query: (alias) => `SELECT ${alias}.totalQuantity - ${alias}.soldQuantity`,
  })
  remainingQuantity: number;

  @ManyToOne(() => Event, event => event.ticketTypes)
  event: Event;

  @Column()
  eventId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isAvailableNow(): boolean {
    const now = new Date();
    
    // Check if ticket type is active
    if (!this.isActive) {
      return false;
    }
    
    // Check if there are tickets remaining
    if (this.soldQuantity >= this.totalQuantity) {
      return false;
    }
    
    // Check sale window if specified
    if (this.saleStartsAt && now < this.saleStartsAt) {
      return false;
    }
    
    if (this.saleEndsAt && now > this.saleEndsAt) {
      return false;
    }
    
    return true;
  }
}
