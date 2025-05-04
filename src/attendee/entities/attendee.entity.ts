import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity()
export class Attendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  company: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  role: string; // ATTENDEE, SPEAKER, VIP, etc.

  @OneToMany(() => Ticket, (ticket) => ticket.attendee)
  tickets: Ticket[];
}