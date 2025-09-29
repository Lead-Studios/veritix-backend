import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';
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

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ type: 'int' })
  capacity: number;

  @ManyToOne(() => User, (user) => user.id, { eager: true })
  organizer: User;

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets?: Ticket[];
}
