import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/user.entity';
import { RevenueShareRule } from '../../modules/revenue-sharing/revenue-sharing.entity';
import { Ticket } from '../../ticket/ticket.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  location: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ticketPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxResalePrice: number;

  @Column({ type: 'int', default: 24 })
  transferCooldownHours: number;

  @Column({ type: 'boolean', default: true })
  allowTransfers: boolean;

  @Column({ type: 'int', default: 3 })
  maxTransfersPerTicket: number;

  @ManyToOne(() => User, user => user.id, { eager: true })
  organizer: User;


  @OneToMany(() => RevenueShareRule, rule => rule.event)
  revenueShareRules: RevenueShareRule[];

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];
}

