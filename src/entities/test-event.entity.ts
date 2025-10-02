import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { TestTicket } from './test-ticket.entity';
import { User } from 'src/user/user.entity';

@Entity()
export class TestEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  location: string;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
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

  @OneToMany(() => TestTicket, (ticket) => ticket.event)
  tickets: TestTicket[];
}
