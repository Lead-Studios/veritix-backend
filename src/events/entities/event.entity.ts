import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TicketType } from '../../ticket-types/entities/ticket-type.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  venue: string;

  @Column()
  address: string;

  @Column('timestamp')
  eventDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxCapacity: number;

  @OneToMany(() => TicketType, ticketType => ticketType.event)
  ticketTypes: TicketType[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
