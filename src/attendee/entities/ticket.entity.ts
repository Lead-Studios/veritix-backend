import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Attendee } from './attendee.entity';
import { Conference } from '../../conference/entities/conference.entity';
import { Session } from '../../conference/entities/session.entity';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // e.g., FULL_ACCESS, DAY_PASS, VIP

  @Column({ default: false })
  badgeGenerated: boolean;

  @Column({ nullable: true })
  badgeUrl: string;

  @ManyToOne(() => Attendee, (attendee) => attendee.tickets)
  attendee: Attendee;

  @ManyToOne(() => Conference)
  conference: Conference;

  @ManyToMany(() => Session)
  @JoinTable()
  registeredSessions: Session[];
}
